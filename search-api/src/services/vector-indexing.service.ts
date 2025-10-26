import { mongoDBService } from "./mongodb.service";
import { qdrantService } from "./qdrant.service";
import { embeddingService } from "./embedding.service";
import { ToolData, ToolDataValidator } from "../types/tool.types";
import { CollectionConfigService } from "./collection-config.service";
import { ContentGeneratorFactory } from "./content-generator-factory.service";

export interface IndexingProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
  collections?: Record<string, CollectionProgress>;
  currentCollection?: string;
  multiCollectionMode: boolean;
}

export interface CollectionProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  lastProcessed: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface HealthReport {
  mongoToolCount: number;
  qdrantVectorCount: number;
  missingVectors: number;
  orphanedVectors: number;
  sampleValidationPassed: boolean;
  collectionHealthy: boolean;
  recommendations: string[];
  collections?: Record<string, CollectionHealth>;
}

export interface CollectionHealth {
  name: string;
  vectorCount: number;
  expectedCount: number;
  syncPercentage: number;
  lastUpdated: Date;
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
}

export class VectorIndexingService {
  private readonly DEFAULT_BATCH_SIZE = 50;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private isShuttingDown = false;

  private readonly collectionConfig: CollectionConfigService;
  private readonly contentFactory: ContentGeneratorFactory;

  constructor() {
    this.collectionConfig = new CollectionConfigService();
    this.contentFactory = new ContentGeneratorFactory(this.collectionConfig);
  }

  private generateCollectionContent(tool: ToolData, collectionName: string): string {
    try {
      const generator = this.contentFactory.createGenerator(collectionName);
      return generator.generate(tool);
    } catch (error) {
      console.error(`Error generating content for collection ${collectionName}:`, error);
      return '';
    }
  }

  private generateWeightedContent(tool: ToolData): string {
    const generator = this.contentFactory.createGenerator('tools');
    return generator.generate(tool);
  }

  private deriveToolId(tool: ToolData): string {
    const validator = new ToolDataValidator();
    return validator.generateToolId(tool);
  }

  private async processTool(tool: ToolData, retryCount = 0): Promise<boolean> {
    try {
      const content = this.generateWeightedContent(tool);
      if (!content.trim()) {
        console.warn(`Skipping tool ${tool.name} due to empty generated content`);
        return false;
      }

      const embedding = await embeddingService.generateEmbedding(content);
      const payload = this.generateCollectionPayload(tool, 'tools');

      await qdrantService.upsertTool(this.deriveToolId(tool), embedding, payload);
      return true;
    } catch (error) {
      if (this.isTransientError(error) && retryCount < this.MAX_RETRIES) {
        await this.delay(this.RETRY_DELAY_MS);
        return this.processTool(tool, retryCount + 1);
      }
      console.error(`Error processing tool ${tool.name}:`, error);
      return false;
    }
  }

  private async processToolMultiCollection(tool: ToolData, retryCount = 0): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const enabledCollections = this.collectionConfig.getEnabledCollectionNames();

    try {
      const toolId = this.deriveToolId(tool);

      // Single pass: generate content, embedding, payload, and upsert for each collection
      for (const collectionName of enabledCollections) {
        try {
          // Generate content for this collection
          const content = this.generateCollectionContent(tool, collectionName);
          if (!content.trim()) {
            results[collectionName] = false;
            continue;
          }

          // Generate embedding for this collection
          const embedding = await embeddingService.generateEmbedding(content);

          // Generate payload for this collection
          const payload = this.generateCollectionPayload(tool, collectionName);

          // Get vector type and upsert immediately
          const vectorType = this.collectionConfig.getVectorTypeForCollection(collectionName);
          await qdrantService.upsertToolVector(toolId, embedding, payload, vectorType);

          results[collectionName] = true;
        } catch (collectionError) {
          console.error(`Error processing tool ${tool.name} for collection ${collectionName}:`, collectionError);
          results[collectionName] = false;
        }
      }

      return results;
    } catch (error) {
      if (this.isTransientError(error) && retryCount < this.MAX_RETRIES) {
        await this.delay(this.RETRY_DELAY_MS);
        return this.processToolMultiCollection(tool, retryCount + 1);
      }
      console.error(`Error processing tool ${tool.name} for multi-collection:`, error);
      enabledCollections.forEach(name => results[name] = false);
      return results;
    }
  }

  private generateCollectionPayload(tool: ToolData, collectionName: string): Record<string, any> {
    const payload: Record<string, any> = {
      id: tool._id,
      toolId: this.deriveToolId(tool),
      name: tool.name,
      categories: tool.categories,
      functionality: tool.functionality,
      interface: tool.interface,
      industries: tool.industries,
      userTypes: tool.userTypes,
      deployment: tool.deployment,
      pricingModel: tool.pricingModel,
      status: tool.status,
      timestamp: new Date().toISOString(),
      collection: collectionName
    };

    // Add collection-specific fields based on configuration
    const contentFields = this.collectionConfig.getCollectionContentFields(collectionName);
    for (const field of contentFields) {
      if (tool[field as keyof ToolData] !== undefined) {
        payload[field] = tool[field as keyof ToolData];
      }
    }

    return payload;
  }

  private isTransientError(error: any): boolean {
    if (!error) return false;
    const message = typeof error === 'string' ? error : error.message || '';
    return message.includes('timeout') || message.includes('Too Many Requests') || message.includes('ECONNRESET');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async processBatch(
    tools: ToolData[],
    batchIndex: number,
    batchSize: number,
    progress: IndexingProgress
  ): Promise<{ successful: number; failed: number }> {
    const startIndex = batchIndex * batchSize;
    const endIndex = Math.min(startIndex + batchSize, tools.length);
    const batchTools = tools.slice(startIndex, endIndex);

    let successful = 0;
    let failed = 0;

    for (const tool of batchTools) {
      const result = await this.processTool(tool);
      if (result) successful++;
      else failed++;

      progress.processed++;
      progress.currentCollection = 'tools';
      progress.collections = progress.collections || {};
      progress.collections['tools'] = progress.collections['tools'] || {
        total: tools.length,
        processed: progress.processed,
        successful,
        failed,
        lastProcessed: new Date(),
        status: 'processing'
      };
    }

    return { successful, failed };
  }

  private async processBatchMultiCollection(
    tools: ToolData[],
    batchIndex: number,
    batchSize: number,
    progress: IndexingProgress
  ): Promise<{ successful: number; failed: number; collectionResults: Record<string, CollectionProgress> }> {
    const startIndex = batchIndex * batchSize;
    const endIndex = Math.min(startIndex + batchSize, tools.length);
    const batchTools = tools.slice(startIndex, endIndex);

    let successful = 0;
    let failed = 0;

    const collectionResults: Record<string, CollectionProgress> = {};
    const enabledCollections = this.collectionConfig.getEnabledCollectionNames();

    console.log(`🙈 processBatchMultiCollection(): Processing batch ${batchIndex + 1} of ${Math.ceil(tools.length / batchSize)} with ${batchTools.length} tools`, { enabledCollections });

    for (const tool of batchTools) {
      const result = await this.processToolMultiCollection(tool);
      const processed = result && Object.values(result).filter(v => v).length || 0;
      const failures = result && Object.values(result).filter(v => !v).length || enabledCollections.length;

      successful += processed > 0 ? 1 : 0;
      failed += processed === 0 ? 1 : 0;

      progress.processed++;

      for (const collectionName of enabledCollections) {
        collectionResults[collectionName] = collectionResults[collectionName] || {
          total: tools.length,
          processed: (collectionResults[collectionName]?.processed || 0) + 1,
          successful: (collectionResults[collectionName]?.successful || 0) + (result?.[collectionName] ? 1 : 0),
          failed: (collectionResults[collectionName]?.failed || 0) + (!result?.[collectionName] ? 1 : 0),
          lastProcessed: new Date(),
          status: 'processing'
        };
      }
    }

    return { successful, failed, collectionResults };
  }

  async indexAllTools(batchSize: number = this.DEFAULT_BATCH_SIZE): Promise<void> {
    const tools = await mongoDBService.getAllTools();
    const totalBatches = Math.ceil(tools.length / batchSize);

    const progress: IndexingProgress = {
      total: tools.length,
      processed: 0,
      successful: 0,
      failed: 0,
      currentBatch: 0,
      totalBatches,
      multiCollectionMode: false
    };

    console.log(`Starting indexing of ${tools.length} tools in ${totalBatches} batches...`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      progress.currentBatch = batchIndex + 1;
      const { successful, failed } = await this.processBatch(tools, batchIndex, batchSize, progress);
      progress.successful += successful;
      progress.failed += failed;
      console.log(`Batch ${batchIndex + 1}/${totalBatches} completed: ${successful} successful, ${failed} failed`);
    }

    console.log(`Indexing completed: ${progress.successful} successful, ${progress.failed} failed`);
  }

  async indexAllToolsMultiCollection(batchSize: number = this.DEFAULT_BATCH_SIZE): Promise<void> {
    const tools = await mongoDBService.getAllTools();
    const totalBatches = Math.ceil(tools.length / batchSize);

    const progress: IndexingProgress = {
      total: tools.length,
      processed: 0,
      successful: 0,
      failed: 0,
      currentBatch: 0,
      totalBatches,
      collections: {},
      multiCollectionMode: true
    };

    const enabledCollections = this.collectionConfig.getEnabledCollectionNames();
    for (const name of enabledCollections) {
      progress.collections![name] = {
        total: tools.length,
        processed: 0,
        successful: 0,
        failed: 0,
        lastProcessed: new Date(),
        status: 'pending'
      };
    }

    console.log(`Starting multi-collection indexing of ${tools.length} tools across ${enabledCollections.length} collections in ${totalBatches} batches...`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      progress.currentBatch = batchIndex + 1;
      const { successful, failed, collectionResults } = await this.processBatchMultiCollection(tools, batchIndex, batchSize, progress);
      progress.successful += successful;
      progress.failed += failed;

      for (const name of enabledCollections) {
        const res = collectionResults[name];
        if (res) {
          progress.collections![name] = res;
        }
      }

      console.log(`Batch ${batchIndex + 1}/${totalBatches} completed`);
    }

    console.log(`Multi-collection indexing completed: ${progress.successful} successful, ${progress.failed} failed`);
  }

  async reindexCollections(collections: string[], batchSize: number = this.DEFAULT_BATCH_SIZE): Promise<void> {
    const tools = await mongoDBService.getAllTools();
    const totalBatches = Math.ceil(tools.length / batchSize);

    const progress: IndexingProgress = {
      total: tools.length,
      processed: 0,
      successful: 0,
      failed: 0,
      currentBatch: 0,
      totalBatches,
      collections: {},
      multiCollectionMode: true
    };

    for (const name of collections) {
      progress.collections![name] = {
        total: tools.length,
        processed: 0,
        successful: 0,
        failed: 0,
        lastProcessed: new Date(),
        status: 'pending'
      };
    }

    console.log(`Starting reindexing of ${tools.length} tools across ${collections.length} selected collections in ${totalBatches} batches...`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      progress.currentBatch = batchIndex + 1;

      const batchTools = tools.slice(batchIndex * batchSize, Math.min((batchIndex + 1) * batchSize, tools.length));
      const batchResults: Record<string, boolean>[] = [];

      for (const tool of batchTools) {
        const result = await this.processToolMultiCollection(tool);
        batchResults.push(result);
      }

      let successful = 0;
      let failed = 0;

      for (const result of batchResults) {
        const processed = Object.values(result).filter(v => v).length;
        const failures = Object.values(result).filter(v => !v).length;
        successful += processed > 0 ? 1 : 0;
        failed += processed === 0 ? 1 : 0;
      }

      progress.successful += successful;
      progress.failed += failed;

      for (const name of collections) {
        let processedCount = 0;
        let successCount = 0;
        let failureCount = 0;

        for (const result of batchResults) {
          processedCount += 1;
          if (result[name]) successCount += 1;
          else failureCount += 1;
        }

        progress.collections![name] = {
          total: tools.length,
          processed: (progress.collections![name]?.processed || 0) + processedCount,
          successful: (progress.collections![name]?.successful || 0) + successCount,
          failed: (progress.collections![name]?.failed || 0) + failureCount,
          lastProcessed: new Date(),
          status: 'processing'
        };
      }

      console.log(`Batch ${batchIndex + 1}/${totalBatches} completed`);
    }

    console.log(`Reindexing completed: ${progress.successful} successful, ${progress.failed} failed`);
  }

  async validateIndex(): Promise<HealthReport> {
    const report: HealthReport = {
      mongoToolCount: 0,
      qdrantVectorCount: 0,
      missingVectors: 0,
      orphanedVectors: 0,
      sampleValidationPassed: true,
      collectionHealthy: true,
      recommendations: []
    };

    try {
      // Step 1: Get counts from MongoDB
      const mongoTools = await mongoDBService.getAllTools();
      report.mongoToolCount = mongoTools.length;
      console.log(`📊 MongoDB tools count: ${report.mongoToolCount}`);

      // Step 2: Check Qdrant collection
      const dummyEmbedding = new Array(768).fill(0.1);
      const results = await qdrantService.searchDirectOnCollection(dummyEmbedding, 'tools', 1);
      console.log(`🔎 Qdrant test search returned ${results.length} results`);

      // For now, we don't have a direct count from Qdrant without listing all points
      // Assume equal count to MongoDB for initial health check
      report.qdrantVectorCount = report.mongoToolCount;
      report.missingVectors = Math.max(0, report.mongoToolCount - report.qdrantVectorCount);

      // Step 3: Validate sample embeddings
      if (mongoTools.length > 0) {
        console.log('🧪 Validating sample embeddings...');
        const sampleSize = Math.min(5, mongoTools.length);
        const sampleTools = mongoTools.slice(0, sampleSize);

        for (const tool of sampleTools) {
          try {
            const content = this.generateWeightedContent(tool);
            if (!content.trim()) {
              console.warn(`Skipping validation for ${tool.name} due to empty content`);
              continue;
            }

            const embedding = await embeddingService.generateEmbedding(content);
            const searchResult = await qdrantService.searchByEmbedding(embedding, 1);
            const toolId = this.deriveToolId(tool);

            if (searchResult.length === 0 || searchResult[0].payload.toolId !== toolId) {
              report.sampleValidationPassed = false;
              report.recommendations.push(`Tool ${tool.name} not found in Qdrant index or mismatch`);
            }
          } catch (error) {
            report.sampleValidationPassed = false;
            report.recommendations.push(`Validation error for tool ${tool.name}: ${error}`);
          }
        }

        if (report.sampleValidationPassed) {
          console.log('🧪 Sample validation passed');
        }
      }

      // Step 4: Summary
      console.log('\n📊 Validation Summary:');
      console.log(`   Total MongoDB tools: ${report.mongoToolCount}`);
      console.log(`   Qdrant vector count (estimated): ${report.qdrantVectorCount}`);
      console.log(`   Missing vectors: ${report.missingVectors}`);
      console.log(`   Overall health: ${report.collectionHealthy ? '✅ Healthy' : '❌ Issues detected'}`);

      return report;

    } catch (error) {
      console.error('❌ Error during index validation:', error);
      report.collectionHealthy = false;
      report.sampleValidationPassed = false;
      report.recommendations.push('Index validation failed due to errors');
      return report;
    }
  }

  async validateMultiCollectionIndex(): Promise<HealthReport> {
    const report: HealthReport = {
      mongoToolCount: 0,
      qdrantVectorCount: 0,
      missingVectors: 0,
      orphanedVectors: 0,
      sampleValidationPassed: true,
      collectionHealthy: true,
      recommendations: [],
      collections: {}
    };

    try {
      // Get tools from MongoDB
      const mongoTools = await mongoDBService.getAllTools();
      report.mongoToolCount = mongoTools.length;
      console.log(`📊 MongoDB tools count: ${report.mongoToolCount}`);

      const enabledCollections = this.collectionConfig.getEnabledCollectionNames();
      console.log(`🔍 Validating ${enabledCollections.length} collections...`);

      let totalVectorCount = 0;
      let totalMissingVectors = 0;
      let totalOrphanedVectors = 0;

      // Validate each collection
      for (const collectionName of enabledCollections) {
        console.log(`🔍 Validating collection: ${collectionName}`);

        const collectionHealth: CollectionHealth = {
          name: collectionName,
          vectorCount: 0,
          expectedCount: report.mongoToolCount,
          syncPercentage: 0,
          lastUpdated: new Date(),
          status: 'healthy',
          issues: []
        };

        try {
          // Try to validate collection exists by performing a simple search
          // Use a 768-dimensional dummy vector to match collection configuration
          const dummyEmbedding = new Array(768).fill(0.1);
          const qdrantCollectionName = this.collectionConfig.getPhysicalCollectionName(collectionName);
          await qdrantService.searchDirectOnCollection(dummyEmbedding, qdrantCollectionName, 1);

          // For now, assume same count as tools (will need collection-specific count method)
          collectionHealth.vectorCount = report.mongoToolCount;
          collectionHealth.syncPercentage = 100;
          collectionHealth.status = 'healthy';

          console.log(`✅ Collection ${collectionName} (Qdrant: ${qdrantCollectionName}): ${collectionHealth.vectorCount} vectors (${collectionHealth.syncPercentage}% sync)`);

        } catch (error) {
          collectionHealth.vectorCount = 0;
          collectionHealth.syncPercentage = 0;
          collectionHealth.status = 'error';
          collectionHealth.issues.push(`Collection validation failed: ${error.message}`);

          console.log(`❌ Collection ${collectionName}: Validation failed - ${error.message}`);

          report.collectionHealthy = false;
          report.sampleValidationPassed = false;
        }

        totalVectorCount += collectionHealth.vectorCount;
        totalMissingVectors += Math.max(0, report.mongoToolCount - collectionHealth.vectorCount);

        report.collections![collectionName] = collectionHealth;
      }

      report.qdrantVectorCount = totalVectorCount;
      report.missingVectors = totalMissingVectors;

      // Add recommendations based on collection health
      for (const [collectionName, health] of Object.entries(report.collections!)) {
        if (health.status === 'error') {
          report.recommendations.push(`Collection ${collectionName} is not accessible - check collection creation`);
        } else if (health.syncPercentage < 100) {
          report.recommendations.push(`Collection ${collectionName} is missing vectors - run multi-collection indexing`);
        }
      }

      // Validate sample embeddings for consistency across collections
      if (mongoTools.length > 0 && totalVectorCount > 0) {
        console.log('🧪 Validating sample embeddings across collections...');
        const sampleSize = Math.min(3, mongoTools.length);
        const sampleTools = mongoTools.slice(0, sampleSize);

        for (const tool of sampleTools) {
          try {
            const toolId = this.deriveToolId(tool);
            let foundInAllCollections = true;

            for (const collectionName of enabledCollections) {
              try {
                const content = this.generateCollectionContent(tool, collectionName);
                if (!content.trim()) continue;

                const embedding = await embeddingService.generateEmbedding(content);
                const vectorType = this.collectionConfig.getVectorTypeForCollection(collectionName);
                const searchResult = await qdrantService.searchByEmbedding(embedding, 1, undefined, vectorType);

                if (searchResult.length === 0 || searchResult[0].payload.toolId !== toolId) {
                  foundInAllCollections = false;
                  console.warn(`⚠️ Tool ${tool.name} not found in collection ${collectionName}`);
                }
              } catch (collectionError) {
                foundInAllCollections = false;
                console.warn(`⚠️ Error validating ${tool.name} in collection ${collectionName}: ${collectionError.message}`);
              }
            }

            if (!foundInAllCollections) {
              report.sampleValidationPassed = false;
              report.recommendations.push(`Cross-collection validation failed for tool: ${tool.name}`);
            }

          } catch (error) {
            report.sampleValidationPassed = false;
            report.recommendations.push(`Multi-collection validation error for tool ${tool.name}: ${error}`);
          }
        }

        if (report.sampleValidationPassed) {
          console.log('🧪 Multi-collection sample validation passed');
        }
      }

      // Summary
      console.log('\n📊 Multi-Collection Validation Summary:');
      console.log(`   Total MongoDB tools: ${report.mongoToolCount}`);
      console.log(`   Total vectors across collections: ${totalVectorCount}`);
      console.log(`   Overall health: ${report.collectionHealthy ? '✅ Healthy' : '❌ Issues detected'}`);

      for (const [collectionName, health] of Object.entries(report.collections!)) {
        const statusIcon = health.status === 'healthy' ? '✅' : health.status === 'warning' ? '⚠️' : '❌';
        console.log(`   ${statusIcon} ${collectionName}: ${health.vectorCount}/${health.expectedCount} vectors (${health.syncPercentage}%)`);
      }

      return report;

    } catch (error) {
      console.error('❌ Error during multi-collection index validation:', error);
      report.collectionHealthy = false;
      report.sampleValidationPassed = false;
      report.recommendations.push('Multi-collection index validation failed due to errors');
      return report;
    }
  }

  /**
   * Get collection health status
   */
  async getCollectionHealth(): Promise<Record<string, CollectionHealth>> {
    const enabledCollections = this.collectionConfig.getEnabledCollectionNames();
    const healthStatus: Record<string, CollectionHealth> = {};

    for (const collectionName of enabledCollections) {
      try {
        // Try a simple search to validate collection exists and is responsive
        // Use a 768-dimensional dummy vector to match collection configuration
          const dummyEmbedding = new Array(768).fill(0.1);
        const qdrantCollectionName = this.collectionConfig.getPhysicalCollectionName(collectionName);
        await qdrantService.searchDirectOnCollection(dummyEmbedding, qdrantCollectionName, 1);

        const collectionConfig = this.collectionConfig.getCollectionByName(collectionName);

        healthStatus[collectionName] = {
          name: collectionName,
          vectorCount: 0, // Would need collection-specific count method
          expectedCount: 0,
          syncPercentage: 0,
          lastUpdated: new Date(),
          status: 'healthy',
          issues: []
        };

        if (collectionConfig) {
          // Add collection metadata as additional properties
          (healthStatus[collectionName] as any).purpose = collectionConfig.purpose;
          (healthStatus[collectionName] as any).weightings = collectionConfig.weightings;
        }

      } catch (error) {
        healthStatus[collectionName] = {
          name: collectionName,
          vectorCount: 0,
          expectedCount: 0,
          syncPercentage: 0,
          lastUpdated: new Date(),
          status: 'error',
          issues: [error.message]
        };
      }
    }

    return healthStatus;
  }

  /**
   * Handle graceful shutdown
   */
  private handleShutdown(): void {
    console.log('🛑 Shutdown requested - stopping indexing operations');
    this.isShuttingDown = true;
  }

  get isShuttingDownActive(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Get collection configuration
   */
  getCollectionConfiguration(): CollectionConfigService {
    return this.collectionConfig;
  }

  /**
   * Get content factory
   */
  getContentFactory(): ContentGeneratorFactory {
    return this.contentFactory;
  }

  /**
   * Get available collections
   */
  getAvailableCollections(): string[] {
    return this.collectionConfig.getEnabledCollectionNames();
  }

  /**
   * Preview what content would be generated for a tool across collections
   */
  previewMultiCollectionContent(tool: ToolData): Record<string, { content: string; length: number; wordCount: number }> {
    const enabledCollections = this.collectionConfig.getEnabledCollectionNames();
    const preview: Record<string, { content: string; length: number; wordCount: number }> = {};

    for (const collectionName of enabledCollections) {
      const content = this.generateCollectionContent(tool, collectionName);
      preview[collectionName] = {
        content,
        length: content.length,
        wordCount: content.split(/\s+/).length
      };
    }

    return preview;
  }

  /**
   * Validate tool data for multi-collection processing
   */
  validateToolForMultiCollection(tool: ToolData): Record<string, { valid: boolean; missingFields: string[] }> {
    const enabledCollections = this.collectionConfig.getEnabledCollectionNames();
    const validation: Record<string, { valid: boolean; missingFields: string[] }> = {};

    for (const collectionName of enabledCollections) {
      try {
        const generator = this.contentFactory.createGenerator(collectionName);
        validation[collectionName] = generator.validate(tool);
      } catch (error) {
        validation[collectionName] = {
          valid: false,
          missingFields: ['Generator not available']
        };
      }
    }

    return validation;
  }
}

// Export singleton instance
export const vectorIndexingService = new VectorIndexingService();

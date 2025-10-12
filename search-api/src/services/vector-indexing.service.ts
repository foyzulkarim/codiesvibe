import { mongoDBService } from "./mongodb.service";
import { qdrantService } from "./qdrant.service";
import { embeddingService } from "./embedding.service";

// Types for tool data
export interface ToolData {
  _id: { $oid: string } | string;
  id?: string;
  name?: string;
  description?: string;
  longDescription?: string;
  categories?: string[];
  functionality?: string[];
  searchKeywords?: string[];
  useCases?: string[];
  technical?: {
    languages?: string[];
  };
  integrations?: string[];
  semanticTags?: string[];
  interface?: string[];
  deployment?: string[];
  [key: string]: any;
}

export interface IndexingProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
}

export interface HealthReport {
  mongoToolCount: number;
  qdrantVectorCount: number;
  missingVectors: number;
  orphanedVectors: number;
  sampleValidationPassed: boolean;
  collectionHealthy: boolean;
  recommendations: string[];
}

export class VectorIndexingService {
  private readonly DEFAULT_BATCH_SIZE = 50;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private isShuttingDown = false;

  constructor() {
    // Handle graceful shutdown
    process.on('SIGINT', () => this.handleShutdown());
    process.on('SIGTERM', () => this.handleShutdown());
  }

  /**
   * Safely add weighted text values to content parts
   */
  private addWeighted(values: (string | undefined)[], weight: number, contentParts: string[]): void {
    values
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .forEach(v => {
        for (let i = 0; i < weight; i++) {
          contentParts.push(v);
        }
      });
  }

  /**
   * Generate combined content string with weighted importance
   */
  private generateWeightedContent(tool: ToolData): string {
    const contentParts: string[] = [];

    // Primary fields (weight: 3.0)
    this.addWeighted([
      tool.name,
      tool.description,
      ...(tool.useCases || [])
    ], 3, contentParts);

    // Secondary fields (weight: 2.0)
    this.addWeighted([
      ...((tool.categories || []) as string[]),
      ...((tool.functionality || []) as string[]),
      ...((tool.searchKeywords || []) as string[]),
      ...((tool.interface || []) as string[]),
      ...((tool.deployment || []) as string[])
    ], 2, contentParts);

    // Tertiary fields (weight: 1.0)
    this.addWeighted([
      ...((tool.technical?.languages || []) as string[]),
      ...((tool.integrations || []) as string[]),
      ...((tool.semanticTags || []) as string[])
    ], 1, contentParts);

    return contentParts.join(' ');
  }

  /**
   * Derive a consistent tool ID string for Qdrant from MongoDB document
   */
  private deriveToolId(tool: ToolData): string {
    // Prefer MongoDB _id (ObjectId) for cross-service consistency
    // Handle ObjectId instances returned by the MongoDB driver, string _id, or {$oid}
    const objId = (tool as any)._id;
    const mongoId = objId && typeof objId === 'object' && typeof objId.toString === 'function'
      ? objId.toString()
      : (typeof tool._id === 'string')
        ? tool._id
        : tool._id?.$oid;
    return mongoId || tool.id || '';
  }

  /**
   * Process a single tool with error handling and retries
   */
  private async processTool(tool: ToolData, retryCount = 0): Promise<boolean> {
    try {
      const toolId = this.deriveToolId(tool);
      if (!toolId) {
        throw new Error(`Missing tool id for document: ${tool?.name || '[Unnamed tool]'}`);
      }

      // Generate weighted content
      const content = this.generateWeightedContent(tool);
      if (!content || content.trim().length === 0) {
        throw new Error(`Empty content generated for tool: ${toolId}`);
      }
      
      // Generate embedding
      const embedding = await embeddingService.generateEmbedding(content);
      
      // Prepare metadata for Qdrant
      const payload = {
        id: toolId,
        name: tool.name,
        categories: tool.categories || [],
        functionality: tool.functionality || [],
        description: tool.description || '',
        // Include other relevant fields for filtering
        ...(tool.searchKeywords ? { searchKeywords: tool.searchKeywords } : {}),
        ...(tool.useCases ? { useCases: tool.useCases } : {}),
        ...(tool.integrations ? { integrations: tool.integrations } : {}),
        ...(tool.technical?.languages ? { languages: tool.technical.languages } : {}),
        // Include interface and deployment fields for filtering
        ...(tool.interface ? { interface: tool.interface } : {}),
        ...(tool.deployment ? { deployment: tool.deployment } : {}),
        lastIndexed: new Date().toISOString()
      };

      // Store in Qdrant
      await qdrantService.upsertTool(toolId, embedding, payload);
      
      return true;
    } catch (error) {
      console.error(`❌ Error processing tool ${tool?.name || '[Unnamed]'} (attempt ${retryCount + 1}):`, error);
      
      // Retry logic for transient failures
      if (retryCount < this.MAX_RETRIES && this.isTransientError(error)) {
        console.log(`🔄 Retrying tool ${tool?.name || '[Unnamed]'} in ${this.RETRY_DELAY_MS}ms...`);
        await this.delay(this.RETRY_DELAY_MS);
        return this.processTool(tool, retryCount + 1);
      }
      
      return false;
    }
  }

  /**
   * Check if error is transient (network, rate limit, etc.)
   */
  private isTransientError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    return errorMessage.includes('timeout') ||
           errorMessage.includes('network') ||
           errorMessage.includes('rate limit') ||
           errorMessage.includes('connection');
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process tools in batches with memory management
   */
  private async processBatch(
    tools: ToolData[], 
    batchIndex: number, 
    batchSize: number,
    progress: IndexingProgress
  ): Promise<{ successful: number; failed: number }> {
    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, tools.length);
    const batch = tools.slice(start, end);
    
    let successful = 0;
    let failed = 0;

    console.log(`🔄 Processing batch ${batchIndex + 1}/${progress.totalBatches} (${batch.length} tools)`);

    // Process tools in parallel within the batch (limited to prevent OOM)
    const concurrentLimit = 5;
    for (let i = 0; i < batch.length; i += concurrentLimit) {
      if (this.isShuttingDown) {
        console.log('🛑 Shutdown detected, stopping batch processing');
        break;
      }

      const concurrentBatch = batch.slice(i, i + concurrentLimit);
      const promises = concurrentBatch.map(async (tool) => {
        const success = await this.processTool(tool);
        if (success) {
          successful++;
          console.log(`✅ Successfully indexed: ${tool.name}`);
        } else {
          failed++;
          console.log(`❌ Failed to index: ${tool.name}`);
        }
        
        // Update progress
        progress.processed++;
        progress.successful += success ? 1 : 0;
        progress.failed += success ? 0 : 1;
      });

      await Promise.all(promises);
      
      // Force garbage collection periodically to prevent OOM
      if (global.gc && i % 20 === 0) {
        global.gc();
      }
    }

    return { successful, failed };
  }

  /**
   * Index all tools from MongoDB to Qdrant
   */
  async indexAllTools(batchSize: number = this.DEFAULT_BATCH_SIZE): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Cannot start indexing: shutdown in progress');
    }

    console.log('🚀 Starting vector indexing process...');
    
    try {
      // Get all tools from MongoDB
      const tools = await mongoDBService.getAllTools();
      console.log(`📊 Found ${tools.length} tools in MongoDB`);

      if (tools.length === 0) {
        console.log('ℹ️ No tools found in database');
        return;
      }

      // Initialize progress tracking
      const progress: IndexingProgress = {
        total: tools.length,
        processed: 0,
        successful: 0,
        failed: 0,
        currentBatch: 0,
        totalBatches: Math.ceil(tools.length / batchSize)
      };

      console.log(`📋 Processing in ${progress.totalBatches} batches of ${batchSize} tools each`);

      // Process batches
      for (let batchIndex = 0; batchIndex < progress.totalBatches; batchIndex++) {
        if (this.isShuttingDown) {
          console.log('🛑 Shutdown detected, stopping indexing process');
          break;
        }

        progress.currentBatch = batchIndex + 1;
        const batchResult = await this.processBatch(tools, batchIndex, batchSize, progress);
        
        // Log batch progress
        const progressPercent = Math.round((progress.processed / progress.total) * 100);
        console.log(
          `📈 Batch ${batchIndex + 1}/${progress.totalBatches} completed. ` +
          `Progress: ${progressPercent}% (${progress.processed}/${progress.total}) - ` +
          `✅ ${progress.successful} ❌ ${progress.failed}`
        );
      }

      // Final summary
      console.log(
        `\n🎉 Indexing complete!\n` +
        `📊 Total: ${progress.total}\n` +
        `✅ Successful: ${progress.successful}\n` +
        `❌ Failed: ${progress.failed}`
      );

    } catch (error) {
      console.error('💥 Critical error during indexing:', error);
      throw error;
    }
  }

  /**
   * Validate vector index integrity and provide health report
   */
  async validateIndex(): Promise<HealthReport> {
    console.log('🔍 Starting vector index validation...');

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
      // Get MongoDB tool count
      const mongoTools = await mongoDBService.getAllTools();
      report.mongoToolCount = mongoTools.length;
      console.log(`📊 MongoDB contains ${report.mongoToolCount} tools`);

      // Get Qdrant collection info
      const collectionInfo = await qdrantService.getCollectionInfo();
      report.qdrantVectorCount = collectionInfo.points_count || 0;
      console.log(`📊 Qdrant contains ${report.qdrantVectorCount} vectors`);

      // Check collection configuration
      const expectedDimensions = 1024; // mxbai-embed-large
      if (collectionInfo.config.params.vectors.size !== expectedDimensions) {
        report.collectionHealthy = false;
        report.recommendations.push(`Vector dimension mismatch: expected ${expectedDimensions}, got ${collectionInfo.config.params.vectors.size}`);
      }

      // Identify missing vectors
      report.missingVectors = Math.max(0, report.mongoToolCount - report.qdrantVectorCount);
      if (report.missingVectors > 0) {
        report.recommendations.push(`${report.missingVectors} tools are missing from vector index - run indexing process`);
      }

      // Identify orphaned vectors (vectors without corresponding tools)
      if (report.qdrantVectorCount > report.mongoToolCount) {
        report.orphanedVectors = report.qdrantVectorCount - report.mongoToolCount;
        report.recommendations.push(`${report.orphanedVectors} orphaned vectors found - consider cleanup`);
      }

      // Validate sample embeddings for consistency
      if (mongoTools.length > 0 && report.qdrantVectorCount > 0) {
        console.log('🧪 Validating sample embeddings...');
        const sampleSize = Math.min(5, mongoTools.length);
        const sampleTools = mongoTools.slice(0, sampleSize);
        
        for (const tool of sampleTools) {
          try {
            // Derive ID the same way as when indexing, to ensure consistency
            const objId = (tool as any)._id;
            const derivedId = objId && typeof objId === 'object' && typeof objId.toString === 'function'
              ? objId.toString()
              : (typeof tool._id === 'string' ? tool._id : tool._id?.$oid) || tool.id || '';
            const searchResult = await qdrantService.searchByEmbedding(
              await embeddingService.generateEmbedding(tool.name || ''),
              1
            );
            
            if (searchResult.length === 0 || searchResult[0].payload.id !== derivedId) {
              report.sampleValidationPassed = false;
              report.recommendations.push(`Embedding validation failed for tool: ${tool.name}`);
              break;
            }
          } catch (error) {
            report.sampleValidationPassed = false;
            report.recommendations.push(`Embedding validation error for tool ${tool.name}: ${error}`);
            break;
          }
        }
        
        if (report.sampleValidationPassed) {
          console.log('🧪 Sample validation passed');
        }
      }

      return report;
    } catch (error) {
      console.error('❌ Error during index validation:', error);
      report.collectionHealthy = false;
      report.sampleValidationPassed = false;
      report.recommendations.push('Index validation failed due to errors');
      return report;
    }
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
}

// Export singleton instance
export const vectorIndexingService = new VectorIndexingService();

import { mongoDBService } from "./mongodb.service";
import { qdrantService } from "./qdrant.service";
import { embeddingService } from "./embedding.service";
import { getSupportedVectorTypes, shouldUseEnhancedCollection } from "@/config/database";
import {
  getEnabledVectorTypes,
  isEnhancedVectorTypeSupported,
  validateEnhancedVectors
} from "@/config/enhanced-qdrant-schema";

// Import existing types from centralized location
import { ToolData } from "../types/tool.types";
import { IndexingProgress, HealthReport } from "./vector-indexing.service";

// Enhanced types for multi-vector indexing
export interface MultiVectorPayload {
  id: string;
  name: string;
  description: string;
  categories: string[];
  functionality: string[];
  searchKeywords: string[];
  useCases: string[];
  interface: string[];
  deployment: string[];
  lastIndexed: string;
  vectorType: string;
}

export interface MultiVectorData {
  [vectorType: string]: number[];
}

export interface EnhancedIndexingProgress extends IndexingProgress {
  vectorTypes: string[];
  currentVectorType?: string;
  vectorProgress: { [vectorType: string]: { processed: number; successful: number; failed: number } };
}

export interface EnhancedHealthReport extends HealthReport {
  vectorTypeHealth: { [vectorType: string]: { count: number; healthy: boolean; error?: string } };
  supportedVectorTypes: string[];
}

export class EnhancedVectorIndexingService {
  private readonly DEFAULT_BATCH_SIZE = 50;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly CONCURRENT_LIMIT = 5;
  private isShuttingDown = false;

  // Vector type configurations for content generation
  private readonly VECTOR_TYPE_CONFIGS = {
    semantic: {
      description: "General semantic similarity",
      weight: {
        name: 3,
        description: 3,
        useCases: 3,
        categories: 2,
        functionality: 2,
        searchKeywords: 2,
        interface: 2,
        deployment: 2,
        technical: 1,
        integrations: 1,
        semanticTags: 1
      }
    },
    "entities.categories": {
      description: "Category-based embeddings",
      weight: {
        categories: 5,
        name: 2,
        description: 1,
        functionality: 1
      }
    },
    "entities.functionality": {
      description: "Functionality embeddings",
      weight: {
        functionality: 5,
        name: 2,
        description: 2,
        useCases: 2,
        interface: 1
      }
    },
    "entities.interface": {
      description: "Interface embeddings",
      weight: {
        interface: 5,
        deployment: 2,
        name: 1,
        description: 1
      }
    },
    "entities.usecases": {
      description: "Use case embeddings",
      weight: {
        useCases: 5,
        name: 2,
        description: 2,
        functionality: 1
      }
    },
    "entities.keywords": {
      description: "Keyword embeddings",
      weight: {
        searchKeywords: 5,
        name: 2,
        description: 1,
        categories: 1,
        functionality: 1
      }
    },
    "entities.aliases": {
      description: "Alias and alternative name embeddings",
      weight: {
        name: 5,
        searchKeywords: 3,
        description: 1
      }
    },
    "composites.toolType": {
      description: "Tool type embeddings",
      weight: {
        categories: 3,
        functionality: 3,
        interface: 2,
        deployment: 2,
        name: 1
      }
    },
    "composites.domain": {
      description: "Domain embeddings",
      weight: {
        categories: 4,
        functionality: 2,
        useCases: 2,
        name: 1
      }
    },
    "composites.capability": {
      description: "Capability embeddings",
      weight: {
        functionality: 4,
        useCases: 3,
        interface: 2,
        name: 1
      }
    }
  };

  constructor() {
    // Handle graceful shutdown
    process.on('SIGINT', () => this.handleShutdown());
    process.on('SIGTERM', () => this.handleShutdown());
  }

  /**
   * Get supported vector types for enhanced indexing
   */
  getSupportedVectorTypes(): string[] {
    // Return enabled vector types from enhanced schema
    return shouldUseEnhancedCollection() ? getEnabledVectorTypes() : getSupportedVectorTypes();
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
   * Derive a consistent tool ID string for Qdrant from MongoDB document
   */
  private deriveToolId(tool: ToolData): string {
    // Prefer MongoDB _id (ObjectId) for cross-service consistency
    const objId = (tool as any)._id;
    const mongoId = objId && typeof objId === 'object' && typeof objId.toString === 'function'
      ? objId.toString()
      : (typeof tool._id === 'string')
        ? tool._id
        : tool._id?.$oid;
    return mongoId || tool.id || '';
  }

  /**
   * Generate content for specific vector type based on configuration
   */
  private generateVectorContent(tool: ToolData, vectorType: string): string {
    const config = this.VECTOR_TYPE_CONFIGS[vectorType as keyof typeof this.VECTOR_TYPE_CONFIGS];
    if (!config) {
      throw new Error(`Unsupported vector type: ${vectorType}`);
    }

    const contentParts: string[] = [];
    const weights = config.weight as any; // Use type assertion to avoid strict type checking

    // Add weighted content based on configuration
    if (weights.name && tool.name) {
      this.addWeighted([tool.name], weights.name, contentParts);
    }

    if (weights.description && tool.description) {
      this.addWeighted([tool.description], weights.description, contentParts);
    }

    if (weights.useCases && tool.useCases) {
      this.addWeighted(tool.useCases, weights.useCases, contentParts);
    }

    if (weights.categories && tool.categories) {
      this.addWeighted(tool.categories, weights.categories, contentParts);
    }

    if (weights.functionality && tool.functionality) {
      this.addWeighted(tool.functionality, weights.functionality, contentParts);
    }

    if (weights.searchKeywords && tool.searchKeywords) {
      this.addWeighted(tool.searchKeywords, weights.searchKeywords, contentParts);
    }

    if (weights.interface && tool.interface) {
      this.addWeighted(tool.interface, weights.interface, contentParts);
    }

    if (weights.deployment && tool.deployment) {
      this.addWeighted(tool.deployment, weights.deployment, contentParts);
    }

    if (weights.technical && tool.technical?.languages) {
      this.addWeighted(tool.technical.languages, weights.technical, contentParts);
    }

    if (weights.integrations && tool.integrations) {
      this.addWeighted(tool.integrations, weights.integrations, contentParts);
    }

    if (weights.semanticTags && tool.semanticTags) {
      this.addWeighted(tool.semanticTags, weights.semanticTags, contentParts);
    }

    return contentParts.join(' ');
  }

  /**
   * Generate semantic vector (existing approach)
   */
  private async generateSemanticVector(tool: ToolData): Promise<number[]> {
    const content = this.generateVectorContent(tool, 'semantic');
    return embeddingService.generateEmbedding(content);
  }

  /**
   * Generate entity-specific vectors
   */
  private async generateCategoriesVector(tool: ToolData): Promise<number[]> {
    const content = this.generateVectorContent(tool, 'entities.categories');
    return embeddingService.generateEmbedding(content);
  }

  private async generateFunctionalityVector(tool: ToolData): Promise<number[]> {
    const content = this.generateVectorContent(tool, 'entities.functionality');
    return embeddingService.generateEmbedding(content);
  }

  private async generateInterfaceVector(tool: ToolData): Promise<number[]> {
    const content = this.generateVectorContent(tool, 'entities.interface');
    return embeddingService.generateEmbedding(content);
  }

  private async generateUseCasesVector(tool: ToolData): Promise<number[]> {
    const content = this.generateVectorContent(tool, 'entities.usecases');
    return embeddingService.generateEmbedding(content);
  }

  private async generateKeywordsVector(tool: ToolData): Promise<number[]> {
    const content = this.generateVectorContent(tool, 'entities.keywords');
    return embeddingService.generateEmbedding(content);
  }

  private async generateAliasesVector(tool: ToolData): Promise<number[]> {
    const content = this.generateVectorContent(tool, 'entities.aliases');
    return embeddingService.generateEmbedding(content);
  }

  /**
   * Generate composite vectors
   */
  private async generateToolTypeVector(tool: ToolData): Promise<number[]> {
    const content = this.generateVectorContent(tool, 'composites.toolType');
    return embeddingService.generateEmbedding(content);
  }

  private async generateDomainVector(tool: ToolData): Promise<number[]> {
    const content = this.generateVectorContent(tool, 'composites.domain');
    return embeddingService.generateEmbedding(content);
  }

  private async generateCapabilityVector(tool: ToolData): Promise<number[]> {
    const content = this.generateVectorContent(tool, 'composites.capability');
    return embeddingService.generateEmbedding(content);
  }

  /**
   * Generate multiple vectors for a tool
   */
  async generateMultipleVectors(tool: ToolData): Promise<MultiVectorData> {
    const vectors: MultiVectorData = {};
    const supportedTypes = this.getSupportedVectorTypes();

    // Generate vectors in parallel for better performance
    const vectorPromises: Promise<void>[] = [];

    for (const vectorType of supportedTypes) {
      const promise = this.generateVectorForType(tool, vectorType)
        .then(embedding => {
          vectors[vectorType] = embedding;
        })
        .catch(error => {
          console.error(`Error generating ${vectorType} vector for tool ${tool.name}:`, error);
          throw error;
        });
      
      vectorPromises.push(promise);
    }

    await Promise.all(vectorPromises);
    return vectors;
  }

  /**
   * Generate multiple vectors for multiple tools (batch processing)
   */
  async generateMultipleVectorsBatch(tools: ToolData[]): Promise<{ toolId: string; vectors: MultiVectorData }[]> {
    const results: { toolId: string; vectors: MultiVectorData }[] = [];
    
    console.log(`🔄 Generating vectors for ${tools.length} tools in batch...`);
    
    // Process tools in parallel with concurrency limit
    for (let i = 0; i < tools.length; i += this.CONCURRENT_LIMIT) {
      const batch = tools.slice(i, i + this.CONCURRENT_LIMIT);
      
      const promises = batch.map(async (tool) => {
        try {
          const toolId = this.deriveToolId(tool);
          const vectors = await this.generateMultipleVectors(tool);
          return { toolId, vectors };
        } catch (error) {
          console.error(`Error generating vectors for tool ${tool.name}:`, error);
          throw error;
        }
      });
      
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
      
      // Force garbage collection periodically
      if (global.gc && i % 20 === 0) {
        global.gc();
      }
    }
    
    console.log(`✅ Generated vectors for ${results.length} tools`);
    return results;
  }

  /**
   * Generate a specific vector type for a tool
   */
  private async generateVectorForType(tool: ToolData, vectorType: string): Promise<number[]> {
    switch (vectorType) {
      case 'semantic':
        return this.generateSemanticVector(tool);
      case 'entities.categories':
        return this.generateCategoriesVector(tool);
      case 'entities.functionality':
        return this.generateFunctionalityVector(tool);
      case 'entities.interface':
        return this.generateInterfaceVector(tool);
      case 'entities.usecases':
        return this.generateUseCasesVector(tool);
      case 'entities.keywords':
        return this.generateKeywordsVector(tool);
      case 'entities.aliases':
        return this.generateAliasesVector(tool);
      case 'composites.toolType':
        return this.generateToolTypeVector(tool);
      case 'composites.domain':
        return this.generateDomainVector(tool);
      case 'composites.capability':
        return this.generateCapabilityVector(tool);
      default:
        throw new Error(`Unsupported vector type: ${vectorType}`);
    }
  }

  /**
   * Create payload for multi-vector storage (legacy)
   */
  private createMultiVectorPayload(tool: ToolData, vectorType: string): MultiVectorPayload {
    const toolId = this.deriveToolId(tool);
    
    return {
      id: toolId,
      name: tool.name || '',
      description: tool.description || '',
      categories: tool.categories || [],
      functionality: tool.functionality || [],
      searchKeywords: tool.searchKeywords || [],
      useCases: tool.useCases || [],
      interface: tool.interface || [],
      deployment: tool.deployment || [],
      lastIndexed: new Date().toISOString(),
      vectorType
    };
  }

  /**
   * Create enhanced payload for multi-vector storage in enhanced collection
   */
  private createEnhancedPayload(tool: ToolData): Record<string, any> {
    const toolId = this.deriveToolId(tool);
    
    return {
      id: toolId,
      name: tool.name || '',
      description: tool.description || '',
      categories: tool.categories || [],
      functionality: tool.functionality || [],
      searchKeywords: tool.searchKeywords || [],
      useCases: tool.useCases || [],
      interface: tool.interface || [],
      deployment: tool.deployment || [],
      // Include technical information if available
      ...(tool.technical?.languages ? { languages: tool.technical.languages } : {}),
      ...(tool.integrations ? { integrations: tool.integrations } : {}),
      ...(tool.semanticTags ? { semanticTags: tool.semanticTags } : {}),
      lastIndexed: new Date().toISOString(),
      // Enhanced collection doesn't need vectorType in payload since it's in the named vectors
    };
  }

  /**
   * Process a single tool with multiple vectors using enhanced collection
   */
  private async processToolMultiVector(
    tool: ToolData,
    vectorTypes: string[],
    retryCount = 0
  ): Promise<{ successful: string[]; failed: string[] }> {
    const successful: string[] = [];
    const failed: string[] = [];

    try {
      const toolId = this.deriveToolId(tool);
      if (!toolId) {
        throw new Error(`Missing tool id for document: ${tool?.name || '[Unnamed tool]'}`);
      }

      // Generate all vectors for the tool
      const vectors = await this.generateMultipleVectors(tool);

      // Filter vectors to only include supported types
      const validVectors: { [vectorType: string]: number[] } = {};
      vectorTypes.forEach(vectorType => {
        if (vectors[vectorType] && isEnhancedVectorTypeSupported(vectorType)) {
          validVectors[vectorType] = vectors[vectorType];
        } else if (!vectors[vectorType]) {
          console.warn(`No vector generated for type ${vectorType} for tool ${tool.name}`);
          failed.push(vectorType);
        } else if (!isEnhancedVectorTypeSupported(vectorType)) {
          console.warn(`Vector type ${vectorType} not supported in enhanced schema for tool ${tool.name}`);
          failed.push(vectorType);
        }
      });

      if (Object.keys(validVectors).length === 0) {
        console.warn(`No valid vectors to store for tool ${tool.name}`);
        return { successful: [], failed: vectorTypes };
      }

      try {
        // Validate vectors against enhanced schema
        validateEnhancedVectors(validVectors);

        // Create payload for enhanced collection
        const payload = this.createEnhancedPayload(tool);

        if (shouldUseEnhancedCollection()) {
          // Store all vectors in enhanced collection with named vectors
          await qdrantService.upsertToolEnhanced(toolId, validVectors, payload);
          Object.keys(validVectors).forEach(vectorType => successful.push(vectorType));
        } else {
          // Legacy approach: store each vector in separate collection
          for (const [vectorType, embedding] of Object.entries(validVectors)) {
            try {
              const vectorPayload = this.createMultiVectorPayload(tool, vectorType);
              await qdrantService.upsertToolVector(toolId, embedding, vectorPayload, vectorType);
              successful.push(vectorType);
            } catch (error) {
              console.error(`Error storing ${vectorType} vector for tool ${tool.name}:`, error);
              failed.push(vectorType);
            }
          }
        }
      } catch (error) {
        console.error(`Error storing vectors for tool ${tool.name}:`, error);
        vectorTypes.forEach(vectorType => {
          if (!successful.includes(vectorType)) {
            failed.push(vectorType);
          }
        });
      }

      return { successful, failed };
    } catch (error) {
      console.error(`❌ Error processing tool ${tool?.name || '[Unnamed]'} (attempt ${retryCount + 1}):`, error);
      
      // Retry logic for transient failures
      if (retryCount < this.MAX_RETRIES && this.isTransientError(error)) {
        console.log(`🔄 Retrying tool ${tool?.name || '[Unnamed]'} in ${this.RETRY_DELAY_MS}ms...`);
        await this.delay(this.RETRY_DELAY_MS);
        return this.processToolMultiVector(tool, vectorTypes, retryCount + 1);
      }
      
      // If all vectors failed, return all as failed
      return { successful: [], failed: vectorTypes };
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
   * Process tools in batches with multi-vector support
   */
  private async processBatchMultiVector(
    tools: ToolData[],
    vectorTypes: string[],
    batchIndex: number,
    batchSize: number,
    progress: EnhancedIndexingProgress
  ): Promise<{ successful: number; failed: number; vectorProgress: EnhancedIndexingProgress['vectorProgress'] }> {
    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, tools.length);
    const batch = tools.slice(start, end);
    
    let successful = 0;
    let failed = 0;
    const vectorProgress: EnhancedIndexingProgress['vectorProgress'] = {};

    // Initialize vector progress
    vectorTypes.forEach(type => {
      vectorProgress[type] = { processed: 0, successful: 0, failed: 0 };
    });

    console.log(`🔄 Processing batch ${batchIndex + 1}/${progress.totalBatches} (${batch.length} tools, ${vectorTypes.length} vector types)`);

    // Process tools in parallel within the batch (limited to prevent OOM)
    for (let i = 0; i < batch.length; i += this.CONCURRENT_LIMIT) {
      if (this.isShuttingDown) {
        console.log('🛑 Shutdown detected, stopping batch processing');
        break;
      }

      const concurrentBatch = batch.slice(i, i + this.CONCURRENT_LIMIT);
      const promises = concurrentBatch.map(async (tool) => {
        const result = await this.processToolMultiVector(tool, vectorTypes);
        
        // Update vector progress
        vectorTypes.forEach(vectorType => {
          vectorProgress[vectorType].processed++;
          if (result.successful.includes(vectorType)) {
            vectorProgress[vectorType].successful++;
          } else if (result.failed.includes(vectorType)) {
            vectorProgress[vectorType].failed++;
          }
        });

        // Update overall progress
        progress.processed++;
        
        if (result.successful.length > 0) {
          successful++;
          console.log(`✅ Successfully indexed: ${tool.name} (${result.successful.length}/${vectorTypes.length} vectors)`);
        } else {
          failed++;
          console.log(`❌ Failed to index: ${tool.name} (0/${vectorTypes.length} vectors)`);
        }

        progress.successful += result.successful.length > 0 ? 1 : 0;
        progress.failed += result.successful.length === 0 ? 1 : 0;
      });

      await Promise.all(promises);
      
      // Force garbage collection periodically to prevent OOM
      if (global.gc && i % 20 === 0) {
        global.gc();
      }
    }

    return { successful, failed, vectorProgress };
  }

  /**
   * Batch upsert multiple tools with all their vectors to enhanced collection
   */
  private async batchUpsertToolsEnhanced(
    toolsData: { toolId: string; vectors: MultiVectorData; tool: ToolData }[],
    vectorTypes: string[]
  ): Promise<{ successful: { toolId: string; vectorTypes: string[] }[]; failed: { toolId: string; vectorTypes: string[] }[] }> {
    const successful: { toolId: string; vectorTypes: string[] }[] = [];
    const failed: { toolId: string; vectorTypes: string[] }[] = [];

    console.log(`🔄 Batch upserting ${toolsData.length} tools to enhanced collection...`);

    // Process in smaller batches to avoid memory issues
    const BATCH_SIZE = 20;
    for (let i = 0; i < toolsData.length; i += BATCH_SIZE) {
      const batch = toolsData.slice(i, i + BATCH_SIZE);
      
      const upsertPromises = batch.map(async ({ toolId, vectors, tool }) => {
        try {
          // Filter and validate vectors
          const validVectors: { [vectorType: string]: number[] } = {};
          const validVectorTypes: string[] = [];
          
          vectorTypes.forEach(vectorType => {
            if (vectors[vectorType] && isEnhancedVectorTypeSupported(vectorType)) {
              validVectors[vectorType] = vectors[vectorType];
              validVectorTypes.push(vectorType);
            }
          });
          
          if (Object.keys(validVectors).length === 0) {
            throw new Error(`No valid vectors for tool ${tool.name}`);
          }
          
          // Validate vectors against enhanced schema
          validateEnhancedVectors(validVectors);
          
          // Create enhanced payload
          const payload = this.createEnhancedPayload(tool);
          
          // Upsert to enhanced collection
          await qdrantService.upsertToolEnhanced(toolId, validVectors, payload);
          
          return { toolId, vectorTypes: validVectorTypes };
        } catch (error) {
          console.error(`Error batch upserting tool ${tool.name}:`, error);
          throw error;
        }
      });
      
      const batchResults = await Promise.allSettled(upsertPromises);
      
      batchResults.forEach((result, index) => {
        const { toolId, vectors, tool } = batch[index];
        const allVectorTypes = vectorTypes.filter(vt => vectors[vt]);
        
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          console.error(`Failed to upsert tool ${tool.name}:`, result.reason);
          failed.push({ toolId, vectorTypes: allVectorTypes });
        }
      });
      
      // Small delay between batches to avoid overwhelming the database
      if (i + BATCH_SIZE < toolsData.length) {
        await this.delay(100);
      }
    }
    
    console.log(`✅ Batch upsert complete: ${successful.length} successful, ${failed.length} failed`);
    return { successful, failed };
  }

  /**
   * Process tools in batches using enhanced batch operations for better performance
   */
  private async processBatchMultiVectorEnhanced(
    tools: ToolData[],
    vectorTypes: string[],
    batchIndex: number,
    batchSize: number,
    progress: EnhancedIndexingProgress
  ): Promise<{ successful: number; failed: number; vectorProgress: EnhancedIndexingProgress['vectorProgress'] }> {
    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, tools.length);
    const batch = tools.slice(start, end);
    
    let successful = 0;
    let failed = 0;
    const vectorProgress: EnhancedIndexingProgress['vectorProgress'] = {};

    // Initialize vector progress
    vectorTypes.forEach(type => {
      vectorProgress[type] = { processed: 0, successful: 0, failed: 0 };
    });

    console.log(`🔄 Processing batch ${batchIndex + 1}/${progress.totalBatches} (${batch.length} tools, ${vectorTypes.length} vector types) using enhanced batch operations`);

    try {
      if (shouldUseEnhancedCollection()) {
        // Enhanced approach: generate all vectors first, then batch upsert
        console.log(`🔄 Generating vectors for ${batch.length} tools...`);
        const vectorsData = await this.generateMultipleVectorsBatch(batch);
        
        // Combine vectors with tool data
        const toolsData = vectorsData.map(({ toolId, vectors }, index) => ({
          toolId,
          vectors,
          tool: batch[index]
        }));
        
        console.log(`🔄 Batch upserting ${toolsData.length} tools to enhanced collection...`);
        const batchResult = await this.batchUpsertToolsEnhanced(toolsData, vectorTypes);
        
        // Update progress based on batch results
        batchResult.successful.forEach(({ toolId, vectorTypes: successfulVectorTypes }) => {
          successful++;
          progress.processed++;
          progress.successful++;
          
          // Update vector progress
          successfulVectorTypes.forEach(vectorType => {
            vectorProgress[vectorType].processed++;
            vectorProgress[vectorType].successful++;
          });
        });
        
        batchResult.failed.forEach(({ toolId, vectorTypes: failedVectorTypes }) => {
          failed++;
          progress.processed++;
          progress.failed++;
          
          // Update vector progress
          failedVectorTypes.forEach(vectorType => {
            vectorProgress[vectorType].processed++;
            vectorProgress[vectorType].failed++;
          });
        });
        
        console.log(`✅ Enhanced batch ${batchIndex + 1} completed: ${successful} successful, ${failed} failed`);
      } else {
        // Legacy approach: process tools individually
        for (let i = 0; i < batch.length; i += this.CONCURRENT_LIMIT) {
          if (this.isShuttingDown) {
            console.log('🛑 Shutdown detected, stopping batch processing');
            break;
          }

          const concurrentBatch = batch.slice(i, i + this.CONCURRENT_LIMIT);
          const promises = concurrentBatch.map(async (tool) => {
            const result = await this.processToolMultiVector(tool, vectorTypes);
            
            // Update vector progress
            vectorTypes.forEach(vectorType => {
              vectorProgress[vectorType].processed++;
              if (result.successful.includes(vectorType)) {
                vectorProgress[vectorType].successful++;
              } else if (result.failed.includes(vectorType)) {
                vectorProgress[vectorType].failed++;
              }
            });

            // Update overall progress
            progress.processed++;
            
            if (result.successful.length > 0) {
              successful++;
              console.log(`✅ Successfully indexed: ${tool.name} (${result.successful.length}/${vectorTypes.length} vectors)`);
            } else {
              failed++;
              console.log(`❌ Failed to index: ${tool.name} (0/${vectorTypes.length} vectors)`);
            }

            progress.successful += result.successful.length > 0 ? 1 : 0;
            progress.failed += result.successful.length === 0 ? 1 : 0;
          });

          await Promise.all(promises);
          
          // Force garbage collection periodically to prevent OOM
          if (global.gc && i % 20 === 0) {
            global.gc();
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error in enhanced batch processing ${batchIndex + 1}:`, error);
      throw error;
    }

    return { successful, failed, vectorProgress };
  }

  /**
   * Index all tools with multiple vectors
   */
  async indexAllToolsMultiVector(
    vectorTypes?: string[],
    batchSize: number = this.DEFAULT_BATCH_SIZE
  ): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Cannot start indexing: shutdown in progress');
    }

    const supportedTypes = vectorTypes || this.getSupportedVectorTypes();
    console.log(`🚀 Starting multi-vector indexing process for ${supportedTypes.length} vector types: ${supportedTypes.join(', ')}`);
    
    try {
      // Get all tools from MongoDB
      const tools = await mongoDBService.getAllTools();
      console.log(`📊 Found ${tools.length} tools in MongoDB`);

      if (tools.length === 0) {
        console.log('ℹ️ No tools found in database');
        return;
      }

      // Initialize progress tracking
      const progress: EnhancedIndexingProgress = {
        total: tools.length,
        processed: 0,
        successful: 0,
        failed: 0,
        currentBatch: 0,
        totalBatches: Math.ceil(tools.length / batchSize),
        vectorTypes: supportedTypes,
        vectorProgress: {},
        multiCollectionMode: false
      };

      // Initialize vector progress
      supportedTypes.forEach(type => {
        progress.vectorProgress[type] = { processed: 0, successful: 0, failed: 0 };
      });

      console.log(`📋 Processing in ${progress.totalBatches} batches of ${batchSize} tools each`);

      // Process batches
      for (let batchIndex = 0; batchIndex < progress.totalBatches; batchIndex++) {
        if (this.isShuttingDown) {
          console.log('🛑 Shutdown detected, stopping indexing process');
          break;
        }

        progress.currentBatch = batchIndex + 1;
        progress.currentVectorType = supportedTypes.join(',');
        
        const batchResult = await this.processBatchMultiVectorEnhanced(
          tools,
          supportedTypes,
          batchIndex,
          batchSize,
          progress
        );
        
        // Update vector progress
        supportedTypes.forEach(vectorType => {
          progress.vectorProgress[vectorType] = batchResult.vectorProgress[vectorType];
        });
        
        // Log batch progress
        const progressPercent = Math.round((progress.processed / progress.total) * 100);
        console.log(
          `📈 Batch ${batchIndex + 1}/${progress.totalBatches} completed. ` +
          `Progress: ${progressPercent}% (${progress.processed}/${progress.total}) - ` +
          `✅ ${progress.successful} ❌ ${progress.failed}`
        );

        // Log vector type progress
        console.log('📊 Vector type progress:');
        supportedTypes.forEach(vectorType => {
          const vp = progress.vectorProgress[vectorType];
          const vpPercent = Math.round((vp.successful / vp.processed) * 100);
          console.log(`   ${vectorType}: ${vp.successful}/${vp.processed} (${vpPercent}%)`);
        });
      }

      // Final summary
      console.log(
        `\n🎉 Multi-vector indexing complete!\n` +
        `📊 Total tools: ${progress.total}\n` +
        `✅ Successfully indexed: ${progress.successful}\n` +
        `❌ Failed: ${progress.failed}`
      );

      // Final vector type summary
      console.log('\n📊 Final vector type summary:');
      supportedTypes.forEach(vectorType => {
        const vp = progress.vectorProgress[vectorType];
        const vpPercent = Math.round((vp.successful / vp.processed) * 100);
        console.log(`   ${vectorType}: ${vp.successful}/${vp.processed} (${vpPercent}%)`);
      });

    } catch (error) {
      console.error('💥 Critical error during multi-vector indexing:', error);
      throw error;
    }
  }

  /**
   * Validate multi-vector index integrity
   */
  async validateMultiVectorIndex(vectorTypes?: string[]): Promise<EnhancedHealthReport> {
    console.log('🔍 Starting multi-vector index validation...');

    const supportedTypes = vectorTypes || this.getSupportedVectorTypes();
    const report: EnhancedHealthReport = {
      mongoToolCount: 0,
      qdrantVectorCount: 0,
      missingVectors: 0,
      orphanedVectors: 0,
      sampleValidationPassed: true,
      collectionHealthy: true,
      recommendations: [],
      vectorTypeHealth: {},
      supportedVectorTypes: supportedTypes
    };

    try {
      // Get MongoDB tool count
      const mongoTools = await mongoDBService.getAllTools();
      report.mongoToolCount = mongoTools.length;
      console.log(`📊 MongoDB contains ${report.mongoToolCount} tools`);

      // Initialize vector type health
      supportedTypes.forEach(vectorType => {
        report.vectorTypeHealth[vectorType] = {
          count: 0,
          healthy: true
        };
      });

      // Get collection info for enhanced collection or individual collections
      let totalVectorCount = 0;
      if (shouldUseEnhancedCollection()) {
        try {
          const collectionInfo = await qdrantService.getEnhancedCollectionInfo();
          const count = collectionInfo.points_count || 0;
          
          // For enhanced collection, all vector types share the same count
          supportedTypes.forEach(vectorType => {
            report.vectorTypeHealth[vectorType].count = count;
          });
          
          totalVectorCount = count * supportedTypes.length;
          
          // Check enhanced collection configuration
          const vectorsConfig = collectionInfo.config.params.vectors;
          if (vectorsConfig) {
            supportedTypes.forEach(vectorType => {
              const vectorConfig = vectorsConfig[vectorType];
              if (vectorConfig) {
                const expectedDimensions = 1024; // mxbai-embed-large
                if (vectorConfig.size !== expectedDimensions) {
                  report.vectorTypeHealth[vectorType].healthy = false;
                  report.vectorTypeHealth[vectorType].error =
                    `Vector dimension mismatch for ${vectorType}: expected ${expectedDimensions}, got ${vectorConfig.size}`;
                }
              } else {
                report.vectorTypeHealth[vectorType].healthy = false;
                report.vectorTypeHealth[vectorType].error = `Vector configuration not found for ${vectorType}`;
              }
            });
          } else {
            supportedTypes.forEach(vectorType => {
              report.vectorTypeHealth[vectorType].healthy = false;
              report.vectorTypeHealth[vectorType].error = 'No vector configuration found in enhanced collection';
            });
          }
        } catch (error) {
          console.error('Error getting enhanced collection info:', error);
          supportedTypes.forEach(vectorType => {
            report.vectorTypeHealth[vectorType].healthy = false;
            report.vectorTypeHealth[vectorType].error = error instanceof Error ? error.message : String(error);
          });
        }
      } else {
        // Legacy approach: check individual collections
        for (const vectorType of supportedTypes) {
          try {
            const collectionInfo = await qdrantService.getCollectionInfoForVectorType(vectorType);
            const count = collectionInfo.points_count || 0;
            report.vectorTypeHealth[vectorType].count = count;
            totalVectorCount += count;
            
            // Check collection configuration
            const expectedDimensions = 1024; // mxbai-embed-large
            if (collectionInfo.config.params.vectors.size !== expectedDimensions) {
              report.vectorTypeHealth[vectorType].healthy = false;
              report.vectorTypeHealth[vectorType].error =
                `Vector dimension mismatch: expected ${expectedDimensions}, got ${collectionInfo.config.params.vectors.size}`;
            }
          } catch (error) {
            report.vectorTypeHealth[vectorType].healthy = false;
            report.vectorTypeHealth[vectorType].error = error instanceof Error ? error.message : String(error);
          }
        }
      }

      report.qdrantVectorCount = totalVectorCount;
      console.log(`📊 Qdrant contains ${report.qdrantVectorCount} total vectors across ${shouldUseEnhancedCollection() ? 'enhanced collection with' : supportedTypes.length + ' collections for'} ${supportedTypes.length} vector types`);

      // Check overall collection health
      const unhealthyCollections = supportedTypes.filter(type => !report.vectorTypeHealth[type].healthy);
      if (unhealthyCollections.length > 0) {
        report.collectionHealthy = false;
        report.recommendations.push(`${unhealthyCollections.length} collections have health issues`);
      }

      // Identify missing vectors
      const expectedTotalVectors = report.mongoToolCount * supportedTypes.length;
      report.missingVectors = Math.max(0, expectedTotalVectors - totalVectorCount);
      if (report.missingVectors > 0) {
        report.recommendations.push(`${report.missingVectors} vectors are missing from index - run multi-vector indexing process`);
      }

      // Identify orphaned vectors
      if (totalVectorCount > expectedTotalVectors) {
        report.orphanedVectors = totalVectorCount - expectedTotalVectors;
        report.recommendations.push(`${report.orphanedVectors} orphaned vectors found - consider cleanup`);
      }

      // Validate sample embeddings for consistency
      if (mongoTools.length > 0 && totalVectorCount > 0) {
        console.log('🧪 Validating sample embeddings...');
        const sampleSize = Math.min(3, mongoTools.length);
        const sampleTools = mongoTools.slice(0, sampleSize);
        
        for (const tool of sampleTools) {
          try {
            const toolId = this.deriveToolId(tool);
            
            // Test each vector type
            for (const vectorType of supportedTypes) {
              if (!report.vectorTypeHealth[vectorType].healthy) continue;
              
              try {
                const searchResult = await qdrantService.searchByVectorType(
                  await this.generateVectorForType(tool, vectorType),
                  vectorType,
                  1
                );
                
                if (searchResult.length === 0 || searchResult[0].payload.id !== toolId) {
                  report.sampleValidationPassed = false;
                  report.recommendations.push(`Embedding validation failed for tool: ${tool.name} (${vectorType})`);
                  break;
                }
              } catch (searchError) {
                console.warn(`Search validation failed for ${vectorType}:`, searchError);
                report.sampleValidationPassed = false;
                report.recommendations.push(`Search validation error for tool ${tool.name} (${vectorType}): ${searchError}`);
                break;
              }
            }
            
            if (!report.sampleValidationPassed) break;
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
      console.error('❌ Error during multi-vector index validation:', error);
      report.collectionHealthy = false;
      report.sampleValidationPassed = false;
      report.recommendations.push('Multi-vector index validation failed due to errors');
      return report;
    }
  }

  /**
   * Handle graceful shutdown
   */
  handleShutdown(): void {
    console.log('🛑 Shutdown requested - stopping multi-vector indexing operations');
    this.isShuttingDown = true;
  }

  get isShuttingDownActive(): boolean {
    return this.isShuttingDown;
  }
}

// Export singleton instance
export const enhancedVectorIndexingService = new EnhancedVectorIndexingService();

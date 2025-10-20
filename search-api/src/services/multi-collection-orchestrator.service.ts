import { ToolData } from '../types/tool.types';
import { CollectionConfigService } from './collection-config.service';
import { VectorTypeRegistryService } from './vector-type-registry.service';
import { ContentGeneratorFactory } from './content-generator-factory.service';
import { qdrantService } from './qdrant.service';
import { embeddingService } from './embedding.service';

export interface MultiCollectionRequest {
  query: string;
  collections?: string[];
  filters?: Record<string, any>;
  limit?: number;
  vectorTypes?: string[];
  useAllCollections?: boolean;
}

export interface MultiCollectionResult {
  results: ToolData[];
  collectionStats: Record<string, CollectionStats>;
  totalProcessed: number;
  totalLatency: number;
  queryAnalysis: QueryAnalysis;
  routing: RoutingInfo;
}

export interface CollectionStats {
  count: number;
  latency: number;
  vectorCount: number;
  searchScore: number;
  errors?: string[];
}

export interface QueryAnalysis {
  intent: string;
  keywords: string[];
  entities: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedCollections: string[];
  recommendedVectorTypes: string[];
}

export interface RoutingInfo {
  selectedCollections: string[];
  routingMethod: 'vocabulary' | 'semantic' | 'hybrid' | 'manual';
  routingConfidence: number;
  fallbackUsed: boolean;
}

export interface ProcessingOptions {
  parallel?: boolean;
  maxConcurrency?: number;
  timeout?: number;
  retryAttempts?: number;
  enableCaching?: boolean;
}

export class MultiCollectionOrchestrator {
  constructor(
    private readonly collectionConfig: CollectionConfigService,
    private readonly vectorTypeRegistry: VectorTypeRegistryService,
    private readonly contentFactory: ContentGeneratorFactory
  ) {}

  /**
   * Search across multiple collections with intelligent routing
   */
  async search(request: MultiCollectionRequest, options: ProcessingOptions = {}): Promise<MultiCollectionResult> {
    const startTime = Date.now();

    try {
      // Analyze the query
      const queryAnalysis = this.analyzeQuery(request.query);

      // Determine optimal collections
      const routing = this.routeQuery(request.query, request.collections, queryAnalysis);

      // Validate collections exist
      const validatedCollections = this.validateCollections(routing.selectedCollections);

      // Execute search across selected collections
      const searchResults = await this.executeSearch(
        request.query,
        validatedCollections,
        request.vectorTypes,
        options
      );

      // Merge and rank results
      const mergedResults = this.mergeResults(searchResults);

      const totalLatency = Date.now() - startTime;

      return {
        results: mergedResults,
        collectionStats: this.buildCollectionStats(searchResults),
        totalProcessed: searchResults.reduce((sum, result) => sum + result.results.length, 0),
        totalLatency,
        queryAnalysis,
        routing
      };
    } catch (error) {
      console.error('Error in multi-collection search:', error);
      throw new Error(`Multi-collection search failed: ${error.message}`);
    }
  }

  /**
   * Process a tool for multiple collections (for indexing)
   */
  async processToolForCollections(tool: ToolData, collections: string[]): Promise<boolean> {
    try {
      const embeddings = await this.generateMultipleVectors(tool, collections);
      
      for (const collectionName of collections) {
        if (embeddings[collectionName]) {
          const payload = this.generatePayload(tool, collectionName);
          
          // Use the proper vector type for the collection instead of collection name
          const vectorType = this.collectionConfig.getVectorTypeForCollection(collectionName);
          
          await qdrantService.upsertToolVector(tool.id, embeddings[collectionName], payload, vectorType);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error processing tool ${tool.id} for collections:`, error);
      return false;
    }
  }

  /**
   * Generate multiple embeddings for a tool
   */
  async generateMultipleVectors(tool: ToolData, collections: string[]): Promise<Record<string, number[]>> {
    const embeddings: Record<string, number[]> = {};

    for (const collectionName of collections) {
      try {
        const generator = this.contentFactory.createGenerator(collectionName);
        const content = generator.generate(tool);

        if (content.trim()) {
          embeddings[collectionName] = await embeddingService.generateEmbedding(content);
        }
      } catch (error) {
        console.error(`Error generating vector for collection ${collectionName}:`, error);
      }
    }

    return embeddings;
  }

  /**
   * Update tool in specific collections based on changed fields
   */
  async updateToolInCollections(tool: ToolData, changedFields: string[]): Promise<void> {
    const affectedCollections = this.determineAffectedCollections(changedFields);

    if (affectedCollections.length > 0) {
      await this.processToolForCollections(tool, affectedCollections);
    }
  }

  /**
   * Validate collection consistency across all collections
   */
  async validateCollectionConsistency(): Promise<boolean> {
    try {
      const allCollections = this.collectionConfig.getEnabledCollectionNames();
      const validationResults = await Promise.all(
        allCollections.map(collection => this.validateSingleCollection(collection))
      );

      return validationResults.every(result => result);
    } catch (error) {
      console.error('Error validating collection consistency:', error);
      return false;
    }
  }

  /**
   * Get collection health status
   */
  async getCollectionHealth(): Promise<Record<string, any>> {
    const allCollections = this.collectionConfig.getEnabledCollectionNames();
    const healthStatus: Record<string, any> = {};

    for (const collectionName of allCollections) {
      try {
        // Try a simple search to validate collection exists
        // Use a 1024-dimensional dummy vector to match collection configuration
        const dummyEmbedding = new Array(1024).fill(0.1);
        const vectorType = this.collectionConfig.getVectorTypeForCollection(collectionName);
        await qdrantService.searchByEmbedding(dummyEmbedding, 1, undefined, vectorType);
        const collectionConfig = this.collectionConfig.getCollectionByName(collectionName);

        healthStatus[collectionName] = {
          exists: true,
          vectorCount: 0, // Would need to implement count method
          config: collectionConfig,
          healthy: true,
          lastChecked: new Date()
        };
      } catch (error) {
        healthStatus[collectionName] = {
          exists: false,
          error: error.message,
          healthy: false,
          lastChecked: new Date()
        };
      }
    }

    return healthStatus;
  }

  /**
   * Analyze query for intent and keywords
   */
  private analyzeQuery(query: string): QueryAnalysis {
    const queryLower = query.toLowerCase();

    // Extract keywords (simple implementation)
    const keywords = queryLower.split(/\s+/).filter(word => word.length > 2);

    // Extract entities (basic implementation)
    const entities = this.extractEntities(query);

    // Determine intent based on keywords and vocabulary matching
    const intent = this.determineIntent(queryLower);

    // Estimate complexity
    const complexity = this.estimateComplexity(query);

    // Get recommended vector types
    const recommendedVectorTypes = this.vectorTypeRegistry.getRecommendedVectorTypes(query);

    return {
      intent,
      keywords,
      entities,
      complexity,
      estimatedCollections: this.estimateCollections(intent, keywords),
      recommendedVectorTypes
    };
  }

  /**
   * Route query to optimal collections
   */
  private routeQuery(query: string, explicitCollections?: string[], analysis?: QueryAnalysis): RoutingInfo {
    if (explicitCollections && explicitCollections.length > 0) {
      // Manual routing - use explicitly specified collections
      const validatedCollections = this.validateCollections(explicitCollections);
      return {
        selectedCollections: validatedCollections,
        routingMethod: 'manual',
        routingConfidence: 1.0,
        fallbackUsed: false
      };
    }

    const queryLower = query.toLowerCase();
    const selectedCollections: string[] = [];
    let routingMethod: 'vocabulary' | 'semantic' | 'hybrid' = 'semantic';
    let routingConfidence = 0.5;

    // Vocabulary-based routing using controlled vocabularies
    const vocabularyRouting = this.routeByVocabulary(queryLower);
    if (vocabularyRouting.collections.length > 0) {
      selectedCollections.push(...vocabularyRouting.collections);
      routingMethod = 'vocabulary';
      routingConfidence = vocabularyRouting.confidence;
    }

    // Fallback to semantic routing
    if (selectedCollections.length === 0) {
      const semanticRouting = this.routeBySemantic(queryLower);
      selectedCollections.push(...semanticRouting.collections);
      routingMethod = 'semantic';
      routingConfidence = semanticRouting.confidence;
    }

    // Always include tools for identity matching
    if (!selectedCollections.includes('tools')) {
      selectedCollections.unshift('tools');
    }

    // Remove duplicates
    const uniqueCollections = [...new Set(selectedCollections)];

    return {
      selectedCollections: uniqueCollections,
      routingMethod,
      routingConfidence,
      fallbackUsed: selectedCollections.length === 0
    };
  }

  /**
   * Route query by vocabulary matching
   */
  private routeByVocabulary(query: string): { collections: string[]; confidence: number } {
    const collections: string[] = [];
    let confidence = 0;

    // Check for industry keywords (route to usecases)
    const industryKeywords = ['healthcare', 'finance', 'education', 'technology', 'retail', 'manufacturing'];
    if (industryKeywords.some(keyword => query.includes(keyword))) {
      collections.push('usecases');
      confidence += 0.8;
    }

    // Check for user type keywords (route to usecases)
    const userTypeKeywords = ['developer', 'designer', 'business', 'student', 'teacher', 'manager'];
    if (userTypeKeywords.some(keyword => query.includes(keyword))) {
      if (!collections.includes('usecases')) {
        collections.push('usecases');
      }
      confidence += 0.8;
    }

    // Check for technical interface keywords (route to interface)
    const interfaceKeywords = ['api', 'sdk', 'library', 'framework', 'cli', 'web', 'mobile'];
    if (interfaceKeywords.some(keyword => query.includes(keyword))) {
      collections.push('interface');
      confidence += 0.9;
    }

    // Check for functionality keywords (route to functionality)
    const functionalityKeywords = ['feature', 'capability', 'function', 'generate', 'analyze', 'process'];
    if (functionalityKeywords.some(keyword => query.includes(keyword))) {
      collections.push('functionality');
      confidence += 0.7;
    }

    return {
      collections,
      confidence: collections.length > 0 ? confidence / collections.length : 0
    };
  }

  /**
   * Route query by semantic analysis
   */
  private routeBySemantic(query: string): { collections: string[]; confidence: number } {
    // Default semantic routing - include tools + functionality for general queries
    return {
      collections: ['tools', 'functionality'],
      confidence: 0.5
    };
  }

  /**
   * Execute search across multiple collections
   */
  private async executeSearch(
    query: string,
    collections: string[],
    vectorTypes?: string[],
    options: ProcessingOptions = {}
  ): Promise<Array<{ collection: string; results: ToolData[]; latency: number }>> {
    const { parallel = true, maxConcurrency = 4 } = options;

    if (parallel) {
      // Execute searches in parallel
      const searchPromises = collections.map(collection =>
        this.searchSingleCollection(query, collection, vectorTypes)
      );

      return Promise.all(searchPromises);
    } else {
      // Execute searches sequentially
      const results = [];
      for (const collection of collections) {
        const result = await this.searchSingleCollection(query, collection, vectorTypes);
        results.push(result);
      }
      return results;
    }
  }

  /**
   * Search a single collection
   */
  private async searchSingleCollection(
    query: string,
    collection: string,
    vectorTypes?: string[]
  ): Promise<{ collection: string; results: ToolData[]; latency: number }> {
    const startTime = Date.now();

    try {
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Search Qdrant - use searchByEmbedding method without passing collection as vectorType
      const searchResults = await qdrantService.searchByEmbedding(queryEmbedding, 10, undefined);

      // Convert results to ToolData format
      const results = searchResults.map(result => this.qdrantResultToToolData(result));

      const latency = Date.now() - startTime;

      return {
        collection,
        results,
        latency
      };
    } catch (error) {
      console.error(`Error searching collection ${collection}:`, error);
      return {
        collection,
        results: [],
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Merge results from multiple collections
   */
  private mergeResults(searchResults: Array<{ collection: string; results: ToolData[]; latency: number }>): ToolData[] {
    const allResults: ToolData[] = [];
    const seenIds = new Set<string>();

    // Add results with deduplication and scoring
    for (const { collection, results } of searchResults) {
      for (const result of results) {
        if (!seenIds.has(result.id)) {
          seenIds.add(result.id);
          allResults.push(result);
        }
      }
    }

    // Sort by relevance (simple implementation - could be enhanced with RRF)
    return allResults.slice(0, 20); // Limit to top 20 results
  }

  /**
   * Build collection statistics
   */
  private buildCollectionStats(searchResults: Array<{ collection: string; results: ToolData[]; latency: number }>): Record<string, CollectionStats> {
    const stats: Record<string, CollectionStats> = {};

    for (const { collection, results, latency } of searchResults) {
      stats[collection] = {
        count: results.length,
        latency,
        vectorCount: results.length, // Simplified - could get actual vector count
        searchScore: results.length > 0 ? 1.0 : 0.0 // Simplified scoring
      };
    }

    return stats;
  }

  /**
   * Generate collection-specific payload
   */
  private generatePayload(tool: ToolData, collectionName: string): Record<string, any> {
    const collectionConfig = this.collectionConfig.getCollectionByName(collectionName);
    const fields = this.contentFactory.createGenerator(collectionName).getFields();

    const payload: Record<string, any> = {
      toolId: tool.id,
      name: tool.name,
      collectionType: collectionName,
      timestamp: new Date().toISOString()
    };

    // Add collection-specific fields
    for (const field of fields) {
      if (tool[field as keyof ToolData] !== undefined) {
        payload[field] = tool[field as keyof ToolData];
      }
    }

    // Add collection configuration metadata
    if (collectionConfig) {
      payload.purpose = collectionConfig.purpose;
      payload.weightings = collectionConfig.weightings;
    }

    return payload;
  }

  /**
   * Validate collections exist
   */
  private validateCollections(collections: string[]): string[] {
    const validation = this.collectionConfig.validateCollectionNames(collections);

    if (validation.invalid.length > 0) {
      console.warn('Invalid collections requested:', validation.invalid);
    }

    return validation.valid;
  }

  /**
   * Determine which collections are affected by field changes
   */
  private determineAffectedCollections(changedFields: string[]): string[] {
    const affectedCollections = new Set<string>();

    for (const field of changedFields) {
      const collections = this.collectionConfig.getCollectionsForVectorTypes(['semantic']);
      for (const collection of collections) {
        const generator = this.contentFactory.createGenerator(collection.name);
        if (generator.getFields().includes(field)) {
          affectedCollections.add(collection.name);
        }
      }
    }

    return Array.from(affectedCollections);
  }

  /**
   * Validate a single collection
   */
  private async validateSingleCollection(collectionName: string): Promise<boolean> {
    try {
      // Use the new searchDirectOnCollection method to avoid vector type validation
      await qdrantService.searchDirectOnCollection(
        new Array(1024).fill(0.1),
        collectionName,
        1
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract entities from query (basic implementation)
   */
  private extractEntities(query: string): string[] {
    // This is a simplified implementation
    // In a real system, you might use NLP services for entity extraction
    const entities: string[] = [];

    // Extract quoted phrases
    const quotedPhrases = query.match(/"([^"]+)"/g);
    if (quotedPhrases) {
      entities.push(...quotedPhrases.map(phrase => phrase.replace(/"/g, '')));
    }

    return entities;
  }

  /**
   * Determine query intent
   */
  private determineIntent(query: string): string {
    if (query.includes('how to') || query.includes('tutorial')) {
      return 'learning';
    }
    if (query.includes('best') || query.includes('top')) {
      return 'recommendation';
    }
    if (query.includes('free') || query.includes('cost')) {
      return 'pricing';
    }
    if (query.includes('api') || query.includes('sdk')) {
      return 'technical';
    }
    return 'general';
  }

  /**
   * Estimate query complexity
   */
  private estimateComplexity(query: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = query.split(/\s+/).length;
    const hasQuotes = query.includes('"');
    const hasOperators = /\b(and|or|not)\b/i.test(query);

    if (wordCount <= 3 && !hasQuotes && !hasOperators) {
      return 'simple';
    }
    if (wordCount <= 8 || hasQuotes || hasOperators) {
      return 'moderate';
    }
    return 'complex';
  }

  /**
   * Estimate likely collections based on intent
   */
  private estimateCollections(intent: string, keywords: string[]): string[] {
    const intentCollections: Record<string, string[]> = {
      'learning': ['tools', 'functionality'],
      'recommendation': ['tools', 'functionality', 'usecases'],
      'pricing': ['interface', 'usecases'],
      'technical': ['interface', 'functionality'],
      'general': ['tools', 'functionality']
    };

    return intentCollections[intent] || ['tools', 'functionality'];
  }

  /**
   * Convert Qdrant result to ToolData
   */
  private qdrantResultToToolData(result: any): ToolData {
    // This is a simplified conversion
    // In a real implementation, you'd map from Qdrant payload to ToolData
    return result.payload as ToolData;
  }
}
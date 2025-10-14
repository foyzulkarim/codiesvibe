import { embeddingService } from './embedding.service';
import { qdrantService } from './qdrant.service';
import { multiVectorSearchService } from './multi-vector-search.service';
import {
  ContextEnrichmentConfig,
  defaultEnhancedSearchConfig
} from '@/config/enhanced-search-config';
import {
  EntityStatisticsSchema,
  MetadataContextSchema,
  EnhancedState
} from '@/types/enhanced-state';
import { z } from 'zod';

// Cache for context enrichment results
interface ContextCache {
  data: any;
  timestamp: number;
  ttl: number;
}

// Semantic context generation types
interface SemanticContext {
  entityName: string;
  entityType: string;
  naturalLanguageDescription: string;
  assumptions: Array<{
    assumption: string;
    confidence: number;
    rationale: string;
  }>;
  sampleTools: Array<{
    name: string;
    relevance: number;
    description?: string;
  }>;
  confidence: {
    overall: number;
    dataQuality: number;
    sampleSize: number;
    factors?: Array<{
      name: string;
      value: number;
      weight: number;
      description: string;
    }>;
  };
  lowConfidenceWarning?: string;
}

interface SemanticContextGenerationOptions {
  includeAssumptions: boolean;
  includeSampleTools: boolean;
  includeConfidenceIndicators: boolean;
  maxSampleTools: number;
  minConfidenceThreshold: number;
  verboseMode: boolean;
}

// Enhanced cache for entity statistics
interface EntityStatisticsCache {
  statistics: z.infer<typeof EntityStatisticsSchema>;
  timestamp: number;
  ttl: number;
  entityName: string;
  sampleSize: number;
}

// Enhanced source attribution for entity statistics
interface EntitySourceAttribution {
  toolId: string;
  toolName: string;
  sources: {
    vectorType: string;
    score: number;
    rank: number;
    weight?: number;
    reliability?: number;
  }[];
  combinedScore: number;
  confidenceFactors?: {
    vectorReliability: number;
    crossValidation: number;
    consistency: number;
  };
}

// Vector type reliability metrics
interface VectorTypeReliability {
  vectorType: string;
  reliability: number; // 0-1 score based on historical performance
  sampleSize: number;
  avgSimilarity: number;
  consistency: number;
  lastUpdated: Date;
}

// Enhanced confidence breakdown
interface ConfidenceBreakdown {
  overall: number;
  sampleSize: number;
  avgSimilarity: number;
  vectorTypeReliability: number;
  crossValidation: number;
  consistency: number;
  dataQuality: number;
  sourceDiversity: number;
  factors: Array<{
    name: string;
    value: number;
    weight: number;
    description: string;
  }>;
}

// Data conflict detection and resolution
interface DataConflict {
  type: 'category' | 'interface' | 'pricing' | 'attribute';
  conflictingValues: Array<{
    value: string;
    sources: string[];
    confidence: number;
    percentage: number;
  }>;
  resolution?: 'high_confidence' | 'weighted_average' | 'merge_all' | 'flag_for_review';
  resolvedValue?: string;
  confidenceInResolution?: number;
}

// Quality indicators for entity statistics
interface QualityIndicators {
  dataFreshness: number;
  sourceDiversity: number;
  crossValidationScore: number;
  consistencyScore: number;
}

// Transparency information for LLM consumption
interface TransparencyInfo {
  dataSources: string[];
  methodology: string;
  limitations: string[];
  confidenceLevel: string;
}

// Entity statistics generation options
interface EntityStatisticsOptions {
  entityName: string;
  entityType?: string;
  minSampleSize?: number;
  maxSampleSize?: number;
  includeSourceAttribution?: boolean;
  cacheEnabled?: boolean;
}

class ContextEnrichmentService {
  private config: ContextEnrichmentConfig;
  private cache: Map<string, ContextCache> = new Map();
  private entityCache: Map<string, EntityStatisticsCache> = new Map();
  private qdrantClient: any = null;
  private vectorTypeReliability: Map<string, VectorTypeReliability> = new Map();
  private confidenceMetrics: Map<string, any> = new Map();

  constructor(config?: Partial<ContextEnrichmentConfig>) {
    this.config = {
      ...defaultEnhancedSearchConfig.contextEnrichment,
      ...config
    };
  }

  /**
   * Initialize the context enrichment service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize Qdrant client for qdrant_multi_vector strategy
      if (this.config.enrichmentStrategy === 'qdrant_multi_vector') {
        // Get Qdrant client from qdrantService
        this.qdrantClient = await import('@/config/database').then(db =>
          db.connectToQdrant()
        );
      }
      
      console.log('Context enrichment service initialized');
    } catch (error) {
      console.error('Failed to initialize context enrichment service:', error);
      throw error;
    }
  }

  /**
   * Enrich search context with entity statistics and metadata
   */
  async enrichContext(query: string, state?: Partial<EnhancedState>): Promise<{
    entityStatistics: Record<string, z.infer<typeof EntityStatisticsSchema>>;
    metadataContext: z.infer<typeof MetadataContextSchema>;
    semanticContexts?: Record<string, any>;
  }> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      if (this.config.cacheEnabled) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Determine enrichment strategy
      const strategy = this.config.enrichmentStrategy;
      let result;

      // Only qdrant_multi_vector strategy is supported
      if (strategy !== 'qdrant_multi_vector') {
        throw new Error(`Unsupported enrichment strategy: ${strategy}`);
      }
      
      result = await this.enrichWithQdrantMultiVector(query);

      // Generate semantic contexts for each entity
      const semanticContexts: Record<string, any> = {};
      for (const [entityName, entityStats] of Object.entries(result.entityStatistics)) {
        try {
          const semanticContext = await this.generateSemanticContext(entityName, entityStats, {
            includeAssumptions: true,
            includeSampleTools: true,
            includeConfidenceIndicators: true,
            maxSampleTools: 5,
            minConfidenceThreshold: 0.3,
            verboseMode: false
          });
          
          // Format for LLM consumption
          semanticContexts[entityName] = this.formatSemanticContextForLLM(semanticContext);
        } catch (error) {
          console.warn(`Error generating semantic context for ${entityName}:`, error);
          // Continue with other entities even if one fails
        }
      }

      // Add semantic contexts to result
      result.semanticContexts = semanticContexts;

      // Add processing time to metadata
      result.metadataContext.processingTime = Date.now() - startTime;

      // Cache the result
      if (this.config.cacheEnabled) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Error enriching context:', error);
      
      // Return fallback result if enabled
      if (this.config.fallbackEnabled) {
        return this.getFallbackResult(query, Date.now() - startTime);
      }
      
      throw error;
    }
  }

  /**
   * Enrich context using Qdrant multi-vector search
   */
  private async enrichWithQdrantMultiVector(query: string): Promise<{
    entityStatistics: Record<string, z.infer<typeof EntityStatisticsSchema>>;
    metadataContext: z.infer<typeof MetadataContextSchema>;
  }> {
    try {
      // Extract entities from query and generate statistics for each
      const entities = this.extractEntitiesFromQuery(query);
      const entityStatistics: Record<string, z.infer<typeof EntityStatisticsSchema>> = {};

      // Generate statistics for each entity
      for (const entity of entities) {
        try {
          const stats = await this.generateEntityStatistics({
            entityName: entity.name,
            entityType: entity.type,
            minSampleSize: this.config.minSampleSize,
            maxSampleSize: 50,
            includeSourceAttribution: true,
            cacheEnabled: this.config.cacheEnabled
          });
          
          if (stats) {
            entityStatistics[entity.name] = stats;
          }
        } catch (error) {
          console.warn(`Error generating statistics for entity ${entity.name}:`, error);
        }
      }

      // Create metadata context
      const metadataContext: z.infer<typeof MetadataContextSchema> = {
        searchSpaceSize: await this.getSearchSpaceSize(),
        metadataConfidence: this.calculateOverallConfidence(entityStatistics),
        assumptions: this.generateAssumptions(query, entityStatistics),
        lastUpdated: new Date(),
        enrichmentStrategy: 'qdrant_multi_vector',
        processingTime: 0 // Will be set by caller
      };

      return { entityStatistics, metadataContext };
    } catch (error) {
      console.error('Error in Qdrant multi-vector enrichment:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive entity statistics using multi-vector search
   */
  async generateEntityStatistics(options: EntityStatisticsOptions): Promise<z.infer<typeof EntityStatisticsSchema> | null> {
    const {
      entityName,
      entityType = 'unknown',
      minSampleSize = this.config.minSampleSize,
      maxSampleSize = 50,
      includeSourceAttribution = true,
      cacheEnabled = this.config.cacheEnabled
    } = options;

    const startTime = Date.now();

    try {
      // Check cache first (fastest path)
      if (cacheEnabled) {
        const cached = this.getEntityFromCache(entityName);
        if (cached && cached.sampleSize >= minSampleSize) {
          const cacheTime = Date.now() - startTime;
          console.log(`📊 Cache hit for entity: ${entityName} in ${cacheTime}ms`);
          return cached.statistics;
        }
      }

      // Performance optimization: Early timeout check
      const maxProcessingTime = this.config.maxProcessingTime || 200;
      const remainingTime = maxProcessingTime - (Date.now() - startTime);
      
      if (remainingTime <= 0) {
        console.warn(`⚠️ Timeout before processing for entity ${entityName}`);
        return null;
      }

      // Adaptive sample size based on time constraints
      const adaptiveMaxSample = Math.min(maxSampleSize, Math.max(25, Math.floor(remainingTime / 4)));

      // Use multi-vector search to find similar tools with performance constraints
      const searchResults = await this.performTimedMultiVectorSearch(entityName, adaptiveMaxSample, includeSourceAttribution, remainingTime * 0.6);

      if (!searchResults) {
        console.warn(`⚠️ Search timeout for entity ${entityName}`);
        return null;
      }

      // Process and merge results from all vector types
      const allResults = this.mergeVectorTypeResults(searchResults.vectorSearchResults);
      
      if (allResults.length < minSampleSize) {
        console.warn(`⚠️ Insufficient results for entity ${entityName}: ${allResults.length} < ${minSampleSize}`);
        return this.handleLowSampleScenario(allResults, entityName, entityType);
      }

      // Generate comprehensive statistics with performance monitoring
      const statistics = this.processEntityResultsWithTiming(allResults, entityName, entityType, includeSourceAttribution, startTime);

      // Cache the results
      if (cacheEnabled && statistics) {
        this.setEntityInCache(entityName, statistics, allResults.length);
      }

      const processingTime = Date.now() - startTime;
      console.log(`📊 Generated statistics for ${entityName} in ${processingTime}ms (${allResults.length} samples)`);

      // Performance warning if exceeding threshold
      if (processingTime > maxProcessingTime) {
        console.warn(`⚠️ Performance warning: Entity statistics generation took ${processingTime}ms > ${maxProcessingTime}ms`);
      }

      return statistics;
    } catch (error) {
      console.error(`Error generating entity statistics for ${entityName}:`, error);
      return null;
    }
  }

  /**
   * Perform timed multi-vector search with timeout handling
   */
  private async performTimedMultiVectorSearch(
    entityName: string,
    limit: number,
    includeSourceAttribution: boolean,
    timeoutMs: number
  ): Promise<any | null> {
    try {
      // Create a timeout promise
      const searchPromise = multiVectorSearchService.searchMultiVector(entityName, {
        limit,
        vectorTypes: ['semantic', 'categories', 'functionality', 'interfaces', 'pricing'],
        enableSourceAttribution: includeSourceAttribution
      });

      // Apply timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Search timeout after ${timeoutMs}ms`)), timeoutMs);
      });

      return await Promise.race([searchPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn(`⚠️ Multi-vector search timeout for entity: ${entityName}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Process entity results with timing and performance optimization
   */
  private processEntityResultsWithTiming(
    results: any[],
    entityName: string,
    entityType: string,
    includeSourceAttribution: boolean,
    startTime: number
  ): z.infer<typeof EntityStatisticsSchema> | null {
    const processStartTime = Date.now();
    const maxProcessingTime = this.config.maxProcessingTime || 200;
    const remainingTime = maxProcessingTime - (processStartTime - startTime);

    // Check if we have enough time for full processing
    if (remainingTime <= 50) {
      console.warn(`⚠️ Limited time for processing ${entityName}, using fast path`);
      return this.fastPathStatistics(results, entityName, entityType);
    }

    try {
      // Use enhanced confidence scoring if we have enough time
      const processingTime = Date.now() - processStartTime;
      if (processingTime < remainingTime - 30) {
        return this.processEntityResultsWithEnhancedConfidenceAndLogging(
          results, entityName, entityType, includeSourceAttribution, startTime
        );
      }
      
      // Fall back to basic processing
      const categories = this.extractCategories(results);
      const interfaces = this.extractInterfaces(results);
      const pricing = this.extractPricing(results);

      // Calculate confidence based on sample size and similarity scores
      const avgSimilarity = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
      const sampleSizeFactor = Math.min(results.length / 30, 1.0); // n ≥ 30 for statistical significance
      const confidence = Math.min(avgSimilarity * sampleSizeFactor * 1.2, 1.0);

      // Get sample tools for attribution
      const sampleTools = results.slice(0, 5).map(r => r.payload?.name || 'unknown');

      // Create source attribution if enabled (skip if time is running out)
      const sourceAttribution = includeSourceAttribution && processingTime < remainingTime - 20
        ? this.createSourceAttribution(results.slice(0, 10))
        : undefined;

      return {
        commonCategories: categories,
        commonInterfaces: interfaces,
        commonPricing: pricing,
        totalCount: results.length,
        confidence,
        semanticMatches: results.filter(r => (r.score || 0) > this.config.confidenceThreshold).length,
        avgSimilarityScore: avgSimilarity,
        source: 'semantic_search' as const,
        sampleTools,
        sourceAttribution
      } as z.infer<typeof EntityStatisticsSchema>;
    } catch (error) {
      console.error(`Error processing entity results for ${entityName}:`, error);
      return null;
    }
  }

  /**
   * Fast path statistics generation for time-constrained scenarios
   */
  private fastPathStatistics(
    results: any[],
    entityName: string,
    entityType: string
  ): z.infer<typeof EntityStatisticsSchema> | null {
    if (results.length === 0) return null;

    try {
      // Simplified processing for speed
      const sampleSize = results.length;
      const avgSimilarity = results.reduce((sum, r) => sum + (r.score || 0), 0) / sampleSize;
      const confidence = Math.min(avgSimilarity * 0.7, 0.8); // Conservative confidence

      // Only extract top 3 items for each category
      const topResults = results.slice(0, Math.min(10, sampleSize));
      
      return {
        commonCategories: this.extractCategories(topResults).slice(0, 3),
        commonInterfaces: this.extractInterfaces(topResults).slice(0, 3),
        commonPricing: this.extractPricing(topResults).slice(0, 3),
        totalCount: sampleSize,
        confidence,
        semanticMatches: topResults.filter(r => (r.score || 0) > this.config.confidenceThreshold).length,
        avgSimilarityScore: avgSimilarity,
        source: 'semantic_search' as const,
        sampleTools: topResults.slice(0, 3).map(r => r.payload?.name || 'unknown'),
        processingOptimization: 'fast_path'
      } as z.infer<typeof EntityStatisticsSchema>;
    } catch (error) {
      console.error(`Error in fast path statistics for ${entityName}:`, error);
      return null;
    }
  }

  /**
   * Extract potential entities from query text
   */
  private extractEntitiesFromQuery(query: string): Array<{ name: string; type: string }> {
    const entities: Array<{ name: string; type: string }> = [];
    
    // Simple entity extraction - can be enhanced with NLP
    const words = query.toLowerCase().split(/\s+/);
    
    // Look for common tool categories, technologies, etc.
    const categoryKeywords = ['api', 'database', 'frontend', 'backend', 'ai', 'ml', 'analytics', 'payment'];
    const techKeywords = ['react', 'vue', 'angular', 'node', 'python', 'javascript', 'typescript'];
    const interfaceKeywords = ['rest', 'graphql', 'websocket', 'sdk'];
    const pricingKeywords = ['free', 'paid', 'subscription', 'open-source'];
    
    words.forEach(word => {
      if (categoryKeywords.includes(word)) {
        entities.push({ name: word, type: 'category' });
      } else if (techKeywords.includes(word)) {
        entities.push({ name: word, type: 'technology' });
      } else if (interfaceKeywords.includes(word)) {
        entities.push({ name: word, type: 'interface' });
      } else if (pricingKeywords.includes(word)) {
        entities.push({ name: word, type: 'pricing' });
      } else if (word.length > 3) {
        // Potential unknown entity
        entities.push({ name: word, type: 'unknown' });
      }
    });

    // Remove duplicates and limit to reasonable number
    const uniqueEntities = entities.filter((entity, index, self) =>
      index === self.findIndex(e => e.name === entity.name)
    ).slice(0, 5);

    return uniqueEntities;
  }

  /**
   * Merge results from different vector types
   */
  private mergeVectorTypeResults(vectorSearchResults: any): any[] {
    const mergedResults: any[] = [];
    const seenToolIds = new Set<string>();

    // Process each vector type's results
    Object.entries(vectorSearchResults).forEach(([vectorType, results]) => {
      if (!Array.isArray(results)) return;

      results.forEach((result, index) => {
        const toolId = result.id || result.payload?.id;
        
        if (!toolId || seenToolIds.has(toolId)) return;
        
        seenToolIds.add(toolId);
        
        // Add vector type information to the result
        mergedResults.push({
          ...result,
          sourceVectorType: vectorType,
          rank: index + 1,
          combinedScore: result.score || 0
        });
      });
    });

    // Sort by combined score
    return mergedResults.sort((a, b) => b.combinedScore - a.combinedScore);
  }

  /**
   * Process entity results to generate comprehensive statistics
   */
  private processEntityResults(
    results: any[],
    entityName: string,
    entityType: string,
    includeSourceAttribution: boolean
  ): z.infer<typeof EntityStatisticsSchema> | null {
    if (results.length === 0) return null;

    try {
      // Extract categories, interfaces, and pricing information
      const categories = this.extractCategories(results);
      const interfaces = this.extractInterfaces(results);
      const pricing = this.extractPricing(results);

      // Calculate confidence based on sample size and similarity scores
      const avgSimilarity = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
      const sampleSizeFactor = Math.min(results.length / 30, 1.0); // n ≥ 30 for statistical significance
      const confidence = Math.min(avgSimilarity * sampleSizeFactor * 1.2, 1.0);

      // Get sample tools for attribution
      const sampleTools = results.slice(0, 5).map(r => r.payload?.name || 'unknown');

      // Create source attribution if enabled
      const sourceAttribution = includeSourceAttribution
        ? this.createSourceAttribution(results.slice(0, 10))
        : undefined;

      return {
        commonCategories: categories,
        commonInterfaces: interfaces,
        commonPricing: pricing,
        totalCount: results.length,
        confidence,
        semanticMatches: results.filter(r => (r.score || 0) > this.config.confidenceThreshold).length,
        avgSimilarityScore: avgSimilarity,
        source: 'semantic_search' as const,
        sampleTools,
        sourceAttribution
      } as z.infer<typeof EntityStatisticsSchema>;
    } catch (error) {
      console.error(`Error processing entity results for ${entityName}:`, error);
      return null;
    }
  }

  /**
   * Extract common categories from results
   */
  private extractCategories(results: any[]): Array<{ category: string; percentage: number }> {
    const categoryCount: Record<string, number> = {};
    
    results.forEach(result => {
      const categories = result.payload?.categories || [];
      if (Array.isArray(categories)) {
        categories.forEach((cat: string) => {
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
      } else if (categories) {
        // Single category
        categoryCount[categories] = (categoryCount[categories] || 0) + 1;
      }
    });

    const total = results.length;
    return Object.entries(categoryCount)
      .map(([category, count]) => ({
        category,
        percentage: (count / total) * 100
      }))
      .filter(item => item.percentage >= 5) // Only include categories with ≥ 5% occurrence
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }

  /**
   * Extract common interfaces from results
   */
  private extractInterfaces(results: any[]): Array<{ interface: string; percentage: number }> {
    const interfaceCount: Record<string, number> = {};
    
    results.forEach(result => {
      const interfaces = result.payload?.interfaces || [];
      if (Array.isArray(interfaces)) {
        interfaces.forEach((iface: string) => {
          interfaceCount[iface] = (interfaceCount[iface] || 0) + 1;
        });
      } else if (interfaces) {
        // Single interface
        interfaceCount[interfaces] = (interfaceCount[interfaces] || 0) + 1;
      }
    });

    const total = results.length;
    return Object.entries(interfaceCount)
      .map(([iface, count]) => ({
        interface: iface,
        percentage: (count / total) * 100
      }))
      .filter(item => item.percentage >= 5) // Only include interfaces with ≥ 5% occurrence
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }

  /**
   * Extract common pricing models from results
   */
  private extractPricing(results: any[]): Array<{ pricing: string; percentage: number }> {
    const pricingCount: Record<string, number> = {};
    
    results.forEach(result => {
      const pricing = result.payload?.pricing || 'unknown';
      pricingCount[pricing] = (pricingCount[pricing] || 0) + 1;
    });

    const total = results.length;
    return Object.entries(pricingCount)
      .map(([pricing, count]) => ({
        pricing,
        percentage: (count / total) * 100
      }))
      .filter(item => item.percentage >= 5) // Only include pricing models with ≥ 5% occurrence
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }

  /**
   * Create source attribution for results
   */
  private createSourceAttribution(results: any[]): EntitySourceAttribution[] {
    return results.map(result => ({
      toolId: result.id || result.payload?.id || 'unknown',
      toolName: result.payload?.name || 'unknown',
      sources: [{
        vectorType: result.sourceVectorType || 'unknown',
        score: result.score || 0,
        rank: result.rank || 0
      }],
      combinedScore: result.combinedScore || 0
    }));
  }

  /**
   * Handle low sample scenarios gracefully
   */
  private handleLowSampleScenario(
    results: any[],
    entityName: string,
    entityType: string
  ): z.infer<typeof EntityStatisticsSchema> | null {
    if (results.length === 0) return null;

    try {
      // For low sample sizes, generate basic statistics with reduced confidence
      const sampleSize = results.length;
      const avgSimilarity = results.reduce((sum, r) => sum + (r.score || 0), 0) / sampleSize;
      
      // Apply heavier penalty for low sample sizes
      const confidence = Math.min(avgSimilarity * 0.5 * (sampleSize / 10), 0.5);

      return {
        commonCategories: this.extractCategories(results),
        commonInterfaces: this.extractInterfaces(results),
        commonPricing: this.extractPricing(results),
        totalCount: sampleSize,
        confidence,
        semanticMatches: results.filter(r => (r.score || 0) > this.config.confidenceThreshold).length,
        avgSimilarityScore: avgSimilarity,
        source: 'semantic_search' as const,
        sampleTools: results.slice(0, 3).map(r => r.payload?.name || 'unknown'),
        lowSampleWarning: `Low sample size (${sampleSize}) - statistics may not be reliable`
      } as z.infer<typeof EntityStatisticsSchema>;
    } catch (error) {
      console.error(`Error handling low sample scenario for ${entityName}:`, error);
      return null;
    }
  }


  /**
   * Process search results into entity statistics
   */
  private processSearchResults(
    results: any[], 
    entityType: string
  ): z.infer<typeof EntityStatisticsSchema> | null {
    if (results.length < this.config.minSampleSize) {
      return null;
    }

    try {
      // Group by common values
      const valueGroups: Record<string, any[]> = {};
      
      results.forEach(result => {
        const payload = result.payload || {};
        const value = payload[entityType] || payload.value || 'unknown';
        
        if (!valueGroups[value]) {
          valueGroups[value] = [];
        }
        valueGroups[value].push(result);
      });

      // Calculate statistics
      const totalResults = results.length;
      const commonValues = Object.entries(valueGroups)
        .map(([value, items]) => ({
          value,
          count: items.length,
          percentage: (items.length / totalResults) * 100,
          avgScore: items.reduce((sum, item) => sum + (item.score || 0), 0) / items.length
        }))
        .filter(item => item.percentage >= 10) // Only include values with >= 10% occurrence
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5); // Top 5 values

      // Calculate confidence based on result consistency
      const avgSimilarity = results.reduce((sum, item) => sum + (item.score || 0), 0) / results.length;
      const confidence = Math.min(avgSimilarity * 1.5, 1.0); // Scale to 0-1 range

      // Format based on entity type
      let formattedCommon;
      switch (entityType) {
        case 'categories':
          formattedCommon = commonValues.map(v => ({ category: v.value, percentage: v.percentage }));
          break;
        case 'interfaces':
          formattedCommon = commonValues.map(v => ({ interface: v.value, percentage: v.percentage }));
          break;
        case 'pricing':
          formattedCommon = commonValues.map(v => ({ pricing: v.value, percentage: v.percentage }));
          break;
        default:
          formattedCommon = commonValues.map(v => ({ [entityType]: v.value, percentage: v.percentage }));
      }

      // Create base entity statistics
      const baseStats = {
        totalCount: totalResults,
        confidence,
        semanticMatches: results.filter(r => (r.score || 0) > this.config.confidenceThreshold).length,
        avgSimilarityScore: avgSimilarity,
        source: 'semantic_search' as const,
        sampleTools: results.slice(0, 3).map(r => r.payload?.name || 'unknown')
      };

      // Add specific fields based on entity type
      switch (entityType) {
        case 'categories':
          return {
            commonCategories: formattedCommon,
            commonInterfaces: [], // Required field
            commonPricing: [], // Required field
            ...baseStats
          } as z.infer<typeof EntityStatisticsSchema>;
        case 'interfaces':
          return {
            commonCategories: [], // Required field
            commonInterfaces: formattedCommon,
            commonPricing: [], // Required field
            ...baseStats
          } as z.infer<typeof EntityStatisticsSchema>;
        case 'pricing':
          return {
            commonCategories: [], // Required field
            commonInterfaces: [], // Required field
            commonPricing: formattedCommon,
            ...baseStats
          } as z.infer<typeof EntityStatisticsSchema>;
        default:
          // For other entity types, create a default structure
          return {
            commonCategories: [], // Required field
            commonInterfaces: [], // Required field
            commonPricing: [], // Required field
            ...baseStats
          } as z.infer<typeof EntityStatisticsSchema>;
      }
    } catch (error) {
      console.error(`Error processing ${entityType} results:`, error);
      return null;
    }
  }


  /**
   * Get total search space size
   */
  private async getSearchSpaceSize(): Promise<number> {
    try {
      // Use Qdrant to get collection info as search space size
      if (!this.qdrantClient) {
        return 0;
      }
      
      const collectionInfo = await this.qdrantClient.getCollection('tools_semantic');
      return collectionInfo.points_count || 0;
    } catch (error) {
      console.warn('Error getting search space size:', error);
      return 0;
    }
  }

  /**
   * Calculate overall confidence from entity statistics
   */
  private calculateOverallConfidence(
    entityStatistics: Record<string, z.infer<typeof EntityStatisticsSchema>>
  ): number {
    if (Object.keys(entityStatistics).length === 0) return 0;

    const confidences = Object.values(entityStatistics).map(stats => stats.confidence);
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    
    // Adjust confidence based on number of entity types with data
    const entityTypeFactor = Math.min(Object.keys(entityStatistics).length / 3, 1.0);
    
    return avgConfidence * entityTypeFactor;
  }

  /**
   * Generate assumptions based on query and entity statistics
   */
  private generateAssumptions(
    query: string,
    entityStatistics: Record<string, z.infer<typeof EntityStatisticsSchema>>
  ): string[] {
    const assumptions: string[] = [];

    // Add assumptions based on query characteristics
    if (query.toLowerCase().includes('free')) {
      assumptions.push('User is interested in free tools');
    }
    
    if (query.toLowerCase().includes('api')) {
      assumptions.push('User is looking for API-based tools');
    }

    // Add assumptions based on entity statistics
    if (entityStatistics.categories?.commonCategories?.length > 0) {
      const topCategory = entityStatistics.categories.commonCategories[0];
      assumptions.push(`Primary category likely: ${topCategory.category} (${topCategory.percentage.toFixed(1)}%)`);
    }

    if (entityStatistics.pricing?.commonPricing?.length > 0) {
      const topPricing = entityStatistics.pricing.commonPricing[0];
      assumptions.push(`Preferred pricing: ${topPricing.pricing} (${topPricing.percentage.toFixed(1)}%)`);
    }

    return assumptions;
  }

  /**
   * Get fallback result when enrichment fails
   */
  private getFallbackResult(
    query: string,
    processingTime: number
  ): {
    entityStatistics: Record<string, z.infer<typeof EntityStatisticsSchema>>;
    metadataContext: z.infer<typeof MetadataContextSchema>;
    semanticContexts?: Record<string, any>;
  } {
    return {
      entityStatistics: {},
      semanticContexts: {},
      metadataContext: {
        searchSpaceSize: 0,
        metadataConfidence: 0,
        assumptions: [`Fallback mode - enrichment failed for query: ${query}`],
        lastUpdated: new Date(),
        enrichmentStrategy: 'qdrant_multi_vector', // Use qdrant_multi_vector as fallback strategy
        processingTime
      }
    };
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `context_${Math.abs(hash)}`;
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL * 1000 // Convert to milliseconds
    });

    // Simple cache size management
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get entity from cache
   */
  private getEntityFromCache(entityName: string): EntityStatisticsCache | null {
    const cached = this.entityCache.get(entityName);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.entityCache.delete(entityName);
      return null;
    }

    return cached;
  }

  /**
   * Set entity in cache
   */
  private setEntityInCache(entityName: string, statistics: z.infer<typeof EntityStatisticsSchema>, sampleSize: number): void {
    this.entityCache.set(entityName, {
      statistics,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL * 1000, // Convert to milliseconds
      entityName,
      sampleSize
    });

    // Simple cache size management
    if (this.entityCache.size > 200) {
      const firstKey = this.entityCache.keys().next().value;
      if (firstKey) {
        this.entityCache.delete(firstKey);
      }
    }
  }

  /**
   * Clear entity cache
   */
  clearEntityCache(): void {
    this.entityCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entityCacheSize: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  } {
    // This would need to be implemented with proper tracking
    return {
      size: this.cache.size,
      entityCacheSize: this.entityCache.size,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0
    };
  }

  /**
   * Helper to get plural form of entity type
   */
  private getPluralForm(entityType: string): string {
    const pluralMap: Record<string, string> = {
      'category': 'commonCategories',
      'interface': 'commonInterfaces',
      'pricing': 'commonPricing',
      'functionality': 'commonFunctionality'
    };
    return pluralMap[entityType] || `${entityType}s`;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ContextEnrichmentConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextEnrichmentConfig {
    return { ...this.config };
  }

  /**
   * Generate semantic context for entity statistics
   * Converts statistical data into natural language context for LLM consumption
   */
  async generateSemanticContext(
    entityName: string,
    entityStatistics: z.infer<typeof EntityStatisticsSchema>,
    options: Partial<SemanticContextGenerationOptions> = {}
  ): Promise<SemanticContext> {
    const startTime = Date.now();
    
    // Default options
    const generationOptions: SemanticContextGenerationOptions = {
      includeAssumptions: true,
      includeSampleTools: true,
      includeConfidenceIndicators: true,
      maxSampleTools: 5,
      minConfidenceThreshold: 0.3,
      verboseMode: false,
      ...options
    };

    try {
      // Generate natural language description of statistical distributions
      const naturalLanguageDescription = this.generateNaturalLanguageDescription(
        entityName,
        entityStatistics,
        generationOptions.verboseMode
      );

      // Generate assumptions based on entity statistics with confidence indicators
      const assumptions = generationOptions.includeAssumptions
        ? this.generateSemanticAssumptions(entityName, entityStatistics)
        : [];

      // Process sample tools with relevance indicators
      const sampleTools = generationOptions.includeSampleTools
        ? this.processSampleTools(entityStatistics, generationOptions.maxSampleTools)
        : [];

      // Calculate confidence metrics
      const confidence = this.calculateDetailedConfidence(entityStatistics);

      // Handle low-confidence scenarios
      let lowConfidenceWarning: string | undefined;
      if (confidence.overall < generationOptions.minConfidenceThreshold) {
        lowConfidenceWarning = this.generateLowConfidenceWarning(entityName, confidence);
      }

      const processingTime = Date.now() - startTime;
      
      if (generationOptions.verboseMode) {
        console.log(`🧠 Generated semantic context for "${entityName}" in ${processingTime}ms`);
      }

      return {
        entityName,
        entityType: this.inferEntityType(entityName, entityStatistics),
        naturalLanguageDescription,
        assumptions,
        sampleTools,
        confidence,
        lowConfidenceWarning
      };
    } catch (error) {
      console.error(`Error generating semantic context for ${entityName}:`, error);
      throw error;
    }
  }

  /**
   * Generate natural language description of statistical distributions
   */
  private generateNaturalLanguageDescription(
    entityName: string,
    statistics: z.infer<typeof EntityStatisticsSchema>,
    verbose: boolean = false
  ): string {
    const descriptions: string[] = [];
    
    // Entity introduction
    descriptions.push(`Based on analysis of ${statistics.totalCount} related tools, "${entityName}" `);
    
    // Categories description
    if (statistics.commonCategories.length > 0) {
      const topCategories = statistics.commonCategories.slice(0, 3);
      const categoryNames = topCategories.map(cat => cat.category).join(', ');
      const topPercentage = topCategories[0].percentage;
      
      if (topCategories.length === 1) {
        descriptions.push(`primarily belongs to the ${topCategories[0].category} category (${topPercentage.toFixed(1)}% of tools)`);
      } else {
        descriptions.push(`most commonly appears in these categories: ${categoryNames} (${topPercentage.toFixed(1)}% for the top category)`);
      }
      
      if (verbose && topCategories.length > 1) {
        const distributionDesc = topCategories
          .map(cat => `${cat.category} (${cat.percentage.toFixed(1)}%)`)
          .join(', ');
        descriptions.push(`with the following distribution: ${distributionDesc}`);
      }
    } else {
      descriptions.push(`doesn't show strong alignment with specific categories`);
    }

    // Interfaces description
    if (statistics.commonInterfaces.length > 0) {
      const topInterface = statistics.commonInterfaces[0];
      const interfaceNames = statistics.commonInterfaces.slice(0, 3)
        .map(iface => iface.interface)
        .join(', ');
      
      descriptions.push(`commonly provides ${interfaceNames} interfaces`);
      
      if (verbose) {
        const interfaceDesc = statistics.commonInterfaces
          .slice(0, 3)
          .map(iface => `${iface.interface} (${iface.percentage.toFixed(1)}%)`)
          .join(', ');
        descriptions.push(`with interface distribution: ${interfaceDesc}`);
      }
    }

    // Pricing description
    if (statistics.commonPricing.length > 0) {
      const topPricing = statistics.commonPricing[0];
      const pricingNames = statistics.commonPricing.slice(0, 3)
        .map(pricing => pricing.pricing)
        .join(', ');
      
      descriptions.push(`typically follows ${pricingNames} pricing models`);
      
      if (verbose) {
        const pricingDesc = statistics.commonPricing
          .slice(0, 3)
          .map(pricing => `${pricing.pricing} (${pricing.percentage.toFixed(1)}%)`)
          .join(', ');
        descriptions.push(`with pricing distribution: ${pricingDesc}`);
      }
    }

    // Confidence and reliability description
    if (statistics.confidence > 0.7) {
      descriptions.push(`These patterns are highly consistent (confidence: ${(statistics.confidence * 100).toFixed(1)}%)`);
    } else if (statistics.confidence > 0.4) {
      descriptions.push(`These patterns show moderate consistency (confidence: ${(statistics.confidence * 100).toFixed(1)}%)`);
    } else {
      descriptions.push(`These patterns show limited consistency (confidence: ${(statistics.confidence * 100).toFixed(1)}%)`);
    }

    // Sample size context
    if (statistics.totalCount < 15) {
      descriptions.push(`based on a limited sample size (${statistics.totalCount} tools)`);
    } else if (statistics.totalCount < 30) {
      descriptions.push(`based on a moderate sample size (${statistics.totalCount} tools)`);
    } else {
      descriptions.push(`based on a substantial sample size (${statistics.totalCount} tools)`);
    }

    return descriptions.join('. ') + '.';
  }

  /**
   * Generate assumptions based on entity statistics with confidence indicators
   */
  private generateSemanticAssumptions(
    entityName: string,
    statistics: z.infer<typeof EntityStatisticsSchema>
  ): Array<{ assumption: string; confidence: number; rationale: string }> {
    const assumptions: Array<{ assumption: string; confidence: number; rationale: string }> = [];
    
    // Category-based assumptions
    if (statistics.commonCategories.length > 0) {
      const topCategory = statistics.commonCategories[0];
      const categoryConfidence = topCategory.percentage / 100;
      
      assumptions.push({
        assumption: `Tools related to "${entityName}" are likely in the ${topCategory.category} domain`,
        confidence: Math.min(categoryConfidence * 1.2, 0.95), // Boost confidence slightly
        rationale: `${topCategory.percentage.toFixed(1)}% of analyzed tools belong to this category`
      });
      
      // Secondary category assumption if significant
      if (statistics.commonCategories.length > 1 && statistics.commonCategories[1].percentage > 20) {
        const secondCategory = statistics.commonCategories[1];
        assumptions.push({
          assumption: `"${entityName}" may also have applications in ${secondCategory.category}`,
          confidence: Math.min((secondCategory.percentage / 100) * 0.8, 0.7),
          rationale: `${secondCategory.percentage.toFixed(1)}% of tools also belong to this secondary category`
        });
      }
    }

    // Interface-based assumptions
    if (statistics.commonInterfaces.length > 0) {
      const topInterface = statistics.commonInterfaces[0];
      const interfaceConfidence = topInterface.percentage / 100;
      
      let interfaceAssumption: string;
      if (topInterface.interface.toLowerCase().includes('api')) {
        interfaceAssumption = `"${entityName}" likely provides programmatic access via APIs`;
      } else if (topInterface.interface.toLowerCase().includes('cli')) {
        interfaceAssumption = `"${entityName}" likely offers command-line interface options`;
      } else if (topInterface.interface.toLowerCase().includes('gui')) {
        interfaceAssumption = `"${entityName}" likely includes graphical user interface components`;
      } else {
        interfaceAssumption = `"${entityName}" commonly uses ${topInterface.interface} interfaces`;
      }
      
      assumptions.push({
        assumption: interfaceAssumption,
        confidence: Math.min(interfaceConfidence * 1.1, 0.9),
        rationale: `${topInterface.percentage.toFixed(1)}% of analyzed tools use this interface type`
      });
    }

    // Pricing-based assumptions
    if (statistics.commonPricing.length > 0) {
      const topPricing = statistics.commonPricing[0];
      const pricingConfidence = topPricing.percentage / 100;
      
      let pricingAssumption: string;
      if (topPricing.pricing.toLowerCase().includes('free')) {
        pricingAssumption = `"${entityName}" likely has free or open-source options available`;
      } else if (topPricing.pricing.toLowerCase().includes('paid')) {
        pricingAssumption = `"${entityName}" likely requires payment for full functionality`;
      } else if (topPricing.pricing.toLowerCase().includes('freemium')) {
        pricingAssumption = `"${entityName}" likely follows a freemium model with basic free features`;
      } else {
        pricingAssumption = `"${entityName}" typically uses ${topPricing.pricing} pricing`;
      }
      
      assumptions.push({
        assumption: pricingAssumption,
        confidence: Math.min(pricingConfidence * 1.15, 0.92),
        rationale: `${topPricing.percentage.toFixed(1)}% of analyzed tools use this pricing model`
      });
    }

    // Sample size and reliability assumption
    if (statistics.totalCount >= 30) {
      assumptions.push({
        assumption: `The patterns observed for "${entityName}" are statistically reliable`,
        confidence: Math.min(statistics.confidence * 1.1, 0.95),
        rationale: `Based on analysis of ${statistics.totalCount} tools, which meets statistical significance thresholds`
      });
    } else if (statistics.totalCount >= 15) {
      assumptions.push({
        assumption: `The patterns for "${entityName}" show moderate reliability`,
        confidence: Math.min(statistics.confidence * 0.9, 0.75),
        rationale: `Based on analysis of ${statistics.totalCount} tools, which provides moderate statistical confidence`
      });
    } else {
      assumptions.push({
        assumption: `The patterns for "${entityName}" should be considered preliminary`,
        confidence: Math.min(statistics.confidence * 0.7, 0.6),
        rationale: `Based on limited analysis of only ${statistics.totalCount} tools`
      });
    }

    // Sort assumptions by confidence (highest first)
    return assumptions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Process sample tools with relevance indicators
   */
  private processSampleTools(
    statistics: z.infer<typeof EntityStatisticsSchema>,
    maxTools: number = 5
  ): Array<{ name: string; relevance: number; description?: string }> {
    return statistics.sampleTools
      .slice(0, maxTools)
      .map((toolName, index) => ({
        name: toolName,
        relevance: 1.0 - (index * 0.15), // Decreasing relevance
        description: `Example tool #${index + 1} representing ${statistics.commonCategories[0]?.category || 'this domain'}`
      }));
  }

  /**
   * Calculate detailed confidence metrics
   */
  private calculateDetailedConfidence(
    statistics: z.infer<typeof EntityStatisticsSchema>
  ): { overall: number; dataQuality: number; sampleSize: number } {
    // Overall confidence from statistics
    const overall = statistics.confidence;
    
    // Data quality based on similarity scores and semantic matches
    const dataQuality = statistics.avgSimilarityScore > 0
      ? Math.min(statistics.avgSimilarityScore * 1.2, 1.0)
      : 0.5;
    
    // Sample size confidence (n ≥ 30 for statistical significance)
    let sampleSize: number;
    if (statistics.totalCount >= 30) {
      sampleSize = 1.0;
    } else if (statistics.totalCount >= 15) {
      sampleSize = 0.7 + (statistics.totalCount - 15) / 30 * 0.3;
    } else if (statistics.totalCount >= 5) {
      sampleSize = 0.4 + (statistics.totalCount - 5) / 10 * 0.3;
    } else {
      sampleSize = Math.max(statistics.totalCount / 5 * 0.4, 0.1);
    }
    
    return { overall, dataQuality, sampleSize };
  }

  /**
   * Generate low confidence warning
   */
  private generateLowConfidenceWarning(
    entityName: string,
    confidence: { overall: number; dataQuality: number; sampleSize: number }
  ): string {
    const issues: string[] = [];
    
    if (confidence.sampleSize < 0.5) {
      issues.push('limited sample size');
    }
    
    if (confidence.dataQuality < 0.5) {
      issues.push('lower data quality');
    }
    
    if (confidence.overall < 0.3) {
      issues.push('inconsistent patterns');
    }
    
    const issuesText = issues.join(', ');
    return `Limited confidence in "${entityName}" analysis due to ${issuesText}. Consider these insights as preliminary rather than definitive.`;
  }

  /**
   * Infer entity type from statistics
   */
  private inferEntityType(
    entityName: string,
    statistics: z.infer<typeof EntityStatisticsSchema>
  ): string {
    // Simple heuristics to infer entity type
    if (statistics.commonCategories.some(cat => cat.category.toLowerCase().includes('api'))) {
      return 'api_service';
    }
    
    if (statistics.commonInterfaces.some(iface => iface.interface.toLowerCase().includes('cli'))) {
      return 'command_line_tool';
    }
    
    if (statistics.commonCategories.some(cat => cat.category.toLowerCase().includes('database'))) {
      return 'database';
    }
    
    if (statistics.commonCategories.some(cat => cat.category.toLowerCase().includes('framework'))) {
      return 'framework';
    }
    
    // Default to technology/tool
    return entityName.toLowerCase().includes('javascript') ||
           entityName.toLowerCase().includes('python') ||
           entityName.toLowerCase().includes('react') ||
           entityName.toLowerCase().includes('vue')
           ? 'technology' : 'tool';
  }

  /**
   * Format semantic context for optimal LLM understanding with enhanced confidence information
   */
  formatSemanticContextForLLM(semanticContext: SemanticContext): string {
    const sections: string[] = [];
    
    // Entity header
    sections.push(`## Entity: ${semanticContext.entityName} (${semanticContext.entityType})`);
    sections.push('');
    
    // Natural language description
    sections.push('### Overview');
    sections.push(semanticContext.naturalLanguageDescription);
    sections.push('');
    
    // Assumptions with confidence indicators
    if (semanticContext.assumptions.length > 0) {
      sections.push('### Key Assumptions');
      semanticContext.assumptions.forEach((assumption, index) => {
        const confidencePercent = (assumption.confidence * 100).toFixed(1);
        const confidenceLevel = assumption.confidence > 0.7 ? 'High' :
                               assumption.confidence > 0.4 ? 'Medium' : 'Low';
        sections.push(`${index + 1}. ${assumption.assumption} [${confidenceLevel} confidence: ${confidencePercent}%]`);
        sections.push(`   Rationale: ${assumption.rationale}`);
      });
      sections.push('');
    }
    
    // Sample tools
    if (semanticContext.sampleTools.length > 0) {
      sections.push('### Representative Examples');
      semanticContext.sampleTools.forEach((tool, index) => {
        const relevancePercent = (tool.relevance * 100).toFixed(1);
        sections.push(`${index + 1}. ${tool.name} (relevance: ${relevancePercent}%)`);
        if (tool.description) {
          sections.push(`   ${tool.description}`);
        }
      });
      sections.push('');
    }
    
    // Enhanced confidence metrics
    sections.push('### Confidence Metrics');
    sections.push(`- Overall confidence: ${(semanticContext.confidence.overall * 100).toFixed(1)}%`);
    sections.push(`- Data quality: ${(semanticContext.confidence.dataQuality * 100).toFixed(1)}%`);
    sections.push(`- Sample size adequacy: ${(semanticContext.confidence.sampleSize * 100).toFixed(1)}%`);
    
    // Add confidence factors breakdown if available
    if (semanticContext.confidence.factors) {
      sections.push('');
      sections.push('#### Confidence Factors:');
      semanticContext.confidence.factors.forEach(factor => {
        const factorPercent = (factor.value * 100).toFixed(1);
        const weightPercent = (factor.weight * 100).toFixed(1);
        sections.push(`- ${factor.name}: ${factorPercent}% (weight: ${weightPercent}%)`);
        sections.push(`  ${factor.description}`);
      });
    }
    
    // Low confidence warning
    if (semanticContext.lowConfidenceWarning) {
      sections.push('');
      sections.push('⚠️ ' + semanticContext.lowConfidenceWarning);
    }
    
    return sections.join('\n');
  }

  /**
   * Generate enhanced semantic context with confidence scoring and source attribution
   */
  async generateEnhancedSemanticContext(
    entityName: string,
    entityStatistics: z.infer<typeof EntityStatisticsSchema>,
    options: Partial<SemanticContextGenerationOptions> = {}
  ): Promise<SemanticContext> {
    const startTime = Date.now();
    
    // Default options
    const generationOptions: SemanticContextGenerationOptions = {
      includeAssumptions: true,
      includeSampleTools: true,
      includeConfidenceIndicators: true,
      maxSampleTools: 5,
      minConfidenceThreshold: 0.3,
      verboseMode: false,
      ...options
    };

    try {
      // Generate natural language description of statistical distributions
      const naturalLanguageDescription = this.generateEnhancedNaturalLanguageDescription(
        entityName,
        entityStatistics,
        generationOptions.verboseMode
      );

      // Generate assumptions based on entity statistics with confidence indicators
      const assumptions = generationOptions.includeAssumptions
        ? this.generateEnhancedSemanticAssumptions(entityName, entityStatistics)
        : [];

      // Process sample tools with relevance indicators
      const sampleTools = generationOptions.includeSampleTools
        ? this.processSampleTools(entityStatistics, generationOptions.maxSampleTools)
        : [];

      // Calculate confidence metrics
      const confidence = entityStatistics.confidenceBreakdown && entityStatistics.confidenceBreakdown.overall !== undefined
        ? this.convertConfidenceBreakdown(entityStatistics.confidenceBreakdown as ConfidenceBreakdown)
        : this.calculateDetailedConfidence(entityStatistics);

      // Handle low-confidence scenarios
      let lowConfidenceWarning: string | undefined;
      if (confidence.overall < generationOptions.minConfidenceThreshold) {
        lowConfidenceWarning = this.generateEnhancedLowConfidenceWarning(entityName, confidence, entityStatistics);
      }

      const processingTime = Date.now() - startTime;
      
      if (generationOptions.verboseMode) {
        console.log(`🧠 Generated enhanced semantic context for "${entityName}" in ${processingTime}ms`);
      }

      return {
        entityName,
        entityType: this.inferEntityType(entityName, entityStatistics),
        naturalLanguageDescription,
        assumptions,
        sampleTools,
        confidence,
        lowConfidenceWarning
      };
    } catch (error) {
      console.error(`Error generating enhanced semantic context for ${entityName}:`, error);
      throw error;
    }
  }

  /**
   * Generate enhanced natural language description with source attribution
   */
  private generateEnhancedNaturalLanguageDescription(
    entityName: string,
    statistics: z.infer<typeof EntityStatisticsSchema>,
    verbose: boolean = false
  ): string {
    const descriptions: string[] = [];
    
    // Entity introduction with source information
    const sourceCount = statistics.transparency?.dataSources?.length || 0;
    descriptions.push(`Based on analysis of ${statistics.totalCount} related tools from ${sourceCount} data sources, "${entityName}" `);
    
    // Categories description with confidence
    if (statistics.commonCategories.length > 0) {
      const topCategories = statistics.commonCategories.slice(0, 3);
      const categoryNames = topCategories.map(cat => cat.category).join(', ');
      const topPercentage = topCategories[0].percentage;
      const topConfidence = topCategories[0].confidence || 0.5;
      
      if (topCategories.length === 1) {
        descriptions.push(`primarily belongs to the ${topCategories[0].category} category (${topPercentage.toFixed(1)}% of tools, ${Math.round(topConfidence * 100)}% confidence)`);
      } else {
        descriptions.push(`most commonly appears in these categories: ${categoryNames} (${topPercentage.toFixed(1)}% for the top category)`);
      }
      
      if (verbose && topCategories.length > 1) {
        const distributionDesc = topCategories
          .map(cat => `${cat.category} (${cat.percentage.toFixed(1)}%, ${Math.round((cat.confidence || 0.5) * 100)}% confidence)`)
          .join(', ');
        descriptions.push(`with the following distribution: ${distributionDesc}`);
      }
    } else {
      descriptions.push(`doesn't show strong alignment with specific categories`);
    }

    // Interfaces description with confidence
    if (statistics.commonInterfaces.length > 0) {
      const topInterface = statistics.commonInterfaces[0];
      const interfaceNames = statistics.commonInterfaces.slice(0, 3)
        .map(iface => iface.interface)
        .join(', ');
      const interfaceConfidence = topInterface.confidence || 0.5;
      
      descriptions.push(`commonly provides ${interfaceNames} interfaces (${Math.round(interfaceConfidence * 100)}% confidence)`);
      
      if (verbose) {
        const interfaceDesc = statistics.commonInterfaces
          .slice(0, 3)
          .map(iface => `${iface.interface} (${iface.percentage.toFixed(1)}%, ${Math.round((iface.confidence || 0.5) * 100)}% confidence)`)
          .join(', ');
        descriptions.push(`with interface distribution: ${interfaceDesc}`);
      }
    }

    // Pricing description with confidence
    if (statistics.commonPricing.length > 0) {
      const topPricing = statistics.commonPricing[0];
      const pricingNames = statistics.commonPricing.slice(0, 3)
        .map(pricing => pricing.pricing)
        .join(', ');
      const pricingConfidence = topPricing.confidence || 0.5;
      
      descriptions.push(`typically follows ${pricingNames} pricing models (${Math.round(pricingConfidence * 100)}% confidence)`);
      
      if (verbose) {
        const pricingDesc = statistics.commonPricing
          .slice(0, 3)
          .map(pricing => `${pricing.pricing} (${pricing.percentage.toFixed(1)}%, ${Math.round((pricing.confidence || 0.5) * 100)}% confidence)`)
          .join(', ');
        descriptions.push(`with pricing distribution: ${pricingDesc}`);
      }
    }

    // Enhanced confidence and reliability description
    if (statistics.confidenceBreakdown) {
      const breakdown = statistics.confidenceBreakdown;
      descriptions.push(`These patterns show ${breakdown.overall > 0.7 ? 'high' : breakdown.overall > 0.4 ? 'moderate' : 'limited'} consistency (overall confidence: ${(breakdown.overall * 100).toFixed(1)}%)`);
      
      // Add information about vector type contributions
      if (statistics.vectorTypeContributions) {
        const topVectorType = Object.entries(statistics.vectorTypeContributions)
          .sort(([,a], [,b]) => b.contribution - a.contribution)[0];
        if (topVectorType) {
          const [vectorType, contribution] = topVectorType;
          descriptions.push(`Most reliable insights come from ${vectorType} vector analysis (${Math.round(contribution.contribution * 100)}% contribution)`);
        }
      }
    } else {
      // Fallback to basic confidence description
      if (statistics.confidence > 0.7) {
        descriptions.push(`These patterns are highly consistent (confidence: ${(statistics.confidence * 100).toFixed(1)}%)`);
      } else if (statistics.confidence > 0.4) {
        descriptions.push(`These patterns show moderate consistency (confidence: ${(statistics.confidence * 100).toFixed(1)}%)`);
      } else {
        descriptions.push(`These patterns show limited consistency (confidence: ${(statistics.confidence * 100).toFixed(1)}%)`);
      }
    }

    // Sample size context
    if (statistics.totalCount < 15) {
      descriptions.push(`based on a limited sample size (${statistics.totalCount} tools)`);
    } else if (statistics.totalCount < 30) {
      descriptions.push(`based on a moderate sample size (${statistics.totalCount} tools)`);
    } else {
      descriptions.push(`based on a substantial sample size (${statistics.totalCount} tools)`);
    }

    // Add data quality indicators if available
    if (statistics.qualityIndicators) {
      const quality = statistics.qualityIndicators;
      if (quality.sourceDiversity > 0.7) {
        descriptions.push(`with high source diversity (${Math.round(quality.sourceDiversity * 100)}%)`);
      }
      if (quality.crossValidationScore > 0.7) {
        descriptions.push(`and strong cross-validation (${Math.round(quality.crossValidationScore * 100)}%)`);
      }
    }

    // Add conflict information if available
    if (statistics.dataConflicts && statistics.dataConflicts.length > 0) {
      descriptions.push(`Note: ${statistics.dataConflicts.length} potential data conflicts were detected and resolved`);
    }

    return descriptions.join('. ') + '.';
  }

  /**
   * Generate enhanced assumptions with source attribution
   */
  private generateEnhancedSemanticAssumptions(
    entityName: string,
    statistics: z.infer<typeof EntityStatisticsSchema>
  ): Array<{ assumption: string; confidence: number; rationale: string }> {
    const assumptions: Array<{ assumption: string; confidence: number; rationale: string }> = [];
    
    // Category-based assumptions with enhanced confidence
    if (statistics.commonCategories.length > 0) {
      const topCategory = statistics.commonCategories[0];
      const categoryConfidence = topCategory.confidence || topCategory.percentage / 100;
      const categorySources = topCategory.sources?.join(', ') || 'multiple sources';
      
      assumptions.push({
        assumption: `Tools related to "${entityName}" are likely in the ${topCategory.category} domain`,
        confidence: Math.min(categoryConfidence * 1.2, 0.95), // Boost confidence slightly
        rationale: `${topCategory.percentage.toFixed(1)}% of analyzed tools belong to this category, based on ${categorySources}`
      });
      
      // Secondary category assumption if significant
      if (statistics.commonCategories.length > 1 && statistics.commonCategories[1].percentage > 20) {
        const secondCategory = statistics.commonCategories[1];
        const secondConfidence = secondCategory.confidence || secondCategory.percentage / 100;
        const secondSources = secondCategory.sources?.join(', ') || 'multiple sources';
        
        assumptions.push({
          assumption: `"${entityName}" may also have applications in ${secondCategory.category}`,
          confidence: Math.min(secondConfidence * 0.8, 0.7),
          rationale: `${secondCategory.percentage.toFixed(1)}% of tools also belong to this secondary category, based on ${secondSources}`
        });
      }
    }

    // Interface-based assumptions with enhanced confidence
    if (statistics.commonInterfaces.length > 0) {
      const topInterface = statistics.commonInterfaces[0];
      const interfaceConfidence = topInterface.confidence || topInterface.percentage / 100;
      const interfaceSources = topInterface.sources?.join(', ') || 'multiple sources';
      
      let interfaceAssumption: string;
      if (topInterface.interface.toLowerCase().includes('api')) {
        interfaceAssumption = `"${entityName}" likely provides programmatic access via APIs`;
      } else if (topInterface.interface.toLowerCase().includes('cli')) {
        interfaceAssumption = `"${entityName}" likely offers command-line interface options`;
      } else if (topInterface.interface.toLowerCase().includes('gui')) {
        interfaceAssumption = `"${entityName}" likely includes graphical user interface components`;
      } else {
        interfaceAssumption = `"${entityName}" commonly uses ${topInterface.interface} interfaces`;
      }
      
      assumptions.push({
        assumption: interfaceAssumption,
        confidence: Math.min(interfaceConfidence * 1.1, 0.9),
        rationale: `${topInterface.percentage.toFixed(1)}% of analyzed tools use this interface type, based on ${interfaceSources}`
      });
    }

    // Pricing-based assumptions with enhanced confidence
    if (statistics.commonPricing.length > 0) {
      const topPricing = statistics.commonPricing[0];
      const pricingConfidence = topPricing.confidence || topPricing.percentage / 100;
      const pricingSources = topPricing.sources?.join(', ') || 'multiple sources';
      
      let pricingAssumption: string;
      if (topPricing.pricing.toLowerCase().includes('free')) {
        pricingAssumption = `"${entityName}" likely has free or open-source options available`;
      } else if (topPricing.pricing.toLowerCase().includes('paid')) {
        pricingAssumption = `"${entityName}" likely requires payment for full functionality`;
      } else if (topPricing.pricing.toLowerCase().includes('freemium')) {
        pricingAssumption = `"${entityName}" likely follows a freemium model with basic free features`;
      } else {
        pricingAssumption = `"${entityName}" typically uses ${topPricing.pricing} pricing`;
      }
      
      assumptions.push({
        assumption: pricingAssumption,
        confidence: Math.min(pricingConfidence * 1.15, 0.92),
        rationale: `${topPricing.percentage.toFixed(1)}% of analyzed tools use this pricing model, based on ${pricingSources}`
      });
    }

    // Enhanced sample size and reliability assumption
    if (statistics.totalCount >= 30) {
      assumptions.push({
        assumption: `The patterns observed for "${entityName}" are statistically reliable`,
        confidence: Math.min(statistics.confidence * 1.1, 0.95),
        rationale: `Based on analysis of ${statistics.totalCount} tools, which meets statistical significance thresholds`
      });
    } else if (statistics.totalCount >= 15) {
      assumptions.push({
        assumption: `The patterns for "${entityName}" show moderate reliability`,
        confidence: Math.min(statistics.confidence * 0.9, 0.75),
        rationale: `Based on analysis of ${statistics.totalCount} tools, which provides moderate statistical confidence`
      });
    } else {
      assumptions.push({
        assumption: `The patterns for "${entityName}" should be considered preliminary`,
        confidence: Math.min(statistics.confidence * 0.7, 0.6),
        rationale: `Based on limited analysis of only ${statistics.totalCount} tools`
      });
    }

    // Add quality-based assumptions if available
    if (statistics.qualityIndicators) {
      const quality = statistics.qualityIndicators;
      
      if (quality.crossValidationScore > 0.8) {
        assumptions.push({
          assumption: `The insights for "${entityName}" are well-validated across different data sources`,
          confidence: quality.crossValidationScore,
          rationale: `High cross-validation score (${Math.round(quality.crossValidationScore * 100)}%) indicates consistent patterns across sources`
        });
      }
      
      if (quality.sourceDiversity > 0.8) {
        assumptions.push({
          assumption: `The analysis of "${entityName}" benefits from diverse data sources`,
          confidence: quality.sourceDiversity * 0.9,
          rationale: `High source diversity (${Math.round(quality.sourceDiversity * 100)}%) reduces bias in the analysis`
        });
      }
    }

    // Sort assumptions by confidence (highest first)
    return assumptions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Convert confidence breakdown to semantic context format
   */
  private convertConfidenceBreakdown(breakdown: ConfidenceBreakdown): {
    overall: number;
    dataQuality: number;
    sampleSize: number;
    factors?: Array<{
      name: string;
      value: number;
      weight: number;
      description: string;
    }>;
  } {
    return {
      overall: breakdown.overall,
      dataQuality: breakdown.dataQuality,
      sampleSize: breakdown.sampleSize,
      factors: breakdown.factors
    };
  }

  /**
   * Generate enhanced low confidence warning with detailed information
   */
  private generateEnhancedLowConfidenceWarning(
    entityName: string,
    confidence: { overall: number; dataQuality: number; sampleSize: number; factors?: any[] },
    statistics: z.infer<typeof EntityStatisticsSchema>
  ): string {
    const issues: string[] = [];
    
    if (confidence.sampleSize < 0.5) {
      issues.push('limited sample size');
    }
    
    if (confidence.dataQuality < 0.5) {
      issues.push('lower data quality');
    }
    
    if (confidence.overall < 0.3) {
      issues.push('inconsistent patterns');
    }
    
    // Add specific factor-based issues
    if (confidence.factors) {
      const lowFactors = confidence.factors.filter(f => f.value < 0.5);
      if (lowFactors.length > 0) {
        issues.push(`concerning ${lowFactors.map(f => f.name).join(', ')}`);
      }
    }
    
    // Add quality indicator issues
    if (statistics.qualityIndicators) {
      const quality = statistics.qualityIndicators;
      if (quality.sourceDiversity < 0.5) {
        issues.push('limited source diversity');
      }
      if (quality.crossValidationScore < 0.5) {
        issues.push('poor cross-validation');
      }
    }
    
    // Add conflict information
    if (statistics.dataConflicts && statistics.dataConflicts.length > 0) {
      issues.push('detected data conflicts');
    }
    
    const issuesText = issues.join(', ');
    let warning = `Limited confidence in "${entityName}" analysis due to ${issuesText}. Consider these insights as preliminary rather than definitive.`;
    
    // Add transparency information
    if (statistics.transparency) {
      warning += ` Analysis based on ${statistics.transparency.methodology}.`;
    }
    
    return warning;
  }

  /**
   * Enhanced confidence calculation with multiple factors
   */
  private calculateEnhancedConfidence(
    results: any[],
    vectorTypeContributions: Record<string, any> = {}
  ): ConfidenceBreakdown {
    const sampleSize = results.length;
    const avgSimilarity = results.reduce((sum, r) => sum + (r.score || 0), 0) / sampleSize;
    
    // Sample size factor (n ≥ 30 for statistical significance)
    let sampleSizeFactor: number;
    if (sampleSize >= 30) {
      sampleSizeFactor = 1.0;
    } else if (sampleSize >= 15) {
      sampleSizeFactor = 0.7 + (sampleSize - 15) / 30 * 0.3;
    } else if (sampleSize >= 5) {
      sampleSizeFactor = 0.4 + (sampleSize - 5) / 10 * 0.3;
    } else {
      sampleSizeFactor = Math.max(sampleSize / 5 * 0.4, 0.1);
    }
    
    // Vector type reliability factor
    const vectorTypes = Object.keys(vectorTypeContributions);
    let vectorTypeReliability = 0.7; // Default reliability
    if (vectorTypes.length > 0) {
      const totalReliability = vectorTypes.reduce((sum, vt) => {
        const reliability = this.getVectorTypeReliability(vt);
        return sum + reliability * (vectorTypeContributions[vt]?.count || 0);
      }, 0);
      const totalSamples = vectorTypes.reduce((sum, vt) => sum + (vectorTypeContributions[vt]?.count || 0), 0);
      vectorTypeReliability = totalSamples > 0 ? totalReliability / totalSamples : 0.7;
    }
    
    // Cross-validation factor (how many vector types agree)
    const crossValidation = Math.min(vectorTypes.length / 5, 1.0);
    
    // Consistency factor (variance in similarity scores)
    const similarityVariance = this.calculateVariance(results.map(r => r.score || 0));
    const consistency = Math.max(1.0 - similarityVariance, 0.1);
    
    // Data quality factor (average similarity score)
    const dataQuality = Math.min(avgSimilarity * 1.2, 1.0);
    
    // Source diversity factor
    const uniqueVectorTypes = new Set(results.map(r => r.sourceVectorType)).size;
    const sourceDiversity = Math.min(uniqueVectorTypes / 5, 1.0);
    
    // Calculate weighted overall confidence
    const factors = [
      { name: 'sampleSize', value: sampleSizeFactor, weight: 0.25, description: 'Statistical significance based on sample size' },
      { name: 'avgSimilarity', value: avgSimilarity, weight: 0.20, description: 'Average similarity score of results' },
      { name: 'vectorTypeReliability', value: vectorTypeReliability, weight: 0.20, description: 'Historical reliability of vector types' },
      { name: 'crossValidation', value: crossValidation, weight: 0.15, description: 'Agreement between different vector types' },
      { name: 'consistency', value: consistency, weight: 0.10, description: 'Consistency of similarity scores' },
      { name: 'dataQuality', value: dataQuality, weight: 0.05, description: 'Overall quality of search results' },
      { name: 'sourceDiversity', value: sourceDiversity, weight: 0.05, description: 'Diversity of data sources' }
    ];
    
    const overall = factors.reduce((sum, factor) => sum + (factor.value * factor.weight), 0);
    
    return {
      overall: Math.min(overall, 1.0),
      sampleSize: sampleSizeFactor,
      avgSimilarity,
      vectorTypeReliability,
      crossValidation,
      consistency,
      dataQuality,
      sourceDiversity,
      factors
    };
  }

  /**
   * Get or calculate vector type reliability
   */
  private getVectorTypeReliability(vectorType: string): number {
    const cached = this.vectorTypeReliability.get(vectorType);
    if (cached && (Date.now() - cached.lastUpdated.getTime()) < 24 * 60 * 60 * 1000) { // 24 hours
      return cached.reliability;
    }
    
    // Default reliability scores for different vector types
    const defaultReliabilities: Record<string, number> = {
      'semantic': 0.85,
      'categories': 0.80,
      'functionality': 0.75,
      'interfaces': 0.70,
      'pricing': 0.65
    };
    
    const reliability = defaultReliabilities[vectorType] || 0.5;
    
    // Cache the reliability
    this.vectorTypeReliability.set(vectorType, {
      vectorType,
      reliability,
      sampleSize: 0, // Would be updated with actual data
      avgSimilarity: 0,
      consistency: 0,
      lastUpdated: new Date()
    });
    
    return reliability;
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Enhanced source attribution with confidence factors
   */
  private createEnhancedSourceAttribution(results: any[]): EntitySourceAttribution[] {
    return results.map(result => {
      const vectorType = result.sourceVectorType || 'unknown';
      const reliability = this.getVectorTypeReliability(vectorType);
      
      return {
        toolId: result.id || result.payload?.id || 'unknown',
        toolName: result.payload?.name || 'unknown',
        sources: [{
          vectorType,
          score: result.score || 0,
          rank: result.rank || 0,
          weight: this.calculateVectorWeight(vectorType),
          reliability
        }],
        combinedScore: result.combinedScore || 0,
        confidenceFactors: {
          vectorReliability: reliability,
          crossValidation: this.calculateCrossValidation(result, results),
          consistency: this.calculateResultConsistency(result, results)
        }
      };
    });
  }

  /**
   * Calculate weight for a vector type
   */
  private calculateVectorWeight(vectorType: string): number {
    const weights: Record<string, number> = {
      'semantic': 1.0,
      'categories': 0.8,
      'functionality': 0.7,
      'interfaces': 0.6,
      'pricing': 0.5
    };
    return weights[vectorType] || 0.5;
  }

  /**
   * Calculate cross-validation score for a result
   */
  private calculateCrossValidation(result: any, allResults: any[]): number {
    const toolId = result.id || result.payload?.id;
    const matchingResults = allResults.filter(r =>
      (r.id || r.payload?.id) === toolId && r.sourceVectorType !== result.sourceVectorType
    );
    
    if (matchingResults.length === 0) return 0.5; // No cross-validation
    
    const avgScore = matchingResults.reduce((sum, r) => sum + (r.score || 0), 0) / matchingResults.length;
    return Math.min(avgScore, 1.0);
  }

  /**
   * Calculate consistency score for a result
   */
  private calculateResultConsistency(result: any, allResults: any[]): number {
    const vectorType = result.sourceVectorType;
    const sameTypeResults = allResults.filter(r => r.sourceVectorType === vectorType);
    
    if (sameTypeResults.length <= 1) return 0.8; // Not enough data for consistency
    
    const scores = sameTypeResults.map(r => r.score || 0);
    const variance = this.calculateVariance(scores);
    return Math.max(1.0 - variance, 0.1);
  }

  /**
   * Detect and resolve data conflicts
   */
  private detectAndResolveConflicts(
    categories: any[],
    interfaces: any[],
    pricing: any[]
  ): DataConflict[] {
    const conflicts: DataConflict[] = [];
    
    // Detect category conflicts
    if (categories.length > 1) {
      const topCategory = categories[0];
      const secondCategory = categories[1];
      
      if (topCategory.percentage - secondCategory.percentage < 10) { // Close competition
        conflicts.push({
          type: 'category',
          conflictingValues: [
            {
              value: topCategory.category,
              sources: topCategory.sources || ['unknown'],
              confidence: topCategory.confidence || 0.5,
              percentage: topCategory.percentage
            },
            {
              value: secondCategory.category,
              sources: secondCategory.sources || ['unknown'],
              confidence: secondCategory.confidence || 0.5,
              percentage: secondCategory.percentage
            }
          ],
          resolution: topCategory.percentage > secondCategory.percentage ? 'high_confidence' : 'weighted_average',
          resolvedValue: topCategory.category,
          confidenceInResolution: Math.max(topCategory.confidence || 0.5, secondCategory.confidence || 0.5)
        });
      }
    }
    
    // Detect interface conflicts
    if (interfaces.length > 1) {
      const topInterface = interfaces[0];
      const secondInterface = interfaces[1];
      
      if (topInterface.percentage - secondInterface.percentage < 10) {
        conflicts.push({
          type: 'interface',
          conflictingValues: [
            {
              value: topInterface.interface,
              sources: topInterface.sources || ['unknown'],
              confidence: topInterface.confidence || 0.5,
              percentage: topInterface.percentage
            },
            {
              value: secondInterface.interface,
              sources: secondInterface.sources || ['unknown'],
              confidence: secondInterface.confidence || 0.5,
              percentage: secondInterface.percentage
            }
          ],
          resolution: 'merge_all',
          confidenceInResolution: Math.min(topInterface.confidence || 0.5, secondInterface.confidence || 0.5)
        });
      }
    }
    
    // Detect pricing conflicts
    if (pricing.length > 1) {
      const topPricing = pricing[0];
      const secondPricing = pricing[1];
      
      if (topPricing.percentage - secondPricing.percentage < 10) {
        conflicts.push({
          type: 'pricing',
          conflictingValues: [
            {
              value: topPricing.pricing,
              sources: topPricing.sources || ['unknown'],
              confidence: topPricing.confidence || 0.5,
              percentage: topPricing.percentage
            },
            {
              value: secondPricing.pricing,
              sources: secondPricing.sources || ['unknown'],
              confidence: secondPricing.confidence || 0.5,
              percentage: secondPricing.percentage
            }
          ],
          resolution: 'weighted_average',
          resolvedValue: topPricing.pricing,
          confidenceInResolution: Math.max(topPricing.confidence || 0.5, secondPricing.confidence || 0.5)
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Calculate quality indicators for entity statistics
   */
  private calculateQualityIndicators(
    results: any[],
    confidenceBreakdown: ConfidenceBreakdown
  ): QualityIndicators {
    // Data freshness (based on timestamps if available)
    const now = Date.now();
    const avgAge = results.reduce((sum, r) => {
      const timestamp = r.payload?.lastUpdated || r.payload?.createdAt || now;
      return sum + (now - timestamp);
    }, 0) / results.length;
    const dataFreshness = Math.max(1.0 - (avgAge / (30 * 24 * 60 * 60 * 1000)), 0); // 30 days max
    
    // Source diversity
    const uniqueVectorTypes = new Set(results.map(r => r.sourceVectorType)).size;
    const sourceDiversity = Math.min(uniqueVectorTypes / 5, 1.0);
    
    // Cross-validation score
    const crossValidationScore = confidenceBreakdown.crossValidation;
    
    // Consistency score
    const consistencyScore = confidenceBreakdown.consistency;
    
    return {
      dataFreshness,
      sourceDiversity,
      crossValidationScore,
      consistencyScore
    };
  }

  /**
   * Generate transparency information for LLM consumption
   */
  private generateTransparencyInfo(
    vectorTypeContributions: Record<string, any>,
    confidenceBreakdown: ConfidenceBreakdown
  ): TransparencyInfo {
    const dataSources = Object.keys(vectorTypeContributions);
    const methodology = 'Multi-vector semantic search with confidence-weighted statistical analysis';
    const limitations = [
      'Based on available tool data which may not be comprehensive',
      'Confidence scores are estimates and not guarantees',
      'Vector type reliability is based on historical performance',
      'Sample size limitations may affect statistical significance'
    ];
    
    let confidenceLevel = 'Medium';
    if (confidenceBreakdown.overall > 0.7) {
      confidenceLevel = 'High';
    } else if (confidenceBreakdown.overall < 0.4) {
      confidenceLevel = 'Low';
    }
    
    return {
      dataSources,
      methodology,
      limitations,
      confidenceLevel
    };
  }

  /**
   * Update processEntityResultsWithTiming to use enhanced confidence scoring
   */
  private processEntityResultsWithEnhancedConfidence(
    results: any[],
    entityName: string,
    entityType: string,
    includeSourceAttribution: boolean,
    startTime: number
  ): z.infer<typeof EntityStatisticsSchema> | null {
    const processStartTime = Date.now();
    const maxProcessingTime = this.config.maxProcessingTime || 200;
    const remainingTime = maxProcessingTime - (processStartTime - startTime);

    // Check if we have enough time for full processing
    if (remainingTime <= 50) {
      console.warn(`⚠️ Limited time for processing ${entityName}, using fast path`);
      return this.fastPathStatistics(results, entityName, entityType);
    }

    try {
      // Calculate vector type contributions
      const vectorTypeContributions: Record<string, any> = {};
      results.forEach(result => {
        const vectorType = result.sourceVectorType || 'unknown';
        if (!vectorTypeContributions[vectorType]) {
          vectorTypeContributions[vectorType] = {
            count: 0,
            totalScore: 0,
            results: []
          };
        }
        vectorTypeContributions[vectorType].count++;
        vectorTypeContributions[vectorType].totalScore += result.score || 0;
        vectorTypeContributions[vectorType].results.push(result);
      });
      
      // Calculate averages and contributions
      Object.keys(vectorTypeContributions).forEach(vectorType => {
        const contribution = vectorTypeContributions[vectorType];
        contribution.avgScore = contribution.totalScore / contribution.count;
        contribution.reliability = this.getVectorTypeReliability(vectorType);
        contribution.contribution = (contribution.count / results.length) * contribution.reliability;
      });

      // Extract enhanced categories, interfaces, and pricing with source attribution
      const categories = this.extractCategoriesWithSources(results);
      const interfaces = this.extractInterfacesWithSources(results);
      const pricing = this.extractPricingWithSources(results);

      // Calculate enhanced confidence breakdown
      const confidenceBreakdown = this.calculateEnhancedConfidence(results, vectorTypeContributions);

      // Detect and resolve conflicts
      const dataConflicts = this.detectAndResolveConflicts(categories, interfaces, pricing);

      // Calculate quality indicators
      const qualityIndicators = this.calculateQualityIndicators(results, confidenceBreakdown);

      // Generate transparency information
      const transparency = this.generateTransparencyInfo(vectorTypeContributions, confidenceBreakdown);

      // Get sample tools for attribution
      const sampleTools = results.slice(0, 5).map(r => r.payload?.name || 'unknown');

      // Create enhanced source attribution if enabled
      const processingTime = Date.now() - processStartTime;
      const sourceAttribution = includeSourceAttribution && processingTime < remainingTime - 20
        ? this.createEnhancedSourceAttribution(results.slice(0, 10))
        : undefined;

      return {
        commonCategories: categories,
        commonInterfaces: interfaces,
        commonPricing: pricing,
        totalCount: results.length,
        confidence: confidenceBreakdown.overall,
        confidenceBreakdown,
        semanticMatches: results.filter(r => (r.score || 0) > this.config.confidenceThreshold).length,
        avgSimilarityScore: confidenceBreakdown.avgSimilarity,
        source: 'semantic_search' as const,
        sampleTools,
        sourceAttribution,
        vectorTypeContributions,
        dataConflicts,
        qualityIndicators,
        transparency
      } as z.infer<typeof EntityStatisticsSchema>;
    } catch (error) {
      console.error(`Error processing entity results for ${entityName}:`, error);
      return null;
    }
  }

  /**
   * Extract categories with source attribution
   */
  private extractCategoriesWithSources(results: any[]): Array<{
    category: string;
    percentage: number;
    confidence: number;
    sources: string[]
  }> {
    const categoryData: Record<string, { count: number; sources: Set<string>; scores: number[] }> = {};
    
    results.forEach(result => {
      const categories = result.payload?.categories || [];
      const vectorType = result.sourceVectorType || 'unknown';
      
      if (Array.isArray(categories)) {
        categories.forEach((cat: string) => {
          if (!categoryData[cat]) {
            categoryData[cat] = { count: 0, sources: new Set(), scores: [] };
          }
          categoryData[cat].count++;
          categoryData[cat].sources.add(vectorType);
          categoryData[cat].scores.push(result.score || 0);
        });
      } else if (categories) {
        // Single category
        if (!categoryData[categories]) {
          categoryData[categories] = { count: 0, sources: new Set(), scores: [] };
        }
        categoryData[categories].count++;
        categoryData[categories].sources.add(vectorType);
        categoryData[categories].scores.push(result.score || 0);
      }
    });

    const total = results.length;
    return Object.entries(categoryData)
      .map(([category, data]) => {
        const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
        const sourceCount = data.sources.size;
        const confidence = Math.min((avgScore * 0.7 + (sourceCount / 5) * 0.3), 1.0);
        
        return {
          category,
          percentage: (data.count / total) * 100,
          confidence,
          sources: Array.from(data.sources)
        };
      })
      .filter(item => item.percentage >= 5) // Only include categories with ≥ 5% occurrence
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }

  /**
   * Extract interfaces with source attribution
   */
  private extractInterfacesWithSources(results: any[]): Array<{
    interface: string;
    percentage: number;
    confidence: number;
    sources: string[]
  }> {
    const interfaceData: Record<string, { count: number; sources: Set<string>; scores: number[] }> = {};
    
    results.forEach(result => {
      const interfaces = result.payload?.interfaces || [];
      const vectorType = result.sourceVectorType || 'unknown';
      
      if (Array.isArray(interfaces)) {
        interfaces.forEach((iface: string) => {
          if (!interfaceData[iface]) {
            interfaceData[iface] = { count: 0, sources: new Set(), scores: [] };
          }
          interfaceData[iface].count++;
          interfaceData[iface].sources.add(vectorType);
          interfaceData[iface].scores.push(result.score || 0);
        });
      } else if (interfaces) {
        // Single interface
        if (!interfaceData[interfaces]) {
          interfaceData[interfaces] = { count: 0, sources: new Set(), scores: [] };
        }
        interfaceData[interfaces].count++;
        interfaceData[interfaces].sources.add(vectorType);
        interfaceData[interfaces].scores.push(result.score || 0);
      }
    });

    const total = results.length;
    return Object.entries(interfaceData)
      .map(([iface, data]) => {
        const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
        const sourceCount = data.sources.size;
        const confidence = Math.min((avgScore * 0.7 + (sourceCount / 5) * 0.3), 1.0);
        
        return {
          interface: iface,
          percentage: (data.count / total) * 100,
          confidence,
          sources: Array.from(data.sources)
        };
      })
      .filter(item => item.percentage >= 5) // Only include interfaces with ≥ 5% occurrence
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }

  /**
   * Extract pricing with source attribution
   */
  private extractPricingWithSources(results: any[]): Array<{
    pricing: string;
    percentage: number;
    confidence: number;
    sources: string[]
  }> {
    const pricingData: Record<string, { count: number; sources: Set<string>; scores: number[] }> = {};
    
    results.forEach(result => {
      const pricing = result.payload?.pricing || 'unknown';
      const vectorType = result.sourceVectorType || 'unknown';
      
      if (!pricingData[pricing]) {
        pricingData[pricing] = { count: 0, sources: new Set(), scores: [] };
      }
      pricingData[pricing].count++;
      pricingData[pricing].sources.add(vectorType);
      pricingData[pricing].scores.push(result.score || 0);
    });

    const total = results.length;
    return Object.entries(pricingData)
      .map(([pricing, data]) => {
        const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
        const sourceCount = data.sources.size;
        const confidence = Math.min((avgScore * 0.7 + (sourceCount / 5) * 0.3), 1.0);
        
        return {
          pricing,
          percentage: (data.count / total) * 100,
          confidence,
          sources: Array.from(data.sources)
        };
      })
      .filter(item => item.percentage >= 5) // Only include pricing models with ≥ 5% occurrence
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }

  /**
   * Log confidence metrics for monitoring
   */
  private logConfidenceMetrics(
    entityName: string,
    confidenceBreakdown: ConfidenceBreakdown,
    vectorTypeContributions: Record<string, any>,
    qualityIndicators?: QualityIndicators
  ): void {
    const metrics = {
      entityName,
      timestamp: new Date(),
      overallConfidence: confidenceBreakdown.overall,
      factors: confidenceBreakdown.factors,
      vectorTypeContributions,
      qualityIndicators,
      dataConflicts: [] // Would be populated if conflicts were detected
    };

    // Store metrics for monitoring
    this.confidenceMetrics.set(entityName, metrics);

    // Log detailed metrics for debugging
    console.log(`📊 Confidence metrics for "${entityName}":`);
    console.log(`  Overall confidence: ${(confidenceBreakdown.overall * 100).toFixed(1)}%`);
    
    if (confidenceBreakdown.factors) {
      console.log(`  Confidence factors:`);
      confidenceBreakdown.factors.forEach(factor => {
        console.log(`    ${factor.name}: ${(factor.value * 100).toFixed(1)}% (weight: ${(factor.weight * 100).toFixed(1)}%)`);
      });
    }
    
    if (vectorTypeContributions) {
      console.log(`  Vector type contributions:`);
      Object.entries(vectorTypeContributions).forEach(([vectorType, contribution]) => {
        console.log(`    ${vectorType}: ${contribution.count} results, ${(contribution.contribution * 100).toFixed(1)}% contribution`);
      });
    }
    
    if (qualityIndicators) {
      console.log(`  Quality indicators:`);
      console.log(`    Data freshness: ${(qualityIndicators.dataFreshness * 100).toFixed(1)}%`);
      console.log(`    Source diversity: ${(qualityIndicators.sourceDiversity * 100).toFixed(1)}%`);
      console.log(`    Cross-validation: ${(qualityIndicators.crossValidationScore * 100).toFixed(1)}%`);
      console.log(`    Consistency: ${(qualityIndicators.consistencyScore * 100).toFixed(1)}%`);
    }
  }

  /**
   * Get confidence metrics for monitoring
   */
  getConfidenceMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    this.confidenceMetrics.forEach((value, key) => {
      metrics[key] = {
        overallConfidence: value.overallConfidence,
        timestamp: value.timestamp,
        factorSummary: value.factors ? value.factors.map(f => ({
          name: f.name,
          value: f.value,
          weight: f.weight
        })) : [],
        vectorTypeSummary: Object.entries(value.vectorTypeContributions).map(([vt, c]) => ({
          vectorType: vt,
          count: (c as any).count,
          contribution: (c as any).contribution
        }))
      };
    });
    
    return metrics;
  }

  /**
   * Get aggregated confidence metrics for all entities
   */
  getAggregatedConfidenceMetrics(): {
    totalEntities: number;
    averageConfidence: number;
    confidenceDistribution: Record<string, number>;
    vectorTypePerformance: Record<string, {
      averageContribution: number;
      usageCount: number;
      reliabilityScore: number;
    }>;
    qualityTrends: {
      averageDataFreshness: number;
      averageSourceDiversity: number;
      averageCrossValidation: number;
      averageConsistency: number;
    };
  } {
    const entities = Array.from(this.confidenceMetrics.values());
    
    if (entities.length === 0) {
      return {
        totalEntities: 0,
        averageConfidence: 0,
        confidenceDistribution: {},
        vectorTypePerformance: {},
        qualityTrends: {
          averageDataFreshness: 0,
          averageSourceDiversity: 0,
          averageCrossValidation: 0,
          averageConsistency: 0
        }
      };
    }
    
    // Calculate average confidence
    const averageConfidence = entities.reduce((sum, e) => sum + e.overallConfidence, 0) / entities.length;
    
    // Calculate confidence distribution
    const confidenceDistribution: Record<string, number> = {
      'high': entities.filter(e => e.overallConfidence > 0.7).length,
      'medium': entities.filter(e => e.overallConfidence > 0.4 && e.overallConfidence <= 0.7).length,
      'low': entities.filter(e => e.overallConfidence <= 0.4).length
    };
    
    // Calculate vector type performance
    const vectorTypePerformance: Record<string, any> = {};
    const vectorTypeData: Record<string, { contributions: number[]; count: number }> = {};
    
    entities.forEach(entity => {
      Object.entries(entity.vectorTypeContributions).forEach(([vectorType, contribution]) => {
        if (!vectorTypeData[vectorType]) {
          vectorTypeData[vectorType] = { contributions: [], count: 0 };
        }
        vectorTypeData[vectorType].contributions.push((contribution as any).contribution);
        vectorTypeData[vectorType].count++;
      });
    });
    
    Object.entries(vectorTypeData).forEach(([vectorType, data]) => {
      const averageContribution = data.contributions.reduce((sum, c) => sum + c, 0) / data.contributions.length;
      const reliabilityScore = this.getVectorTypeReliability(vectorType);
      
      vectorTypePerformance[vectorType] = {
        averageContribution,
        usageCount: data.count,
        reliabilityScore
      };
    });
    
    // Calculate quality trends
    const entitiesWithQuality = entities.filter(e => e.qualityIndicators);
    const averageDataFreshness = entitiesWithQuality.length > 0
      ? entitiesWithQuality.reduce((sum, e) => sum + e.qualityIndicators.dataFreshness, 0) / entitiesWithQuality.length
      : 0;
    const averageSourceDiversity = entitiesWithQuality.length > 0
      ? entitiesWithQuality.reduce((sum, e) => sum + e.qualityIndicators.sourceDiversity, 0) / entitiesWithQuality.length
      : 0;
    const averageCrossValidation = entitiesWithQuality.length > 0
      ? entitiesWithQuality.reduce((sum, e) => sum + e.qualityIndicators.crossValidationScore, 0) / entitiesWithQuality.length
      : 0;
    const averageConsistency = entitiesWithQuality.length > 0
      ? entitiesWithQuality.reduce((sum, e) => sum + e.qualityIndicators.consistencyScore, 0) / entitiesWithQuality.length
      : 0;
    
    return {
      totalEntities: entities.length,
      averageConfidence,
      confidenceDistribution,
      vectorTypePerformance,
      qualityTrends: {
        averageDataFreshness,
        averageSourceDiversity,
        averageCrossValidation,
        averageConsistency
      }
    };
  }

  /**
   * Clear confidence metrics
   */
  clearConfidenceMetrics(): void {
    this.confidenceMetrics.clear();
  }

  /**
   * Update processEntityResultsWithEnhancedConfidence to include logging
   */
  private processEntityResultsWithEnhancedConfidenceAndLogging(
    results: any[],
    entityName: string,
    entityType: string,
    includeSourceAttribution: boolean,
    startTime: number
  ): z.infer<typeof EntityStatisticsSchema> | null {
    const statistics = this.processEntityResultsWithEnhancedConfidence(
      results, entityName, entityType, includeSourceAttribution, startTime
    );
    
    if (statistics && statistics.confidenceBreakdown) {
      this.logConfidenceMetrics(
        entityName,
        statistics.confidenceBreakdown as ConfidenceBreakdown,
        statistics.vectorTypeContributions || {},
        statistics.qualityIndicators as QualityIndicators | undefined
      );
    }
    
    return statistics;
  }
}

// Export singleton instance
export const contextEnrichmentService = new ContextEnrichmentService();

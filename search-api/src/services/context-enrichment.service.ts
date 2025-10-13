import { embeddingService } from './embedding.service';
import { qdrantService } from './qdrant.service';
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

class ContextEnrichmentService {
  private config: ContextEnrichmentConfig;
  private cache: Map<string, ContextCache> = new Map();
  private qdrantClient: any = null;

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
    if (!this.qdrantClient) {
      throw new Error('Qdrant client not initialized');
    }

    try {
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Search across multiple vector types
      const vectorTypes = ['semantic', 'categories', 'functionality', 'interfaces', 'pricing'];
      const entityStatistics: Record<string, z.infer<typeof EntityStatisticsSchema>> = {};

      for (const vectorType of vectorTypes) {
        try {
          const searchResults = await this.qdrantClient.search(`tools_${vectorType}`, {
            vector: queryEmbedding,
            limit: this.config.maxEntitiesPerQuery * 2, // Get more for better statistics
            with_payload: true
          });

          // Process results into entity statistics
          const stats = this.processSearchResults(searchResults, vectorType);
          if (stats) {
            entityStatistics[vectorType] = stats;
          }
        } catch (error) {
          console.warn(`Error searching ${vectorType} vectors:`, error);
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
  } {
    return {
      entityStatistics: {},
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
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  } {
    // This would need to be implemented with proper tracking
    return {
      size: this.cache.size,
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
}

// Export singleton instance
export const contextEnrichmentService = new ContextEnrichmentService();

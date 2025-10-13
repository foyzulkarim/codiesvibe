import { qdrantService } from './qdrant.service';
import { embeddingService } from './embedding.service';
import {
  MultiVectorSearchConfig,
  defaultEnhancedSearchConfig
} from '@/config/enhanced-search-config';
import {
  VectorSearchResultsSchema,
  VectorSearchStateSchema,
  VectorSearchMetricsRecordSchema
} from '@/types/enhanced-state';
import { z } from 'zod';

// Type imports for proper TypeScript usage
type VectorSearchStateType = z.infer<typeof VectorSearchStateSchema>;
type VectorSearchResultsType = z.infer<typeof VectorSearchResultsSchema>;
type VectorSearchMetricsRecordType = z.infer<typeof VectorSearchMetricsRecordSchema>;

// Cache for multi-vector search results
interface VectorSearchCache {
  data: VectorSearchStateType;
  timestamp: number;
  ttl: number;
}

// Result deduplication interface
interface DeduplicationResult {
  uniqueResults: any[];
  duplicatesRemoved: number;
  deduplicationTime: number;
}

// Source attribution interface
interface SourceAttribution {
  resultId: string;
  sources: {
    vectorType: string;
    score: number;
    rank: number;
  }[];
  combinedScore: number;
}

class MultiVectorSearchService {
  private config: MultiVectorSearchConfig;
  private cache: Map<string, VectorSearchCache> = new Map();

  constructor(config?: Partial<MultiVectorSearchConfig>) {
    this.config = {
      ...defaultEnhancedSearchConfig.multiVectorSearch,
      ...config
    };
  }

  /**
   * Initialize the multi-vector search service
   */
  async initialize(): Promise<void> {
    try {
      // Validate Qdrant connection
      await qdrantService.healthCheck();
      
      console.log('Multi-vector search service initialized');
    } catch (error) {
      console.error('Failed to initialize multi-vector search service:', error);
      throw error;
    }
  }

  /**
   * Perform multi-vector search across different vector types
   */
  async searchMultiVector(
    query: string,
    options: {
      limit?: number;
      filter?: Record<string, any>;
      vectorTypes?: string[];
    } = {}
  ): Promise<VectorSearchStateType> {
    const startTime = Date.now();
    const {
      limit = 20,
      filter = {},
      vectorTypes = this.config.vectorTypes
    } = options;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query, JSON.stringify({ limit, filter, vectorTypes }));
      if (this.config.searchTimeout > 0) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Generate query embedding once
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Initialize search results and metrics
      const vectorSearchResults: Record<string, any[]> = {};
      const searchMetrics: Record<string, any> = {};

      // Search across different vector types
      if (this.config.parallelSearchEnabled) {
        // Parallel search for better performance
        const searchPromises = vectorTypes.map(vectorType => 
          this.searchSingleVectorType(queryEmbedding, vectorType, limit, filter)
        );
        
        const results = await Promise.allSettled(searchPromises);
        
        results.forEach((result, index) => {
          const vectorType = vectorTypes[index];
          if (result.status === 'fulfilled') {
            vectorSearchResults[vectorType] = result.value.results;
            searchMetrics[vectorType] = result.value.metrics;
          } else {
            console.warn(`Search failed for vector type ${vectorType}:`, result.reason);
            vectorSearchResults[vectorType] = [];
            searchMetrics[vectorType] = {
              resultCount: 0,
              searchTime: 0,
              avgSimilarity: 0,
              error: result.reason
            };
          }
        });
      } else {
        // Sequential search
        for (const vectorType of vectorTypes) {
          try {
            const result = await this.searchSingleVectorType(queryEmbedding, vectorType, limit, filter);
            vectorSearchResults[vectorType] = result.results;
            searchMetrics[vectorType] = result.metrics;
          } catch (error) {
            console.warn(`Search failed for vector type ${vectorType}:`, error);
            vectorSearchResults[vectorType] = [];
            searchMetrics[vectorType] = {
              resultCount: 0,
              searchTime: 0,
              avgSimilarity: 0,
              error
            };
          }
        }
      }

      // Convert to proper schema format
      const formattedResults = this.formatSearchResults(vectorSearchResults);
      const formattedMetrics = this.formatSearchMetrics(searchMetrics);

      // Merge results based on configured strategy
      const mergeStartTime = Date.now();
      const mergedResults = await this.mergeResults(formattedResults, this.config.mergeStrategy);
      const mergeTime = Date.now() - mergeStartTime;

      // Create vector search state
      const vectorSearchState: VectorSearchStateType = {
        queryEmbedding,
        vectorSearchResults: formattedResults,
        searchMetrics: formattedMetrics,
        mergeStrategy: this.config.mergeStrategy
      };

      // Cache the result
      if (this.config.searchTimeout > 0) {
        this.setCache(cacheKey, vectorSearchState);
      }

      console.log(`Multi-vector search completed in ${Date.now() - startTime}ms (merge: ${mergeTime}ms)`);
      return vectorSearchState;
    } catch (error) {
      console.error('Error in multi-vector search:', error);
      throw error;
    }
  }

  /**
   * Search a single vector type
   */
  private async searchSingleVectorType(
    queryEmbedding: number[],
    vectorType: string,
    limit: number,
    filter: Record<string, any>
  ): Promise<{
    results: any[];
    metrics: {
      resultCount: number;
      searchTime: number;
      avgSimilarity: number;
    };
  }> {
    const startTime = Date.now();
    
    try {
      // Create collection name based on vector type
      const collectionName = `tools_${vectorType}`;
      
      // Search using Qdrant service with timeout
      const searchPromise = qdrantService.searchByEmbedding(
        queryEmbedding,
        Math.min(limit * 2, this.config.maxResultsPerVector), // Get more results for better merging
        filter
      );

      // Apply timeout if configured
      const results = this.config.searchTimeout > 0 
        ? await this.withTimeout(searchPromise, this.config.searchTimeout)
        : await searchPromise;

      const searchTime = Date.now() - startTime;
      const avgSimilarity = results.length > 0 
        ? results.reduce((sum, result) => sum + result.score, 0) / results.length
        : 0;

      return {
        results,
        metrics: {
          resultCount: results.length,
          searchTime,
          avgSimilarity
        }
      };
    } catch (error) {
      console.error(`Error searching ${vectorType} vectors:`, error);
      throw error;
    }
  }

  /**
   * Merge results from different vector types using the specified strategy
   */
  private async mergeResults(
    results: Record<string, any[]>,
    strategy: string
  ): Promise<any[]> {
    switch (strategy) {
      case 'reciprocal_rank_fusion':
        return this.reciprocalRankFusion(results);
      case 'weighted_average':
        return this.weightedAverage(results);
      case 'custom':
        return this.customMergeStrategy(results);
      default:
        return this.reciprocalRankFusion(results);
    }
  }

  /**
   * Reciprocal Rank Fusion (RRF) merging strategy
   */
  private reciprocalRankFusion(results: Record<string, any[]>): any[] {
    const k = this.config.rrfKValue;
    const scoreMap: Record<string, { score: number; result: any; sources: any[] }> = {};

    // Calculate RRF scores
    Object.entries(results).forEach(([vectorType, vectorResults]) => {
      vectorResults.forEach((result, rank) => {
        const resultId = result.id || result.payload?.id || `temp_${Math.random().toString(36).substr(2, 9)}`;
        
        if (!scoreMap[resultId]) {
          scoreMap[resultId] = {
            score: 0,
            result,
            sources: []
          };
        }

        scoreMap[resultId].score += 1 / (k + rank + 1);
        scoreMap[resultId].sources.push({
          vectorType,
          score: result.score,
          rank: rank + 1
        });
      });
    });

    // Sort by RRF score
    const mergedResults = Object.values(scoreMap)
      .sort((a, b) => b.score - a.score)
      .map(item => ({
        ...item.result,
        rrfScore: item.score,
        sources: this.config.sourceAttributionEnabled ? item.sources : undefined
      }));

    // Apply deduplication if enabled
    if (this.config.deduplicationEnabled) {
      return this.deduplicateResults(mergedResults).uniqueResults;
    }

    return mergedResults;
  }

  /**
   * Weighted average merging strategy
   */
  private weightedAverage(results: Record<string, any[]>): any[] {
    const scoreMap: Record<string, { weightedScore: number; result: any; sources: any[] }> = {};
    
    // Define weights for different vector types (can be made configurable)
    const weights: Record<string, number> = {
      semantic: 1.0,
      categories: 0.8,
      functionality: 0.7,
      aliases: 0.6,
      composites: 0.5
    };

    // Calculate weighted scores
    Object.entries(results).forEach(([vectorType, vectorResults]) => {
      const weight = weights[vectorType] || 0.5;
      
      vectorResults.forEach(result => {
        const resultId = result.id || result.payload?.id || `temp_${Math.random().toString(36).substr(2, 9)}`;
        
        if (!scoreMap[resultId]) {
          scoreMap[resultId] = {
            weightedScore: 0,
            result,
            sources: []
          };
        }

        scoreMap[resultId].weightedScore += result.score * weight;
        scoreMap[resultId].sources.push({
          vectorType,
          score: result.score,
          weightedScore: result.score * weight
        });
      });
    });

    // Sort by weighted score
    const mergedResults = Object.values(scoreMap)
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .map(item => ({
        ...item.result,
        weightedScore: item.weightedScore,
        sources: this.config.sourceAttributionEnabled ? item.sources : undefined
      }));

    // Apply deduplication if enabled
    if (this.config.deduplicationEnabled) {
      return this.deduplicateResults(mergedResults).uniqueResults;
    }

    return mergedResults;
  }

  /**
   * Custom merge strategy (can be extended based on specific requirements)
   */
  private customMergeStrategy(results: Record<string, any[]>): any[] {
    // This is a placeholder for a custom strategy
    // Can be extended to implement domain-specific merging logic
    
    // For now, fall back to RRF
    return this.reciprocalRankFusion(results);
  }

  /**
   * Deduplicate results based on similarity threshold
   */
  private deduplicateResults(results: any[]): DeduplicationResult {
    const startTime = Date.now();
    const uniqueResults: any[] = [];
    const seenIds = new Set<string>();
    let duplicatesRemoved = 0;

    for (const result of results) {
      const resultId = result.id || result.payload?.id;
      
      if (resultId) {
        if (!seenIds.has(resultId)) {
          seenIds.add(resultId);
          uniqueResults.push(result);
        } else {
          duplicatesRemoved++;
        }
      } else {
        // For results without IDs, use content-based deduplication
        const contentHash = this.generateContentHash(result);
        if (!seenIds.has(contentHash)) {
          seenIds.add(contentHash);
          uniqueResults.push(result);
        } else {
          duplicatesRemoved++;
        }
      }
    }

    const deduplicationTime = Date.now() - startTime;
    
    return {
      uniqueResults,
      duplicatesRemoved,
      deduplicationTime
    };
  }

  /**
   * Generate content hash for deduplication
   */
  private generateContentHash(result: any): string {
    const content = result.payload?.name || result.payload?.description || '';
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  /**
   * Format search results to match schema
   */
  private formatSearchResults(results: Record<string, any[]>): z.infer<typeof VectorSearchResultsSchema> {
    const formattedResults: any = {
      semantic: [],
      categories: [],
      functionality: [],
      aliases: [],
      composites: []
    };

    Object.entries(results).forEach(([vectorType, vectorResults]) => {
      if (formattedResults[vectorType] !== undefined) {
        formattedResults[vectorType] = vectorResults;
      }
    });

    return VectorSearchResultsSchema.parse(formattedResults);
  }

  /**
   * Format search metrics to match schema
   */
  private formatSearchMetrics(metrics: Record<string, any>): z.infer<typeof VectorSearchMetricsRecordSchema> {
    const formattedMetrics: Record<string, any> = {};

    Object.entries(metrics).forEach(([vectorType, metric]) => {
      formattedMetrics[vectorType] = {
        resultCount: metric.resultCount || 0,
        searchTime: metric.searchTime || 0,
        avgSimilarity: metric.avgSimilarity || 0
      };
    });

    return VectorSearchMetricsRecordSchema.parse(formattedMetrics);
  }

  /**
   * Apply timeout to a promise
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Generate cache key for search results
   */
  private generateCacheKey(query: string, options: string): string {
    const combined = `${query}:${options}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `mv_search_${Math.abs(hash)}`;
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string): VectorSearchStateType | null {
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
  private setCache(key: string, data: VectorSearchStateType): void {
    // Set TTL based on configuration (default 1 hour)
    const ttl = 3600000; // 1 hour in milliseconds
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
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
   * Health check for multi-vector search service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {
      qdrantConnection: 'unknown',
      cacheSize: this.cache.size,
      vectorTypes: this.config.vectorTypes,
      mergeStrategy: this.config.mergeStrategy
    };

    try {
      // Check Qdrant connection
      await qdrantService.healthCheck();
      details.qdrantConnection = 'connected';
      
      return {
        status: 'healthy',
        details
      };
    } catch (error) {
      details.qdrantConnection = 'failed';
      details.error = error instanceof Error ? error.message : String(error);
      
      return {
        status: 'unhealthy',
        details
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MultiVectorSearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): MultiVectorSearchConfig {
    return { ...this.config };
  }

  /**
   * Get available vector types for searching
   */
  getAvailableVectorTypes(): string[] {
    return [...this.config.vectorTypes];
  }

  /**
   * Get performance metrics for the last search
   */
  getLastSearchMetrics(): {
    totalSearchTime: number;
    vectorTypeMetrics: Record<string, any>;
    mergeTime: number;
  } | null {
    // This would need to be implemented with proper tracking
    return null;
  }
}

// Export singleton instance
export const multiVectorSearchService = new MultiVectorSearchService();

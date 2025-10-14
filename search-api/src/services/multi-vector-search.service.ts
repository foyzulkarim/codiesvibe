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
import {
  ResultDeduplicator,
  DeduplicationResult,
  createMultiVectorDeduplicationConfig,
  DeduplicationPerformanceMonitor,
  mergeResultsWithRRF
} from '@/utils/result-deduplication';

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


// Enhanced source attribution interface
interface SourceAttribution {
  resultId: string;
  sources: {
    vectorType: string;
    score: number;
    rank: number;
    weight: number;
  }[];
  combinedScore: number;
  rrfScore: number;
  weightedScore: number;
}

// Performance metrics for each vector type
interface VectorTypePerformanceMetrics {
  vectorType: string;
  searchTime: number;
  resultCount: number;
  avgSimilarity: number;
  cacheHitRate: number;
  errorCount: number;
  timeoutCount: number;
}

// Merge strategy configuration
interface MergeStrategyConfig {
  strategy: 'reciprocal_rank_fusion' | 'weighted_average' | 'custom' | 'hybrid';
  rrfKValue: number;
  vectorWeights: Record<string, number>;
  diversityThreshold: number;
  maxResults: number;
}

// Search result with enhanced metadata
interface EnhancedSearchResult {
  id: string;
  score: number;
  payload: any;
  vectorType: string;
  rank: number;
  originalScore: number;
  attribution?: SourceAttribution;
}

class MultiVectorSearchService {
  private config: MultiVectorSearchConfig;
  private cache: Map<string, VectorSearchCache> = new Map();
  private performanceMetrics: Map<string, VectorTypePerformanceMetrics> = new Map();
  private deduplicator: ResultDeduplicator;
  private deduplicationMonitor: DeduplicationPerformanceMonitor;
  private lastSearchMetrics: {
    totalSearchTime: number;
    vectorTypeMetrics: Record<string, any>;
    mergeTime: number;
    deduplicationTime: number;
    cacheHitRate: number;
  } | null = null;

  constructor(config?: Partial<MultiVectorSearchConfig>) {
    this.config = {
      ...defaultEnhancedSearchConfig.multiVectorSearch,
      ...config
    };
    
    // Initialize enhanced deduplicator with RRF configuration
    const deduplicationConfig = createMultiVectorDeduplicationConfig({
      similarityThreshold: this.config.deduplicationThreshold,
      rrfKValue: this.config.rrfKValue,
      enableScoreMerging: this.config.sourceAttributionEnabled,
      enableSourceAttribution: this.config.sourceAttributionEnabled,
      batchSize: 100,
      enableParallelProcessing: false
    });
    
    this.deduplicator = new ResultDeduplicator(deduplicationConfig);
    this.deduplicationMonitor = new DeduplicationPerformanceMonitor();
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
   * Perform multi-vector search across different vector types with enhanced result merging
   */
  async searchMultiVector(
    query: string,
    options: {
      limit?: number;
      filter?: Record<string, any>;
      vectorTypes?: string[];
      mergeStrategy?: string;
      rrfKValue?: number;
      enableSourceAttribution?: boolean;
    } = {}
  ): Promise<VectorSearchStateType> {
    const startTime = Date.now();
    const {
      limit = 20,
      filter = {},
      vectorTypes = this.config.vectorTypes,
      mergeStrategy = this.config.mergeStrategy,
      rrfKValue = this.config.rrfKValue,
      enableSourceAttribution = this.config.sourceAttributionEnabled
    } = options;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query, JSON.stringify({ limit, filter, vectorTypes, mergeStrategy, rrfKValue }));
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.updateCacheMetrics(true);
        return cached;
      }
      this.updateCacheMetrics(false);

      // Generate query embedding once
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Initialize search results and metrics
      const vectorSearchResults: Record<string, EnhancedSearchResult[]> = {};
      const searchMetrics: Record<string, any> = {};

      // Enhanced parallel search across vector types
      const searchStartTime = Date.now();
      if (this.config.parallelSearchEnabled) {
        await this.performParallelSearch(queryEmbedding, vectorTypes, limit, filter, vectorSearchResults, searchMetrics);
      } else {
        await this.performSequentialSearch(queryEmbedding, vectorTypes, limit, filter, vectorSearchResults, searchMetrics);
      }
      const totalSearchTime = Date.now() - searchStartTime;

      // Update performance metrics
      this.updatePerformanceMetrics(vectorTypes, searchMetrics);

      // Convert to proper schema format
      const formattedResults = this.formatSearchResults(vectorSearchResults);
      const formattedMetrics = this.formatSearchMetrics(searchMetrics);

      // Enhanced result merging with configurable strategies
      const mergeStartTime = Date.now();
      const mergeConfig: MergeStrategyConfig = {
        strategy: mergeStrategy as any,
        rrfKValue,
        vectorWeights: this.getVectorWeights(),
        diversityThreshold: 0.7,
        maxResults: limit
      };
      
      const mergedResults = await this.mergeResultsWithStrategy(formattedResults, mergeConfig, enableSourceAttribution);
      const mergeTime = Date.now() - mergeStartTime;

      // Enhanced deduplication with RRF
      const dedupStartTime = Date.now();
      const deduplicationResult = this.performEnhancedDeduplication(mergedResults);
      const dedupTime = Date.now() - dedupStartTime;
      
      // Record deduplication metrics
      this.recordDeduplicationMetrics(deduplicationResult, dedupTime);

      // Create enhanced vector search state
      const vectorSearchState: VectorSearchStateType = {
        queryEmbedding,
        vectorSearchResults: formattedResults,
        searchMetrics: formattedMetrics,
        mergeStrategy: mergeStrategy as any
      };

      // Update last search metrics
      this.lastSearchMetrics = {
        totalSearchTime,
        vectorTypeMetrics: searchMetrics,
        mergeTime,
        deduplicationTime: dedupTime,
        cacheHitRate: this.getCacheHitRate()
      };

      // Cache the result
      this.setCache(cacheKey, vectorSearchState);

      console.log(`🔍 Enhanced multi-vector search completed in ${Date.now() - startTime}ms (search: ${totalSearchTime}ms, merge: ${mergeTime}ms, dedup: ${dedupTime}ms)`);
      console.log(`📊 Results: ${Object.values(vectorSearchResults).reduce((sum, results) => sum + results.length, 0)} total, ${deduplicationResult.uniqueResults.length} unique after deduplication`);
      
      return vectorSearchState;
    } catch (error) {
      console.error('❌ Error in enhanced multi-vector search:', error);
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
    const config: MergeStrategyConfig = {
      strategy: strategy as any,
      rrfKValue: this.config.rrfKValue,
      vectorWeights: this.getVectorWeights(),
      diversityThreshold: 0.7,
      maxResults: 20
    };
    
    return this.mergeResultsWithStrategy(results, config, this.config.sourceAttributionEnabled);
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
      const deduplicationResult = this.performEnhancedDeduplication(mergedResults);
      return deduplicationResult.uniqueResults;
    }

    return mergedResults;
  }

  /**
   * Enhanced parallel search across vector types with timeout handling
   */
  private async performParallelSearch(
    queryEmbedding: number[],
    vectorTypes: string[],
    limit: number,
    filter: Record<string, any>,
    vectorSearchResults: Record<string, EnhancedSearchResult[]>,
    searchMetrics: Record<string, any>
  ): Promise<void> {
    const searchPromises = vectorTypes.map(vectorType =>
      this.searchSingleVectorTypeEnhanced(queryEmbedding, vectorType, limit, filter)
    );
    
    const results = await Promise.allSettled(searchPromises);
    
    results.forEach((result, index) => {
      const vectorType = vectorTypes[index];
      if (result.status === 'fulfilled') {
        vectorSearchResults[vectorType] = result.value.results;
        searchMetrics[vectorType] = result.value.metrics;
      } else {
        console.warn(`⚠️ Search failed for vector type ${vectorType}:`, result.reason);
        vectorSearchResults[vectorType] = [];
        searchMetrics[vectorType] = {
          resultCount: 0,
          searchTime: 0,
          avgSimilarity: 0,
          error: result.reason
        };
        this.updateErrorMetrics(vectorType);
      }
    });
  }

  /**
   * Enhanced sequential search across vector types
   */
  private async performSequentialSearch(
    queryEmbedding: number[],
    vectorTypes: string[],
    limit: number,
    filter: Record<string, any>,
    vectorSearchResults: Record<string, EnhancedSearchResult[]>,
    searchMetrics: Record<string, any>
  ): Promise<void> {
    for (const vectorType of vectorTypes) {
      try {
        const result = await this.searchSingleVectorTypeEnhanced(queryEmbedding, vectorType, limit, filter);
        vectorSearchResults[vectorType] = result.results;
        searchMetrics[vectorType] = result.metrics;
      } catch (error) {
        console.warn(`⚠️ Search failed for vector type ${vectorType}:`, error);
        vectorSearchResults[vectorType] = [];
        searchMetrics[vectorType] = {
          resultCount: 0,
          searchTime: 0,
          avgSimilarity: 0,
          error
        };
        this.updateErrorMetrics(vectorType);
      }
    }
  }

  /**
   * Enhanced single vector type search with additional metadata
   */
  private async searchSingleVectorTypeEnhanced(
    queryEmbedding: number[],
    vectorType: string,
    limit: number,
    filter: Record<string, any>
  ): Promise<{
    results: EnhancedSearchResult[];
    metrics: {
      resultCount: number;
      searchTime: number;
      avgSimilarity: number;
    };
  }> {
    const startTime = Date.now();
    
    try {
      // Use Qdrant service's searchByVectorType for named vector support
      const searchPromise = qdrantService.searchByVectorType(
        queryEmbedding,
        vectorType,
        Math.min(limit * 2, this.config.maxResultsPerVector),
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

      // Enhance results with additional metadata
      const enhancedResults: EnhancedSearchResult[] = results.map((result, index) => ({
        id: result.id || result.payload?.id,
        score: result.score,
        payload: result.payload,
        vectorType,
        rank: index + 1,
        originalScore: result.score
      }));

      return {
        results: enhancedResults,
        metrics: {
          resultCount: results.length,
          searchTime,
          avgSimilarity
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        this.updateTimeoutMetrics(vectorType);
      }
      throw error;
    }
  }

  /**
   * Enhanced result merging with multiple strategies
   */
  private async mergeResultsWithStrategy(
    results: Record<string, any[]>,
    config: MergeStrategyConfig,
    enableSourceAttribution: boolean
  ): Promise<any[]> {
    switch (config.strategy) {
      case 'reciprocal_rank_fusion':
        return this.reciprocalRankFusionEnhanced(results, config, enableSourceAttribution);
      case 'weighted_average':
        return this.weightedAverageEnhanced(results, config, enableSourceAttribution);
      case 'hybrid':
        return this.hybridMergeStrategy(results, config, enableSourceAttribution);
      case 'custom':
        return this.customMergeStrategy(results, config, enableSourceAttribution);
      default:
        return this.reciprocalRankFusionEnhanced(results, config, enableSourceAttribution);
    }
  }

  /**
   * Enhanced Reciprocal Rank Fusion (RRF) with k=60 and source attribution
   */
  private reciprocalRankFusionEnhanced(
    results: Record<string, any[]>,
    config: MergeStrategyConfig,
    enableSourceAttribution: boolean
  ): any[] {
    // Use the enhanced RRF utility function
    const rrfResults = mergeResultsWithRRF(
      results,
      config.rrfKValue,
      config.vectorWeights,
      enableSourceAttribution
    );

    // Convert to expected format and apply diversity filtering
    let mergedResults = rrfResults.map(item => ({
      ...item.result,
      rrfScore: item.rrfScore,
      weightedScore: item.weightedScore,
      sources: enableSourceAttribution ? item.sources : undefined,
      mergedFromCount: item.mergedFromCount
    }));

    // Apply diversity filtering to ensure result variety
    mergedResults = this.applyDiversityFiltering(mergedResults, config.diversityThreshold);

    // Limit results
    return mergedResults.slice(0, config.maxResults);
  }

  /**
   * Enhanced weighted average merging strategy
   */
  private weightedAverageEnhanced(
    results: Record<string, any[]>,
    config: MergeStrategyConfig,
    enableSourceAttribution: boolean
  ): any[] {
    const scoreMap: Record<string, {
      weightedScore: number;
      result: any;
      sources: any[];
      totalWeight: number;
    }> = {};

    // Calculate weighted scores with enhanced attribution
    Object.entries(results).forEach(([vectorType, vectorResults]) => {
      const weight = config.vectorWeights[vectorType] || 1.0;
      
      vectorResults.forEach(result => {
        const resultId = result.id || result.payload?.id || `temp_${Math.random().toString(36).substr(2, 9)}`;
        
        if (!scoreMap[resultId]) {
          scoreMap[resultId] = {
            weightedScore: 0,
            totalWeight: 0,
            result,
            sources: []
          };
        }

        scoreMap[resultId].weightedScore += result.score * weight;
        scoreMap[resultId].totalWeight += weight;
        
        scoreMap[resultId].sources.push({
          vectorType,
          score: result.score,
          weightedScore: result.score * weight,
          weight
        });
      });
    });

    // Normalize by total weight and sort
    let mergedResults = Object.values(scoreMap)
      .map(item => ({
        ...item.result,
        weightedScore: item.totalWeight > 0 ? item.weightedScore / item.totalWeight : 0,
        sources: enableSourceAttribution ? item.sources : undefined
      }))
      .sort((a, b) => b.weightedScore - a.weightedScore);

    // Apply diversity filtering
    mergedResults = this.applyDiversityFiltering(mergedResults, config.diversityThreshold);

    return mergedResults.slice(0, config.maxResults);
  }

  /**
   * Hybrid merge strategy combining RRF and weighted average
   */
  private hybridMergeStrategy(
    results: Record<string, any[]>,
    config: MergeStrategyConfig,
    enableSourceAttribution: boolean
  ): any[] {
    // Get results from both strategies
    const rrfResults = this.reciprocalRankFusionEnhanced(results, config, enableSourceAttribution);
    const weightedResults = this.weightedAverageEnhanced(results, config, enableSourceAttribution);

    // Combine and re-rank
    const combinedMap: Record<string, any> = {};
    
    // Add RRF results
    rrfResults.forEach((result, index) => {
      const resultId = result.id || result.payload?.id;
      if (resultId) {
        combinedMap[resultId] = {
          ...result,
          rrfRank: index + 1,
          hybridScore: result.rrfScore || result.weightedScore
        };
      }
    });

    // Add weighted average results and update hybrid score
    weightedResults.forEach((result, index) => {
      const resultId = result.id || result.payload?.id;
      if (resultId && combinedMap[resultId]) {
        combinedMap[resultId].weightedRank = index + 1;
        combinedMap[resultId].hybridScore = (
          (combinedMap[resultId].rrfScore || 0) * 0.6 +
          (result.weightedScore || 0) * 0.4
        );
      } else if (resultId) {
        combinedMap[resultId] = {
          ...result,
          weightedRank: index + 1,
          hybridScore: result.weightedScore
        };
      }
    });

    // Sort by hybrid score
    return Object.values(combinedMap)
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, config.maxResults);
  }

  /**
   * Custom merge strategy with domain-specific logic
   */
  private customMergeStrategy(
    results: Record<string, any[]>,
    config: MergeStrategyConfig,
    enableSourceAttribution: boolean
  ): any[] {
    // For now, fall back to enhanced RRF
    // This can be extended with domain-specific merging logic
    return this.reciprocalRankFusionEnhanced(results, config, enableSourceAttribution);
  }

  /**
   * Apply diversity filtering to ensure result variety
   */
  private applyDiversityFiltering(results: any[], threshold: number): any[] {
    if (threshold <= 0) return results;

    const diverseResults: any[] = [];
    const seenCategories = new Set<string>();
    const seenNames = new Set<string>();

    for (const result of results) {
      const category = result.payload?.category;
      const name = result.payload?.name;

      // Check if result is diverse enough
      let isDiverse = true;
      
      if (category && seenCategories.has(category)) {
        const categorySimilarity = this.calculateCategorySimilarity(result, diverseResults);
        if (categorySimilarity > threshold) isDiverse = false;
      }

      if (name && seenNames.has(name)) {
        isDiverse = false;
      }

      if (isDiverse) {
        diverseResults.push(result);
        if (category) seenCategories.add(category);
        if (name) seenNames.add(name);
      }

      if (diverseResults.length >= results.length) break;
    }

    return diverseResults;
  }

  /**
   * Calculate category similarity for diversity filtering
   */
  private calculateCategorySimilarity(result: any, existingResults: any[]): number {
    const resultCategory = result.payload?.category;
    if (!resultCategory) return 0;

    const similarCount = existingResults.filter(r =>
      r.payload?.category === resultCategory
    ).length;

    return similarCount / existingResults.length;
  }

  /**
   * Enhanced deduplication using the dedicated deduplicator utility with RRF
   */
  private performEnhancedDeduplication(results: any[]): DeduplicationResult {
    // Update deduplicator configuration if needed
    const currentConfig = this.deduplicator.getConfig();
    if (currentConfig.similarityThreshold !== this.config.deduplicationThreshold) {
      this.deduplicator.updateConfig({
        similarityThreshold: this.config.deduplicationThreshold,
        rrfKValue: this.config.rrfKValue,
        enableSourceAttribution: this.config.sourceAttributionEnabled
      });
    }
    
    return this.deduplicator.deduplicate(results);
  }

  /**
   * Record deduplication performance metrics
   */
  private recordDeduplicationMetrics(result: DeduplicationResult, processingTime: number): void {
    const metrics = {
      totalProcessed: result.totalResultsProcessed,
      uniqueResults: result.uniqueResults.length,
      duplicatesRemoved: result.duplicatesRemoved,
      processingTime,
      averageSimilarityScore: result.averageMergedScore,
      batchCount: Math.ceil(result.totalResultsProcessed / this.deduplicator.getConfig().batchSize)
    };
    
    this.deduplicationMonitor.recordMetrics(metrics);
  }

  /**
   * Calculate content similarity between two results
   */
  private calculateContentSimilarity(result1: any, result2: any): number {
    const name1 = (result1.payload?.name || '').toLowerCase();
    const name2 = (result2.payload?.name || '').toLowerCase();
    const desc1 = (result1.payload?.description || '').toLowerCase();
    const desc2 = (result2.payload?.description || '').toLowerCase();

    // Simple similarity calculation (can be enhanced with more sophisticated methods)
    const nameSimilarity = name1 === name2 ? 1.0 : 0.0;
    const descSimilarity = this.calculateStringSimilarity(desc1, desc2);
    
    return (nameSimilarity * 0.7 + descSimilarity * 0.3);
  }

  /**
   * Calculate string similarity using Jaccard similarity
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set(Array.from(words1).concat(Array.from(words2)));
    
    return intersection.size / union.size;
  }

  /**
   * Get vector weights for merging strategies
   */
  private getVectorWeights(): Record<string, number> {
    return {
      semantic: 1.0,
      categories: 0.8,
      functionality: 0.7,
      aliases: 0.6,
      composites: 0.5
    };
  }

  /**
   * Update performance metrics for vector types
   */
  private updatePerformanceMetrics(vectorTypes: string[], searchMetrics: Record<string, any>): void {
    vectorTypes.forEach(vectorType => {
      const metrics = searchMetrics[vectorType];
      if (!metrics) return;

      const existing = this.performanceMetrics.get(vectorType) || {
        vectorType,
        searchTime: 0,
        resultCount: 0,
        avgSimilarity: 0,
        cacheHitRate: 0,
        errorCount: 0,
        timeoutCount: 0
      };

      // Update with exponential moving average
      const alpha = 0.3; // Smoothing factor
      existing.searchTime = existing.searchTime * (1 - alpha) + metrics.searchTime * alpha;
      existing.resultCount = existing.resultCount * (1 - alpha) + metrics.resultCount * alpha;
      existing.avgSimilarity = existing.avgSimilarity * (1 - alpha) + metrics.avgSimilarity * alpha;

      this.performanceMetrics.set(vectorType, existing);
    });
  }

  /**
   * Update error metrics for vector types
   */
  private updateErrorMetrics(vectorType: string): void {
    const existing = this.performanceMetrics.get(vectorType) || {
      vectorType,
      searchTime: 0,
      resultCount: 0,
      avgSimilarity: 0,
      cacheHitRate: 0,
      errorCount: 0,
      timeoutCount: 0
    };

    existing.errorCount += 1;
    this.performanceMetrics.set(vectorType, existing);
  }

  /**
   * Update timeout metrics for vector types
   */
  private updateTimeoutMetrics(vectorType: string): void {
    const existing = this.performanceMetrics.get(vectorType) || {
      vectorType,
      searchTime: 0,
      resultCount: 0,
      avgSimilarity: 0,
      cacheHitRate: 0,
      errorCount: 0,
      timeoutCount: 0
    };

    existing.timeoutCount += 1;
    this.performanceMetrics.set(vectorType, existing);
  }

  /**
   * Update cache metrics
   */
  private updateCacheMetrics(hit: boolean): void {
    // This would update cache hit/miss tracking
    // Implementation depends on the specific caching strategy
  }

  /**
   * Get cache hit rate
   */
  private getCacheHitRate(): number {
    // This would calculate the actual cache hit rate
    // For now, return a placeholder
    return 0.0;
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
    
    // Update deduplicator configuration if deduplication settings changed
    if (newConfig.deduplicationThreshold !== undefined) {
      this.deduplicator.updateConfig({
        similarityThreshold: newConfig.deduplicationThreshold
      });
    }
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
    deduplicationTime: number;
    cacheHitRate: number;
  } | null {
    return this.lastSearchMetrics;
  }

  /**
   * Get performance metrics for all vector types
   */
  getVectorTypeMetrics(): VectorTypePerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics.clear();
    this.lastSearchMetrics = null;
  }

  /**
   * Get detailed performance report
   */
  getPerformanceReport(): {
    vectorTypes: VectorTypePerformanceMetrics[];
    lastSearch: typeof this.lastSearchMetrics;
    cacheStats: ReturnType<typeof this.getCacheStats>;
    config: MultiVectorSearchConfig;
    deduplicationMetrics: ReturnType<typeof this.deduplicationMonitor.getAverageMetrics>;
  } {
    return {
      vectorTypes: this.getVectorTypeMetrics(),
      lastSearch: this.lastSearchMetrics,
      cacheStats: this.getCacheStats(),
      config: this.getConfig(),
      deduplicationMetrics: this.deduplicationMonitor.getAverageMetrics()
    };
  }

  /**
   * Get deduplication performance metrics
   */
  getDeduplicationMetrics(): {
    current: ReturnType<typeof this.deduplicationMonitor.getMetrics>;
    average: ReturnType<typeof this.deduplicationMonitor.getAverageMetrics>;
  } {
    return {
      current: this.deduplicationMonitor.getMetrics(),
      average: this.deduplicationMonitor.getAverageMetrics()
    };
  }

  /**
   * Reset deduplication performance metrics
   */
  resetDeduplicationMetrics(): void {
    this.deduplicationMonitor.clear();
  }
}

// Export singleton instance
export const multiVectorSearchService = new MultiVectorSearchService();

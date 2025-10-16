import { 
  qdrantService, 
  multiVectorSearchService, 
  resultMergerService, 
  duplicateDetectionService 
} from './index';
import { embeddingService } from './embedding.service';
import { 
  EnhancedSearchRequest, 
  EnhancedSearchResponse, 
  EnhancedSearchConfig,
  SearchSourceConfig 
} from '@/dto/enhanced-search.dto';
import { 
  SearchResultItem, 
  RankedResults, 
  MergedResult, 
  MergeConfig 
} from './result-merger.service';
import { 
  DuplicateDetectionConfig,
  DetectionStrategy 
} from './duplicate-detection.interfaces';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Search Service
 * 
 * This service coordinates between different search sources, applies result merging
 * using reciprocal rank fusion, and performs duplicate detection to provide
 * unified, ranked search results.
 */
export class EnhancedSearchService {
  private config: EnhancedSearchConfig;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor(config?: Partial<EnhancedSearchConfig>) {
    this.config = {
      defaultSources: {
        vector: { enabled: true, weight: 1.0, timeout: 3000 },
        traditional: { enabled: true, weight: 0.9, timeout: 2000 },
        hybrid: { enabled: true, weight: 0.95, timeout: 4000 },
      },
      defaultMergeStrategy: 'reciprocal_rank_fusion',
      defaultDuplicateDetection: true,
      maxConcurrentSearches: 5,
      defaultTimeout: 5000,
      enableCache: true,
      cacheTTL: 300000, // 5 minutes
      ...config
    };
  }

  /**
   * Perform enhanced search across multiple sources with result merging and duplicate detection
   */
  async search(request: EnhancedSearchRequest): Promise<EnhancedSearchResponse> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      console.log(`🔍 [${requestId}] Starting enhanced search for: "${request.query}"`);
      
      // Check cache first if enabled
      if (request.options.performance.enableCache && this.config.enableCache) {
        const cached = this.getFromCache(request);
        if (cached) {
          console.log(`📋 [${requestId}] Cache hit, returning cached results`);
          return {
            ...cached,
            requestId,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // Determine which sources to search
      const sourcesToSearch = this.determineSourcesToSearch(request);
      console.log(`📡 [${requestId}] Searching sources: ${sourcesToSearch.join(', ')}`);

      // Execute searches in parallel
      const searchResults = await this.executeParallelSearches(request, sourcesToSearch, requestId);
      const searchTime = Date.now() - startTime;

      // Merge results using reciprocal rank fusion
      const mergeStartTime = Date.now();
      const mergedResults = await this.mergeResults(searchResults, request);
      const mergeTime = Date.now() - mergeStartTime;

      // Apply duplicate detection
      const dedupStartTime = Date.now();
      const deduplicatedResults = await this.applyDuplicateDetection(mergedResults, request);
      const dedupTime = Date.now() - dedupStartTime;

      // Apply pagination and sorting
      const finalResults = this.applyPaginationAndSorting(deduplicatedResults, request);

      // Calculate final metrics
      const totalProcessingTime = Date.now() - startTime;
      
      // Build response
      const response: EnhancedSearchResponse = {
        query: request.query,
        requestId,
        timestamp: new Date().toISOString(),
        summary: {
          totalResults: deduplicatedResults.length,
          returnedResults: finalResults.length,
          processingTime: totalProcessingTime,
          sourcesSearched: sourcesToSearch,
          duplicatesRemoved: mergedResults.length - deduplicatedResults.length,
          searchStrategy: request.options.mergeOptions.strategy,
        },
        results: finalResults,
        sourceAttribution: this.buildSourceAttribution(searchResults),
        duplicateDetection: request.options.duplicateDetectionOptions.enabled ? {
          enabled: true,
          duplicatesRemoved: mergedResults.length - deduplicatedResults.length,
          duplicateGroups: Math.floor((mergedResults.length - deduplicatedResults.length) / 2) || 0,
          strategies: request.options.duplicateDetectionOptions.strategies,
          processingTime: dedupTime,
        } : undefined,
        metrics: {
          totalProcessingTime,
          searchTime,
          mergeTime,
          deduplicationTime: dedupTime,
          cacheHitRate: 0, // TODO: Implement cache hit rate tracking
        },
        debug: request.options.debug ? {
          executionPath: ['enhanced-search', 'parallel-search', 'merge-results', 'duplicate-detection'],
          sourceMetrics: this.buildSourceMetrics(searchResults),
          mergeConfig: request.options.mergeOptions,
          duplicateDetectionConfig: request.options.duplicateDetectionOptions,
        } : undefined,
        pagination: {
          page: request.options.pagination.page,
          limit: request.options.pagination.limit,
          totalPages: Math.ceil(deduplicatedResults.length / request.options.pagination.limit),
          hasNext: request.options.pagination.page * request.options.pagination.limit < deduplicatedResults.length,
          hasPrev: request.options.pagination.page > 1,
        },
      };

      // Cache results if enabled
      if (request.options.performance.enableCache && this.config.enableCache) {
        this.setCache(request, response);
      }

      console.log(`✅ [${requestId}] Enhanced search completed in ${totalProcessingTime}ms`);
      console.log(`📊 [${requestId}] Results: ${finalResults.length} returned, ${mergedResults.length - deduplicatedResults.length} duplicates removed`);

      return response;
    } catch (error) {
      console.error(`❌ [${requestId}] Enhanced search failed:`, error);
      throw error;
    }
  }

  /**
   * Determine which search sources to use based on request configuration
   */
  private determineSourcesToSearch(request: EnhancedSearchRequest): string[] {
    const sources: string[] = [];
    
    if (request.options.sources.vector) {
      sources.push('vector');
    }
    
    if (request.options.sources.traditional) {
      sources.push('traditional');
    }
    
    if (request.options.sources.hybrid) {
      sources.push('hybrid');
    }

    // If no sources specified, use all enabled sources
    if (sources.length === 0) {
      return Object.keys(this.config.defaultSources).filter(
        source => this.config.defaultSources[source].enabled
      );
    }

    return sources;
  }

  /**
   * Execute searches across multiple sources in parallel
   */
  private async executeParallelSearches(
    request: EnhancedSearchRequest, 
    sources: string[], 
    requestId: string
  ): Promise<RankedResults[]> {
    const searchPromises = sources.map(source => 
      this.executeSingleSearch(request, source, requestId)
        .catch(error => {
          console.warn(`⚠️ [${requestId}] Search failed for source ${source}:`, error.message);
          return {
            source,
            results: [],
            totalResults: 0,
            searchTime: 0,
            metadata: { error: error.message }
          };
        })
    );

    const results = await Promise.allSettled(searchPromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<RankedResults> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Execute a single search for a specific source
   */
  private async executeSingleSearch(
    request: EnhancedSearchRequest, 
    source: string, 
    requestId: string
  ): Promise<RankedResults> {
    const startTime = Date.now();
    const sourceConfig = this.config.defaultSources[source];
    
    if (!sourceConfig || !sourceConfig.enabled) {
      throw new Error(`Source ${source} is not enabled`);
    }

    console.log(`🔎 [${requestId}] Executing ${source} search...`);

    let results: SearchResultItem[] = [];

    switch (source) {
      case 'vector':
        results = await this.executeVectorSearch(request);
        break;
      case 'traditional':
        results = await this.executeTraditionalSearch(request);
        break;
      case 'hybrid':
        results = await this.executeHybridSearch(request);
        break;
      default:
        throw new Error(`Unknown search source: ${source}`);
    }

    const searchTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] ${source} search completed in ${searchTime}ms with ${results.length} results`);

    return {
      source,
      results,
      totalResults: results.length,
      searchTime,
      metadata: {
        weight: sourceConfig.weight,
        timeout: sourceConfig.timeout,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Execute vector search using multi-vector search service
   */
  private async executeVectorSearch(request: EnhancedSearchRequest): Promise<SearchResultItem[]> {
    const vectorOptions = request.options.vectorOptions;
    
    // Use multi-vector search service
    const multiVectorResult = await multiVectorSearchService.searchMultiVector(
      request.query,
      {
        limit: vectorOptions.limit,
        filter: vectorOptions.filter,
        vectorTypes: vectorOptions.vectorTypes,
        mergeStrategy: request.options.mergeOptions.strategy,
        rrfKValue: request.options.mergeOptions.rrfKValue,
        enableSourceAttribution: request.options.includeSourceAttribution,
      }
    );

    // Convert multi-vector results to SearchResultItem format
    const allResults: SearchResultItem[] = [];
    
    Object.entries(multiVectorResult.vectorSearchResults).forEach(([vectorType, results]) => {
      results.forEach((result, index) => {
        allResults.push({
          id: result.id,
          score: result.score,
          payload: result.payload,
          metadata: {
            vectorType,
            rank: index + 1,
            originalScore: result.score,
            source: 'vector'
          },
          source: 'vector'
        });
      });
    });

    return allResults;
  }

  /**
   * Execute traditional search (placeholder implementation)
   */
  private async executeTraditionalSearch(request: EnhancedSearchRequest): Promise<SearchResultItem[]> {
    // This is a placeholder for traditional search implementation
    // In a real implementation, this could use MongoDB text search, Elasticsearch, etc.
    
    // For now, we'll use basic Qdrant text search as a fallback
    const results = await qdrantService.searchByText(
      request.query,
      request.options.vectorOptions.limit,
      request.options.vectorOptions.filter
    );

    return results.map((result, index) => ({
      id: result.id,
      score: result.score,
      payload: result.payload,
      metadata: {
        rank: index + 1,
        originalScore: result.score,
        source: 'traditional'
      },
      source: 'traditional'
    }));
  }

  /**
   * Execute hybrid search combining vector and traditional approaches
   */
  private async executeHybridSearch(request: EnhancedSearchRequest): Promise<SearchResultItem[]> {
    // For hybrid search, we'll use the multi-vector search with enhanced configuration
    const hybridResults = await multiVectorSearchService.searchMultiVector(
      request.query,
      {
        limit: Math.floor(request.options.vectorOptions.limit * 1.5), // Get more results for hybrid
        filter: request.options.vectorOptions.filter,
        vectorTypes: request.options.vectorOptions.vectorTypes,
        mergeStrategy: 'hybrid',
        rrfKValue: request.options.mergeOptions.rrfKValue,
        enableSourceAttribution: request.options.includeSourceAttribution,
      }
    );

    // Convert to SearchResultItem format
    const allResults: SearchResultItem[] = [];
    
    Object.entries(hybridResults.vectorSearchResults).forEach(([vectorType, results]) => {
      results.forEach((result, index) => {
        allResults.push({
          id: result.id,
          score: result.score,
          payload: result.payload,
          metadata: {
            vectorType,
            rank: index + 1,
            originalScore: result.score,
            source: 'hybrid',
            mergeStrategy: 'hybrid'
          },
          source: 'hybrid'
        });
      });
    });

    return allResults;
  }

  /**
   * Merge results from multiple sources using reciprocal rank fusion
   */
  private async mergeResults(
    searchResults: RankedResults[], 
    request: EnhancedSearchRequest
  ): Promise<MergedResult[]> {
    if (searchResults.length === 0) {
      return [];
    }

    // Build merge configuration
    const sourceWeights: Record<string, number> = {};
    
    // Extract weights from default sources
    Object.entries(this.config.defaultSources).forEach(([source, config]) => {
      sourceWeights[source] = config.weight;
    });
    
    // Override with request-specific weights
    Object.assign(sourceWeights, request.options.mergeOptions.sourceWeights);
    
    // Build merge configuration
    const mergeConfig: MergeConfig = {
      kValue: request.options.mergeOptions.rrfKValue,
      maxResults: request.options.mergeOptions.maxResults,
      enableDeduplication: false, // We'll handle deduplication separately
      preserveMetadata: request.options.includeMetadata,
      sourceWeights,
      useEnhancedDuplicateDetection: false, // We'll handle this separately
    };

    // Use result merger service to merge results
    const mergedResults = await resultMergerService.mergeResults(searchResults, mergeConfig);

    return mergedResults;
  }

  /**
   * Apply duplicate detection to merged results
   */
  private async applyDuplicateDetection(
    mergedResults: MergedResult[], 
    request: EnhancedSearchRequest
  ): Promise<MergedResult[]> {
    if (!request.options.duplicateDetectionOptions.enabled || mergedResults.length === 0) {
      return mergedResults;
    }

    // Convert MergedResult to SearchResultItem for duplicate detection
    const searchResultItems: SearchResultItem[] = mergedResults.map(result => ({
      id: result.id,
      score: result.score,
      payload: result.payload,
      metadata: {
        ...result.metadata,
        originalRankings: result.originalRankings,
        sourceCount: result.sourceCount,
        rrfScore: result.rrfScore
      },
      source: result.source
    }));

    // Build duplicate detection configuration
    const duplicateConfig: DuplicateDetectionConfig = {
      enabled: true,
      strategies: request.options.duplicateDetectionOptions.strategies.map(
        strategy => DetectionStrategy[strategy as keyof typeof DetectionStrategy]
      ),
      thresholds: {
        contentSimilarity: request.options.duplicateDetectionOptions.threshold,
        fuzzyMatch: request.options.duplicateDetectionOptions.threshold * 0.8,
        versionAware: request.options.duplicateDetectionOptions.threshold * 0.85,
        combined: request.options.duplicateDetectionOptions.threshold
      },
      fieldWeights: {
        name: 0.5,
        description: 0.3,
        url: 0.15,
        category: 0.05,
        metadata: 0.0
      },
      customRules: [],
      performance: {
        maxComparisonItems: 1000,
        enableCache: true,
        cacheSize: 10000,
        enableParallel: request.options.performance.enableParallel,
        parallelWorkers: 4
      },
      logging: {
        enabled: request.options.debug,
        level: 'info',
        includeStats: true
      }
    };

    // Apply duplicate detection
    const duplicateResult = await duplicateDetectionService.detectDuplicates(
      searchResultItems,
      duplicateConfig
    );

    // Convert back to MergedResult format
    const deduplicatedResults: MergedResult[] = duplicateResult.deduplicatedItems.map(item => ({
      id: item.id,
      score: item.score,
      payload: item.payload,
      metadata: item.metadata,
      source: item.source,
      rrfScore: item.metadata?.rrfScore || 0,
      originalRankings: item.metadata?.originalRankings || {},
      sourceCount: item.metadata?.sourceCount || 1,
      finalRank: 0 // Will be set during final sorting
    }));

    // Re-rank after deduplication
    deduplicatedResults.forEach((result, index) => {
      result.finalRank = index + 1;
    });

    return deduplicatedResults;
  }

  /**
   * Apply pagination and sorting to final results
   */
  private applyPaginationAndSorting(
    results: MergedResult[], 
    request: EnhancedSearchRequest
  ): MergedResult[] {
    let sortedResults = [...results];

    // Apply sorting
    switch (request.options.sort.field) {
      case 'relevance':
      case 'score':
        // Results are already sorted by relevance (RRF score)
        break;
      case 'name':
        sortedResults.sort((a, b) => {
          const nameA = (a.payload?.name || '').toLowerCase();
          const nameB = (b.payload?.name || '').toLowerCase();
          return request.options.sort.order === 'asc' 
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        });
        break;
      case 'category':
        sortedResults.sort((a, b) => {
          const catA = (a.payload?.category || '').toLowerCase();
          const catB = (b.payload?.category || '').toLowerCase();
          return request.options.sort.order === 'asc'
            ? catA.localeCompare(catB)
            : catB.localeCompare(catA);
        });
        break;
    }

    // Apply pagination
    const { page, limit } = request.options.pagination;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return sortedResults.slice(startIndex, endIndex);
  }

  /**
   * Build source attribution information
   */
  private buildSourceAttribution(searchResults: RankedResults[]): any[] {
    return searchResults.map(result => ({
      source: result.source,
      resultCount: result.results.length,
      searchTime: result.searchTime,
      avgScore: result.results.length > 0 
        ? result.results.reduce((sum, item) => sum + item.score, 0) / result.results.length
        : 0,
      weight: result.metadata?.weight || 1.0,
    }));
  }

  /**
   * Build source metrics for debug information
   */
  private buildSourceMetrics(searchResults: RankedResults[]): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    searchResults.forEach(result => {
      metrics[result.source] = {
        resultCount: result.results.length,
        searchTime: result.searchTime,
        avgScore: result.results.length > 0 
          ? result.results.reduce((sum, item) => sum + item.score, 0) / result.results.length
          : 0,
        error: result.metadata?.error,
        weight: result.metadata?.weight || 1.0,
      };
    });

    return metrics;
  }

  /**
   * Get data from cache
   */
  private getFromCache(request: EnhancedSearchRequest): any | null {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Set data in cache
   */
  private setCache(request: EnhancedSearchRequest, data: any): void {
    const cacheKey = this.generateCacheKey(request);
    const ttl = this.config.cacheTTL;
    
    this.cache.set(cacheKey, {
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
   * Generate cache key for request
   */
  private generateCacheKey(request: EnhancedSearchRequest): string {
    const keyData = {
      query: request.query,
      options: {
        sources: request.options.sources,
        vectorOptions: request.options.vectorOptions,
        mergeOptions: request.options.mergeOptions,
        duplicateDetectionOptions: request.options.duplicateDetectionOptions,
        pagination: request.options.pagination,
        sort: request.options.sort,
        filters: request.options.filters,
      }
    };
    
    return `enhanced_search_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
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
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EnhancedSearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): EnhancedSearchConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const enhancedSearchService = new EnhancedSearchService();

import { Request, Response } from 'express';
import { enhancedSearchService } from '@/services/enhanced-search.service';
import {
  EnhancedSearchRequestSchema,
  EnhancedSearchResponseSchema,
  EnhancedSearchErrorResponseSchema,
  EnhancedSearchRequest,
  EnhancedSearchResponse,
  ExecutionMetricsSchema,
  ConfidenceBreakdownSchema,
  EnhancedSearchContextSchema
} from '@/dto/enhanced-search.dto';
import { z } from 'zod';

/**
 * Enhanced Search Controller
 * 
 * Handles HTTP requests for the enhanced search endpoint, providing
 * advanced search capabilities with result merging and duplicate detection.
 */
export class EnhancedSearchController {
  /**
   * POST /api/search/enhanced
   * 
   * Enhanced search endpoint that combines results from multiple search sources,
   * applies reciprocal rank fusion for result merging, and performs duplicate detection.
   */
  async enhancedSearch(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}`;
    
    try {
      // Enhanced request validation
      const validationResult = EnhancedSearchRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorResponse = {
          error: 'Validation Error',
          message: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
          requestId,
          details: {
            fieldErrors: validationResult.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          }
        };
        
        console.warn(`⚠️ [${requestId}] Request validation failed:`, errorResponse.details);
        res.status(400).json(errorResponse);
        return;
      }
      
      const searchRequest: EnhancedSearchRequest = validationResult.data;
      
      // Enhanced request logging
      console.log(`🚀 [${requestId}] Enhanced search request received:`, {
        query: searchRequest.query,
        options: {
          sources: searchRequest.options.sources,
          vectorTypes: searchRequest.options.vectorOptions.vectorTypes,
          mergeStrategy: searchRequest.options.mergeOptions.strategy,
          debug: searchRequest.options.debug,
          includeMetrics: searchRequest.options.includeExecutionMetrics,
          includeConfidence: searchRequest.options.includeConfidenceBreakdown
        }
      });
      
      // Validate enhanced search options
      this.validateEnhancedOptions(searchRequest, requestId);
      
      // Execute enhanced search with timeout handling
      const searchPromise = enhancedSearchService.search(searchRequest);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), searchRequest.options.performance.timeout);
      });
      
      const searchResponse = await Promise.race([searchPromise, timeoutPromise]) as EnhancedSearchResponse;
      
      // Enhanced response validation and formatting
      const formattedResponse = this.formatEnhancedResponse(searchResponse, searchRequest, requestId);
      
      const responseValidation = EnhancedSearchResponseSchema.safeParse(formattedResponse);
      
      if (!responseValidation.success) {
        console.error(`❌ [${requestId}] Response validation failed:`, responseValidation.error);
        throw new Error('Internal server error: Invalid response format from enhanced search service');
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [${requestId}] Enhanced search completed in ${processingTime}ms:`, {
        totalResults: responseValidation.data.summary.totalResults,
        returnedResults: responseValidation.data.summary.returnedResults,
        sourcesSearched: responseValidation.data.summary.sourcesSearched,
        enhancementVersion: responseValidation.data.summary.enhancementVersion
      });
      
      // Add response headers for enhanced features
      res.set({
        'X-Request-ID': requestId,
        'X-Processing-Time': processingTime.toString(),
        'X-Enhancement-Version': responseValidation.data.summary.enhancementVersion || '2.0',
        'X-Sources-Searched': responseValidation.data.summary.sourcesSearched.join(',')
      });
      
      // Return successful response
      res.status(200).json(responseValidation.data);
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [${requestId}] Enhanced search failed after ${processingTime}ms:`, error);
      
      // Enhanced error handling
      const errorResponse = this.buildEnhancedErrorResponse(error, requestId, processingTime);
      
      // Determine appropriate HTTP status code
      const statusCode = this.determineErrorStatusCode(error);
      
      res.set({
        'X-Request-ID': requestId,
        'X-Processing-Time': processingTime.toString(),
        'X-Error-Code': errorResponse.code
      });
      
      res.status(statusCode).json(errorResponse);
    }
  }

  /**
   * Validate enhanced search options
   */
  private validateEnhancedOptions(request: EnhancedSearchRequest, requestId: string): void {
    const { options } = request;
    
    // Validate context enrichment options
    if (options.contextEnrichment.enabled && options.contextEnrichment.maxEntitiesPerQuery > 20) {
      throw new Error('Context enrichment maxEntitiesPerQuery cannot exceed 20');
    }
    
    // Validate local NLP options
    if (options.localNLP.enabled && options.localNLP.confidenceThreshold < 0.1) {
      throw new Error('Local NLP confidence threshold must be at least 0.1');
    }
    
    // Validate multi-vector search options
    if (options.multiVectorSearch.enabled && options.multiVectorSearch.vectorTypes.length === 0) {
      throw new Error('At least one vector type must be specified for multi-vector search');
    }
    
    // Validate performance options
    if (options.performance.timeout < 1000) {
      console.warn(`⚠️ [${requestId}] Very short timeout (${options.performance.timeout}ms) may cause failures`);
    }
    
    console.log(`✅ [${requestId}] Enhanced options validation passed`);
  }

  /**
   * Format enhanced response with additional fields
   */
  private formatEnhancedResponse(
    response: EnhancedSearchResponse,
    request: EnhancedSearchRequest,
    requestId: string
  ): EnhancedSearchResponse {
    const formattedResponse = { ...response };
    
    // Add enhancement version if not present
    if (!formattedResponse.summary.enhancementVersion) {
      formattedResponse.summary.enhancementVersion = '2.0';
    }
    
    // Add confidence breakdown if requested
    if (request.options.includeConfidenceBreakdown) {
      formattedResponse.results = formattedResponse.results.map(result => ({
        ...result,
        confidenceBreakdown: result.confidenceBreakdown || {
          overall: result.score,
          vector: result.metadata?.vectorScore,
          traditional: result.metadata?.traditionalScore,
          hybrid: result.metadata?.hybridScore
        }
      }));
    }
    
    // Add execution metrics if requested
    if (request.options.includeExecutionMetrics) {
      formattedResponse.metrics = {
        ...formattedResponse.metrics,
        nodeExecutionTimes: response.metrics.nodeExecutionTimes || {},
        resourceUsage: response.metrics.resourceUsage || {
          peakMemory: 0,
          averageMemory: 0,
          cpuTime: 0
        },
        cacheMetrics: response.metrics.cacheMetrics || {
          embeddingCacheHits: 0,
          embeddingCacheMisses: 0,
          resultCacheHits: 0,
          resultCacheMisses: 0
        }
      };
    }
    
    // Add enhanced debug information
    if (request.options.debug) {
      formattedResponse.debug = {
        ...formattedResponse.debug,
        requestId,
        requestTimestamp: new Date().toISOString(),
        enhancedFeatures: {
          contextEnrichment: request.options.contextEnrichment.enabled,
          localNLP: request.options.localNLP.enabled,
          multiVectorSearch: request.options.multiVectorSearch.enabled
        }
      };
    }
    
    return formattedResponse;
  }

  /**
   * Build enhanced error response
   */
  private buildEnhancedErrorResponse(
    error: any,
    requestId: string,
    processingTime: number
  ): z.infer<typeof EnhancedSearchErrorResponseSchema> {
    const baseError = {
      timestamp: new Date().toISOString(),
      requestId,
      processingTime
    };

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return {
          error: 'Timeout Error',
          message: 'Search request timed out',
          code: 'TIMEOUT_ERROR',
          ...baseError,
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message,
            stack: error.stack
          } : undefined
        };
      }
      
      if (error.message.includes('validation')) {
        return {
          error: 'Validation Error',
          message: 'Request validation failed',
          code: 'VALIDATION_ERROR',
          ...baseError,
          details: {
            originalError: error.message
          }
        };
      }
      
      if (error.message.includes('service') || error.message.includes('connection')) {
        return {
          error: 'Service Error',
          message: 'Enhanced search service unavailable',
          code: 'SERVICE_UNAVAILABLE',
          ...baseError,
          details: {
            originalError: error.message
          }
        };
      }
    }

    // Default error response
    return {
      error: error instanceof Error ? error.name : 'Unknown Error',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      code: 'SEARCH_ERROR',
      ...baseError,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error instanceof Error ? error.stack : undefined,
        originalError: error
      } : undefined
    };
  }

  /**
   * Determine appropriate HTTP status code for error
   */
  private determineErrorStatusCode(error: any): number {
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return 408; // Request Timeout
      }
      
      if (error.message.includes('validation')) {
        return 400; // Bad Request
      }
      
      if (error.message.includes('not found') || error.message.includes('invalid')) {
        return 400; // Bad Request
      }
      
      if (error.message.includes('service') || error.message.includes('connection')) {
        return 503; // Service Unavailable
      }
      
      if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        return 429; // Too Many Requests
      }
    }
    
    return 500; // Internal Server Error
  }

  /**
   * GET /api/search/enhanced/health
   * 
   * Health check endpoint for the enhanced search service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const cacheStats = enhancedSearchService.getCacheStats();
      const config = enhancedSearchService.getConfig();
      
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'enhanced-search',
        version: '2.0.0',
        enhancementVersion: '2.0',
        cache: {
          size: cacheStats.size,
          enabled: config.enableCache,
          ttl: config.cacheTTL
        },
        configuration: {
          defaultSources: Object.keys(config.defaultSources),
          defaultMergeStrategy: config.defaultMergeStrategy,
          duplicateDetectionEnabled: config.defaultDuplicateDetection,
          maxConcurrentSearches: config.maxConcurrentSearches,
          defaultTimeout: config.defaultTimeout
        },
        // Enhanced v2.0 features status (using environment variables as fallback)
        features: {
          contextEnrichment: {
            enabled: process.env.CONTEXT_ENRICHMENT_ENABLED !== 'false',
            maxEntitiesPerQuery: parseInt(process.env.CONTEXT_ENRICHMENT_MAX_ENTITIES || '5')
          },
          localNLP: {
            enabled: process.env.LOCAL_NLP_ENABLED !== 'false',
            models: {
              ner: process.env.LOCAL_NLP_NER_MODEL || 'Xenova/bert-base-NER',
              classification: process.env.LOCAL_NLP_CLASSIFICATION_MODEL || 'Xenova/nli-deberta-v3-base'
            }
          },
          multiVectorSearch: {
            enabled: process.env.SEARCH_USE_MULTIVECTOR === 'true',
            vectorTypes: (process.env.VECTOR_TYPES || "semantic,categories,functionality").split(",")
          },
          performanceOptimization: {
            enabled: process.env.ENABLE_CACHE !== 'false',
            intelligentCache: process.env.PERFORMANCE_INTELLIGENT_CACHE_ENABLED !== 'false'
          }
        },
        // Performance metrics
        performance: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        }
      };
      
      res.status(200).json(healthData);
    } catch (error) {
      console.error('❌ [Controller] Enhanced health check failed:', error);
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'enhanced-search',
        version: '2.0.0',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      });
    }
  }

  /**
   * POST /api/search/enhanced/cache/clear
   * 
   * Clear the enhanced search cache
   */
  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      const beforeStats = enhancedSearchService.getCacheStats();
      enhancedSearchService.clearCache();
      const afterStats = enhancedSearchService.getCacheStats();
      
      console.log(`🗑️ [Controller] Cache cleared: ${beforeStats.size} entries removed`);
      
      res.status(200).json({
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString(),
        before: {
          size: beforeStats.size,
          keys: beforeStats.keys
        },
        after: {
          size: afterStats.size,
          keys: afterStats.keys
        }
      });
    } catch (error) {
      console.error('❌ [Controller] Cache clear failed:', error);
      
      res.status(500).json({
        error: 'Cache Clear Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'CACHE_CLEAR_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/search/enhanced/config
   * 
   * Get current enhanced search configuration
   */
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = enhancedSearchService.getConfig();
      
      // Return a sanitized version of the configuration (exclude sensitive data)
      const sanitizedConfig = {
        defaultSources: Object.fromEntries(
          Object.entries(config.defaultSources).map(([key, value]) => [
            key, 
            {
              enabled: value.enabled,
              weight: value.weight,
              timeout: value.timeout
            }
          ])
        ),
        defaultMergeStrategy: config.defaultMergeStrategy,
        defaultDuplicateDetection: config.defaultDuplicateDetection,
        maxConcurrentSearches: config.maxConcurrentSearches,
        defaultTimeout: config.defaultTimeout,
        enableCache: config.enableCache,
        cacheTTL: config.cacheTTL
      };
      
      res.status(200).json({
        config: sanitizedConfig,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [Controller] Get config failed:', error);
      
      res.status(500).json({
        error: 'Config Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'CONFIG_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * PUT /api/search/enhanced/config
   * 
   * Update enhanced search configuration
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { config } = req.body;
      
      if (!config || typeof config !== 'object') {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Config object is required',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      const beforeConfig = enhancedSearchService.getConfig();
      enhancedSearchService.updateConfig(config);
      const afterConfig = enhancedSearchService.getConfig();
      
      console.log(`⚙️ [Controller] Configuration updated`);
      
      res.status(200).json({
        message: 'Configuration updated successfully',
        timestamp: new Date().toISOString(),
        before: {
          defaultSources: Object.keys(beforeConfig.defaultSources),
          defaultMergeStrategy: beforeConfig.defaultMergeStrategy,
          enableCache: beforeConfig.enableCache
        },
        after: {
          defaultSources: Object.keys(afterConfig.defaultSources),
          defaultMergeStrategy: afterConfig.defaultMergeStrategy,
          enableCache: afterConfig.enableCache
        }
      });
    } catch (error) {
      console.error('❌ [Controller] Update config failed:', error);
      
      res.status(500).json({
        error: 'Config Update Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'CONFIG_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/search/enhanced/stats
   * 
   * Get enhanced search statistics and performance metrics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const cacheStats = enhancedSearchService.getCacheStats();
      const config = enhancedSearchService.getConfig();
      
      // In a real implementation, you would collect more detailed statistics
      // from the service itself (search counts, average times, etc.)
      const stats = {
        timestamp: new Date().toISOString(),
        service: 'enhanced-search',
        cache: {
          size: cacheStats.size,
          enabled: config.enableCache,
          ttl: config.cacheTTL
        },
        configuration: {
          availableSources: Object.keys(config.defaultSources),
          defaultMergeStrategy: config.defaultMergeStrategy,
          duplicateDetectionEnabled: config.defaultDuplicateDetection
        },
        // Placeholder for actual performance metrics
        performance: {
          totalSearches: 0, // TODO: Implement search counter
          averageResponseTime: 0, // TODO: Implement response time tracking
          cacheHitRate: 0, // TODO: Implement cache hit rate tracking
          errorRate: 0 // TODO: Implement error rate tracking
        }
      };
      
      res.status(200).json(stats);
    } catch (error) {
      console.error('❌ [Controller] Get stats failed:', error);
      
      res.status(500).json({
        error: 'Stats Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'STATS_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Export singleton instance
export const enhancedSearchController = new EnhancedSearchController();

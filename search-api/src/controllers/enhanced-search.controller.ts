import { Request, Response } from 'express';
import { enhancedSearchService } from '@/services/enhanced-search.service';
import {
  EnhancedSearchRequestSchema,
  EnhancedSearchResponseSchema,
  EnhancedSearchErrorResponseSchema,
  EnhancedSearchRequest,
  EnhancedSearchResponse
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
    
    try {
      // Validate request body
      const validationResult = EnhancedSearchRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorResponse = {
          error: 'Validation Error',
          message: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
          details: validationResult.error.errors
        };
        
        res.status(400).json(errorResponse);
        return;
      }
      
      const searchRequest: EnhancedSearchRequest = validationResult.data;
      
      console.log(`🚀 [Controller] Received enhanced search request: "${searchRequest.query}"`);
      
      // Execute enhanced search
      const searchResponse = await enhancedSearchService.search(searchRequest);
      
      // Validate response
      const responseValidation = EnhancedSearchResponseSchema.safeParse(searchResponse);
      
      if (!responseValidation.success) {
        console.error('❌ [Controller] Response validation failed:', responseValidation.error);
        throw new Error('Internal server error: Invalid response format');
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [Controller] Enhanced search completed in ${processingTime}ms`);
      
      // Return successful response
      res.status(200).json(responseValidation.data);
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [Controller] Enhanced search failed after ${processingTime}ms:`, error);
      
      // Build error response
      const errorResponse: z.infer<typeof EnhancedSearchErrorResponseSchema> = {
        error: error instanceof Error ? error.name : 'Unknown Error',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        code: 'SEARCH_ERROR',
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? {
          stack: error instanceof Error ? error.stack : undefined,
          processingTime
        } : undefined
      };
      
      // Determine appropriate HTTP status code
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          statusCode = 408;
          errorResponse.code = 'TIMEOUT_ERROR';
        } else if (error.message.includes('not found') || error.message.includes('invalid')) {
          statusCode = 400;
          errorResponse.code = 'INVALID_REQUEST';
        } else if (error.message.includes('service') || error.message.includes('connection')) {
          statusCode = 503;
          errorResponse.code = 'SERVICE_UNAVAILABLE';
        }
      }
      
      res.status(statusCode).json(errorResponse);
    }
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
        version: '1.0.0',
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
        }
      };
      
      res.status(200).json(healthData);
    } catch (error) {
      console.error('❌ [Controller] Health check failed:', error);
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'enhanced-search',
        error: error instanceof Error ? error.message : 'Unknown error'
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

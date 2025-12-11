import { StateAnnotation } from '../../types/state.js';
import { planCacheService } from '../../services/plan-cache.service.js';
import { CONFIG } from '#config/env.config';
import type { LogMetadata } from '#types/logger.types.js';

// Configuration for logging
const LOG_CONFIG = {
  enabled: !CONFIG.env.IS_PRODUCTION,
  prefix: '💾 Cache Store:',
};

// Helper function for conditional logging
const log = (message: string, data?: LogMetadata) => {
  if (LOG_CONFIG.enabled) {
    console.log(`${LOG_CONFIG.prefix} ${message}`, data ? data : '');
  }
};

const logError = (message: string, error?: LogMetadata) => {
  console.error(`${LOG_CONFIG.prefix} ERROR: ${message}`, error ? error : '');
};

/**
 * Cache Store Node - Stores successful pipeline results for future use
 *
 * This node runs at the end of the pipeline (after query-executor) to cache
 * successful results for future queries.
 *
 * Input: Complete pipeline state with results
 * Process:
 *   1. Check if this was a cache hit (skip storing if so)
 *   2. Validate that we have all required data
 *   3. Check confidence thresholds
 *   4. Store the plan in MongoDB for future retrieval
 *
 * Output: Same state with cache metadata updated
 */
export async function cacheStoreNode(
  state: typeof StateAnnotation.State
): Promise<Partial<typeof StateAnnotation.State>> {
  const {
    query,
    intentState,
    executionPlan,
    candidates,
    executionStats,
    metadata,
    errors
  } = state;

  // Skip caching if this was already a cache hit
  if (metadata?.cacheHit) {
    log('Skipping cache storage - this was a cache hit', {
      originalQuery: metadata.originalQuery,
      cacheType: metadata.cacheType,
      usageCount: metadata.usageCount,
    });
    return state;
  }

  // Don't cache if there were errors in the pipeline
  const hasErrors = errors && errors.length > 0;
  if (hasErrors) {
    log('Skipping cache storage - pipeline had errors', {
      errorCount: errors.length,
      lastError: errors[errors.length - 1]?.node,
    });
    return state;
  }

  // Validate we have all required data for caching
  if (!query || !intentState || !executionPlan) {
    log('Skipping cache storage - missing required data', {
      hasQuery: !!query,
      hasIntentState: !!intentState,
      hasExecutionPlan: !!executionPlan,
    });
    return state;
  }

  // Check confidence threshold for caching
  const confidence = executionPlan.confidence || 0.7;
  const MIN_CONFIDENCE_FOR_CACHING = 0.6;

  if (confidence < MIN_CONFIDENCE_FOR_CACHING) {
    log('Skipping cache storage - confidence too low', {
      confidence,
      minRequired: MIN_CONFIDENCE_FOR_CACHING,
    });
    return state;
  }

  const startTime = Date.now();
  log('Starting cache storage', {
    query: query.substring(0, 100),
    confidence,
    candidatesCount: candidates?.length || 0,
    executionTime: executionStats?.totalTimeMs || 0,
  });

  try {
    // Store the plan in cache
    const planId = await planCacheService.storePlan(
      query,
      intentState,
      executionPlan,
      candidates || [],
      executionStats?.totalTimeMs || 0,
      metadata || {}
    );

    const storeTime = Date.now() - startTime;

    log('Successfully stored plan in cache', {
      planId: planId.toString(),
      storeTime,
      executionTime: executionStats?.totalTimeMs || 0,
      candidatesCount: candidates?.length || 0,
    });

    // Update metadata to indicate successful caching
    return {
      executionStats: {
        ...executionStats,
        nodeTimings: {
          ...executionStats?.nodeTimings,
          'cache-store': storeTime,
        },
      },
      metadata: {
        ...metadata,
        executionPath: [
          ...(metadata?.executionPath || []),
          'cache-store',
        ],
        nodeExecutionTimes: {
          ...metadata?.nodeExecutionTimes,
          'cache-store': storeTime,
        },
        cachedAt: new Date(),
        planId: planId.toString(),
        cacheStored: true,
        cacheStorageTime: storeTime,
      },
    };

  } catch (error) {
    const storeTime = Date.now() - startTime;
    logError('Failed to store plan in cache', {
      error: error instanceof Error ? error.message : String(error),
      storeTime,
    });

    // Don't fail the pipeline if caching fails - just log the error
    log('Cache storage failed - pipeline completed successfully, but caching failed');

    return {
      executionStats: {
        ...executionStats,
        nodeTimings: {
          ...executionStats?.nodeTimings,
          'cache-store': storeTime,
        },
      },
      metadata: {
        ...metadata,
        executionPath: [
          ...(metadata?.executionPath || []),
          'cache-store',
        ],
        nodeExecutionTimes: {
          ...metadata?.nodeExecutionTimes,
          'cache-store': storeTime,
        },
        cacheStored: false,
        cacheStorageError: error instanceof Error ? error.message : String(error),
      },
      errors: [
        ...(state.errors || []),
        {
          node: 'cache-store',
          error: error instanceof Error ? error : new Error('Cache storage failed'),
          timestamp: new Date(),
          recovered: true, // Pipeline succeeded, only caching failed
          recoveryStrategy: 'Cache storage failed - pipeline completed successfully',
        },
      ],
    };
  }
}
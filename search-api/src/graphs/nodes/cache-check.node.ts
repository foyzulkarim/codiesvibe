import { StateAnnotation } from '../../types/state';
import { planCacheService, CacheLookupResult } from '../../services/plan-cache.service';

// Configuration for logging
const LOG_CONFIG = {
  enabled: process.env.NODE_ENV !== 'production',
  prefix: '💾 Cache Check:',
};

// Helper function for conditional logging
const log = (message: string, data?: any) => {
  if (LOG_CONFIG.enabled) {
    console.log(`${LOG_CONFIG.prefix} ${message}`, data ? data : '');
  }
};

const logError = (message: string, error?: any) => {
  console.error(`${LOG_CONFIG.prefix} ERROR: ${message}`, error ? error : '');
};

/**
 * Cache Check Node - Checks for cached results before running expensive LLM operations
 *
 * This node serves as the entry point for the enhanced workflow with caching:
 *
 * Input: User query string
 * Process:
 *   1. Try to find exact match in cache (hash-based)
 *   2. Try to find similar match in cache (vector search)
 *   3. Return cached results if found with similarity >= 0.90
 *   4. Otherwise, proceed to full pipeline
 *
 * Output: Either cached results (bypassing LLM nodes) or proceed to intent-extractor
 */
export async function cacheCheckNode(
  state: typeof StateAnnotation.State
): Promise<Partial<typeof StateAnnotation.State>> {
  const { query } = state;

  if (!query || query.trim().length === 0) {
    logError('No query provided for cache check');
    return {
      errors: [
        ...(state.errors || []),
        {
          node: 'cache-check',
          error: new Error('No query provided for cache check'),
          timestamp: new Date(),
          recovered: false,
        },
      ],
    };
  }

  const startTime = Date.now();
  log('Starting cache lookup', { query: query.substring(0, 100) });

  try {
    // Perform cache lookup
    const cacheResult: CacheLookupResult = await planCacheService.lookupPlan(query);
    const cacheTime = Date.now() - startTime;

    log('Cache lookup completed', {
      cacheType: cacheResult.cacheType,
      found: cacheResult.found,
      similarity: cacheResult.similarity,
      cacheTime,
    });

    if (!cacheResult.found || !cacheResult.plan) {
      // Cache miss - proceed to full pipeline
      log('Cache miss - proceeding to full pipeline');

      return {
        executionStats: {
          totalTimeMs: state.executionStats?.totalTimeMs || 0,
          nodeTimings: Object.assign({}, state.executionStats?.nodeTimings || {}, {
            'cache-check': cacheTime,
          }),
          vectorQueriesExecuted: state.executionStats?.vectorQueriesExecuted || 0,
          structuredQueriesExecuted: state.executionStats?.structuredQueriesExecuted || 0,
        },
        metadata: {
          startTime: state.metadata?.startTime || new Date(),
          executionPath: (state.metadata?.executionPath || []).concat(['cache-check']),
          nodeExecutionTimes: Object.assign({}, state.metadata?.nodeExecutionTimes || {}, {
            'cache-check': cacheTime,
          }),
          totalNodesExecuted: (state.metadata?.totalNodesExecuted || 0) + 1,
          pipelineVersion: state.metadata?.pipelineVersion || "2.1-llm-first-with-caching",
          cacheHit: false,
          cacheType: 'miss',
        },
      };
    }

    // Cache hit - use cached results
    const plan = cacheResult.plan;

    log('Cache hit - using cached results', {
      originalQuery: plan.originalQuery,
      cacheType: cacheResult.cacheType,
      similarity: cacheResult.similarity,
      usageCount: plan.usageCount,
      planAge: Date.now() - new Date(plan.createdAt).getTime(),
    });

    // Reconstruct the state from cached plan
    return {
      intentState: plan.intentState,
      executionPlan: plan.executionPlan,
      candidates: plan.candidates,
      executionStats: {
        totalTimeMs: cacheTime, // Much faster than full pipeline
        nodeTimings: Object.assign({}, state.executionStats?.nodeTimings || {}, {
          'cache-check': cacheTime,
        }),
        // Since we're bypassing LLM calls, we don't increment these
        vectorQueriesExecuted: 0,
        structuredQueriesExecuted: 0,
        cacheHit: true,
        cacheSimilarity: cacheResult.similarity,
        originalExecutionTime: plan.executionTime,
        timeSaved: plan.executionTime - cacheTime,
      },
      metadata: {
        startTime: state.metadata?.startTime || new Date(),
        executionPath: ['cache-check'], // Bypassed the main pipeline
        nodeExecutionTimes: Object.assign({}, state.metadata?.nodeExecutionTimes || {}, {
          'cache-check': cacheTime,
        }),
        totalNodesExecuted: 1, // Only cache-check node executed
        pipelineVersion: plan.metadata.pipelineVersion,
        cacheHit: true,
        cacheType: cacheResult.cacheType,
        cacheSimilarity: cacheResult.similarity,
        cachedAt: plan.createdAt,
        originalQuery: plan.originalQuery,
        planId: plan._id?.toString(),
        usageCount: plan.usageCount,
        // Mark that we should skip directly to query-executor
        skipToExecutor: true,
        costSavings: {
          llmCallsAvoided: 2, // intent-extractor + query-planner
          estimatedCostSaved: 0.02, // Rough estimate
          timeSavedPercent: ((plan.executionTime - cacheTime) / plan.executionTime * 100).toFixed(1)
        }
      },
    };

  } catch (error) {
    const cacheTime = Date.now() - startTime;
    logError('Cache lookup failed', {
      error: error instanceof Error ? error.message : String(error),
      cacheTime,
    });

    // If cache fails, proceed to full pipeline (graceful degradation)
    log('Cache lookup failed - proceeding to full pipeline (graceful degradation)');

    return {
      errors: [
        ...(state.errors || []),
        {
          node: 'cache-check',
          error: error instanceof Error ? error : new Error('Cache lookup failed'),
          timestamp: new Date(),
          recovered: true, // Mark as recovered since we can proceed to full pipeline
          recoveryStrategy: 'Cache lookup failed - proceeding to full pipeline',
        },
      ],
      executionStats: {
        totalTimeMs: state.executionStats?.totalTimeMs || 0,
        vectorQueriesExecuted: state.executionStats?.vectorQueriesExecuted || 0,
        structuredQueriesExecuted: state.executionStats?.structuredQueriesExecuted || 0,
        nodeTimings: Object.assign({}, state.executionStats?.nodeTimings || {}, {
          'cache-check': cacheTime,
        }),
      },
      metadata: {
        startTime: state.metadata?.startTime || new Date(),
        executionPath: (state.metadata?.executionPath || []).concat(['cache-check']),
        nodeExecutionTimes: Object.assign({}, state.metadata?.nodeExecutionTimes || {}, {
          'cache-check': cacheTime,
        }),
        totalNodesExecuted: (state.metadata?.totalNodesExecuted || 0) + 1,
        pipelineVersion: state.metadata?.pipelineVersion || "2.1-llm-first-with-caching",
        cacheHit: false,
        cacheType: 'error',
        cacheError: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
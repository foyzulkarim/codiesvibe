import { StateAnnotation } from "../types/state";
import { EnhancedStateAnnotation, EntityStatisticsSchema, MetadataContextSchema } from "../types/enhanced-state";
import { contextEnrichmentService } from "../services/context-enrichment.service";
import { checkpointManager } from "../utils/checkpoint-manager";
import { stateMonitor } from "../utils/state-monitor";
import { defaultEnhancedSearchConfig } from "../config/enhanced-search-config";

const nodeId = "context-enrichment";

/**
 * Context Enrichment Node
 * 
 * Integrates context enrichment with the existing search pipeline using LangGraph.
 * Processes extracted entities from previous stage and generates entity statistics.
 * Maintains <200ms latency requirement with comprehensive error handling.
 */
export async function contextEnrichmentNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const startTime = Date.now();
  const threadId = state.metadata?.threadId || "default";
  
  try {
    console.log(`[${nodeId}] Starting context enrichment for query: "${state.query}"`);
    
    // Check if context enrichment is enabled
    const config = defaultEnhancedSearchConfig.contextEnrichment;
    if (!config.enabled) {
      console.log(`[${nodeId}] Context enrichment disabled, skipping`);
      return {
        metadata: {
          ...state.metadata,
          executionPath: [...(state.metadata?.executionPath || []), nodeId],
          nodeExecutionTimes: {
            ...(state.metadata?.nodeExecutionTimes || {}),
            [nodeId]: Date.now() - startTime
          }
        }
      };
    }

    // Extract entities from NER results in extraction signals
    const extractedEntities = extractEntitiesFromState(state);
    
    if (extractedEntities.length === 0) {
      console.log(`[${nodeId}] No entities found for enrichment, using query-based enrichment`);
      return await enrichFromQuery(state, startTime, nodeId);
    }

    // Enrich context based on extracted entities
    const enrichmentResult = await enrichFromEntities(extractedEntities, state, config);
    
    // Create checkpoint after successful enrichment
    await checkpointManager.createCheckpoint(
      threadId,
      `${nodeId}-${Date.now()}`,
      state,
      nodeId,
      Date.now() - startTime
    );

    // Track successful transition
    stateMonitor.trackTransition(
      threadId,
      "intent-extraction",
      nodeId,
      Date.now() - startTime,
      { ...state, ...enrichmentResult }
    );

    const executionTime = Date.now() - startTime;
    console.log(`[${nodeId}] Completed context enrichment in ${executionTime}ms`);

    return {
      ...enrichmentResult,
      metadata: {
        ...state.metadata,
        originalQuery: state.metadata?.originalQuery || state.query,
        executionPath: [...(state.metadata?.executionPath || []), nodeId],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          [nodeId]: executionTime
        }
      }
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[${nodeId}] Error in context enrichment:`, error);
    
    // Track error
    stateMonitor.trackValidationFailure(
      threadId,
      nodeId,
      [error instanceof Error ? error.message : String(error)],
      state
    );

    // Return fallback result if enabled
    if (defaultEnhancedSearchConfig.contextEnrichment.fallbackEnabled) {
      console.log(`[${nodeId}] Using fallback result due to error`);
      return getFallbackState(state, startTime, nodeId, error);
    }

    // Return error state
    return {
      errors: [
        ...(state.errors || []),
        {
          node: nodeId,
          error: error instanceof Error ? error : new Error("Unknown error in context enrichment"),
          timestamp: new Date()
        }
      ],
      metadata: {
        ...state.metadata,
        originalQuery: state.metadata?.originalQuery || state.query,
        executionPath: [...(state.metadata?.executionPath || []), nodeId],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          [nodeId]: executionTime
        }
      }
    };
  }
}

/**
 * Extract entities from the state
 */
function extractEntitiesFromState(state: typeof StateAnnotation.State): string[] {
  const entities: string[] = [];
  
  // Extract from NER results
  if (state.extractionSignals?.nerResults) {
    entities.push(...state.extractionSignals.nerResults);
  }
  
  // Extract from resolved tool names
  if (state.extractionSignals?.resolvedToolNames) {
    entities.push(...state.extractionSignals.resolvedToolNames);
  }
  
  // Extract from fuzzy matches
  if (state.extractionSignals?.fuzzyMatches) {
    state.extractionSignals.fuzzyMatches.forEach(match => {
      if (match.name) {
        entities.push(match.name);
      }
    });
  }
  
  // Remove duplicates and filter
  return [...new Set(entities)]
    .filter(entity => entity && entity.length > 1)
    .slice(0, defaultEnhancedSearchConfig.contextEnrichment.maxEntitiesPerQuery);
}

/**
 * Enrich context from extracted entities
 */
async function enrichFromEntities(
  entities: string[],
  state: typeof StateAnnotation.State,
  config: any
): Promise<Partial<typeof StateAnnotation.State>> {
  const startTime = Date.now();
  const entityStatistics: Record<string, any> = {};
  
  // Process each entity with timeout
  const enrichmentPromises = entities.map(async (entity) => {
    try {
      // Add timeout to ensure <200ms requirement
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Entity enrichment timeout for: ${entity}`)), config.maxProcessingTime);
      });

      const enrichmentPromise = contextEnrichmentService.enrichContext(entity, state);
      const result = await Promise.race([enrichmentPromise, timeoutPromise]) as {
        entityStatistics: Record<string, any>;
        metadataContext: any;
      };
      
      return { entity, result, success: true };
    } catch (error) {
      console.warn(`[${nodeId}] Failed to enrich entity "${entity}":`, error);
      return { entity, error, success: false };
    }
  });

  // Wait for all enrichments with timeout
  const results = await Promise.allSettled(enrichmentPromises);
  
  // Process results
  let successfulEnrichments = 0;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      const { entity, result: enrichmentResult } = result.value;
      
      // Merge entity statistics
      if (enrichmentResult && enrichmentResult.entityStatistics) {
        Object.assign(entityStatistics, enrichmentResult.entityStatistics);
      }
      
      successfulEnrichments++;
    } else {
      console.warn(`[${nodeId}] Entity enrichment failed for: ${entities[index]}`);
    }
  });

  // Create metadata context
  const metadataContext: any = {
    searchSpaceSize: 0,
    metadataConfidence: successfulEnrichments / entities.length,
    assumptions: [
      `Processed ${successfulEnrichments}/${entities.length} entities successfully`,
      `Enrichment completed in ${Date.now() - startTime}ms`
    ],
    lastUpdated: new Date(),
    enrichmentStrategy: 'qdrant_multi_vector',
    processingTime: Date.now() - startTime
  };

  // Calculate overall confidence
  if (Object.keys(entityStatistics).length > 0) {
    const confidences = Object.values(entityStatistics).map((stats: any) => stats.confidence || 0);
    metadataContext.metadataConfidence = confidences.reduce((sum: number, conf: number) => sum + conf, 0) / confidences.length;
  }

  return {
    entityStatistics,
    metadataContext,
    metadata: {
      ...state.metadata,
      originalQuery: state.metadata?.originalQuery || state.query,
      executionPath: [...(state.metadata?.executionPath || []), nodeId],
      nodeExecutionTimes: {
        ...state.metadata?.nodeExecutionTimes,
        [nodeId]: Date.now() - startTime
      }
    }
  };
}

/**
 * Enrich context from query when no entities are found
 */
async function enrichFromQuery(
  state: typeof StateAnnotation.State,
  startTime: number,
  nodeId: string
): Promise<Partial<typeof StateAnnotation.State>> {
  try {
    const config = defaultEnhancedSearchConfig.contextEnrichment;
    
    // Add timeout to ensure <200ms requirement
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query enrichment timeout')), config.maxProcessingTime);
    });

    const enrichmentPromise = contextEnrichmentService.enrichContext(state.query || '', state);
    const result = await Promise.race([enrichmentPromise, timeoutPromise]) as {
      entityStatistics: Record<string, any>;
      metadataContext: any;
    };
    
    return {
      entityStatistics: result.entityStatistics || {},
      metadataContext: result.metadataContext,
      metadata: {
        ...state.metadata,
        originalQuery: state.metadata?.originalQuery || state.query,
        executionPath: [...(state.metadata?.executionPath || []), nodeId],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          [nodeId]: Date.now() - startTime
        }
      }
    };
  } catch (error) {
    console.warn(`[${nodeId}] Query enrichment failed:`, error);
    return getFallbackState(state, startTime, nodeId, error);
  }
}

/**
 * Get fallback state when enrichment fails
 */
function getFallbackState(
  state: typeof StateAnnotation.State,
  startTime: number,
  nodeId: string,
  error: any
): Partial<typeof StateAnnotation.State> {
  const executionTime = Date.now() - startTime;
  
  return {
    entityStatistics: {},
    metadataContext: {
      searchSpaceSize: 0,
      metadataConfidence: 0,
      assumptions: [
        `Fallback mode - enrichment failed: ${error instanceof Error ? error.message : String(error)}`
      ],
      lastUpdated: new Date(),
      enrichmentStrategy: 'qdrant_multi_vector',
      processingTime: executionTime
    },
    metadata: {
      ...state.metadata,
      originalQuery: state.metadata?.originalQuery || state.query,
      executionPath: [...(state.metadata?.executionPath || []), nodeId],
      nodeExecutionTimes: {
        ...(state.metadata?.nodeExecutionTimes || {}),
        [nodeId]: executionTime
      }
    }
  };
}

/**
 * Validate context enrichment results
 */
function validateEnrichmentResult(
  entityStatistics: any,
  metadataContext: any
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate entity statistics
  if (entityStatistics && typeof entityStatistics === 'object') {
    for (const [entityType, stats] of Object.entries(entityStatistics)) {
      const result = EntityStatisticsSchema.safeParse(stats);
      if (!result.success) {
        errors.push(`Invalid entityStatistics for ${entityType}: ${result.error.issues.map(i => i.message).join(', ')}`);
      }
    }
  }
  
  // Validate metadata context
  if (metadataContext) {
    const result = MetadataContextSchema.safeParse(metadataContext);
    if (!result.success) {
      errors.push(`Invalid metadataContext: ${result.error.issues.map(i => i.message).join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if node execution is within performance requirements
 */
function checkPerformanceRequirements(executionTime: number): boolean {
  const maxTime = defaultEnhancedSearchConfig.contextEnrichment.maxProcessingTime;
  if (executionTime > maxTime) {
    console.warn(`[${nodeId}] Performance warning: Execution time ${executionTime}ms exceeds requirement of ${maxTime}ms`);
    return false;
  }
  return true;
}

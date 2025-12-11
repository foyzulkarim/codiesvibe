import { StateAnnotation } from '../../types/state.js';
import { QueryPlan } from '../../types/query-plan.js';
import { Candidate, QueryExecutorOutput } from '../../types/candidate.js';
import { QdrantService } from '../../services/database/qdrant.service.js';
import { MongoDBService } from '../../services/database/mongodb.service.js';
import { EmbeddingService } from '../../services/embedding/embedding.service.js';
import { fuseResults, groupCandidatesBySource } from '../../utils/fusion.js';
import { CONFIG } from '#config/env.config';
import type { LogMetadata } from '#types/logger.types.js';
import type { IntentState } from '../../types/intent-state.js';
import type { ToolData } from '../../types/tool.types.js';
import type { ITool } from '../../types/tool.interfaces.js';

// Configuration for logging
const LOG_CONFIG = {
  enabled: !CONFIG.env.IS_PRODUCTION,
  prefix: '⚡ Query Executor:',
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
 * QueryExecutorNode - Deterministic execution against Qdrant and MongoDB
 *
 * Input: QueryPlan JSON from state
 * Output: Candidates array with execution statistics
 */
export async function queryExecutorNode(
  state: typeof StateAnnotation.State
): Promise<Partial<typeof StateAnnotation.State>> {
  const { executionPlan, intentState, query } = state;

  if (!executionPlan) {
    logError('No execution plan provided for query execution');
    return {
      candidates: [],
      errors: [
        ...(state.errors || []),
        {
          node: 'query-executor',
          error: new Error('No execution plan provided for query execution'),
          timestamp: new Date(),
          recovered: false,
        },
      ],
    };
  }

  const startTime = Date.now();
  log('Starting query execution', {
    strategy: executionPlan.strategy,
    vectorSourcesCount: executionPlan.vectorSources?.length || 0,
    structuredSourcesCount: executionPlan.structuredSources?.length || 0,
    fusionMethod: executionPlan.fusion || 'none',
    sources: JSON.stringify({
      structuredSources: executionPlan.structuredSources,
    }),
  });

  try {
    // Initialize services
    const qdrantService = new QdrantService();
    const mongoService = new MongoDBService();
    const embeddingService = new EmbeddingService();

    const candidatesBySource = new Map<string, Candidate[]>();
    let vectorQueriesExecuted = 0;
    let structuredQueriesExecuted = 0;
    let structuredResultsCount = 0;

    // Execute structured searches FIRST
    const structuredFiltersAndQueries = [];
    if (
      executionPlan.structuredSources &&
      executionPlan.structuredSources.length > 0
    ) {
      log('Executing structured searches', {
        sourcesCount: executionPlan.structuredSources.length,
        sources: executionPlan.structuredSources.map((source) =>
          JSON.stringify(source)
        ),
      });

      for (const structuredSource of executionPlan.structuredSources) {
        try {
          const {
            candidates: structuredCandidates,
            filters,
            query: structuredQuery,
          } = await executeStructuredSearch(structuredSource, mongoService);
          structuredFiltersAndQueries.push({
            filters,
            query: structuredQuery,
            candidatesLength: structuredCandidates.length,
          });

          if (structuredCandidates.length > 0) {
            candidatesBySource.set(
              `mongodb_${structuredSource.source}`,
              structuredCandidates
            );
            structuredResultsCount += structuredCandidates.length;
          }

          structuredQueriesExecuted++;
          log('Structured search completed', {
            source: structuredSource.source,
            candidatesFound: structuredCandidates.length,
            limit: structuredSource.limit || 'default',
          });
        } catch (error) {
          logError('Structured search failed', {
            source: structuredSource.source,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with other sources instead of failing completely
        }
      }
    }

    // Determine adaptive score threshold based on structured results
    const hasStructuredResults = structuredResultsCount > 0;
    const adaptiveThreshold = hasStructuredResults
      ? CONFIG.search.QUERY_EXECUTOR_HIGH_THRESHOLD
      : CONFIG.search.QUERY_EXECUTOR_SCORE_THRESHOLD;

    log('Adaptive threshold determined', {
      hasStructuredResults,
      structuredResultsCount,
      adaptiveThreshold,
    });

    // Execute vector searches SECOND with adaptive threshold
    const vectorFiltersAndQueries = [];
    if (executionPlan.vectorSources && executionPlan.vectorSources.length > 0) {
      log('Executing vector searches', {
        sourcesCount: executionPlan.vectorSources.length,
        adaptiveThreshold,
      });

      for (const vectorSource of executionPlan.vectorSources) {
        try {
          const {
            candidates: vectorCandidates,
            filters,
            query: vectorQuery,
          } = await executeVectorSearch(
            vectorSource,
            query,
            intentState,
            qdrantService,
            embeddingService,
            adaptiveThreshold
          );

          if (vectorCandidates.length > 0) {
            candidatesBySource.set(
              `vector_${vectorSource.collection}`,
              vectorCandidates
            );
          }

          vectorQueriesExecuted++;
          vectorFiltersAndQueries.push({
            filters,
            query: vectorQuery,
            candidatesLength: vectorCandidates.length,
          });
          log('Vector search completed', {
            collection: vectorSource.collection,
            candidatesFound: vectorCandidates.length,
            topK: vectorSource.topK,
            thresholdUsed: adaptiveThreshold,
          });
        } catch (error) {
          logError('Vector search failed', {
            collection: vectorSource.collection,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with other sources instead of failing completely
        }
      }
    }

    // Apply fusion if multiple sources
    let finalCandidates: Candidate[];
    if (candidatesBySource.size === 0) {
      logWarning('No candidates found from any source');
      finalCandidates = [];
    } else if (candidatesBySource.size === 1) {
      // Single source - just normalize scores
      const singleSource = Array.from(candidatesBySource.values())[0];
      finalCandidates = singleSource.map((candidate, index) => ({
        ...candidate,
        score: 1 - index / singleSource.length, // Simple ranking normalization
      }));
    } else {
      // Multiple sources - apply fusion
      finalCandidates = fuseResults(
        candidatesBySource,
        executionPlan.fusion || 'rrf'
      );
    }

    // Enrich candidates with full MongoDB data
    const enrichmentStartTime = Date.now();
    const results = await enrichCandidatesWithFullData(
      finalCandidates,
      mongoService
    );
    const enrichmentTime = Date.now() - enrichmentStartTime;

    const executionTime = Date.now() - startTime;

    // Create execution stats
    const executionStats = {
      totalTimeMs: executionTime,
      nodeTimings: Object.assign({}, state.executionStats?.nodeTimings || {}, {
        'query-executor': executionTime,
      }),
      vectorQueriesExecuted,
      structuredQueriesExecuted,
      fusionMethod: executionPlan.fusion || 'none',
      confidence: executionPlan.confidence,
    };

    log('Query execution completed successfully', {
      totalCandidates: finalCandidates.length,
      vectorQueriesExecuted,
      structuredQueriesExecuted,
      fusionMethod: executionPlan.fusion || 'none',
      executionTime,
      enrichmentTime,
      resultsEnriched: results.filter((r) => r !== null).length,
    });

    return {
      candidates: finalCandidates,
      results: results as ToolData[],
      executionStats,
      metadata: {
        ...state.metadata,
        vectorFiltersAndQueries,
        structuredFiltersAndQueries,
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'query-executor',
        ],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'query-executor': executionTime,
        },
      },
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logError('Query execution failed', {
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    });

    return {
      candidates: [],
      errors: [
        ...(state.errors || []),
        {
          node: 'query-executor',
          error:
            error instanceof Error
              ? error
              : new Error('Unknown error in query execution'),
          timestamp: new Date(),
          recovered: false,
          recoveryStrategy: 'Query execution failed - returning empty results',
        },
      ],
      executionStats: {
        totalTimeMs: executionTime,
        nodeTimings: Object.assign(
          {},
          state.executionStats?.nodeTimings || {},
          {
            'query-executor': executionTime,
          }
        ),
        vectorQueriesExecuted: 0,
        structuredQueriesExecuted: 0,
        fusionMethod: executionPlan.fusion || 'none',
      },
      metadata: {
        ...state.metadata,
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'query-executor',
        ],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'query-executor': executionTime,
        },
      },
    };
  }
}

/**
 * Execute vector search against Qdrant
 */
async function executeVectorSearch(
  vectorSource: QueryPlan['vectorSources'][number],
  query: string,
  intentState: IntentState | null,
  qdrantService: QdrantService,
  embeddingService: EmbeddingService,
  scoreThreshold?: number
): Promise<{ candidates: Candidate[]; filters: Record<string, unknown>[]; query: Record<string, unknown> }> {
  try {
    // Generate query vector based on source
    let queryVector: number[];

    switch (vectorSource.queryVectorSource) {
      case 'query_text':
        queryVector = await embeddingService.generateEmbedding(query);
        break;
      case 'reference_tool_embedding':
        if (!intentState?.referenceTool) {
          throw new Error('Reference tool specified but none found in intent');
        }
        queryVector = await embeddingService.generateEmbedding(
          intentState.referenceTool
        );
        break;
      case 'semantic_variant':
        // Note: semanticVariants is defined in schema but not in IntentState type
        // This is a fallback for future implementation
        const variants = (intentState as Record<string, unknown>)?.semanticVariants as string[] || [];
        if (variants.length === 0) {
          throw new Error(
            'Semantic variant specified but none found in intent'
          );
        }
        queryVector = await embeddingService.generateEmbedding(variants[0]);
        break;
      default:
        queryVector = await embeddingService.generateEmbedding(query);
    }

    // Build filter if specified
    // Note: filter property is not in QueryPlan type but may be added in future
    const vectorSourceFilter = (vectorSource as Record<string, unknown>).filter as Record<string, unknown> | undefined;
    let filter: { must?: Array<{ key: string; match: { value: unknown } }> } | undefined = undefined;
    if (vectorSourceFilter) {
      // Convert vectorSource filter to Qdrant filter format
      const must: Array<{ key: string; match: { value: unknown } }> = [];
      for (const [field, condition] of Object.entries(vectorSourceFilter)) {
        must.push({
          key: field,
          match: { value: condition },
        });
      }
      filter = { must };
    }

    // Execute search with score threshold to filter out low-quality results
    const threshold = scoreThreshold ?? CONFIG.search.QUERY_EXECUTOR_SCORE_THRESHOLD;
    const searchResults = await qdrantService.searchByEmbedding(
      queryVector,
      vectorSource.topK,
      filter,
      vectorSource.embeddingType,
      vectorSource.collection,
      threshold
    );

    // Convert to Candidate format
    const candidates: Candidate[] = searchResults.map(
      (result: Record<string, unknown>, index: number) => ({
        id: (result.id as string) || (result.payload as Record<string, unknown>)?.id as string || `unknown_${index}`,
        source: 'qdrant' as const,
        score: (result.score as number) || 0,
        metadata: {
          name: (result.payload as Record<string, unknown>)?.name as string || 'Unknown Tool',
          category: (result.payload as Record<string, unknown>)?.category as string | undefined,
          pricing: Array.isArray((result.payload as Record<string, unknown>)?.pricingModel)
            ? ((result.payload as Record<string, unknown>).pricingModel as string[]).join(', ')
            : (result.payload as Record<string, unknown>)?.pricingModel as string | undefined,
          platform: ((result.payload as Record<string, unknown>)?.interface as string[])?.[0],
          features: ((result.payload as Record<string, unknown>)?.features as string[]) || [],
          description: (result.payload as Record<string, unknown>)?.description as string | undefined,
        },
        embeddingVector: (result.vector as number[]) || null,
        provenance: {
          collection: vectorSource.collection,
          queryVectorSource: vectorSource.queryVectorSource,
          filtersApplied: filter ? ['vector_filter_applied'] : [],
        },
      })
    );

    return { candidates, filters: filter ? [filter] : [], query: {} };
  } catch (error) {
    logError('Vector search execution failed', {
      collection: vectorSource.collection,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Execute structured search against MongoDB
 */
async function executeStructuredSearch(
  structuredSource: QueryPlan['structuredSources'][number],
  mongoService: MongoDBService
): Promise<{ filters: Record<string, unknown>[]; query: Record<string, unknown>; candidates: Candidate[] }> {
  try {
    // Build MongoDB query from filters
    let query: Record<string, unknown> = {};

    log('Structured search query:', structuredSource);

    if (structuredSource.filters && structuredSource.filters.length > 0) {
      for (const filter of structuredSource.filters) {
        log('Structured search filter:', filter);
        switch (filter.operator) {
          case '=':
            query = {
              ...query,
              [filter.field]: filter.value,
            };
            break;
          case 'contains':
            query = {
              ...query,
              [filter.field]: { $regex: filter.value, $options: 'i' },
            };
            break;
          case '>':
            query = {
              ...query,
              [filter.field]: { $gt: filter.value },
            };
            break;
          case '<':
            query = {
              ...query,
              [filter.field]: { $lt: filter.value },
            };
            break;
          case '>=':
            query = {
              ...query,
              [filter.field]: { $gte: filter.value },
            };
            break;
          case '<=':
            query = {
              ...query,
              [filter.field]: { $lte: filter.value },
            };
            break;
          case 'in':
            // Handle array of values - MongoDB $in operator
            if (Array.isArray(filter.value)) {
              query = {
                ...query,
                [filter.field]: { $in: filter.value },
              };
            } else {
              // Single value - treat as equals
              query = {
                ...query,
                [filter.field]: filter.value,
              };
            }
            break;
          default:
            // Handle unknown operators by treating them as equals
            logWarning(
              `Unknown operator '${filter.operator}' for field '${filter.field}', treating as equals`
            );
            query = {
              ...query,
              [filter.field]: filter.value,
            };
            break;
        }
      }
    }

    log('Structured search query:', query);

    // Execute query
    const results = await mongoService.searchTools(
      query,
      structuredSource.limit || 50
    );

    // Convert to Candidate format
    const candidates: Candidate[] = results.map((tool: ITool, index: number) => ({
      id: tool._id?.toString() || tool.id || `mongo_${index}`,
      source: 'mongodb' as const,
      score: 0.5, // Default score for structured results (will be normalized later)
      metadata: {
        name: tool.name || 'Unknown Tool',
        category: tool.categories?.[0],
        pricing: Array.isArray(tool.pricingModel)
          ? tool.pricingModel.join(', ')
          : tool.pricingModel,
        platform: tool.interface?.[0],
        features: tool.functionality || [],
        description: tool.description || tool.tagline,
      },
      provenance: {
        collection: 'tools',
        queryVectorSource: 'structured_search',
        filtersApplied:
          structuredSource.filters?.map(
            (f) => `${f.field}_${f.operator}_${String(f.value)}`
          ) || [],
      },
    }));

    return { filters: (structuredSource.filters || []) as Record<string, unknown>[], query, candidates };
  } catch (error) {
    logError('Structured search execution failed', {
      source: structuredSource.source,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Helper function for warning logging
 */
const logWarning = (message: string, data?: LogMetadata) => {
  if (LOG_CONFIG.enabled) {
    console.warn(`${LOG_CONFIG.prefix} WARNING: ${message}`, data ? data : '');
  }
};

/**
 * Enrich candidates with full MongoDB data
 * Fetches complete tool documents from MongoDB while preserving candidate order
 */
async function enrichCandidatesWithFullData(
  candidates: Candidate[],
  mongoService: MongoDBService
): Promise<ToolData[]> {
  if (candidates.length === 0) {
    return [];
  }

  try {
    // Extract unique candidate IDs
    const candidateIds = candidates.map((candidate) => candidate.id);

    log('Enriching candidates with full MongoDB data', {
      candidateCount: candidates.length,
      uniqueIds: candidateIds.length,
    });

    // Batch fetch full documents from MongoDB
    const fullDocuments = await mongoService.getToolsByIds(candidateIds);

    log('Retrieved full documents from MongoDB', {
      documentsFound: fullDocuments.length,
      requestedIds: candidateIds.length,
      fullDocuments,
    });

    // Create a map for quick lookup by ID (handle both ObjectId and string formats)
    const documentMap = new Map<string, ToolData>();
    fullDocuments.forEach((doc) => {
      // Store by both string representation and ObjectId string
      const idStr = (doc._id as { toString: () => string }).toString();
      const toolData = doc as unknown as ToolData;
      documentMap.set(idStr, toolData);
      documentMap.set(doc._id as string, toolData);
    });

    console.log('enrichCandidatesWithFullData(): documentMap', {
      documentMap,
      fullDocuments,
    });

    // Create results array in the same order as candidates
    const results = candidates.map((candidate) => {
      const fullDoc = documentMap.get(candidate.id);
      if (fullDoc) {
        return fullDoc;
      } else {
        log(`No full document found for candidate ID: ${candidate.id}`);
        return null;
      }
    });

    const foundCount = results.filter((result) => result !== null).length;
    log('Enrichment completed', {
      totalCandidates: candidates.length,
      documentsFound: foundCount,
      documentsNotFound: candidates.length - foundCount,
      results,
    });

    return results as ToolData[];
  } catch (error) {
    logError('Failed to enrich candidates with full data', {
      error: error instanceof Error ? error.message : String(error),
      candidateCount: candidates.length,
    });

    // Return array of nulls to maintain order if enrichment fails
    return new Array(candidates.length).fill(null) as ToolData[];
  }
}

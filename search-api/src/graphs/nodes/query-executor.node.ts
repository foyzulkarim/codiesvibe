import { StateAnnotation } from '../../types/state';
import { QueryPlan } from '../../types/query-plan';
import { Candidate, QueryExecutorOutput } from '../../types/candidate';
import { QdrantService } from '../../services/qdrant.service';
import { MongoDBService } from '../../services/mongodb.service';
import { EmbeddingService } from '../../services/embedding.service';
import { fuseResults, groupCandidatesBySource } from '../../utils/fusion';

// Configuration for logging
const LOG_CONFIG = {
  enabled: process.env.NODE_ENV !== 'production',
  prefix: '⚡ Query Executor:',
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
          node: "query-executor",
          error: new Error("No execution plan provided for query execution"),
          timestamp: new Date(),
          recovered: false
        }
      ]
    };
  }

  const startTime = Date.now();
  log('Starting query execution', {
    strategy: executionPlan.strategy,
    vectorSourcesCount: executionPlan.vectorSources?.length || 0,
    structuredSourcesCount: executionPlan.structuredSources?.length || 0,
    fusionMethod: executionPlan.fusion || 'none'
  });

  try {
    // Initialize services
    const qdrantService = new QdrantService();
    const mongoService = new MongoDBService();
    const embeddingService = new EmbeddingService();

    const candidatesBySource = new Map<string, Candidate[]>();
    let vectorQueriesExecuted = 0;
    let structuredQueriesExecuted = 0;

    // Execute vector searches
    if (executionPlan.vectorSources && executionPlan.vectorSources.length > 0) {
      log('Executing vector searches', {
        sourcesCount: executionPlan.vectorSources.length
      });

      for (const vectorSource of executionPlan.vectorSources) {
        try {
          const vectorCandidates = await executeVectorSearch(
            vectorSource,
            query,
            intentState,
            qdrantService,
            embeddingService
          );

          if (vectorCandidates.length > 0) {
            candidatesBySource.set(`vector_${vectorSource.collection}`, vectorCandidates);
          }

          vectorQueriesExecuted++;
          log('Vector search completed', {
            collection: vectorSource.collection,
            candidatesFound: vectorCandidates.length,
            topK: vectorSource.topK
          });
        } catch (error) {
          logError('Vector search failed', {
            collection: vectorSource.collection,
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue with other sources instead of failing completely
        }
      }
    }

    // Execute structured searches
    if (executionPlan.structuredSources && executionPlan.structuredSources.length > 0) {
      log('Executing structured searches', {
        sourcesCount: executionPlan.structuredSources.length,
        sources: executionPlan.structuredSources.map(source => JSON.stringify(source))
      });

      for (const structuredSource of executionPlan.structuredSources) {
        try {
          const structuredCandidates = await executeStructuredSearch(
            structuredSource,
            mongoService
          );

          if (structuredCandidates.length > 0) {
            candidatesBySource.set(`mongodb_${structuredSource.source}`, structuredCandidates);
          }

          structuredQueriesExecuted++;
          log('Structured search completed', {
            source: structuredSource.source,
            candidatesFound: structuredCandidates.length,
            limit: structuredSource.limit || 'default'
          });
        } catch (error) {
          logError('Structured search failed', {
            source: structuredSource.source,
            error: error instanceof Error ? error.message : String(error)
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
        score: 1 - (index / singleSource.length) // Simple ranking normalization
      }));
    } else {
      // Multiple sources - apply fusion
      finalCandidates = fuseResults(candidatesBySource, executionPlan.fusion || 'rrf');
    }

    const executionTime = Date.now() - startTime;

    // Create execution stats
    const executionStats = {
      totalTimeMs: executionTime,
      nodeTimings: {
        ...state.executionStats?.nodeTimings,
        "query-executor": executionTime
      },
      vectorQueriesExecuted,
      structuredQueriesExecuted,
      fusionMethod: executionPlan.fusion || 'none'
    };

    // Create output
    const output: QueryExecutorOutput = {
      candidates: finalCandidates,
      executionStats: {
        vectorQueriesExecuted,
        structuredQueriesExecuted,
        fusionMethod: executionPlan.fusion || 'none',
        latencyMs: executionTime
      },
      confidence: executionPlan.confidence
    };

    log('Query execution completed successfully', {
      totalCandidates: finalCandidates.length,
      vectorQueriesExecuted,
      structuredQueriesExecuted,
      fusionMethod: executionPlan.fusion || 'none',
      executionTime
    });

    return {
      candidates: finalCandidates,
      executionStats,
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "query-executor"],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          "query-executor": executionTime
        }
      }
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logError('Query execution failed', {
      error: error instanceof Error ? error.message : String(error),
      executionTime
    });

    return {
      candidates: [],
      errors: [
        ...(state.errors || []),
        {
          node: "query-executor",
          error: error instanceof Error ? error : new Error("Unknown error in query execution"),
          timestamp: new Date(),
          recovered: false,
          recoveryStrategy: "Query execution failed - returning empty results"
        }
      ],
      executionStats: {
        totalTimeMs: executionTime,
        nodeTimings: {
          ...state.executionStats?.nodeTimings,
          "query-executor": executionTime
        },
        vectorQueriesExecuted: 0,
        structuredQueriesExecuted: 0,
        fusionMethod: executionPlan.fusion || 'none'
      },
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "query-executor"],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          "query-executor": executionTime
        }
      }
    };
  }
}

/**
 * Execute vector search against Qdrant
 */
async function executeVectorSearch(
  vectorSource: any,
  query: string,
  intentState: any,
  qdrantService: QdrantService,
  embeddingService: EmbeddingService
): Promise<Candidate[]> {
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
        queryVector = await embeddingService.generateEmbedding(intentState.referenceTool);
        break;
      case 'semantic_variant':
        const variants = intentState?.semanticVariants || [];
        if (variants.length === 0) {
          throw new Error('Semantic variant specified but none found in intent');
        }
        queryVector = await embeddingService.generateEmbedding(variants[0]);
        break;
      default:
        queryVector = await embeddingService.generateEmbedding(query);
    }

    // Build filter if specified
    let filter: any = undefined;
    if (vectorSource.filter) {
      // Convert vectorSource filter to Qdrant filter format
      filter = { must: [] };
      for (const [field, condition] of Object.entries(vectorSource.filter)) {
        filter.must.push({
          key: field,
          match: { value: condition }
        });
      }
    }

    // Execute search
    const searchResults = await qdrantService.searchByEmbedding(
      queryVector,
      vectorSource.topK,
      filter,
      vectorSource.embeddingType,
      vectorSource.collection,
    );

    // Convert to Candidate format
    const candidates: Candidate[] = searchResults.map((result: any, index: number) => ({
      id: result.id || result.payload?.id || `unknown_${index}`,
      source: 'qdrant',
      score: result.score || 0,
      metadata: {
        name: result.payload?.name || 'Unknown Tool',
        category: result.payload?.category,
        pricing: result.payload?.pricingSummary?.pricingModel?.[0],
        platform: result.payload?.interface?.[0],
        features: result.payload?.features || [],
        description: result.payload?.description
      },
      embeddingVector: result.vector || null,
      provenance: {
        collection: vectorSource.collection,
        queryVectorSource: vectorSource.queryVectorSource,
        filtersApplied: filter ? ['vector_filter_applied'] : []
      }
    }));

    return candidates;

  } catch (error) {
    logError('Vector search execution failed', {
      collection: vectorSource.collection,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Execute structured search against MongoDB
 */
async function executeStructuredSearch(
  structuredSource: any,
  mongoService: MongoDBService
): Promise<Candidate[]> {
  try {
    // Build MongoDB query from filters
    let query: any = {};

    log('Structured search query:', structuredSource);

    if (structuredSource.filters && structuredSource.filters.length > 0) {
      for (const filter of structuredSource.filters) {
        log('Structured search filter:', filter);
        switch (filter.operator) {
          case '=':
            log('Structured filter.field:', filter.field);
            query = {
              ...query,
              [filter.field]: filter.value
            };
            log('Structured query:', query);
            break;
          case 'contains':
            query = {
              ...query,
              [filter.field]: { $regex: filter.value, $options: 'i' }
            };
            break;
          case '>':
            query = {
              ...query,
              [filter.field]: { $gt: filter.value }
            };
            break;
          case '<':
            query = {
              ...query,
              [filter.field]: { $lt: filter.value }
            };
            break;
          case '>=':

            query = {
              ...query,
              [filter.field]: { $gte: filter.value }
            };
            break;
          case '<=':

            query = {
              ...query,
              [filter.field]: { $lte: filter.value }
            };
            break;
          case 'in':
            // Handle array of values - MongoDB $in operator
            if (Array.isArray(filter.value)) {
              query = {
                ...query,
                [filter.field]: { $in: filter.value }
              };
            } else {
              // Single value - treat as equals
              query = {
                ...query,
                [filter.field]: filter.value
              };
            }
            break;
          default:
            // Handle unknown operators by treating them as equals
            logWarning(`Unknown operator '${filter.operator}' for field '${filter.field}', treating as equals`);
            query = {
              ...query,
              [filter.field]: filter.value
            };
            break;
        }
      }
    }

    log('Structured search query:', query);

    // Execute query
    const results = await mongoService.searchTools(query, structuredSource.limit || 50);

    // Convert to Candidate format
    const candidates: Candidate[] = results.map((tool: any, index: number) => ({
      id: tool._id?.toString() || tool.id || `mongo_${index}`,
      source: 'mongodb',
      score: 0.5, // Default score for structured results (will be normalized later)
      metadata: {
        name: tool.name || 'Unknown Tool',
        category: tool.categories?.primary?.[0],
        pricing: tool.pricingSummary?.pricingModel?.[0],
        platform: tool.interface?.[0],
        features: tool.capabilities?.core || [],
        description: tool.description || tool.tagline
      },
      provenance: {
        collection: 'tools',
        queryVectorSource: 'structured_search',
        filtersApplied: structuredSource.filters?.map((f: any) => `${f.field}_${f.operator}_${f.value}`) || []
      }
    }));

    return candidates;

  } catch (error) {
    logError('Structured search execution failed', {
      source: structuredSource.source,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Helper function for warning logging
 */
const logWarning = (message: string, data?: any) => {
  if (LOG_CONFIG.enabled) {
    console.warn(`${LOG_CONFIG.prefix} WARNING: ${message}`, data ? data : '');
  }
};
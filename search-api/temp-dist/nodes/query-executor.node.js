"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryExecutorNode = queryExecutorNode;
const qdrant_service_1 = require("../services/qdrant.service");
const mongodb_service_1 = require("../services/mongodb.service");
const embedding_service_1 = require("../services/embedding.service");
const fusion_1 = require("../utils/fusion");
// Configuration for logging
const LOG_CONFIG = {
    enabled: process.env.NODE_ENV !== 'production',
    prefix: '⚡ Query Executor:',
};
// Helper function for conditional logging
const log = (message, data) => {
    if (LOG_CONFIG.enabled) {
        console.log(`${LOG_CONFIG.prefix} ${message}`, data ? data : '');
    }
};
const logError = (message, error) => {
    console.error(`${LOG_CONFIG.prefix} ERROR: ${message}`, error ? error : '');
};
/**
 * QueryExecutorNode - Deterministic execution against Qdrant and MongoDB
 *
 * Input: QueryPlan JSON from state
 * Output: Candidates array with execution statistics
 */
async function queryExecutorNode(state) {
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
        const qdrantService = new qdrant_service_1.QdrantService();
        const mongoService = new mongodb_service_1.MongoDBService();
        const embeddingService = new embedding_service_1.EmbeddingService();
        const candidatesBySource = new Map();
        let vectorQueriesExecuted = 0;
        let structuredQueriesExecuted = 0;
        // Execute vector searches
        if (executionPlan.vectorSources && executionPlan.vectorSources.length > 0) {
            log('Executing vector searches', {
                sourcesCount: executionPlan.vectorSources.length
            });
            for (const vectorSource of executionPlan.vectorSources) {
                try {
                    const vectorCandidates = await executeVectorSearch(vectorSource, query, intentState, qdrantService, embeddingService);
                    if (vectorCandidates.length > 0) {
                        candidatesBySource.set(`vector_${vectorSource.collection}`, vectorCandidates);
                    }
                    vectorQueriesExecuted++;
                    log('Vector search completed', {
                        collection: vectorSource.collection,
                        candidatesFound: vectorCandidates.length,
                        topK: vectorSource.topK
                    });
                }
                catch (error) {
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
                sourcesCount: executionPlan.structuredSources.length
            });
            for (const structuredSource of executionPlan.structuredSources) {
                try {
                    const structuredCandidates = await executeStructuredSearch(structuredSource, mongoService);
                    if (structuredCandidates.length > 0) {
                        candidatesBySource.set(`mongodb_${structuredSource.source}`, structuredCandidates);
                    }
                    structuredQueriesExecuted++;
                    log('Structured search completed', {
                        source: structuredSource.source,
                        candidatesFound: structuredCandidates.length,
                        limit: structuredSource.limit || 'default'
                    });
                }
                catch (error) {
                    logError('Structured search failed', {
                        source: structuredSource.source,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    // Continue with other sources instead of failing completely
                }
            }
        }
        // Apply fusion if multiple sources
        let finalCandidates;
        if (candidatesBySource.size === 0) {
            logWarning('No candidates found from any source');
            finalCandidates = [];
        }
        else if (candidatesBySource.size === 1) {
            // Single source - just normalize scores
            const singleSource = Array.from(candidatesBySource.values())[0];
            finalCandidates = singleSource.map((candidate, index) => ({
                ...candidate,
                score: 1 - (index / singleSource.length) // Simple ranking normalization
            }));
        }
        else {
            // Multiple sources - apply fusion
            finalCandidates = (0, fusion_1.fuseResults)(candidatesBySource, executionPlan.fusion || 'rrf');
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
        const output = {
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
    }
    catch (error) {
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
async function executeVectorSearch(vectorSource, query, intentState, qdrantService, embeddingService) {
    try {
        // Generate query vector based on source
        let queryVector;
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
        let filter = undefined;
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
        const searchResults = await qdrantService.searchByEmbedding(queryVector, vectorSource.topK, filter, vectorSource.embeddingType);
        // Convert to Candidate format
        const candidates = searchResults.map((result, index) => ({
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
    }
    catch (error) {
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
async function executeStructuredSearch(structuredSource, mongoService) {
    try {
        // Build MongoDB query from filters
        const query = {};
        if (structuredSource.filters && structuredSource.filters.length > 0) {
            for (const filter of structuredSource.filters) {
                switch (filter.operator) {
                    case '=':
                        query[filter.field] = filter.value;
                        break;
                    case 'contains':
                        query[filter.field] = { $regex: filter.value, $options: 'i' };
                        break;
                    case '>':
                        query[filter.field] = { $gt: filter.value };
                        break;
                    case '<':
                        query[filter.field] = { $lt: filter.value };
                        break;
                    case '>=':
                        query[filter.field] = { $gte: filter.value };
                        break;
                    case '<=':
                        query[filter.field] = { $lte: filter.value };
                        break;
                }
            }
        }
        // Execute query
        const results = await mongoService.searchTools(query, structuredSource.limit || 50);
        // Convert to Candidate format
        const candidates = results.map((tool, index) => ({
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
                filtersApplied: structuredSource.filters?.map((f) => `${f.field}_${f.operator}_${f.value}`) || []
            }
        }));
        return candidates;
    }
    catch (error) {
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
const logWarning = (message, data) => {
    if (LOG_CONFIG.enabled) {
        console.warn(`${LOG_CONFIG.prefix} WARNING: ${message}`, data ? data : '');
    }
};

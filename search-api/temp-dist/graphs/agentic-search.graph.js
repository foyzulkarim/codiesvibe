"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgenticSearchGraph = createAgenticSearchGraph;
exports.default = createAgenticSearchGraph;
exports.createCompiledAgenticSearchGraph = createCompiledAgenticSearchGraph;
exports.searchWithAgenticPipeline = searchWithAgenticPipeline;
exports.batchSearchWithAgenticPipeline = batchSearchWithAgenticPipeline;
exports.streamSearchWithAgenticPipeline = streamSearchWithAgenticPipeline;
const langgraph_1 = require("@langchain/langgraph");
const state_1 = require("@/types/state");
const langgraph_2 = require("@langchain/langgraph");
// Import our new 3-node pipeline
const intent_extraction_node_1 = require("@/nodes/intent-extraction.node");
/**
 * Agentic Search Graph - 3-Node LLM-First Pipeline
 *
 * Simplified architecture replacing the complex 13+ node extraction pipeline:
 *
 * 1. IntentExtractorNode - LLM-based intent understanding
 * 2. QueryPlannerNode - LLM-based retrieval strategy planning
 * 3. QueryExecutorNode - Deterministic execution against Qdrant + MongoDB
 *
 * Architecture: Query → Intent → Plan → Candidates
 */
/**
 * Create the agentic search workflow graph
 */
function createAgenticSearchGraph() {
    const workflow = new langgraph_1.StateGraph(state_1.StateAnnotation)
        // Single orchestrator node that handles the 3-node pipeline internally
        .addNode("agentic-search", intent_extraction_node_1.intentExtractionNode)
        // Simple linear flow: START → Agentic Search → END
        .addEdge(langgraph_1.START, "agentic-search")
        .addEdge("agentic-search", langgraph_1.END);
    return workflow;
}
/**
 * Compile the graph with memory and checkpointing
 */
function createCompiledAgenticSearchGraph() {
    const graph = createAgenticSearchGraph();
    // Add memory for conversation context (optional for search)
    const memory = new langgraph_2.MemorySaver();
    // Compile with checkpointing for reliability
    const compiledGraph = graph.compile({
        checkpointer: memory
    });
    return compiledGraph;
}
/**
 * Simple entry point for single queries
 */
async function searchWithAgenticPipeline(query, options = {}) {
    const startTime = Date.now();
    try {
        // Initialize state
        const initialState = {
            query,
            intentState: null,
            executionPlan: null,
            candidates: [],
            executionStats: {
                totalTimeMs: 0,
                nodeTimings: {},
                vectorQueriesExecuted: 0,
                structuredQueriesExecuted: 0
            },
            errors: [],
            metadata: {
                startTime: new Date(),
                executionPath: [],
                nodeExecutionTimes: {},
                threadId: options.threadId,
                totalNodesExecuted: 0,
                pipelineVersion: "2.0-llm-first",
                ...options.metadata
            }
        };
        // Use simple direct execution (no checkpoints needed for single queries)
        if (!options.enableCheckpoints) {
            const result = await (0, intent_extraction_node_1.intentExtractionNode)(initialState);
            return {
                ...result,
                metadata: {
                    ...result.metadata,
                    endTime: new Date()
                }
            };
        }
        // Use direct node execution for simplicity (graph checkpoints not needed)
        const result = await (0, intent_extraction_node_1.intentExtractionNode)(initialState);
        const totalTime = Date.now() - startTime;
        return {
            ...result,
            executionStats: {
                ...result.executionStats,
                totalTimeMs: totalTime
            },
            metadata: {
                ...result.metadata,
                endTime: new Date()
            }
        };
    }
    catch (error) {
        const totalTime = Date.now() - startTime;
        console.error('Agentic search pipeline failed:', error);
        return {
            query,
            intentState: null,
            executionPlan: null,
            candidates: [],
            executionStats: {
                totalTimeMs: totalTime,
                nodeTimings: {},
                vectorQueriesExecuted: 0,
                structuredQueriesExecuted: 0
            },
            errors: [{
                    node: "agentic-search-graph",
                    error: error instanceof Error ? error : new Error("Unknown error in agentic search"),
                    timestamp: new Date(),
                    recovered: false,
                    recoveryStrategy: "Complete graph failure - check node-level errors"
                }],
            metadata: {
                startTime: new Date(startTime),
                endTime: new Date(),
                executionPath: ["agentic-search"],
                nodeExecutionTimes: {},
                threadId: options.threadId,
                totalNodesExecuted: 0,
                pipelineVersion: "2.0-llm-first"
            }
        };
    }
}
/**
 * Batch processing for multiple queries
 */
async function batchSearchWithAgenticPipeline(queries, options = {}) {
    const concurrency = options.concurrency || 3;
    const results = [];
    console.log(`🚀 Starting batch agentic search for ${queries.length} queries (concurrency: ${concurrency})`);
    // Process in batches to control resource usage
    for (let i = 0; i < queries.length; i += concurrency) {
        const batch = queries.slice(i, i + concurrency);
        const batchPromises = batch.map((query, batchIndex) => searchWithAgenticPipeline(query, {
            threadId: options.threadId ? `${options.threadId}-batch-${Math.floor(i / concurrency)}-${batchIndex}` : undefined,
            enableCheckpoints: options.enableCheckpoints
        }));
        try {
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            console.log(`✅ Batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(queries.length / concurrency)} completed`);
        }
        catch (error) {
            console.error(`❌ Batch ${Math.floor(i / concurrency) + 1} failed:`, error);
            // Add error results for failed batch
            const errorResults = batch.map(query => ({
                query,
                intentState: null,
                executionPlan: null,
                candidates: [],
                executionStats: { totalTimeMs: 0, nodeTimings: {}, vectorQueriesExecuted: 0, structuredQueriesExecuted: 0 },
                errors: [{
                        node: "batch-search",
                        error: error instanceof Error ? error : new Error("Batch search failed"),
                        timestamp: new Date(),
                        recovered: false
                    }],
                metadata: {
                    startTime: new Date(),
                    executionPath: ["batch-search"],
                    nodeExecutionTimes: {},
                    totalNodesExecuted: 0,
                    pipelineVersion: "2.0-llm-first"
                }
            }));
            results.push(...errorResults);
        }
    }
    const successfulResults = results.filter(r => !r.errors || r.errors.length === 0);
    const averageTime = results.reduce((sum, r) => sum + (r.executionStats?.totalTimeMs || 0), 0) / results.length;
    console.log(`🎉 Batch search completed: ${successfulResults.length}/${results.length} successful, avg time: ${Math.round(averageTime)}ms`);
    return results;
}
/**
 * Stream search for real-time feedback (experimental)
 */
async function* streamSearchWithAgenticPipeline(query, options = {}) {
    const startTime = Date.now();
    try {
        // Initialize state
        const state = {
            query,
            intentState: null,
            executionPlan: null,
            candidates: [],
            executionStats: {
                totalTimeMs: 0,
                nodeTimings: {},
                vectorQueriesExecuted: 0,
                structuredQueriesExecuted: 0
            },
            errors: [],
            metadata: {
                startTime: new Date(),
                executionPath: [],
                nodeExecutionTimes: {},
                threadId: options.threadId,
                totalNodesExecuted: 0,
                pipelineVersion: "2.0-llm-first"
            }
        };
        // Emit initial state
        yield {
            stage: "initialized",
            data: state,
            progress: 0
        };
        // For now, just run the full pipeline and emit final result
        // In a real implementation, we'd instrument the nodes to emit intermediate results
        const result = await searchWithAgenticPipeline(query, options);
        yield {
            stage: "completed",
            data: result,
            progress: 100
        };
    }
    catch (error) {
        yield {
            stage: "error",
            data: {
                query,
                intentState: null,
                executionPlan: null,
                candidates: [],
                executionStats: { totalTimeMs: Date.now() - startTime, nodeTimings: {}, vectorQueriesExecuted: 0, structuredQueriesExecuted: 0 },
                errors: [{
                        node: "stream-search",
                        error: error instanceof Error ? error : new Error("Stream search failed"),
                        timestamp: new Date(),
                        recovered: false
                    }],
                metadata: {
                    startTime: new Date(startTime),
                    executionPath: ["stream-search"],
                    nodeExecutionTimes: {},
                    threadId: options.threadId,
                    totalNodesExecuted: 0,
                    pipelineVersion: "2.0-llm-first"
                }
            },
            progress: -1
        };
    }
}

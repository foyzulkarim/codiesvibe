"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intentExtractionNode = intentExtractionNode;
const intent_extractor_node_1 = require("./intent-extractor.node");
const query_planner_node_1 = require("./query-planner.node");
const query_executor_node_1 = require("./query-executor.node");
/**
 * Intent Extraction Node (Refactored)
 *
 * Simplified orchestrator that runs the new 3-node LLM-first pipeline:
 * 1. IntentExtractorNode - LLM-based intent understanding
 * 2. QueryPlannerNode - LLM-based retrieval strategy planning
 * 3. QueryExecutorNode - Deterministic execution against Qdrant + MongoDB
 */
async function intentExtractionNode(state) {
    const startTime = Date.now();
    try {
        // Step 1: Extract intent using LLM
        let currentState = { ...state, ...await (0, intent_extractor_node_1.intentExtractorNode)(state) };
        // Step 2: Plan retrieval strategy using LLM
        currentState = { ...currentState, ...await (0, query_planner_node_1.queryPlannerNode)(currentState) };
        // Step 3: Execute queries against databases (deterministic)
        currentState = { ...currentState, ...await (0, query_executor_node_1.queryExecutorNode)(currentState) };
        const executionTime = Date.now() - startTime;
        return {
            ...currentState,
            executionStats: {
                ...currentState.executionStats,
                totalTimeMs: executionTime
            },
            metadata: {
                ...currentState.metadata,
                executionPath: [...(state.metadata?.executionPath || []), "intent-extraction"],
                nodeExecutionTimes: {
                    ...(state.metadata?.nodeExecutionTimes || {}),
                    "intent-extraction": executionTime
                },
                totalNodesExecuted: 3,
                pipelineVersion: "2.0-llm-first"
            }
        };
    }
    catch (error) {
        console.error("Error in intent extraction pipeline:", error);
        const executionTime = Date.now() - startTime;
        return {
            errors: [
                ...(state.errors || []),
                {
                    node: "intent-extraction",
                    error: error instanceof Error ? error : new Error("Unknown error in intent extraction"),
                    timestamp: new Date(),
                    recovered: false,
                    recoveryStrategy: "Complete pipeline failure - check individual node errors"
                }
            ],
            executionStats: {
                totalTimeMs: executionTime,
                nodeTimings: {},
                vectorQueriesExecuted: 0,
                structuredQueriesExecuted: 0,
                fusionMethod: undefined
            },
            metadata: {
                ...state.metadata,
                executionPath: [...(state.metadata?.executionPath || []), "intent-extraction"],
                nodeExecutionTimes: {
                    ...(state.metadata?.nodeExecutionTimes || {}),
                    "intent-extraction": executionTime
                },
                totalNodesExecuted: 0,
                pipelineVersion: "2.0-llm-first"
            }
        };
    }
}

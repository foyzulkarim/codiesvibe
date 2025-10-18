import { StateAnnotation } from "../types/state";
import { intentExtractorNode } from "./intent-extractor.node";
import { queryPlannerNode } from "./query-planner.node";
import { queryExecutorNode } from "./query-executor.node";

/**
 * Intent Extraction Node (Refactored)
 *
 * Simplified orchestrator that runs the new 3-node LLM-first pipeline:
 * 1. IntentExtractorNode - LLM-based intent understanding
 * 2. QueryPlannerNode - LLM-based retrieval strategy planning
 * 3. QueryExecutorNode - Deterministic execution against Qdrant + MongoDB
 */
export async function intentExtractionNode(
  state: typeof StateAnnotation.State
): Promise<Partial<typeof StateAnnotation.State>> {
  const startTime = Date.now();

  try {
    // Step 1: Extract intent using LLM
    let currentState = { ...state, ...await intentExtractorNode(state) };

    // Step 2: Plan retrieval strategy using LLM
    currentState = { ...currentState, ...await queryPlannerNode(currentState) };

    // Step 3: Execute queries against databases (deterministic)
    currentState = { ...currentState, ...await queryExecutorNode(currentState) };

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
  } catch (error) {
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

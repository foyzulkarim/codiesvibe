import { StateAnnotation } from "../types/state";
import { singlePlanExecutorNode } from "./execution/single-plan-executor.node";
import { multiStrategyExecutorNode } from "./execution/multi-strategy-executor.node";
import { resultMergerNode } from "./execution/result-merger.node";
import { log } from "console";

/**
 * Execution Node
 * 
 * Orchestrates the execution of plans by routing to appropriate executors
 * and merging results when necessary.
 */
export async function executionNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  try {
    let currentState = state;
    const { plan } = state;

    // Log the plan for debugging
    log('executionNode(): Plan to execute', { plan: JSON.stringify(plan) });
    
    if (!plan) {
      throw new Error("No plan found for execution");
    }
    
    // Check if it's a multi-strategy plan
    if ('strategies' in plan) {
      // Multi-strategy execution
      currentState = { ...currentState, ...await multiStrategyExecutorNode(currentState) };
    } else {
      // Single plan execution
      const singlePlanResult = await singlePlanExecutorNode(currentState);
      console.log('executionNode(): Result from singlePlanExecutorNode:', {
        hasQueryResults: !!singlePlanResult.queryResults,
        queryResultsLength: singlePlanResult.queryResults?.length || 0,
        queryResultsPreview: singlePlanResult.queryResults?.slice(0, 2).map(r => ({ name: r?.name, id: r?._id })) || []
      });
      currentState = { ...currentState, ...singlePlanResult };
    }
    
    // Merge results if we have multiple result sets
    if (currentState.executionResults && currentState.executionResults.length > 1) {
      currentState = { ...currentState, ...await resultMergerNode(currentState) };
    }

    // Log the final state for debugging
    log('executionNode(): Final state after execution', { 
      hasQueryResults: !!currentState.queryResults,
      queryResultsLength: currentState.queryResults?.length || 0,
      queryResultsPreview: currentState.queryResults?.slice(0, 2).map(r => ({ name: r?.name, id: r?._id })) || []
    });
    
    return {
      ...currentState,
      metadata: {
        ...currentState.metadata,
        executionPath: [...(currentState.metadata?.executionPath || []), "execution"],
        nodeExecutionTimes: {
          ...(currentState.metadata?.nodeExecutionTimes || {}),
          "execution": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
    
  } catch (error) {
    console.error("Error in execution:", error);
    return {
      errors: [
        ...(state.errors || []),
        {
          node: "execution",
          error: error instanceof Error ? error : new Error("Unknown error in execution"),
          timestamp: new Date()
        }
      ],
      queryResults: [], // Empty results on error
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "execution"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "execution": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
  }
}
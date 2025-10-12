import { StateAnnotation } from "../types/state";
import { optimalPlannerNode } from "./planning/optimal-planner.node";
import { multiStrategyPlannerNode } from "./planning/multi-strategy-planner.node";
import { fallbackPlannerNode } from "./planning/fallback-planner.node";
import { planValidatorNode } from "./planning/plan-validator.node";

/**
 * Query Planning Node
 * 
 * Routes to the appropriate planner based on the routing decision
 * and validates the resulting plan.
 */
export async function queryPlanningNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  try {
    let currentState = state;
    const { routingDecision } = state;
    console.log("Routing decision:", routingDecision);
    // Route to appropriate planner based on routing decision
    switch (routingDecision) {
      case "optimal":
        currentState = { ...currentState, ...await optimalPlannerNode(currentState) };
        break;
      case "multi-strategy":
        currentState = { ...currentState, ...await multiStrategyPlannerNode(currentState) };
        break;
      case "fallback":
      default:
        currentState = { ...currentState, ...await fallbackPlannerNode(currentState) };
        break;
    }
    
    // Validate the generated plan
    currentState = { ...currentState, ...planValidatorNode(currentState) };
    
    return {
      ...currentState,
      metadata: {
        ...currentState.metadata,
        executionPath: [...(currentState.metadata?.executionPath || []), "query-planning"],
        nodeExecutionTimes: {
          ...(currentState.metadata?.nodeExecutionTimes || {}),
          "query-planning": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
    
  } catch (error) {
    console.error("Error in query planning:", error);
    
    // Fallback to basic plan
    const fallbackState = await fallbackPlannerNode(state);
    
    return {
      ...fallbackState,
      errors: [
        ...(state.errors || []),
        {
          node: "query-planning",
          error: error instanceof Error ? error : new Error("Unknown error in query planning"),
          timestamp: new Date()
        }
      ],
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "query-planning"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "query-planning": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
  }
}
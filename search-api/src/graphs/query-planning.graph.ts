import { StateGraph, END } from "@langchain/langgraph";
import { StateAnnotation } from "@/types/state";

// Import planner nodes
import { optimalPlannerNode } from "@/nodes/planning/optimal-planner.node";
import { multiStrategyPlannerNode } from "@/nodes/planning/multi-strategy-planner.node";
import { fallbackPlannerNode } from "@/nodes/planning/fallback-planner.node";
import { planValidatorNode } from "@/nodes/planning/plan-validator.node";

// Import routers
import { enhancedConfidenceRouter } from "@/routers/confidence.router";

/**
 * Creates the query planning subgraph with conditional routing
 */
export function createQueryPlanningGraph(): StateGraph<typeof StateAnnotation.State> {
  const workflow = new StateGraph(StateAnnotation)
    // Router node
    .addNode("confidence-router", enhancedConfidenceRouter)
    
    // Planning nodes
    .addNode("optimal-planner", optimalPlannerNode)
    .addNode("multi-strategy-planner", multiStrategyPlannerNode)
    .addNode("fallback-planner", fallbackPlannerNode)
    .addNode("plan-validator", planValidatorNode)
    
    // Set the entry point
    .setEntryPoint("confidence-router")
    
    // Define conditional routing from confidence to planner
    .addConditionalEdges(
      "confidence-router",
      enhancedConfidenceRouter,
      {
        "optimal": "optimal-planner",
        "multi-strategy": "multi-strategy-planner",
        "fallback": "fallback-planner"
      }
    )
    
    // All planners converge to validator
    .addEdge("optimal-planner", "plan-validator")
    .addEdge("multi-strategy-planner", "plan-validator")
    .addEdge("fallback-planner", "plan-validator")
    
    .addEdge("plan-validator", END);
    
  return workflow as any;
}

/**
 * Entry point for query planning
 */
export async function planQuery(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const graph = createQueryPlanningGraph();
  const compiledGraph = graph.compile();
  
  // Update execution path
  const updatedState = {
    ...state,
    metadata: {
      ...state.metadata,
      executionPath: [...(state.metadata.executionPath || []), "query-planning"]
    }
  };
  
  return await compiledGraph.invoke(updatedState);
}

/**
 * Standalone planning function for direct invocation
 */
export async function createExecutionPlan(intent: any, confidence: any): Promise<any> {
  const graph = createQueryPlanningGraph();
  const compiledGraph = graph.compile();
  
  const state = {
    intent,
    confidence,
    metadata: {
      startTime: new Date(),
      executionPath: ["query-planning"],
      nodeExecutionTimes: {}
    }
  };
  
  const result = await compiledGraph.invoke(state);
  return result.plan;
}

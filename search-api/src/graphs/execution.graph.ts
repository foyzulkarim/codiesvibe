import { StateGraph, END } from "@langchain/langgraph";
import { StateAnnotation } from "@/types/state";

// Import execution nodes
import { singlePlanExecutorNode } from "@/nodes/execution/single-plan-executor.node";
import { multiStrategyExecutorNode } from "@/nodes/execution/multi-strategy-executor.node";
import { resultMergerNode } from "@/nodes/execution/result-merger.node";
import { completionNode } from "@/nodes/execution/completion.node";

// Import planning nodes for refinement/expansion
import { refinementPlannerNode } from "@/nodes/planning/refinement-planner.node";
import { expansionPlannerNode } from "@/nodes/planning/expansion-planner.node";

// Import evaluation and routing nodes
import { qualityEvaluatorNode } from "@/nodes/routing/quality-evaluator.node";
import { executionRouter, postExecutionRouter } from "@/routers/execution.router";
import { adaptiveQualityRouter } from "@/routers/quality.router";

/**
 * Creates the execution subgraph with refinement/expansion cycles
 */
export function createExecutionGraph(): StateGraph<typeof StateAnnotation.State> {
  const workflow = new StateGraph(StateAnnotation)
    // Execution nodes
    .addNode("quality-evaluator", qualityEvaluatorNode)
    
    // Planning nodes for refinement/expansion
    .addNode("refinement-planner", refinementPlannerNode)
    .addNode("expansion-planner", expansionPlannerNode)
    
    // Execution routers
    .addNode("execution-router", executionRouter)
    .addNode("post-execution-router", postExecutionRouter)
    .addNode("quality-router", adaptiveQualityRouter)
    
    // Executor nodes
    .addNode("single-plan-executor", singlePlanExecutorNode)
    .addNode("multi-strategy-executor", multiStrategyExecutorNode)
    .addNode("result-merger", resultMergerNode)
    .addNode("completion", completionNode)
    
    // Start with quality evaluation (for initial execution, this will route to execution)
    .addEdge("__start__", "quality-evaluator")
    
    // Route based on quality (first time will route to execution)
    .addConditionalEdges(
      "quality-evaluator",
      preQualityRouter,
      {
        "execution-router": "execution-router",
        "completion": "completion"
      }
    )
    
    // Route to appropriate executor
    .addConditionalEdges(
      "execution-router",
      executionRouter,
      {
        "single-plan-executor": "single-plan-executor",
        "multi-strategy-executor": "multi-strategy-executor"
      }
    )
    
    // After execution, determine if merging is needed
    .addEdge("single-plan-executor", "post-execution-router")
    .addEdge("multi-strategy-executor", "post-execution-router")
    
    // Route based on post-execution needs
    .addConditionalEdges(
      "post-execution-router",
      postExecutionRouter,
      {
        "result-merger": "result-merger",
        "completion": "completion"
      }
    )
    
    // After merging (if needed), evaluate quality again
    .addEdge("result-merger", "quality-evaluator")
    
    // Route based on quality assessment
    .addConditionalEdges(
      "quality-router",
      adaptiveQualityRouter,
      {
        "refinement-planner": "refinement-planner",
        "expansion-planner": "expansion-planner",
        "completion": "completion"
      }
    )
    
    // After refinement/expansion, go back to execution
    .addEdge("refinement-planner", "execution-router")
    .addEdge("expansion-planner", "execution-router")
    
    // End at completion
    .addEdge("completion", END);
    
  return workflow;
}

/**
 * Entry point for execution
 */
export async function executePlan(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const graph = createExecutionGraph();
  const compiledGraph = graph.compile();
  
  // Update execution path
  const updatedState = {
    ...state,
    metadata: {
      ...state.metadata,
      executionPath: [...(state.metadata.executionPath || []), "execution"]
    }
  };
  
  return await compiledGraph.invoke(updatedState);
}

/**
 * Standalone execution function for direct invocation
 */
export async function executeSearch(plan: any, query: string): Promise<any> {
  const graph = createExecutionGraph();
  const compiledGraph = graph.compile();
  
  const state = {
    query,
    plan,
    metadata: {
      startTime: new Date(),
      executionPath: ["execution"],
      nodeExecutionTimes: {}
    }
  };
  
  const result = await compiledGraph.invoke(state);
  return result.completion;
}

/**
 * Pre-quality router for initial execution decision
 */
async function preQualityRouter(state: typeof StateAnnotation.State): Promise<"execution-router" | "completion"> {
  // If we don't have results yet, we need to execute
  if (!state.queryResults || state.queryResults.length === 0) {
    return "execution-router";
  }
  
  // If we have results, evaluate quality
  return "quality-router";
}
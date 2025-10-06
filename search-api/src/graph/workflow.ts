import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState, GraphStateAnnotation } from "./state";
import { planner, executor, evaluator, response, clarification } from "./nodes";
import config from "../config/agentic";

/**
 * Conditional edge function to determine if the workflow should continue
 */
const shouldContinue = (state: GraphState): string => {
  // If we have a response or error, we're done
  if (state.response || state.error) {
    return END;
  }

  // If we need clarification, go to clarification node
  if (state.needsClarification) {
    return "clarification";
  }

  // Get current iteration count
  const currentIteration = state.metadata?.iterationCount || 0;
  const maxIterations = state.metadata?.maxIterations || config.MAX_ITERATIONS;

  // If we've reached max iterations, go to final_response
  if (currentIteration >= maxIterations) {
    return "final_response";
  }

  // If we have no plan, go to planner
  if (!state.plan) {
    return "planner";
  }

  // If we have a plan but no results, go to executor
  if (state.plan && (!state.results || state.results.length === 0)) {
    return "executor";
  }

  // If we have results but no evaluation, go to evaluator
  if (state.results && state.results.length > 0 && !state.evaluation) {
    return "evaluator";
  }

  // If evaluation says we should continue and we haven't reached max iterations, go back to planner
  if (state.evaluation?.shouldContinue && currentIteration < maxIterations) {
    return "planner";
  }

  // If we have results and evaluation says we're done, go to final_response
  if (state.results && state.results.length > 0 && state.evaluation && !state.evaluation.shouldContinue) {
    return "final_response";
  }

  // If we have results but no evaluation (edge case), go to evaluator
  if (state.results && state.results.length > 0 && !state.evaluation) {
    return "evaluator";
  }

  // If we have no results after execution and evaluation, go to final_response
  if (state.results && state.results.length === 0 && state.evaluation && !state.evaluation.shouldContinue) {
    return "final_response";
  }

  // Default: go to final_response to prevent infinite loops
  return "final_response";
};

/**
 * Create and compile the LangGraph workflow
 */
export const createWorkflow = () => {
  const workflow = new StateGraph(GraphStateAnnotation)
    .addNode("planner", planner)
    .addNode("executor", executor)
    .addNode("evaluator", evaluator)
    .addNode("final_response", response)
    .addNode("clarification", clarification)
    
    // Add edges with conditional logic
    .addEdge(START, "planner")
    .addConditionalEdges("planner", shouldContinue)
    .addConditionalEdges("executor", shouldContinue)
    .addConditionalEdges("evaluator", shouldContinue)
    .addEdge("final_response", END)
    .addEdge("clarification", END);
  
  // Compile the workflow with a reasonable recursion limit
  return workflow.compile({
    recursionLimit: 10 // Increased from default 25 to provide buffer for our 3 iterations
  });
};

/**
 * Create a workflow instance that can be used throughout the application
 */
export const searchWorkflow = createWorkflow();

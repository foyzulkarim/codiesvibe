import { StateAnnotation } from "@/types/state";
import { Plan, MultiStrategyPlan } from "@/types/plan";

/**
 * Route to appropriate executor based on plan structure
 */
export async function executionRouter(state: typeof StateAnnotation.State): Promise<"single-plan-executor" | "multi-strategy-executor"> {
  const { plan } = state;
  
  if (!plan) {
    console.log("Execution router: No plan available, routing to single-plan-executor with fallback");
    return "single-plan-executor";
  }
  
  try {
    // Check if it's a multi-strategy plan
    const isMultiStrategy = "strategies" in plan;
    
    if (isMultiStrategy) {
      const multiStrategyPlan = plan as MultiStrategyPlan;
      
      // Validate multi-strategy plan
      if (!multiStrategyPlan.strategies || multiStrategyPlan.strategies.length === 0) {
        console.log("Execution router: Invalid multi-strategy plan, routing to single-plan-executor");
        return "single-plan-executor";
      }
      
      if (!multiStrategyPlan.weights || multiStrategyPlan.weights.length !== multiStrategyPlan.strategies.length) {
        console.log("Execution router: Invalid weights in multi-strategy plan, routing to single-plan-executor");
        return "single-plan-executor";
      }
      
      console.log(`Execution router: Valid multi-strategy plan with ${multiStrategyPlan.strategies.length} strategies, routing to multi-strategy-executor`);
      return "multi-strategy-executor";
    } else {
      // Single plan execution
      const singlePlan = plan as Plan;
      
      if (!singlePlan.steps || singlePlan.steps.length === 0) {
        console.log("Execution router: Invalid single plan, but routing to single-plan-executor for fallback handling");
      } else {
        console.log(`Execution router: Valid single plan with ${singlePlan.steps.length} steps, routing to single-plan-executor`);
      }
      
      return "single-plan-executor";
    }
  } catch (error) {
    console.error("Error in executionRouter:", error);
    console.log("Execution router: Error occurred, routing to single-plan-executor");
    return "single-plan-executor";
  }
}

/**
 * Post-execution router to determine if result merging is needed
 */
export async function postExecutionRouter(state: typeof StateAnnotation.State): Promise<"result-merger" | "execution-completion"> {
  const { executionResults, plan } = state;
  
  if (!executionResults || executionResults.length === 0) {
    console.log("Post-execution router: No execution results, routing to execution-completion");
    return "execution-completion";
  }
  
  // Check if this was a multi-strategy execution
  const isMultiStrategy = plan && "strategies" in plan;
  
  if (isMultiStrategy) {
    console.log("Post-execution router: Multi-strategy execution detected, routing to result-merger");
    return "result-merger";
  } else {
    console.log("Post-execution router: Single strategy execution, routing to execution-completion");
    return "execution-completion";
  }
}

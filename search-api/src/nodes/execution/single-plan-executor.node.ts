import { StateAnnotation } from "@/types/state";
import { Plan, Function } from "@/types/plan";
import { functionRegistry } from "@/nodes/functions";

/**
 * Execute a single plan step-by-step, managing dependencies between steps
 */
export async function singlePlanExecutorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { plan } = state;
  
  if (!plan || ("strategies" in plan)) {
    return {
      queryResults: [],
      metadata: {
        ...state.metadata,
        executionError: "No valid single plan provided for execution"
      }
    };
  }
  
  try {
    const singlePlan = plan as Plan;
    const executionResults: any[] = [];
    let currentResults: any[] = [];
    
    // Execute each step in sequence
    for (let i = 0; i < singlePlan.steps.length; i++) {
      const step = singlePlan.steps[i];
      const startTime = Date.now();
      
      // Get the function to execute
      const executor = functionRegistry[step.name as keyof typeof functionRegistry];
      if (!executor) {
        throw new Error(`Unknown function: ${step.name}`);
      }
      
      // Prepare input data if step references previous results
      let stepParams = { ...step.parameters };
      if (step.inputFromStep !== undefined && step.inputFromStep >= 0 && step.inputFromStep < executionResults.length) {
        stepParams.input = executionResults[step.inputFromStep];
      }
      
      // Execute the function
      const stepResult = await executor(stepParams);
      executionResults.push(stepResult);
      
      // Update current results for the next step
      if (stepResult.results && Array.isArray(stepResult.results)) {
        currentResults = stepResult.results;
      } else if (Array.isArray(stepResult)) {
        currentResults = stepResult;
      }
      
      // Log execution time
      const executionTime = Date.now() - startTime;
      console.log(`Step ${i + 1} (${step.name}) completed in ${executionTime}ms`);
      
      // Update metadata with execution time
      state.metadata.nodeExecutionTimes[`${step.name}_${i}`] = executionTime;
    }
    
    return {
      executionResults,
      queryResults: currentResults,
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata.executionPath || []), "single-plan-executor"],
        lastExecutionPlan: singlePlan.description,
        stepsExecuted: singlePlan.steps.length
      }
    };
  } catch (error) {
    console.error("Error in singlePlanExecutorNode:", error);
    
    // Add error to errors array
    const newError = {
      node: "single-plan-executor",
      error: error instanceof Error ? error : new Error(String(error)),
      timestamp: new Date()
    };
    
    return {
      queryResults: [],
      metadata: {
        ...state.metadata,
        executionError: error instanceof Error ? error.message : String(error),
        executionPath: [...(state.metadata.executionPath || []), "single-plan-executor"]
      },
      errors: [...(state.errors || []), newError]
    };
  }
}
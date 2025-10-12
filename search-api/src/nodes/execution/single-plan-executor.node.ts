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
        ...state.metadata
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
      
      // Prepare a modified state for this step execution
      let stepState = { ...state };
      
      // If this step references previous results, update the state with those results
      if (step.inputFromStep !== undefined && step.inputFromStep >= 0 && step.inputFromStep < executionResults.length) {
        const previousResult = executionResults[step.inputFromStep];
        // Update the executionResults to include the previous step's result
        stepState.executionResults = [...(state.executionResults || []), previousResult];
        
        // Also update queryResults if the previous result has tools
        if (previousResult.tools || previousResult.queryResults) {
          stepState.queryResults = previousResult.tools || previousResult.queryResults;
        }
      }
      
      // Execute the function with the modified state
      const stepResult = await executor(stepState);
      executionResults.push(stepResult);
      
      // Update current results for the next step
      if (stepResult.queryResults && Array.isArray(stepResult.queryResults)) {
        currentResults = stepResult.queryResults;
      } else if (Array.isArray(stepResult)) {
        currentResults = stepResult;
      }
      
      // Log the step result for debugging
      console.log(`Step ${i + 1} (${step.name}) result:`, {
        hasQueryResults: !!stepResult.queryResults,
        queryResultsLength: stepResult.queryResults?.length || 0,
        currentResultsLength: currentResults.length
      });
      
      // Log execution time
      const executionTime = Date.now() - startTime;
      console.log(`Step ${i + 1} (${step.name}) completed in ${executionTime}ms`);
      
      // Update metadata with execution time
      state.metadata.nodeExecutionTimes[`${step.name}_${i}`] = executionTime;

      // step.name
      state.metadata.name = step.name;
    }
    
    // Log final state before returning
    console.log('singlePlanExecutorNode(): Final state before return:', {
      executionResultsLength: executionResults.length,
      currentResultsLength: currentResults.length,
      currentResultsPreview: currentResults.slice(0, 2).map(r => ({ name: r?.name, id: r?._id }))
    });
    
    return {
      executionResults,
      queryResults: currentResults,
      metadata: {
        ...state.metadata,
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
        ...state.metadata
      },
      errors: [...(state.errors || []), newError]
    };
  }
}

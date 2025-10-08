import { StateAnnotation } from "@/types/state";
import { Plan, MultiStrategyPlan } from "@/types/plan";
import { functionRegistry } from "@/nodes/functions";

/**
 * Execute multiple strategy plans in parallel
 */
export async function multiStrategyExecutorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { plan } = state;
  
  if (!plan || !("strategies" in plan)) {
    return {
      queryResults: [],
      metadata: {
        ...state.metadata,
        executionError: "No valid multi-strategy plan provided for execution"
      }
    };
  }
  
  try {
    const multiStrategyPlan = plan as MultiStrategyPlan;
    const strategyPromises: Promise<any>[] = [];
    
    // Execute all strategies in parallel
    multiStrategyPlan.strategies.forEach((strategy, index) => {
      const strategyPromise = executeSingleStrategy(strategy, index, state);
      strategyPromises.push(strategyPromise);
    });
    
    // Wait for all strategies to complete
    const strategyResults = await Promise.all(strategyPromises);
    
    // Organize results by strategy
    const executionResults = strategyResults.map((result, index) => ({
      strategyIndex: index,
      strategy: multiStrategyPlan.strategies[index],
      results: result.results,
      executionTime: result.executionTime,
      success: result.success,
      error: result.error
    }));
    
    return {
      executionResults,
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata.executionPath || []), "multi-strategy-executor"],
        strategiesExecuted: multiStrategyPlan.strategies.length,
        strategiesSuccessful: executionResults.filter(r => r.success).length,
        multiStrategyWeights: multiStrategyPlan.weights,
        mergeStrategy: multiStrategyPlan.mergeStrategy
      }
    };
  } catch (error) {
    console.error("Error in multiStrategyExecutorNode:", error);
    
    const newError = {
      node: "multi-strategy-executor",
      error: error instanceof Error ? error : new Error(String(error)),
      timestamp: new Date()
    };
    
    return {
      queryResults: [],
      metadata: {
        ...state.metadata,
        executionError: error instanceof Error ? error.message : String(error),
        executionPath: [...(state.metadata.executionPath || []), "multi-strategy-executor"]
      },
      errors: [...(state.errors || []), newError]
    };
  }
}

/**
 * Execute a single strategy and return results with timing
 */
async function executeSingleStrategy(strategy: Plan, strategyIndex: number, state: any): Promise<any> {
  const startTime = Date.now();
  
  try {
    const executionResults: any[] = [];
    let currentResults: any[] = [];
    
    // Execute each step in the strategy
    for (let i = 0; i < strategy.steps.length; i++) {
      const step = strategy.steps[i];
      
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
      
      // Update current results
      if (stepResult.results && Array.isArray(stepResult.results)) {
        currentResults = stepResult.results;
      } else if (Array.isArray(stepResult)) {
        currentResults = stepResult;
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      results: currentResults,
      executionResults,
      executionTime,
      success: true,
      error: null
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    return {
      results: [],
      executionResults: [],
      executionTime,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
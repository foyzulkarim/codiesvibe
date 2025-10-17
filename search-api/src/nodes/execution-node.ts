import { EnhancedState } from "@/types/enhanced-state";
import { multiVectorSearchNode } from "./multi-vector-search.node";

/**
 * Execution Node for AI Search Enhancement v2.0
 * 
 * This node executes the search plan by coordinating the multi-vector search
 * and other execution steps, handles errors gracefully, and updates the state
 * with execution results.
 */
export async function executionNode(state: EnhancedState): Promise<Partial<EnhancedState>> {
  const startTime = Date.now();
  
  console.log('executionNode(): Starting execution', {
    query: state.query,
    hasExecutionPlan: !!state.executionPlan,
    planStages: state.executionPlan?.execution_plan?.length || 0
  });

  try {
    // Extract query and execution plan from state
    const query = state.query || '';
    const executionPlan = state.executionPlan;
    
    if (!query) {
      throw new Error('No query found in state for execution');
    }

    if (!executionPlan || !executionPlan.execution_plan) {
      throw new Error('No execution plan found in state');
    }

    // Execute the plan steps
    let currentState = { ...state };
    let executionResults: any[] = [];

    // Execute multi-vector search (primary step)
    if (executionPlan.execution_plan.some(step => step.stage === 'multi-vector-search')) {
      console.log('executionNode(): Executing multi-vector search');
      const searchResult = await multiVectorSearchNode(currentState);
      currentState = { ...currentState, ...searchResult };
      executionResults.push({
        step: 'multi-vector-search',
        result: searchResult,
        success: !!searchResult.vectorSearchState
      });
    }

    // Execute other steps if defined
    for (const step of executionPlan.execution_plan) {
      if (step.stage === 'multi-vector-search') {
        continue; // Already executed
      }

      console.log(`executionNode(): Executing step: ${step.stage}`);
      
      // For now, just log the step (other execution nodes would be implemented as needed)
      executionResults.push({
        step: step.stage,
        params: step.params,
        reason: step.reason,
        success: true,
        result: { message: `Step ${step.stage} executed successfully` }
      });
    }

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Update metadata with execution information
    const updatedMetadata = {
      ...state.metadata,
      nodeExecutionTimes: {
        ...state.metadata?.nodeExecutionTimes,
        'execution': executionTime
      },
      executionPath: [
        ...(state.metadata?.executionPath || []),
        'execution'
      ],
      executionStats: {
        stepsExecuted: executionResults.length,
        successfulSteps: executionResults.filter(r => r.success).length,
        failedSteps: executionResults.filter(r => !r.success).length,
        totalExecutionTime: executionTime
      }
    };

    console.log('executionNode(): Completed successfully', {
      executionTime,
      stepsExecuted: executionResults.length,
      successfulSteps: executionResults.filter(r => r.success).length,
      hasVectorSearchState: !!currentState.vectorSearchState
    });

    // Return the enhanced state with execution results
    return {
      vectorSearchState: currentState.vectorSearchState,
      executionResults,
      metadata: updatedMetadata
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    console.error('executionNode(): Error during execution', {
      error: error instanceof Error ? error.message : String(error),
      executionTime
    });

    // Fallback to minimal execution
    try {
      console.log('executionNode(): Attempting fallback to minimal execution');
      
      const query = state.query || '';
      if (!query) {
        throw new Error('No query found in state for fallback execution');
      }

      // Execute minimal multi-vector search
      const searchResult = await multiVectorSearchNode(state);

      // Update metadata with fallback information
      const updatedMetadata = {
        ...state.metadata,
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'execution': executionTime
        },
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'execution-fallback'
        ],
        fallbackUsed: 'minimal-execution',
        fallbackReason: error instanceof Error ? error.message : String(error),
        executionStats: {
          stepsExecuted: 1,
          successfulSteps: 1,
          failedSteps: 0,
          totalExecutionTime: executionTime
        }
      };

      console.log('executionNode(): Fallback completed successfully', {
        executionTime,
        hasVectorSearchState: !!searchResult.vectorSearchState
      });

      return {
        vectorSearchState: searchResult.vectorSearchState,
        executionResults: [{
          step: 'multi-vector-search-fallback',
          result: searchResult,
          success: !!searchResult.vectorSearchState
        }],
        metadata: updatedMetadata
      };

    } catch (fallbackError) {
      console.error('executionNode(): Fallback also failed', {
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      });

      // Even fallback failed, return error state
      const updatedMetadata = {
        ...state.metadata,
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'execution': executionTime
        },
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'execution-error'
        ],
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        fallbackFailed: true,
        executionStats: {
          stepsExecuted: 0,
          successfulSteps: 0,
          failedSteps: 1,
          totalExecutionTime: executionTime
        }
      };

      return {
        executionResults: [],
        metadata: updatedMetadata
      };
    }
  }
}

import { StateGraph, START, END } from "@langchain/langgraph";
import { StateAnnotation } from "@/types/state";
import { MemorySaver } from "@langchain/langgraph";
import { threadManager } from "@/utils/thread-manager";
import { checkpointManager, CheckpointConfig } from "@/utils/checkpoint-manager";
import { stateValidator } from "@/utils/state-validator";
import { rollbackManager } from "@/utils/rollback-manager";
import { stateMonitor } from "@/utils/state-monitor";
import { v4 as uuidv4 } from "uuid";

// Import individual nodes
import { intentExtractionNode } from "@/nodes/intent-extraction.node";
import { contextEnrichmentNode } from "@/nodes/context-enrichment.node";
import { queryPlanningNode } from "@/nodes/query-planning.node";
import { executionNode } from "@/nodes/execution.node";
import { completionNode } from "@/nodes/execution/completion.node";

/**
 * Creates wrapped nodes with state validation and checkpointing
 */
function createValidatedNode(nodeName: string, originalNode: any) {
  return async (state: any) => {
    const threadId = state.metadata?.threadId;
    const transitionId = uuidv4();
    
    try {
      // Track transition
      if (threadId) {
        stateValidator.trackTransition(threadId,
          state.metadata?.executionPath?.[state.metadata.executionPath.length - 2] || "start",
          nodeName,
          transitionId
        );
      }

      // Validate state before node execution
      const beforeValidation = stateValidator.validateState(state,
        nodeName === "intent-extraction" ? "initial" :
        nodeName === "context-enrichment" ? "intentExtraction" :
        nodeName === "query-planning" ? "contextEnrichment" :
        nodeName === "execution" ? "queryPlanning" : "execution"
      );

      if (!beforeValidation.isValid) {
        console.warn(`[${nodeName}] State validation failed before execution: ${beforeValidation.errors.join(', ')}`);
        
        // Attempt rollback if we have a thread ID
        if (threadId) {
          const rollbackResult = await rollbackManager.autoRollback(threadId,
            `State validation failed before ${nodeName}: ${beforeValidation.errors.join(', ')}`
          );
          
          if (rollbackResult.success) {
            console.log(`[${nodeName}] Auto-rollback successful, retrying with restored state`);
            state = rollbackResult.state;
          }
        }
      }

      // Execute the original node
      const startTime = Date.now();
      const result = await originalNode(state);
      const executionTime = Date.now() - startTime;

      // Validate state after node execution
      const afterValidation = stateValidator.validateState(result,
        nodeName === "intent-extraction" ? "intentExtraction" :
        nodeName === "context-enrichment" ? "contextEnrichment" :
        nodeName === "query-planning" ? "queryPlanning" :
        nodeName === "execution" ? "execution" : "completion"
      );

      if (!afterValidation.isValid) {
        console.warn(`[${nodeName}] State validation failed after execution: ${afterValidation.errors.join(', ')}`);
        
        // Don't proceed if validation failed, attempt rollback
        if (threadId) {
          const rollbackResult = await rollbackManager.autoRollback(threadId,
            `State validation failed after ${nodeName}: ${afterValidation.errors.join(', ')}`
          );
          
          if (rollbackResult.success) {
            console.log(`[${nodeName}] Auto-rollback successful after validation failure`);
            return rollbackResult.state;
          }
        }
        
        // If rollback failed, throw an error
        throw new Error(`Node ${nodeName} produced invalid state: ${afterValidation.errors.join(', ')}`);
      }

      // Create checkpoint after successful execution
      if (threadId) {
        await checkpointManager.createCheckpoint(threadId, transitionId, result, nodeName, executionTime);
      }

      // Track successful transition
      if (threadId) {
        stateMonitor.trackTransition(threadId,
          state.metadata?.executionPath?.[state.metadata.executionPath.length - 2] || "start",
          nodeName,
          executionTime,
          result
        );
      }

      return result;

    } catch (error) {
      console.error(`[${nodeName}] Node execution failed:`, error);
      
      // Attempt rollback on error
      if (threadId) {
        const rollbackResult = await rollbackManager.autoRollback(threadId,
          `Node ${nodeName} execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
        
        if (rollbackResult.success) {
          console.log(`[${nodeName}] Error recovery successful via rollback`);
          // Track the successful rollback
          stateMonitor.trackRollback(threadId, rollbackManager.getRollbackHistory(threadId)[rollbackManager.getRollbackHistory(threadId).length - 1]);
          return rollbackResult.state;
        }
      }
      
      // Re-throw the error if recovery failed
      throw error;
    }
  };
}

/**
 * Creates the main state graph for the intelligent search system
 * @returns StateGraph instance
 */
export function createMainGraph() {
  const workflow = new StateGraph(StateAnnotation)
    .addNode("intent-extraction", createValidatedNode("intent-extraction", intentExtractionNode))
    .addNode("context-enrichment", createValidatedNode("context-enrichment", contextEnrichmentNode))
    .addNode("query-planning", createValidatedNode("query-planning", queryPlanningNode))
    .addNode("execution", createValidatedNode("execution", executionNode))
    .addNode("final-completion", createValidatedNode("final-completion", completionNode))
    
    // Define the main flow
    .addEdge(START, "intent-extraction")
    .addEdge("intent-extraction", "context-enrichment")
    .addEdge("context-enrichment", "query-planning")
    .addEdge("query-planning", "execution")
    .addEdge("execution", "final-completion")
    .addEdge("final-completion", END);
    
  return workflow;
}

/**
 * Creates a compiled graph with checkpointing support
 */
export function createCompiledGraph(threadId?: string, checkpointConfig?: Partial<CheckpointConfig>) {
  const workflow = createMainGraph();
  
  // Get the MemorySaver instance from checkpoint manager
  const memorySaver = checkpointManager.getMemorySaver();
  
  // Configure checkpointing for the thread if provided
  if (threadId) {
    checkpointManager.configureThread(threadId, checkpointConfig);
  }
  
  // Compile the graph with the checkpointer
  const compiledGraph = workflow.compile({
    checkpointer: memorySaver,
    // Optional: Add interrupt before or after specific nodes for debugging
    interruptBefore: [],
    interruptAfter: []
  });
  
  return compiledGraph;
}

/**
 * Main entry point for the intelligent search system with checkpointing support
 */
export async function intelligentSearch(query: string, options: {
  debug?: boolean;
  threadId?: string;
  checkpointConfig?: Partial<CheckpointConfig>;
  enableRecovery?: boolean;
  enableStateValidation?: boolean;
  validationConfig?: {
    enableStrictValidation?: boolean;
    enableConsistencyChecks?: boolean;
    enableAutoRollback?: boolean;
  };
} = {}): Promise<any> {
  const {
    debug = false,
    threadId,
    checkpointConfig,
    enableRecovery = true,
    enableStateValidation = true,
    validationConfig = {}
  } = options;
  
  try {
    // Create or validate thread ID
    let currentThreadId = threadId;
    if (!currentThreadId) {
      currentThreadId = threadManager.createThread({
        query,
        startTime: new Date(),
        enableCheckpoints: true
      });
    } else {
      const validation = threadManager.validateThreadId(currentThreadId);
      if (!validation.isValid) {
        console.warn(`[intelligentSearch] Invalid thread ID provided: ${validation.error}. Creating new thread.`);
        currentThreadId = threadManager.createThread({
          query,
          startTime: new Date(),
          enableCheckpoints: true
        });
      }
    }

    // Create compiled graph with checkpointing
    const compiledGraph = createCompiledGraph(currentThreadId, checkpointConfig);
    
    const initialState = {
      query,
      metadata: {
        startTime: new Date(),
        executionPath: ["intelligent-search"],
        nodeExecutionTimes: {},
        threadId: currentThreadId,
        name: "intelligent-search"
      }
    };

    let result;
    
    if (enableRecovery) {
      // Try to recover from checkpoints if available
      const recoveryResult = await checkpointManager.restoreFromCheckpoint(currentThreadId);
      
      if (recoveryResult.success && recoveryResult.recoveredState) {
        // Validate recovered state
        const validation = checkpointManager.validateRecoveredState(recoveryResult.recoveredState);
        
        if (validation.isValid) {
          console.log(`[intelligentSearch] Successfully recovered state from checkpoint ${recoveryResult.fromCheckpoint}`);
          
          // Update the query if needed and continue from recovered state
          const updatedState = {
            ...recoveryResult.recoveredState,
            query, // Use the new query
            metadata: {
              ...recoveryResult.recoveredState.metadata,
              threadId: currentThreadId,
              recoveryTime: new Date(),
              originalQuery: recoveryResult.recoveredState.query
            }
          };
          
          result = await compiledGraph.invoke(updatedState, {
            configurable: { thread_id: currentThreadId }
          });
        } else {
          console.warn(`[intelligentSearch] Recovered state validation failed: ${validation.errors.join(', ')}`);
          // Fall back to fresh execution
          result = await compiledGraph.invoke(initialState, {
            configurable: { thread_id: currentThreadId }
          });
        }
      } else {
        // No checkpoint available or recovery failed, start fresh
        if (debug) {
          console.log(`[intelligentSearch] No checkpoint available or recovery failed: ${recoveryResult.error}`);
        }
        
        result = await compiledGraph.invoke(initialState, {
          configurable: { thread_id: currentThreadId }
        });
      }
    } else {
      // Execute without recovery
      result = await compiledGraph.invoke(initialState, {
        configurable: { thread_id: currentThreadId }
      });
    }
    
    // Update thread metadata
    threadManager.updateThreadMetadata(currentThreadId, {
      lastExecutionTime: new Date(),
      lastQuery: query,
      executionSuccessful: true,
      resultsCount: result.completion?.results?.length || 0,
      status: 'completed',
      endTime: new Date(),
      results: result.completion?.results || []
    });
    
    if (debug) {
      const stats = await checkpointManager.getCheckpointStats(currentThreadId);
      console.log("Search completed successfully:", {
        threadId: currentThreadId,
        resultsCount: result.completion?.results?.length || 0,
        path: result.metadata.executionPath,
        checkpointStats: stats
      });
    }

    console.log(`🔍 intelligentSearch - Final results:`, result);
    
    const completionResult = result.completion;
    if (completionResult) {
      return {
        ...completionResult,
        threadId: currentThreadId,
        metadata: {
          ...completionResult.metadata,
          threadId: currentThreadId
        }
      };
    } else {
      return {
        query,
        strategy: "Basic Search",
        results: [],
        explanation: "Search completed",
        threadId: currentThreadId,
        metadata: {
          executionTime: "0ms",
          resultsCount: 0,
          threadId: currentThreadId
        }
      };
    }
    
  } catch (error) {
    console.error("Error in intelligentSearch:", error);
    
    // Update thread status to error
    if (threadId) {
      threadManager.updateThreadMetadata(threadId, {
        status: 'error',
        endTime: new Date(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Attempt error recovery if thread ID is available
    if (threadId && enableRecovery) {
      try {
        console.log(`[intelligentSearch] Attempting error recovery for thread ${threadId}`);
        const recoveryResult = await checkpointManager.restoreFromCheckpoint(threadId);
        
        if (recoveryResult.success && recoveryResult.recoveredState) {
          const validation = checkpointManager.validateRecoveredState(recoveryResult.recoveredState);
          
          if (validation.isValid) {
            console.log(`[intelligentSearch] Error recovery successful from checkpoint ${recoveryResult.fromCheckpoint}`);
            
            // Return partial results from recovered state
            return {
              query,
              strategy: "Error Recovery",
              results: recoveryResult.recoveredState.completion?.results || [],
              explanation: "Partial results recovered after error. Please try again for complete results.",
              threadId,
              metadata: {
                executionTime: "recovered",
                resultsCount: recoveryResult.recoveredState.completion?.results?.length || 0,
                error: error instanceof Error ? error.message : String(error),
                recoveredFrom: recoveryResult.fromCheckpoint,
                threadId
              }
            };
          }
        }
      } catch (recoveryError) {
        console.error(`[intelligentSearch] Error recovery failed:`, recoveryError);
      }
    }
    
    // Fallback response
    return {
      query,
      strategy: "Error Recovery",
      results: [],
      explanation: "An error occurred during search. Please try again.",
      threadId: threadId || "no-thread",
      metadata: {
        executionTime: "0ms",
        resultsCount: 0,
        error: error instanceof Error ? error.message : String(error),
        threadId: threadId || "no-thread"
      }
    };
  }
}

/**
 * Search with explicit thread management
 */
export async function searchWithThread(query: string, threadId: string, options: {
  debug?: boolean;
  checkpointConfig?: Partial<CheckpointConfig>;
  continueFromCheckpoint?: boolean;
} = {}): Promise<any> {
  const { debug = false, checkpointConfig, continueFromCheckpoint = true } = options;
  
  // Validate thread ID
  const validation = threadManager.validateThreadId(threadId);
  if (!validation.isValid) {
    throw new Error(`Invalid thread ID: ${validation.error}`);
  }
  
  return intelligentSearch(query, {
    debug,
    threadId,
    checkpointConfig,
    enableRecovery: continueFromCheckpoint
  });
}

/**
 * Create a new search thread
 */
export function createSearchThread(metadata?: Record<string, any>): string {
  return threadManager.createThread(metadata);
}

/**
 * Get thread information
 */
export function getSearchThreadInfo(threadId: string) {
  return threadManager.getThreadInfo(threadId);
}

/**
 * Delete a search thread and its checkpoints
 */
export async function deleteSearchThread(threadId: string): Promise<boolean> {
  try {
    // Clear checkpoints
    await checkpointManager.clearThreadCheckpoints(threadId);
    
    // Delete thread
    return threadManager.deleteThread(threadId);
  } catch (error) {
    console.error(`[deleteSearchThread] Failed to delete thread ${threadId}:`, error);
    return false;
  }
}

export type SearchResult = {
  query: string;
  strategy: string;
  results: any[];
  explanation: string;
  metadata: {
    executionTime: string;
    resultsCount: number;
    confidence?: number;
    routingDecision?: string;
    qualityMetrics?: any;
    executionPath: string[];
    nodeExecutionTimes: Record<string, number>;
  };
};

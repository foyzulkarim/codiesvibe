import { StateGraph, START, END } from "@langchain/langgraph";
import { EnhancedStateAnnotation } from "@/types/enhanced-state";
import { MemorySaver } from "@langchain/langgraph";
import { threadManager } from "@/utils/thread-manager";
import { checkpointManager, CheckpointConfig } from "@/utils/checkpoint-manager";
import { stateValidator } from "@/utils/state-validator";
import { rollbackManager } from "@/utils/rollback-manager";
import { stateMonitor } from "@/utils/state-monitor";
import { v4 as uuidv4 } from "uuid";
import { defaultEnhancedSearchConfig } from "@/config/enhanced-search-config";

// Import individual nodes for the enhanced pipeline
import { localNLPProcessingNode } from "@/nodes/local-nlp-processing.node";
import { contextEnrichmentNode } from "@/nodes/context-enrichment.node";
import { multiVectorSearchNode } from "@/nodes/multi-vector-search.node";
import { queryPlanningNode } from "@/nodes/query-planning-node";
import { executionNode } from "@/nodes/execution-node";
import { resultMergerNode } from "@/nodes/result-merger.node";

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
        nodeName === "local-nlp-processing" ? "initial" :
        nodeName === "context-enrichment" ? "contextEnrichment" :
        nodeName === "multi-vector-search" ? "contextEnrichment" :
        nodeName === "query-planning" ? "queryPlanning" :
        nodeName === "execution" ? "execution" : "execution"
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
        nodeName === "local-nlp-processing" ? "contextEnrichment" :
        nodeName === "context-enrichment" ? "contextEnrichment" :
        nodeName === "multi-vector-search" ? "queryPlanning" :
        nodeName === "query-planning" ? "execution" :
        nodeName === "execution" ? "execution" : "execution"
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
 * Context enrichment router - determines if context enrichment should be executed
 */
function contextEnrichmentRouter(state: typeof EnhancedStateAnnotation.State): "context-enrichment" | "skip-context-enrichment" {
  console.log(`[contextEnrichmentRouter] Deciding for query: "${state.query}"`);
  
  // Check if context enrichment is enabled in configuration
  const config = defaultEnhancedSearchConfig?.contextEnrichment;
  console.log(`[contextEnrichmentRouter] Config enabled: ${config?.enabled}`);
  if (config && !config.enabled) {
    console.log(`[contextEnrichmentRouter] Decision: skip-context-enrichment (config disabled)`);
    return "skip-context-enrichment";
  }
  
  // Check if there are entities to enrich
  const entities = state.nlpResults?.entities?.length || 0;
  
  console.log(`[contextEnrichmentRouter] Entity count: ${entities}`);
  
  if (entities === 0) {
    console.log(`[contextEnrichmentRouter] Decision: skip-context-enrichment (no entities)`);
    return "skip-context-enrichment";
  }
  
  // Check if we're in recovery mode - skip enrichment to speed up recovery
  if (state.metadata?.recoveryTime) {
    console.log(`[contextEnrichmentRouter] Decision: skip-context-enrichment (recovery mode)`);
    return "skip-context-enrichment";
  }
  
  console.log(`[contextEnrichmentRouter] Decision: context-enrichment (proceed)`);
  return "context-enrichment";
}

/**
 * Skip context enrichment node - passes through state unchanged
 */
async function skipContextEnrichmentNode(state: typeof EnhancedStateAnnotation.State): Promise<Partial<typeof EnhancedStateAnnotation.State>> {
  console.log(`[skip-context-enrichment] Skipping context enrichment for query: "${state.query}"`);
  
  return {
    metadata: {
      ...state.metadata,
      executionPath: [...(state.metadata?.executionPath || []), "skip-context-enrichment"],
      nodeExecutionTimes: {
        ...(state.metadata?.nodeExecutionTimes || {}),
        "skip-context-enrichment": 0
      }
    }
  };
}

/**
 * Creates the enhanced search state graph for AI Search Enhancement v2.0
 * @returns StateGraph instance
 */
export function createEnhancedSearchGraph() {
  const workflow = new StateGraph(EnhancedStateAnnotation)
    // Add nodes for the 6-stage pipeline
    .addNode("local-nlp-processing", createValidatedNode("local-nlp-processing", localNLPProcessingNode))
    .addNode("context-enrichment", createValidatedNode("context-enrichment", contextEnrichmentNode))
    .addNode("skip-context-enrichment", createValidatedNode("skip-context-enrichment", skipContextEnrichmentNode))
    .addNode("multi-vector-search", createValidatedNode("multi-vector-search", multiVectorSearchNode))
    .addNode("query-planning", createValidatedNode("query-planning", queryPlanningNode))
    .addNode("execution", createValidatedNode("execution", executionNode))
    .addNode("result-merging", createValidatedNode("result-merging", resultMergerNode))
    
    // Define the main flow with conditional context enrichment
    .addEdge(START, "local-nlp-processing")
    .addConditionalEdges(
      "local-nlp-processing",
      contextEnrichmentRouter,
      {
        "context-enrichment": "context-enrichment",
        "skip-context-enrichment": "skip-context-enrichment"
      }
    )
    .addEdge("context-enrichment", "multi-vector-search")
    .addEdge("skip-context-enrichment", "multi-vector-search")
    .addEdge("multi-vector-search", "query-planning")
    .addEdge("query-planning", "execution")
    .addEdge("execution", "result-merging")
    .addEdge("result-merging", END);
    
  return workflow;
}

/**
 * Creates a compiled graph with checkpointing support
 */
export function createCompiledEnhancedSearchGraph(threadId?: string, checkpointConfig?: Partial<CheckpointConfig>) {
  const workflow = createEnhancedSearchGraph();
  
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
 * Main entry point for the enhanced search system with checkpointing support
 */
export async function enhancedSearch(query: string, options: {
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
        console.warn(`[enhancedSearch] Invalid thread ID provided: ${validation.error}. Creating new thread.`);
        currentThreadId = threadManager.createThread({
          query,
          startTime: new Date(),
          enableCheckpoints: true
        });
      }
    }

    // Create compiled graph with checkpointing
    const compiledGraph = createCompiledEnhancedSearchGraph(currentThreadId, checkpointConfig);
    
    const initialState = {
      query,
      metadata: {
        startTime: new Date(),
        executionPath: ["enhanced-search"],
        nodeExecutionTimes: {},
        threadId: currentThreadId,
        name: "enhanced-search",
        enhancementVersion: "2.0"
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
          console.log(`[enhancedSearch] Successfully recovered state from checkpoint ${recoveryResult.fromCheckpoint}`);
          
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
          console.warn(`[enhancedSearch] Recovered state validation failed: ${validation.errors.join(', ')}`);
          // Fall back to fresh execution
          result = await compiledGraph.invoke(initialState, {
            configurable: { thread_id: currentThreadId }
          });
        }
      } else {
        // No checkpoint available or recovery failed, start fresh
        if (debug) {
          console.log(`[enhancedSearch] No checkpoint available or recovery failed: ${recoveryResult.error}`);
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
      resultsCount: result.mergedResults?.results?.length || 0,
      status: 'completed',
      endTime: new Date(),
      results: result.mergedResults?.results || []
    });
    
    if (debug) {
      const stats = await checkpointManager.getCheckpointStats(currentThreadId);
      console.log("Enhanced search completed successfully:", {
        threadId: currentThreadId,
        resultsCount: result.mergedResults?.results?.length || 0,
        path: result.metadata.executionPath,
        checkpointStats: stats
      });
    }

    console.log(`🔍 enhancedSearch - Final results:`, result);
    
    const mergedResults = result.mergedResults;
    if (mergedResults) {
      return {
        ...mergedResults,
        threadId: currentThreadId,
        metadata: {
          ...mergedResults.metadata,
          threadId: currentThreadId
        }
      };
    } else {
      return {
        query,
        strategy: "Enhanced Search",
        results: [],
        explanation: "Enhanced search completed",
        threadId: currentThreadId,
        metadata: {
          executionTime: "0ms",
          resultsCount: 0,
          threadId: currentThreadId
        }
      };
    }
    
  } catch (error) {
    console.error("Error in enhancedSearch:", error);
    
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
        console.log(`[enhancedSearch] Attempting error recovery for thread ${threadId}`);
        const recoveryResult = await checkpointManager.restoreFromCheckpoint(threadId);
        
        if (recoveryResult.success && recoveryResult.recoveredState) {
          const validation = checkpointManager.validateRecoveredState(recoveryResult.recoveredState);
          
          if (validation.isValid) {
            console.log(`[enhancedSearch] Error recovery successful from checkpoint ${recoveryResult.fromCheckpoint}`);
            
            // Return partial results from recovered state
            return {
              query,
              strategy: "Error Recovery",
              results: (recoveryResult.recoveredState as any)?.mergedResults?.results || [],
              explanation: "Partial results recovered after error. Please try again for complete results.",
              threadId,
              metadata: {
                executionTime: "recovered",
                resultsCount: (recoveryResult.recoveredState as any)?.mergedResults?.results?.length || 0,
                error: error instanceof Error ? error.message : String(error),
                recoveredFrom: recoveryResult.fromCheckpoint,
                threadId
              }
            };
          }
        }
      } catch (recoveryError) {
        console.error(`[enhancedSearch] Error recovery failed:`, recoveryError);
      }
    }
    
    // Fallback response
    return {
      query,
      strategy: "Error Recovery",
      results: [],
      explanation: "An error occurred during enhanced search. Please try again.",
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
 * Enhanced search with explicit thread management
 */
export async function enhancedSearchWithThread(query: string, threadId: string, options: {
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
  
  return enhancedSearch(query, {
    debug,
    threadId,
    checkpointConfig,
    enableRecovery: continueFromCheckpoint
  });
}

/**
 * Create a new enhanced search thread
 */
export function createEnhancedSearchThread(metadata?: Record<string, any>): string {
  return threadManager.createThread(metadata);
}

/**
 * Get enhanced search thread information
 */
export function getEnhancedSearchThreadInfo(threadId: string) {
  return threadManager.getThreadInfo(threadId);
}

/**
 * Delete an enhanced search thread and its checkpoints
 */
export async function deleteEnhancedSearchThread(threadId: string): Promise<boolean> {
  try {
    // Clear checkpoints
    await checkpointManager.clearThreadCheckpoints(threadId);
    
    // Delete thread
    return threadManager.deleteThread(threadId);
  } catch (error) {
    console.error(`[deleteEnhancedSearchThread] Failed to delete thread ${threadId}:`, error);
    return false;
  }
}

export type EnhancedSearchResult = {
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
    threadId: string;
  };
};

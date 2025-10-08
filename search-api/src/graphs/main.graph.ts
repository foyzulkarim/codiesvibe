import { StateGraph, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { StateAnnotation } from "@/types/state";

// Import subgraphs
import { createIntentExtractionGraph } from "./intent-extraction.graph";
import { createQueryPlanningGraph } from "./query-planning.graph";
import { createExecutionGraph } from "./execution.graph";

// Import individual nodes for direct routing
import { confidenceEvaluatorNode } from "@/nodes/routing/confidence-evaluator.node";
import { qualityEvaluatorNode } from "@/nodes/routing/quality-evaluator.node";

/**
 * Creates the main search pipeline graph with checkpointing
 */
export function createMainGraph(): StateGraph<typeof StateAnnotation.State> {
  const workflow = new StateGraph(StateAnnotation)
    // Add subgraphs as nodes
    .addNode("intent-extraction", async (state) => {
      const subgraph = createIntentExtractionGraph();
      const compiledSubgraph = subgraph.compile();
      return await compiledSubgraph.invoke(state);
    })
    
    .addNode("query-planning", async (state) => {
      const subgraph = createQueryPlanningGraph();
      const compiledSubgraph = subgraph.compile();
      return await compiledSubgraph.invoke(state);
    })
    
    .addNode("execution", async (state) => {
      const subgraph = createExecutionGraph();
      const compiledSubgraph = subgraph.compile();
      return await compiledSubgraph.invoke(state);
    })
    
    // Define the main flow
    .addEdge(START, "intent-extraction")
    .addEdge("intent-extraction", "query-planning")
    .addEdge("query-planning", "execution")
    .addEdge("execution", END);
    
  return workflow;
}

/**
 * Creates a main graph with checkpointing for persistence
 */
export function createMainGraphWithCheckpointing(): StateGraph<typeof StateAnnotation.State> {
  const workflow = createMainGraph();
  
  // Add checkpointing
  const memory = new MemorySaver();
  
  return workflow.compile({
    checkpointer: memory,
    // Configure other checkpointing options
    interruptAfter: [], // Nodes to interrupt after for manual inspection
    interruptBefore: [], // Nodes to interrupt before for manual inspection
  });
}

/**
 * Main entry point for the intelligent search system
 */
export async function intelligentSearch(query: string, options: {
  debug?: boolean;
  checkpointing?: boolean;
  threadId?: string;
} = {}): Promise<any> {
  const { debug = false, checkpointing = false, threadId } = options;
  
  try {
    const graph = checkpointing ? createMainGraphWithCheckpointing() : createMainGraph();
    const compiledGraph = graph.compile();
    
    const initialState = {
      query,
      metadata: {
        startTime: new Date(),
        executionPath: ["intelligent-search"],
        nodeExecutionTimes: {},
        debug: debug
      }
    };
    
    const config = threadId ? { configurable: { thread_id: threadId } } : {};
    
    const result = await compiledGraph.invoke(initialState, config);
    
    if (debug) {
      console.log("Search completed successfully:", {
        executionTime: result.metadata.totalExecutionTime,
        resultsCount: result.completion?.results?.length || 0,
        path: result.metadata.executionPath
      });
    }
    
    return result.completion;
  } catch (error) {
    console.error("Error in intelligentSearch:", error);
    
    // Fallback response
    return {
      query,
      strategy: "Error Recovery",
      results: [],
      explanation: "An error occurred during search. Please try again.",
      metadata: {
        executionTime: "0ms",
        resultsCount: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Async search with streaming support
 */
export async function* intelligentSearchStream(query: string, options: {
  debug?: boolean;
  checkpointing?: boolean;
  threadId?: string;
} = {}): AsyncGenerator<any, void, unknown> {
  const { debug = false, checkpointing = false, threadId } = options;
  
  try {
    const graph = checkpointing ? createMainGraphWithCheckpointing() : createMainGraph();
    const compiledGraph = graph.compile();
    
    const initialState = {
      query,
      metadata: {
        startTime: new Date(),
        executionPath: ["intelligent-search"],
        nodeExecutionTimes: {},
        debug: debug
      }
    };
    
    const config = threadId ? { configurable: { thread_id: threadId } } : {};
    
    // Stream the execution
    for await (const event of compiledGraph.stream(initialState, config)) {
      yield {
        event,
        timestamp: new Date(),
        query
      };
    }
    
  } catch (error) {
    console.error("Error in intelligentSearchStream:", error);
    
    yield {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      query
    };
  }
}

/**
 * Resume execution from a checkpoint
 */
export async function resumeSearch(threadId: string): Promise<any> {
  const graph = createMainGraphWithCheckpointing();
  const compiledGraph = graph.compile();
  
  const config = { configurable: { thread_id: threadId } };
  
  try {
    const result = await compiledGraph.invoke(null, config);
    return result.completion;
  } catch (error) {
    console.error("Error resuming search:", error);
    throw error;
  }
}

/**
 * Get current state of a running search
 */
export async function getSearchState(threadId: string): Promise<any> {
  const graph = createMainGraphWithCheckpointing();
  const compiledGraph = graph.compile();
  
  const config = { configurable: { thread_id: threadId } };
  
  try {
    const state = await compiledGraph.getState(config);
    return state;
  } catch (error) {
    console.error("Error getting search state:", error);
    throw error;
  }
}

// Export types for external use
export type SearchOptions = {
  debug?: boolean;
  checkpointing?: boolean;
  threadId?: string;
};

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

export type SearchStreamEvent = {
  event: any;
  timestamp: Date;
  query: string;
  error?: string;
};
import { StateGraph, START, END } from "@langchain/langgraph";
import { StateAnnotation } from "@/types/state";
import { MemorySaver } from "@langchain/langgraph";

// Import our 3-node pipeline components
import { intentExtractorNode } from "@/nodes/intent-extractor.node";
import { queryPlannerNode } from "@/nodes/query-planner.node";
import { queryExecutorNode } from "@/nodes/query-executor.node";

/**
 * Agentic Search Graph - 3-Node LLM-First Pipeline
 *
 * Simplified architecture replacing the complex 13+ node extraction pipeline:
 *
 * 1. IntentExtractorNode - LLM-based intent understanding
 * 2. QueryPlannerNode - LLM-based retrieval strategy planning
 * 3. QueryExecutorNode - Deterministic execution against Qdrant + MongoDB
 *
 * Architecture: Query → Intent → Plan → Candidates
 */

/**
 * Create the agentic search workflow graph with explicit 3-node pipeline
 */
export function createAgenticSearchGraph() {
  const workflow = new StateGraph(StateAnnotation)
    // Node 1: IntentExtractorNode - LLM-based intent understanding
    .addNode("intent-extractor", intentExtractorNode)

    // Node 2: QueryPlannerNode - LLM-based retrieval strategy planning
    .addNode("query-planner", queryPlannerNode)

    // Node 3: QueryExecutorNode - Deterministic execution against databases
    .addNode("query-executor", queryExecutorNode)

    // Define the linear flow through the 3-node pipeline
    .addEdge(START, "intent-extractor")
    .addEdge("intent-extractor", "query-planner")
    .addEdge("query-planner", "query-executor")
    .addEdge("query-executor", END);

  return workflow;
}

/**
 * Compile the graph with memory and checkpointing
 */
export function createCompiledAgenticSearchGraph() {
  const graph = createAgenticSearchGraph();

  // Add memory for conversation context (optional for search)
  const memory = new MemorySaver();

  // Compile with checkpointing for reliability
  const compiledGraph = graph.compile({
    checkpointer: memory
  });

  return compiledGraph;
}

/**
 * Simple entry point for single queries
 */
export async function searchWithAgenticPipeline(
  query: string,
  options: {
    threadId?: string;
    enableCheckpoints?: boolean;
    metadata?: Record<string, any>;
  } = {}
): Promise<Partial<typeof StateAnnotation.State>> {
  const startTime = Date.now();

  try {
    // Initialize state
    const initialState: typeof StateAnnotation.State = {
      query,
      intentState: null,
      executionPlan: null,
      candidates: [],
      executionStats: {
        totalTimeMs: 0,
        nodeTimings: {},
        vectorQueriesExecuted: 0,
        structuredQueriesExecuted: 0
      },
      errors: [],
      metadata: {
        startTime: new Date(),
        executionPath: [],
        nodeExecutionTimes: {},
        threadId: options.threadId,
        totalNodesExecuted: 0,
        pipelineVersion: "2.0-llm-first",
        ...options.metadata
      }
    };

    // Use the compiled graph for proper 3-node execution
    const compiledGraph = createCompiledAgenticSearchGraph();
    const result = await compiledGraph.invoke(initialState);

    const totalTime = Date.now() - startTime;

    return {
      ...result,
      executionStats: {
        ...result.executionStats,
        totalTimeMs: totalTime
      },
      metadata: {
        ...result.metadata,
        endTime: new Date()
      }
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;

    console.error('Agentic search pipeline failed:', error);

    return {
      query,
      intentState: null,
      executionPlan: null,
      candidates: [],
      executionStats: {
        totalTimeMs: totalTime,
        nodeTimings: {},
        vectorQueriesExecuted: 0,
        structuredQueriesExecuted: 0
      },
      errors: [{
        node: "agentic-search-graph",
        error: error instanceof Error ? error : new Error("Unknown error in agentic search"),
        timestamp: new Date(),
        recovered: false,
        recoveryStrategy: "Complete graph failure - check node-level errors"
      }],
      metadata: {
        startTime: new Date(startTime),
        endTime: new Date(),
        executionPath: ["agentic-search"],
        nodeExecutionTimes: {},
        threadId: options.threadId,
        totalNodesExecuted: 0,
        pipelineVersion: "2.0-llm-first"
      }
    };
  }
}

/**
 * Batch processing for multiple queries
 * TODO: Uncomment and test after basic pipeline is working
 */
/*
export async function batchSearchWithAgenticPipeline(
  queries: string[],
  options: {
    threadId?: string;
    concurrency?: number;
    enableCheckpoints?: boolean;
  } = {}
): Promise<Array<Partial<typeof StateAnnotation.State>>> {
  const concurrency = options.concurrency || 3;
  const results: Array<Partial<typeof StateAnnotation.State>> = [];

  console.log(`🚀 Starting batch agentic search for ${queries.length} queries (concurrency: ${concurrency})`);

  // Process in batches to control resource usage
  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency);
    const batchPromises = batch.map((query, batchIndex) =>
      searchWithAgenticPipeline(query, {
        threadId: options.threadId ? `${options.threadId}-batch-${Math.floor(i/concurrency)}-${batchIndex}` : undefined,
        enableCheckpoints: options.enableCheckpoints
      })
    );

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      console.log(`✅ Batch ${Math.floor(i/concurrency) + 1}/${Math.ceil(queries.length/concurrency)} completed`);
    } catch (error) {
      console.error(`❌ Batch ${Math.floor(i/concurrency) + 1} failed:`, error);

      // Add error results for failed batch
      const errorResults = batch.map(query => ({
        query,
        intentState: null,
        executionPlan: null,
        candidates: [],
        executionStats: { totalTimeMs: 0, nodeTimings: {}, vectorQueriesExecuted: 0, structuredQueriesExecuted: 0 },
        errors: [{
          node: "batch-search",
          error: error instanceof Error ? error : new Error("Batch search failed"),
          timestamp: new Date(),
          recovered: false
        }],
        metadata: {
          startTime: new Date(),
          executionPath: ["batch-search"],
          nodeExecutionTimes: {},
          totalNodesExecuted: 0,
          pipelineVersion: "2.0-llm-first"
        }
      }));

      results.push(...errorResults);
    }
  }

  const successfulResults = results.filter(r => !r.errors || r.errors.length === 0);
  const averageTime = results.reduce((sum, r) => sum + (r.executionStats?.totalTimeMs || 0), 0) / results.length;

  console.log(`🎉 Batch search completed: ${successfulResults.length}/${results.length} successful, avg time: ${Math.round(averageTime)}ms`);

  return results;
}
*/

/**
 * Stream search for real-time feedback (experimental)
 */
export async function* streamSearchWithAgenticPipeline(
  query: string,
  options: {
    threadId?: string;
    emitIntermediate?: boolean;
  } = {}
): AsyncGenerator<{
  stage: string;
  data: Partial<typeof StateAnnotation.State>;
  progress: number;
}, void, unknown> {
  const startTime = Date.now();

  try {
    // Initialize state
    const state: typeof StateAnnotation.State = {
      query,
      intentState: null,
      executionPlan: null,
      candidates: [],
      executionStats: {
        totalTimeMs: 0,
        nodeTimings: {},
        vectorQueriesExecuted: 0,
        structuredQueriesExecuted: 0
      },
      errors: [],
      metadata: {
        startTime: new Date(),
        executionPath: [],
        nodeExecutionTimes: {},
        threadId: options.threadId,
        totalNodesExecuted: 0,
        pipelineVersion: "2.0-llm-first"
      }
    };

    // Emit initial state
    yield {
      stage: "initialized",
      data: state,
      progress: 0
    };

    // For now, just run the full pipeline and emit final result
    // In a real implementation, we'd instrument the nodes to emit intermediate results
    const result = await searchWithAgenticPipeline(query, options);

    yield {
      stage: "completed",
      data: result,
      progress: 100
    };

  } catch (error) {
    yield {
      stage: "error",
      data: {
        query,
        intentState: null,
        executionPlan: null,
        candidates: [],
        executionStats: { totalTimeMs: Date.now() - startTime, nodeTimings: {}, vectorQueriesExecuted: 0, structuredQueriesExecuted: 0 },
        errors: [{
          node: "stream-search",
          error: error instanceof Error ? error : new Error("Stream search failed"),
          timestamp: new Date(),
          recovered: false
        }],
        metadata: {
          startTime: new Date(startTime),
          executionPath: ["stream-search"],
          nodeExecutionTimes: {},
          threadId: options.threadId,
          totalNodesExecuted: 0,
          pipelineVersion: "2.0-llm-first"
        }
      },
      progress: -1
    };
  }
}

// Export the graph creation function for external use
export { createAgenticSearchGraph as default };
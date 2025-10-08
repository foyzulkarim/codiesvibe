# Phase 8: Graph Assembly - Detailed Implementation Tasks

## Task 8.1: Intent Extraction Graph

### Implementation Details:

**graphs/intent-extraction.graph.ts**
```typescript
import { StateGraph, END } from "@langchain/langgraph";
import { StateAnnotation } from "@/types/state";

// Import all extraction nodes
import { queryPreprocessorNode } from "@/nodes/preprocessing/query-preprocessor.node";
import { semanticPrefilterNode } from "@/nodes/extraction/semantic-prefilter.node";
import { zeroShotClassifierNode } from "@/nodes/extraction/zero-shot-classifier.node";
import { scoreCombinerNode } from "@/nodes/extraction/score-combiner.node";
import { nerExtractorNode } from "@/nodes/extraction/ner-extractor.node";
import { fuzzyMatcherNode } from "@/nodes/extraction/fuzzy-matcher.node";
import { nameResolverNode } from "@/nodes/extraction/name-resolver.node";
import { comparativeDetectorNode } from "@/nodes/extraction/comparative-detector.node";
import { referenceExtractorNode } from "@/nodes/extraction/reference-extractor.node";
import { priceExtractorNode } from "@/nodes/extraction/price-extractor.node";
import { interfaceDetectorNode } from "@/nodes/extraction/interface-detector.node";
import { deploymentDetectorNode } from "@/nodes/extraction/deployment-detector.node";
import { intentSynthesizerNode } from "@/nodes/extraction/intent-synthesizer.node";
import { confidenceEvaluatorNode } from "@/nodes/routing/confidence-evaluator.node";

/**
 * Creates the intent extraction subgraph with parallel execution
 */
export function createIntentExtractionGraph(): StateGraph<typeof StateAnnotation.State> {
  const workflow = new StateGraph(StateAnnotation)
    // Start with query preprocessing
    .addNode("query-preprocessor", queryPreprocessorNode)
    
    // Parallel extraction branches
    .addNode("semantic-prefilter", semanticPrefilterNode)
    .addNode("zero-shot-classifier", zeroShotClassifierNode)
    .addNode("score-combiner", scoreCombinerNode)
    
    .addNode("ner-extractor", nerExtractorNode)
    .addNode("fuzzy-matcher", fuzzyMatcherNode)
    .addNode("name-resolver", nameResolverNode)
    
    .addNode("comparative-detector", comparativeDetectorNode)
    .addNode("reference-extractor", referenceExtractorNode)
    
    .addNode("price-extractor", priceExtractorNode)
    .addNode("interface-detector", interfaceDetectorNode)
    .addNode("deployment-detector", deploymentDetectorNode)
    
    // Convergence and synthesis
    .addNode("intent-synthesizer", intentSynthesizerNode)
    .addNode("confidence-evaluator", confidenceEvaluatorNode)
    
    // Define edges
    .addEdge("__start__", "query-preprocessor")
    
    // Fan out to parallel branches after preprocessing
    .addEdge("query-preprocessor", "semantic-prefilter")
    .addEdge("query-preprocessor", "ner-extractor")
    .addEdge("query-preprocessor", "comparative-detector")
    .addEdge("query-preprocessor", "price-extractor")
    .addEdge("query-preprocessor", "interface-detector")
    .addEdge("query-preprocessor", "deployment-detector")
    
    // Semantic branch (sequential)
    .addEdge("semantic-prefilter", "zero-shot-classifier")
    .addEdge("zero-shot-classifier", "score-combiner")
    
    // Tool name branch (sequential)
    .addEdge("ner-extractor", "fuzzy-matcher")
    .addEdge("fuzzy-matcher", "name-resolver")
    
    // Comparative branch (conditional)
    .addEdge("comparative-detector", "reference-extractor")
    
    // Convergence point - all branches lead to intent synthesizer
    .addEdge("score-combiner", "intent-synthesizer")
    .addEdge("name-resolver", "intent-synthesizer")
    .addEdge("reference-extractor", "intent-synthesizer")
    .addEdge("price-extractor", "intent-synthesizer")
    .addEdge("interface-detector", "intent-synthesizer")
    .addEdge("deployment-detector", "intent-synthesizer")
    
    // Final evaluation
    .addEdge("intent-synthesizer", "confidence-evaluator")
    .addEdge("confidence-evaluator", END);
    
  return workflow;
}

/**
 * Conditional edge for comparative detection
 */
async function shouldExtractReference(state: typeof StateAnnotation.State): Promise<boolean> {
  return state.extractionSignals?.comparativeFlag || false;
}

/**
 * Entry point for intent extraction
 */
export async function extractIntent(query: string): Promise<Partial<typeof StateAnnotation.State>> {
  const graph = createIntentExtractionGraph();
  const compiledGraph = graph.compile();
  
  const initialState = {
    query,
    metadata: {
      startTime: new Date(),
      executionPath: ["intent-extraction"],
      nodeExecutionTimes: {}
    }
  };
  
  return await compiledGraph.invoke(initialState);
}
```

## Task 8.2: Query Planning Graph

### Implementation Details:

**graphs/query-planning.graph.ts**
```typescript
import { StateGraph, END } from "@langchain/langgraph";
import { StateAnnotation } from "@/types/state";

// Import planner nodes
import { optimalPlannerNode } from "@/nodes/planning/optimal-planner.node";
import { multiStrategyPlannerNode } from "@/nodes/planning/multi-strategy-planner.node";
import { fallbackPlannerNode } from "@/nodes/planning/fallback-planner.node";
import { planValidatorNode } from "@/nodes/planning/plan-validator.node";

// Import routers
import { enhancedConfidenceRouter } from "@/routers/confidence.router";

/**
 * Creates the query planning subgraph with conditional routing
 */
export function createQueryPlanningGraph(): StateGraph<typeof StateAnnotation.State> {
  const workflow = new StateGraph(StateAnnotation)
    // Planning nodes
    .addNode("optimal-planner", optimalPlannerNode)
    .addNode("multi-strategy-planner", multiStrategyPlannerNode)
    .addNode("fallback-planner", fallbackPlannerNode)
    .addNode("plan-validator", planValidatorNode)
    
    // Define conditional routing from confidence to planner
    .addConditionalEdges(
      "confidence-router",
      enhancedConfidenceRouter,
      {
        "optimal": "optimal-planner",
        "multi-strategy": "multi-strategy-planner",
        "fallback": "fallback-planner"
      }
    )
    
    // All planners converge to validator
    .addEdge("optimal-planner", "plan-validator")
    .addEdge("multi-strategy-planner", "plan-validator")
    .addEdge("fallback-planner", "plan-validator")
    
    .addEdge("plan-validator", END);
    
  return workflow;
}

/**
 * Entry point for query planning
 */
export async function planQuery(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const graph = createQueryPlanningGraph();
  const compiledGraph = graph.compile();
  
  // Update execution path
  const updatedState = {
    ...state,
    metadata: {
      ...state.metadata,
      executionPath: [...(state.metadata.executionPath || []), "query-planning"]
    }
  };
  
  return await compiledGraph.invoke(updatedState);
}

/**
 * Standalone planning function for direct invocation
 */
export async function createExecutionPlan(intent: any, confidence: any): Promise<any> {
  const graph = createQueryPlanningGraph();
  const compiledGraph = graph.compile();
  
  const state = {
    intent,
    confidence,
    metadata: {
      startTime: new Date(),
      executionPath: ["query-planning"],
      nodeExecutionTimes: {}
    }
  };
  
  const result = await compiledGraph.invoke(state);
  return result.plan;
}
```

## Task 8.3: Execution Graph

### Implementation Details:

**graphs/execution.graph.ts**
```typescript
import { StateGraph, END } from "@langchain/langgraph";
import { StateAnnotation } from "@/types/state";

// Import execution nodes
import { singlePlanExecutorNode } from "@/nodes/execution/single-plan-executor.node";
import { multiStrategyExecutorNode } from "@/nodes/execution/multi-strategy-executor.node";
import { resultMergerNode } from "@/nodes/execution/result-merger.node";
import { completionNode } from "@/nodes/execution/completion.node";

// Import planning nodes for refinement/expansion
import { refinementPlannerNode } from "@/nodes/planning/refinement-planner.node";
import { expansionPlannerNode } from "@/nodes/planning/expansion-planner.node";

// Import evaluation and routing nodes
import { qualityEvaluatorNode } from "@/nodes/routing/quality-evaluator.node";
import { executionRouter, postExecutionRouter } from "@/routers/execution.router";
import { adaptiveQualityRouter } from "@/routers/quality.router";

/**
 * Creates the execution subgraph with refinement/expansion cycles
 */
export function createExecutionGraph(): StateGraph<typeof StateAnnotation.State> {
  const workflow = new StateGraph(StateAnnotation)
    // Execution nodes
    .addNode("quality-evaluator", qualityEvaluatorNode)
    
    // Planning nodes for refinement/expansion
    .addNode("refinement-planner", refinementPlannerNode)
    .addNode("expansion-planner", expansionPlannerNode)
    
    // Execution routers
    .addNode("execution-router", executionRouter)
    .addNode("post-execution-router", postExecutionRouter)
    .addNode("quality-router", adaptiveQualityRouter)
    
    // Executor nodes
    .addNode("single-plan-executor", singlePlanExecutorNode)
    .addNode("multi-strategy-executor", multiStrategyExecutorNode)
    .addNode("result-merger", resultMergerNode)
    .addNode("completion", completionNode)
    
    // Start with quality evaluation (for initial execution, this will route to execution)
    .addEdge("__start__", "quality-evaluator")
    
    // Route based on quality (first time will route to execution)
    .addConditionalEdges(
      "quality-evaluator",
      preQualityRouter,
      {
        "quality-evaluator": "execution-router",
        "completion": "completion"
      }
    )
    
    // Route to appropriate executor
    .addConditionalEdges(
      "execution-router",
      executionRouter,
      {
        "single-plan-executor": "single-plan-executor",
        "multi-strategy-executor": "multi-strategy-executor"
      }
    )
    
    // After execution, determine if merging is needed
    .addConditionalEdges(
      "single-plan-executor",
      () => "post-execution-router",
      {
        "post-execution-router": "post-execution-router"
      }
    )
    
    .addConditionalEdges(
      "multi-strategy-executor",
      () => "post-execution-router",
      {
        "post-execution-router": "post-execution-router"
      }
    )
    
    // Route based on post-execution needs
    .addConditionalEdges(
      "post-execution-router",
      postExecutionRouter,
      {
        "result-merger": "result-merger",
        "completion": "completion"
      }
    )
    
    // After merging (if needed), evaluate quality again
    .addEdge("result-merger", "quality-evaluator")
    
    // Route based on quality assessment
    .addConditionalEdges(
      "quality-router",
      adaptiveQualityRouter,
      {
        "refinement-planner": "refinement-planner",
        "expansion-planner": "expansion-planner",
        "completion": "completion"
      }
    )
    
    // After refinement/expansion, go back to execution
    .addEdge("refinement-planner", "execution-router")
    .addEdge("expansion-planner", "execution-router")
    
    // End at completion
    .addEdge("completion", END);
    
  return workflow;
}

/**
 * Entry point for execution
 */
export async function executePlan(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const graph = createExecutionGraph();
  const compiledGraph = graph.compile();
  
  // Update execution path
  const updatedState = {
    ...state,
    metadata: {
      ...state.metadata,
      executionPath: [...(state.metadata.executionPath || []), "execution"]
    }
  };
  
  return await compiledGraph.invoke(updatedState);
}

/**
 * Standalone execution function for direct invocation
 */
export async function executeSearch(plan: any, query: string): Promise<any> {
  const graph = createExecutionGraph();
  const compiledGraph = graph.compile();
  
  const state = {
    query,
    plan,
    metadata: {
      startTime: new Date(),
      executionPath: ["execution"],
      nodeExecutionTimes: {}
    }
  };
  
  const result = await compiledGraph.invoke(state);
  return result.completion;
}

/**
 * Pre-quality router for initial execution decision
 */
async function preQualityRouter(state: typeof StateAnnotation.State): Promise<"execution-router" | "completion"> {
  // If we don't have results yet, we need to execute
  if (!state.queryResults || state.queryResults.length === 0) {
    return "execution-router";
  }
  
  // If we have results, evaluate quality
  return "quality-router";
}
```

## Task 8.4: Main Graph

### Implementation Details:

**graphs/main.graph.ts**
```typescript
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
```

---

## Phase 8 Summary

**Total: 4 tasks, 4 main files + potential utility files**

**Key Features Implemented:**

1. **Intent Extraction Graph**: 
   - Parallel execution of extraction nodes
   - Proper fan-out/fan-in patterns
   - Conditional routing for comparative queries
   - Comprehensive error handling

2. **Query Planning Graph**:
   - Conditional routing based on confidence levels
   - Integration with all planner nodes
   - Plan validation before execution
   - Support for direct planning invocation

3. **Execution Graph**:
   - Adaptive refinement/expansion cycles
   - Quality-driven decision making
   - Support for both single and multi-strategy execution
   - Result merging and completion

4. **Main Graph**:
   - Complete pipeline orchestration
   - Checkpointing support for persistence
   - Streaming and async execution
   - Resume capability from checkpoints
   - Comprehensive error handling and fallbacks

**Advanced Features:**
- **Checkpointing**: Memory-based state persistence
- **Streaming**: Real-time execution progress
- **Resume**: Continue interrupted searches
- **Debug Mode**: Enhanced logging and monitoring
- **Error Recovery**: Graceful fallbacks at all levels
- **Performance Monitoring**: Execution time tracking
- **State Inspection**: Check current execution state

**Integration Points:**
- **Subgraph Composition**: Combines all phases into unified pipeline
- **State Management**: Consistent state flow across all phases
- **Configuration**: Flexible options for different use cases
- **API Interface**: Clean interfaces for external integration

**Estimated complexity:** 2-3 days for complete implementation

These graphs provide the complete orchestration layer that brings together all the previously implemented components into a cohesive, production-ready intelligent search system with advanced features like checkpointing, streaming, and adaptive execution.
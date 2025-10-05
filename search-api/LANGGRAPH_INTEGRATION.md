# LangGraph Integration Plan

## Overview
This document outlines the steps to integrate LangGraph into the existing search-api service, replacing the custom orchestration system with a LangGraph-based workflow.

## Step 1: Update Dependencies

### Add to package.json dependencies:
```json
{
  "dependencies": {
    "@langchain/core": "^0.3.0",
    "@langchain/langgraph": "^0.2.0",
    "@langchain/community": "^0.3.0",
    "langchain": "^0.3.0"
  }
}
```

### Installation command:
```bash
npm install @langchain/core @langchain/langgraph @langchain/community langchain
```

## Step 2: Create LangGraph State Schema

Create a new file `src/graph/state.ts` with the following content:

```typescript
import { Annotation, StateGraph } from "@langchain/langgraph";
import { Tool, QueryContext, ConfidenceScore, ToolHistoryStep } from "../types";

// Define the state schema for the LangGraph workflow
export const GraphState = Annotation.Root({
  // Query processing
  originalQuery: Annotation<string>,
  processedQuery: Annotation<any>,
  queryIntent: Annotation<string>,
  confidence: Annotation<number>,
  
  // Execution state
  currentNode: Annotation<string>,
  executionPath: Annotation<string[]>,
  toolSequence: Annotation<ToolHistoryStep[]>,
  results: Annotation<Tool[]>,
  
  // Context management
  queryContext: Annotation<QueryContext>,
  iterationCount: Annotation<number>,
  maxIterations: Annotation<number>,
  isComplete: Annotation<boolean>,
  
  // Error handling
  errors: Annotation<any[]>,
  retryCount: Annotation<number>,
  fallbackStrategy: Annotation<string>,
  
  // Response building
  responseData: Annotation<any>,
  responseMetadata: Annotation<any>,
  finalResponse: Annotation<any>
});

export type GraphStateType = typeof GraphState.State;
```

## Step 3: Implement LangGraph Nodes

Create a new file `src/graph/nodes.ts` with the following content:

```typescript
import { GraphState } from "./state";
import { RulesBasedPlanner } from "../planning/rules-based";
import { LLMPlanner } from "../planning/llm-planner";
import { ToolExecutor } from "../execution/executor";
import { ResultEvaluator } from "../evaluation/evaluator";
import { ResponseFormatter } from "../formatting/response-formatter";
import { AmbiguityDetector } from "../ambiguity/detector";
import config from "../config/agentic";

// Planner node - decides what action to take next
export const plannerNode = async (state: GraphStateType) => {
  const { queryContext, iterationCount, maxIterations } = state;
  
  // Check if we need clarification
  if (AmbiguityDetector.needsClarification(queryContext)) {
    return {
      currentNode: "clarification",
      processedQuery: {
        action: "clarify",
        parameters: AmbiguityDetector.generateClarificationRequest(
          queryContext.ambiguities,
          queryContext.originalQuery,
          queryContext
        )
      },
      confidence: 0.3
    };
  }
  
  // Check if we've reached max iterations
  if (iterationCount >= maxIterations) {
    return {
      currentNode: "response",
      isComplete: true,
      confidence: state.confidence * 0.8 // Lower confidence due to iteration limit
    };
  }
  
  // Choose between LLM and rules-based planning
  let planningResult;
  if (config.OLLAMA_URL && config.ENABLE_REASONING_EXPLANATION) {
    try {
      planningResult = await LLMPlanner.generatePlan({
        context: queryContext,
        state: {
          originalQuery: state.originalQuery,
          currentResults: state.results,
          iterationCount,
          isComplete: false,
          confidenceScores: [],
          lastUpdateTime: new Date(),
          metadata: {
            startTime: new Date(),
            currentPhase: "planning",
            totalSteps: maxIterations,
            completedSteps: iterationCount
          }
        },
        availableTools: ToolExecutor.getRegisteredTools(),
        iteration: iterationCount,
        maxIterations,
        planningType: iterationCount === 0 ? "initial" : "iteration"
      });
    } catch (error) {
      console.warn("LLM planner failed, falling back to rules-based:", error);
      planningResult = await RulesBasedPlanner.planNextAction(queryContext, {
        originalQuery: state.originalQuery,
        currentResults: state.results,
        iterationCount,
        isComplete: false,
        confidenceScores: [],
        lastUpdateTime: new Date(),
        metadata: {
          startTime: new Date(),
          currentPhase: "planning",
          totalSteps: maxIterations,
          completedSteps: iterationCount
        }
      });
    }
  } else {
    planningResult = await RulesBasedPlanner.planNextAction(queryContext, {
      originalQuery: state.originalQuery,
      currentResults: state.results,
      iterationCount,
      isComplete: false,
      confidenceScores: [],
      lastUpdateTime: new Date(),
      metadata: {
        startTime: new Date(),
        currentPhase: "planning",
        totalSteps: maxIterations,
        completedSteps: iterationCount
      }
    });
  }
  
  // Update execution path
  const newPath = [...(state.executionPath || []), "planner"];
  
  return {
    currentNode: "executor",
    processedQuery: planningResult.action,
    confidence: planningResult.confidence,
    executionPath: newPath,
    toolSequence: [
      ...(state.toolSequence || []),
      {
        toolName: planningResult.action.toolName,
        parameters: planningResult.action.parameters,
        resultCount: 0,
        confidence: { score: planningResult.confidence, reasoning: planningResult.reasoning, timestamp: new Date() },
        reasoning: planningResult.reasoning,
        timestamp: new Date()
      }
    ]
  };
};

// Executor node - executes the planned action
export const executorNode = async (state: GraphStateType) => {
  const { processedQuery, queryContext, results, toolSequence, iterationCount } = state;
  
  if (!processedQuery || processedQuery.type === "complete") {
    return {
      currentNode: "response",
      isComplete: true,
      confidence: state.confidence
    };
  }
  
  if (processedQuery.type === "clarify") {
    return {
      currentNode: "clarification",
      responseData: processedQuery.parameters,
      confidence: 0.3
    };
  }
  
  try {
    // Execute the tool
    const executionResult = await ToolExecutor.execute({
      toolName: processedQuery.toolName,
      parameters: processedQuery.parameters || {},
      context: queryContext,
      state: {
        originalQuery: state.originalQuery,
        currentResults: results,
        iterationCount,
        isComplete: false,
        confidenceScores: [],
        lastUpdateTime: new Date(),
        metadata: {
          startTime: new Date(),
          currentPhase: "executing",
          totalSteps: state.maxIterations,
          completedSteps: iterationCount
        }
      },
      priority: "medium",
      timeout: 30000
    });
    
    // Update execution path
    const newPath = [...(state.executionPath || []), "executor"];
    
    if (executionResult.success) {
      return {
        currentNode: "evaluator",
        results: executionResult.data || results,
        confidence: executionResult.confidence.score,
        executionPath: newPath,
        toolSequence: toolSequence.map((step, index) => 
          index === toolSequence.length - 1
            ? { ...step, resultCount: executionResult.data?.length || 0, confidence: executionResult.confidence }
            : step
        )
      };
    } else {
      // Handle execution failure
      return {
        currentNode: "evaluator",
        results,
        confidence: 0.2,
        executionPath: newPath,
        errors: [
          ...(state.errors || []),
          {
            type: "execution",
            message: executionResult.error?.message || "Unknown execution error",
            tool: processedQuery.toolName,
            parameters: processedQuery.parameters
          }
        ]
      };
    }
  } catch (error) {
    // Handle unexpected errors
    return {
      currentNode: "evaluator",
      results,
      confidence: 0.1,
      errors: [
        ...(state.errors || []),
        {
          type: "system",
          message: error instanceof Error ? error.message : "Unknown system error",
          tool: processedQuery.toolName,
          parameters: processedQuery.parameters
        }
      ]
    };
  }
};

// Evaluator node - evaluates results and decides next steps
export const evaluatorNode = async (state: GraphStateType) => {
  const { results, queryContext, confidence, iterationCount, maxIterations } = state;
  
  // Evaluate current results
  const evaluationResult = await ResultEvaluator.evaluateResults(
    {
      originalQuery: state.originalQuery,
      currentResults: results,
      iterationCount,
      isComplete: false,
      confidenceScores: [],
      lastUpdateTime: new Date(),
      metadata: {
        startTime: new Date(),
        currentPhase: "evaluating",
        totalSteps: maxIterations,
        completedSteps: iterationCount
      }
    },
    queryContext,
    "medium"
  );
  
  // Update execution path
  const newPath = [...(state.executionPath || []), "evaluator"];
  
  // Determine if we should continue or complete
  if (
    evaluationResult.shouldContinue &&
    confidence >= config.CONFIDENCE_THRESHOLD &&
    iterationCount < maxIterations
  ) {
    return {
      currentNode: "planner",
      iterationCount: iterationCount + 1,
      confidence: evaluationResult.confidence,
      executionPath: newPath,
      responseMetadata: {
        evaluation: evaluationResult,
        reason: "Continue search based on evaluation results"
      }
    };
  } else {
    return {
      currentNode: "response",
      isComplete: true,
      confidence: evaluationResult.confidence,
      executionPath: newPath,
      responseMetadata: {
        evaluation: evaluationResult,
        reason: evaluationResult.shouldContinue 
          ? "Max iterations reached" 
          : "Search completed satisfactorily"
      }
    };
  }
};

// Response node - formats and returns the final response
export const responseNode = async (state: GraphStateType) => {
  const { results, queryContext, toolSequence, confidence, responseMetadata } = state;
  
  // Format the response
  const formattedResponse = await ResponseFormatter.formatResponse(
    {
      originalQuery: state.originalQuery,
      currentResults: results,
      iterationCount: state.iterationCount,
      isComplete: true,
      confidenceScores: [],
      lastUpdateTime: new Date(),
      toolHistory: toolSequence,
      metadata: {
        startTime: new Date(),
        currentPhase: "response",
        totalSteps: state.maxIterations,
        completedSteps: state.iterationCount
      }
    },
    queryContext,
    responseMetadata?.evaluation || {
      overallScore: confidence,
      criteria: {
        relevance: confidence,
        completeness: confidence,
        accuracy: confidence,
        quality: confidence,
        confidence
      },
      qualityChecks: [],
      shouldContinue: false,
      nextAction: "complete",
      reasoning: "Search completed",
      recommendations: [],
      confidence,
      metadata: {
        evaluationTime: 0,
        resultCount: results?.length || 0,
        iterationCount: state.iterationCount,
        evaluationDepth: "medium"
      }
    },
    {
      includeReasoning: true,
      includeMetrics: true,
      includeConfidence: true,
      includeSuggestions: true,
      verbosity: "standard",
      format: "json"
    }
  );
  
  // Update execution path
  const newPath = [...(state.executionPath || []), "response"];
  
  return {
    currentNode: "end",
    finalResponse: formattedResponse,
    executionPath: newPath
  };
};

// Clarification node - handles ambiguity resolution
export const clarificationNode = async (state: GraphStateType) => {
  const { responseData, queryContext } = state;
  
  // Update execution path
  const newPath = [...(state.executionPath || []), "clarification"];
  
  return {
    currentNode: "end",
    finalResponse: {
      success: false,
      results: [],
      total: 0,
      reasoning: {
        phase: "clarification",
        ambiguities: queryContext.ambiguities.map(a => ({
          type: a.type,
          description: a.description,
          severity: a.severity
        }))
      },
      summary: `Your query contains ambiguities that need clarification`,
      confidence: 0.3,
      disambiguationOptions: responseData,
      sessionId: queryContext.sessionId,
      metadata: {
        query: state.originalQuery,
        intent: "needs_clarification",
        iterations: state.iterationCount,
        executionTime: 0,
        toolsUsed: [],
        timestamp: new Date(),
        warnings: ["Query clarification needed"]
      }
    },
    executionPath: newPath
  };
};
```

## Step 4: Build the LangGraph Workflow

Create a new file `src/graph/workflow.ts` with the following content:

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState, GraphStateType } from "./state";
import { plannerNode, executorNode, evaluatorNode, responseNode, clarificationNode } from "./nodes";
import config from "../config/agentic";

// Conditional edge functions
const shouldContinue = (state: GraphStateType) => {
  if (state.isComplete || state.currentNode === "response") {
    return "response";
  }
  if (state.confidence < config.CONFIDENCE_THRESHOLD && state.currentNode !== "planner") {
    return "planner";
  }
  return state.currentNode;
};

const afterPlanner = (state: GraphStateType) => {
  if (state.processedQuery?.type === "clarify") {
    return "clarification";
  }
  return "executor";
};

const afterExecutor = (state: GraphStateType) => {
  return "evaluator";
};

const afterEvaluator = (state: GraphStateType) => {
  if (state.isComplete || state.iterationCount >= state.maxIterations) {
    return "response";
  }
  return "planner";
};

// Create the workflow graph
export const createWorkflow = () => {
  const workflow = new StateGraph(GraphState)
    .addNode("planner", plannerNode)
    .addNode("executor", executorNode)
    .addNode("evaluator", evaluatorNode)
    .addNode("response", responseNode)
    .addNode("clarification", clarificationNode)
    
    // Add edges
    .addEdge(START, "planner")
    .addConditionalEdges("planner", afterPlanner, {
      executor: "executor",
      clarification: "clarification"
    })
    .addEdge("executor", "evaluator")
    .addConditionalEdges("evaluator", afterEvaluator, {
      planner: "planner",
      response: "response"
    })
    .addEdge("response", END)
    .addEdge("clarification", END);
  
  return workflow.compile();
};
```

## Step 5: Update the Query Route

Modify `src/routes/query.ts` to use the LangGraph workflow. Replace the existing queryHandler function with:

```typescript
import { createWorkflow } from "../graph/workflow";
import { GraphState } from "../graph/state";

// Create the workflow instance
const searchWorkflow = createWorkflow();

/**
 * Main query handler with LangGraph orchestration
 */
const queryHandler = async (
  request: FastifyRequest<{ Body: QueryRequest }>,
  reply: FastifyReply
): Promise<void> => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validatedBody = querySchema.parse(request.body);
    const { query, limit, offset, context, options } = validatedBody;

    // Generate session ID if not provided
    const sessionId = context?.sessionId || generateSessionId();

    // Initialize query context
    const queryContext: QueryContext = {
      originalQuery: query,
      interpretedIntent: '',
      extractedEntities: {},
      constraints: {},
      ambiguities: [],
      clarificationHistory: [],
      sessionId
    };

    console.log(`[${sessionId}] Starting LangGraph query processing: "${query}"`);

    // Initialize the graph state
    const initialState = {
      originalQuery: query,
      processedQuery: null,
      queryIntent: "",
      confidence: 0.5,
      currentNode: "planner",
      executionPath: [],
      toolSequence: [],
      results: [],
      queryContext,
      iterationCount: 0,
      maxIterations: options?.maxIterations || config.MAX_ITERATIONS,
      isComplete: false,
      errors: [],
      retryCount: 0,
      fallbackStrategy: "",
      responseData: null,
      responseMetadata: null,
      finalResponse: null
    };

    // Run the workflow
    const result = await searchWorkflow.invoke(initialState);

    // Apply pagination if needed
    if (result.finalResponse?.results && (limit || offset)) {
      const start = offset || 0;
      const end = start + (limit || 20);
      result.finalResponse.results = result.finalResponse.results.slice(start, end);
      result.finalResponse.total = result.finalResponse.results.length;
    }

    const executionTime = Date.now() - startTime;

    // Add execution metadata
    if (result.finalResponse) {
      result.finalResponse.metadata = {
        ...result.finalResponse.metadata,
        executionTime,
        sessionId,
        graphExecutionPath: result.executionPath,
        graphIterations: result.iterationCount
      };
    }

    console.log(`[${sessionId}] LangGraph query processing completed in ${executionTime}ms, ${result.iterationCount} iterations`);

    return reply.status(200).send(result.finalResponse);

  } catch (error) {
    console.error('LangGraph query processing error:', error);

    const executionTime = Date.now() - startTime;
    const sessionId = generateSessionId();

    const errorResponse: QueryResponse = {
      success: false,
      results: [],
      total: 0,
      summary: 'An error occurred while processing your query',
      confidence: 0,
      sessionId,
      metadata: {
        query: request.body.query,
        intent: 'error',
        iterations: 0,
        executionTime,
        toolsUsed: [],
        timestamp: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      }
    };

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        ...errorResponse,
        metadata: {
          ...errorResponse.metadata,
          errors: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        }
      });
    }

    return reply.status(500).send(errorResponse);
  }
};
```

## Step 6: Update the Server

Modify `src/server.ts` to ensure all the components are properly imported and initialized:

```typescript
// Add this import to the top of the file
import "./graph/workflow"; // This will initialize the workflow

// The rest of the file remains the same
```

## Step 7: Error Handling and Fallbacks

Create a new file `src/graph/error-handling.ts` with the following content:

```typescript
import { GraphStateType } from "./state";
import { RulesBasedPlanner } from "../planning/rules-based";
import { ToolExecutor } from "../execution/executor";

// Error recovery strategies
export const handlePlannerError = async (state: GraphStateType, error: Error) => {
  console.warn("Planner error, using fallback:", error);
  
  // Use rules-based planner as fallback
  const fallbackResult = await RulesBasedPlanner.planNextAction(
    state.queryContext,
    {
      originalQuery: state.originalQuery,
      currentResults: state.results,
      iterationCount: state.iterationCount,
      isComplete: false,
      confidenceScores: [],
      lastUpdateTime: new Date(),
      metadata: {
        startTime: new Date(),
        currentPhase: "planner",
        totalSteps: state.maxIterations,
        completedSteps: state.iterationCount
      }
    }
  );
  
  return {
    ...state,
    processedQuery: fallbackResult.action,
    confidence: Math.min(fallbackResult.confidence, 0.6), // Lower confidence for fallback
    errors: [
      ...(state.errors || []),
      {
        type: "planner",
        message: error.message,
        fallbackUsed: true
      }
    ],
    fallbackStrategy: "rules-based"
  };
};

export const handleExecutorError = async (state: GraphStateType, error: Error) => {
  console.warn("Executor error, attempting recovery:", error);
  
  // Try to use a simpler tool as fallback
  const fallbackTool = "searchByText";
  const fallbackParams = {
    query: state.originalQuery,
    fields: ["name", "description"]
  };
  
  try {
    const fallbackResult = await ToolExecutor.execute({
      toolName: fallbackTool,
      parameters: fallbackParams,
      context: state.queryContext,
      state: {
        originalQuery: state.originalQuery,
        currentResults: state.results,
        iterationCount: state.iterationCount,
        isComplete: false,
        confidenceScores: [],
        lastUpdateTime: new Date(),
        metadata: {
          startTime: new Date(),
          currentPhase: "executing",
          totalSteps: state.maxIterations,
          completedSteps: state.iterationCount
        }
      },
      priority: "low",
      timeout: 10000
    });
    
    return {
      ...state,
      results: fallbackResult.data || state.results,
      confidence: Math.min(fallbackResult.confidence.score, 0.5), // Lower confidence for fallback
      errors: [
        ...(state.errors || []),
        {
          type: "executor",
          message: error.message,
          fallbackUsed: true,
          fallbackTool
        }
      ],
      fallbackStrategy: "simple-search"
    };
  } catch (fallbackError) {
    // If even the fallback fails, return the original results
    return {
      ...state,
      confidence: 0.2, // Very low confidence
      errors: [
        ...(state.errors || []),
        {
          type: "executor",
          message: error.message,
          fallbackError: fallbackError instanceof Error ? fallbackError.message : "Unknown fallback error",
          fallbackFailed: true
        }
      ],
      fallbackStrategy: "failed"
    };
  }
};
```

## Step 8: Update Tests

Modify the test files to work with the LangGraph implementation. The main changes will be:

1. Update test expectations to match the new response format
2. Add tests for error handling and fallbacks
3. Add tests for the workflow execution path

## Conclusion

By implementing these changes, the search-api service will use LangGraph for orchestration instead of the custom system. This provides several benefits:

1. Better visualization and debugging of the workflow
2. More robust state management
3. Easier to extend and modify the workflow
4. Better integration with the LangChain ecosystem

The implementation maintains backward compatibility with the existing API while improving the internal architecture.

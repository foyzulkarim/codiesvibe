import { GraphState } from "./state";
import { LLMPlanner } from "../planning/llm-planner";
import { RulesBasedPlanner } from "../planning/rules-based";
import { ResultEvaluator } from "../evaluation/evaluator";
import { ResponseFormatter } from "../formatting/response-formatter";
import { AmbiguityDetector } from "../ambiguity/detector";
import config from "../config/agentic";

// Import the CustomToolExecutor
import { CustomToolExecutor } from "../execution/custom-executor";

/**
 * Planner node - analyzes the user query and creates an execution plan
 */
export const planner = async (state: GraphState): Promise<Partial<GraphState>> => {
  const { query, metadata } = state;
  const iterationCount = metadata?.iterationCount || 0;
  const maxIterations = metadata?.maxIterations || 10;
  const sessionId = metadata?.sessionId || 'unknown';

  console.log(`🔥[${sessionId}] PLANNER NODE STARTED`);
  console.log(`🔥[${sessionId}] Query: "${query}"`);
  console.log(`🔥[${sessionId}] Iteration: ${iterationCount}/${maxIterations}`);
  console.log(`🔥[${sessionId}] Available tools:`, CustomToolExecutor.getRegisteredTools());

  try {
    // Create a query context from the query
    const queryContext = {
      originalQuery: query,
      interpretedIntent: '',
      extractedEntities: {},
      constraints: {},
      ambiguities: [],
      clarificationNeeded: false,
      clarificationHistory: [],
      refinementHistory: [],
      sessionId: metadata?.sessionId || '',
      preferences: {}
    };
    
    // Check if we need clarification
    if (AmbiguityDetector.needsClarification(queryContext)) {
      const clarificationRequest = AmbiguityDetector.generateClarificationRequest(
        queryContext.ambiguities,
        queryContext.originalQuery,
        queryContext
      );
      
      return {
        needsClarification: true,
        clarificationQuestion: clarificationRequest?.question || 'Please clarify your query',
        metadata: {
          ...metadata,
          lastPlanUpdate: new Date().toISOString(),
          currentNode: 'planner'
        }
      };
    }
    
    // Check if we've reached max iterations
    if (iterationCount >= maxIterations) {
      return {
        metadata: {
          ...metadata,
          lastPlanUpdate: new Date().toISOString(),
          currentNode: 'planner',
          completedAt: new Date().toISOString()
        }
      };
    }
    
    // Create agent state for the planner
    const agentState = {
      originalQuery: query,
      currentResults: state.results || [],
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
    };
    
    // Choose between LLM and rules-based planning
    let planningResult;
    if (config.OLLAMA_URL && config.ENABLE_REASONING_EXPLANATION) {
      try {
        // Use LLM planner for all iterations
        planningResult = await LLMPlanner.generatePlan({
          context: queryContext,
          state: agentState,
          availableTools: CustomToolExecutor.getRegisteredTools(),
          iteration: iterationCount,
          maxIterations,
          planningType: iterationCount === 0 ? "initial" : "iteration"
        });

        // Update state with the LLM plan
        return {
          plan: planningResult.plan,
          metadata: {
            ...metadata,
            lastPlanUpdate: new Date().toISOString(),
            currentNode: 'planner',
            planningReasoning: planningResult.reasoning,
            iterationCount: iterationCount + 1
          }
        };
      } catch (error) {
        console.warn("LLM planner failed, falling back to rules-based:", error);
        planningResult = await RulesBasedPlanner.planNextAction(queryContext, agentState);

        // Convert rules-based result to LLM plan format
        const convertedPlan = {
          tool: planningResult.action.toolName || 'searchByText',
          parameters: planningResult.action.parameters || {},
          reasoning: planningResult.reasoning,
          confidence: planningResult.confidence,
          expectedOutcome: 'Execute planned action'
        };

        // Update state with the converted plan
        return {
          plan: convertedPlan,
          metadata: {
            ...metadata,
            lastPlanUpdate: new Date().toISOString(),
            currentNode: 'planner',
            planningReasoning: planningResult.reasoning,
            iterationCount: iterationCount + 1
          }
        };
      }
    } else {
      planningResult = await RulesBasedPlanner.planNextAction(queryContext, agentState);

      // Convert rules-based result to LLM plan format
      const convertedPlan = {
        tool: planningResult.action.toolName || 'searchByText',
        parameters: planningResult.action.parameters || {},
        reasoning: planningResult.reasoning,
        confidence: planningResult.confidence,
        expectedOutcome: 'Execute planned action'
      };

      // Update state with the converted plan
      return {
        plan: convertedPlan,
        metadata: {
          ...metadata,
          lastPlanUpdate: new Date().toISOString(),
          currentNode: 'planner',
          planningReasoning: planningResult.reasoning,
          iterationCount: iterationCount + 1
        }
      };
    }
    
  } catch (error) {
    // Handle planning errors
    return {
      error: error instanceof Error ? error.message : "Unknown planning error",
      metadata: {
        ...metadata,
        lastPlanUpdate: new Date().toISOString(),
        currentNode: 'planner',
        planningError: true
      }
    };
  }
};

/**
 * Executor node - executes the plan by calling the appropriate tools
 */
export const executor = async (state: GraphState): Promise<Partial<GraphState>> => {
  const { plan, query, results, metadata } = state;
  const sessionId = metadata?.sessionId || 'unknown';

  console.log(`🔥[${sessionId}] EXECUTOR NODE STARTED`);
  console.log(`🔥[${sessionId}] Plan:`, JSON.stringify(plan, null, 2));
  console.log(`🔥[${sessionId}] Available tools:`, CustomToolExecutor.getRegisteredTools());
  console.log(`🔥[${sessionId}] Dataset size:`, require('../data/loader').getOriginalDataset().length);

  if (!plan) {
    console.error(`🔥[${sessionId}] EXECUTOR ERROR: No plan available for execution`);
    return {
      error: "No plan available for execution",
      metadata: {
        ...metadata,
        lastExecutionUpdate: new Date().toISOString(),
        currentNode: 'executor',
        executionError: true
      }
    };
  }

  try {
    // Create a query context for execution
    const queryContext = {
      originalQuery: query,
      interpretedIntent: '',
      extractedEntities: {},
      constraints: {},
      ambiguities: [],
      clarificationNeeded: false,
      clarificationHistory: [],
      refinementHistory: [],
      sessionId: metadata?.sessionId || '',
      preferences: {}
    };
    
    // Create agent state for execution
    const agentState = {
      originalQuery: query,
      currentResults: results || [],
      iterationCount: metadata?.iterationCount || 0,
      isComplete: false,
      confidenceScores: [],
      lastUpdateTime: new Date(),
      metadata: {
        startTime: new Date(),
        currentPhase: "executing",
        totalSteps: metadata?.maxIterations || 10,
        completedSteps: metadata?.iterationCount || 0
      }
    };
    
    console.log(`🔥[${sessionId}] EXECUTING TOOL: ${plan.tool}`);
    console.log(`🔥[${sessionId}] TOOL PARAMETERS:`, JSON.stringify(plan.parameters, null, 2));

    // Execute the tool using CustomToolExecutor
    const executionResult = await CustomToolExecutor.execute({
      toolName: plan.tool,
      parameters: plan.parameters || {},
      context: queryContext,
      state: agentState,
      priority: "medium",
      timeout: 30000
    });

    console.log(`🔥[${sessionId}] EXECUTION RESULT:`, JSON.stringify(executionResult, null, 2));

    if (executionResult.success) {
      console.log(`🔥[${sessionId}] EXECUTION SUCCESS: ${executionResult.data?.length || 0} results`);
      return {
        results: executionResult.data || results,
        metadata: {
          ...metadata,
          lastExecutionUpdate: new Date().toISOString(),
          currentNode: 'executor',
          executionReasoning: plan.reasoning,
          executionConfidence: executionResult.confidence.score
        }
      };
    } else {
      console.error(`🔥[${sessionId}] EXECUTION FAILURE:`, executionResult.error);
      // Handle execution failure
      return {
        error: executionResult.error?.message || "Unknown execution error",
        metadata: {
          ...metadata,
          lastExecutionUpdate: new Date().toISOString(),
          currentNode: 'executor',
          executionError: true
        }
      };
    }
  } catch (error) {
    // Handle unexpected errors
    return {
      error: error instanceof Error ? error.message : "Unknown system error",
      metadata: {
        ...metadata,
        lastExecutionUpdate: new Date().toISOString(),
        currentNode: 'executor',
        executionError: true
      }
    };
  }
};

/**
 * Evaluator node - evaluates the results and determines if they are satisfactory
 */
export const evaluator = async (state: GraphState): Promise<Partial<GraphState>> => {
  const { results, query, plan, metadata } = state;
  
  try {
    // Create a query context for evaluation
    const queryContext = {
      originalQuery: query,
      interpretedIntent: '',
      extractedEntities: {},
      constraints: {},
      ambiguities: [],
      clarificationNeeded: false,
      clarificationHistory: [],
      refinementHistory: [],
      sessionId: metadata?.sessionId || '',
      preferences: {}
    };
    
    // Create agent state for evaluation
    const agentState = {
      originalQuery: query,
      currentResults: results || [],
      iterationCount: metadata?.iterationCount || 0,
      isComplete: false,
      confidenceScores: [],
      lastUpdateTime: new Date(),
      metadata: {
        startTime: new Date(),
        currentPhase: "evaluating",
        totalSteps: metadata?.maxIterations || 10,
        completedSteps: metadata?.iterationCount || 0
      }
    };
    
    // Evaluate current results
    const evaluationResult = await ResultEvaluator.evaluateResults(
      agentState,
      queryContext,
      "medium"
    );
    
    // Update state with evaluation
    return {
      evaluation: evaluationResult,
      metadata: {
        ...metadata,
        lastEvaluationUpdate: new Date().toISOString(),
        currentNode: 'evaluator',
        evaluationReasoning: evaluationResult.reasoning,
        evaluationScore: evaluationResult.overallScore
      }
    };
  } catch (error) {
    // Handle evaluation errors
    return {
      error: error instanceof Error ? error.message : "Unknown evaluation error",
      metadata: {
        ...metadata,
        lastEvaluationUpdate: new Date().toISOString(),
        currentNode: 'evaluator',
        evaluationError: true
      }
    };
  }
};

/**
 * Response node - generates the final response to the user
 */
export const response = async (state: GraphState): Promise<Partial<GraphState>> => {
  const { results, query, evaluation, plan, metadata } = state;
  
  try {
    // Create a query context for response formatting
    const queryContext = {
      originalQuery: query,
      interpretedIntent: '',
      extractedEntities: {},
      constraints: {},
      ambiguities: [],
      clarificationNeeded: false,
      clarificationHistory: [],
      refinementHistory: [],
      sessionId: metadata?.sessionId || '',
      preferences: {}
    };
    
    // Create agent state for response formatting
    const agentState = {
      originalQuery: query,
      currentResults: results || [],
      iterationCount: metadata?.iterationCount || 0,
      isComplete: true,
      confidenceScores: [],
      lastUpdateTime: new Date(),
      toolHistory: [],
      metadata: {
        startTime: new Date(),
        currentPhase: "response",
        totalSteps: metadata?.maxIterations || 10,
        completedSteps: metadata?.iterationCount || 0
      }
    };
    
    // Format the response
    const formattedResponse = await ResponseFormatter.formatResponse(
      agentState,
      queryContext,
      evaluation || {
        overallScore: 0.5,
        criteria: {
          relevance: 0.5,
          completeness: 0.5,
          accuracy: 0.5,
          quality: 0.5,
          confidence: 0.5
        },
        qualityChecks: [],
        shouldContinue: false,
        nextAction: "complete",
        reasoning: "Search completed",
        recommendations: [],
        confidence: 0.5,
        metadata: {
          evaluationTime: 0,
          resultCount: results?.length || 0,
          iterationCount: metadata?.iterationCount || 0,
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
    
    // Update state with response
    return {
      response: JSON.stringify(formattedResponse),
      metadata: {
        ...metadata,
        lastResponseUpdate: new Date().toISOString(),
        currentNode: 'response',
        completedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    // Handle response formatting errors
    return {
      error: error instanceof Error ? error.message : "Unknown response error",
      response: JSON.stringify({
        success: false,
        results: [],
        summary: "An error occurred while formatting the response",
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }),
      metadata: {
        ...metadata,
        lastResponseUpdate: new Date().toISOString(),
        currentNode: 'response',
        responseError: true,
        completedAt: new Date().toISOString()
      }
    };
  }
};

/**
 * Clarification node - generates a clarification question when needed
 */
export const clarification = async (state: GraphState): Promise<Partial<GraphState>> => {
  const { query, clarificationQuestion, metadata } = state;
  
  try {
    // Create a clarification response
    const clarificationResponse = {
      success: false,
      results: [],
      summary: "Your query contains ambiguities that need clarification",
      confidence: 0.3,
      disambiguationOptions: clarificationQuestion,
      metadata: {
        query,
        intent: "needs_clarification",
        iterations: metadata?.iterationCount || 0,
        timestamp: new Date(),
        warnings: ["Query clarification needed"]
      }
    };
    
    // Update state with clarification response
    return {
      response: JSON.stringify(clarificationResponse),
      metadata: {
        ...metadata,
        lastClarificationUpdate: new Date().toISOString(),
        currentNode: 'clarification',
        completedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    // Handle clarification errors
    return {
      error: error instanceof Error ? error.message : "Unknown clarification error",
      response: JSON.stringify({
        success: false,
        results: [],
        summary: "An error occurred while generating clarification",
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }),
      metadata: {
        ...metadata,
        lastClarificationUpdate: new Date().toISOString(),
        currentNode: 'clarification',
        clarificationError: true,
        completedAt: new Date().toISOString()
      }
    };
  }
};

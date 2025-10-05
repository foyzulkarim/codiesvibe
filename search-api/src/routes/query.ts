/**
 * Query Route Handler with AI Reasoning
 * Main orchestrator for the agentic search system
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, z } from 'zod';

// Import all AI reasoning components
import { StateManager } from '../state/helpers';
import { AmbiguityDetector, ClarificationRequest, ClarificationResponse } from '../ambiguity/detector';
import { RulesBasedPlanner } from '../planning/rules-based';
import { LLMPlanner } from '../planning/llm-planner';
import { ToolExecutor } from '../execution/executor';
import { ResultEvaluator } from '../evaluation/evaluator';
import { ResponseFormatter } from '../formatting/response-formatter';
import { PromptBuilder } from '../prompts/builder';

// Import types
import { AgentState, Tool, QueryContext } from '../types';
import config from '../config/agentic';

// Helper function to map verbosity types
function mapVerbosity(verbosity: 'concise' | 'standard' | 'detailed'): 'medium' | 'shallow' | 'deep' {
  switch (verbosity) {
    case 'concise': return 'shallow';
    case 'standard': return 'medium';
    case 'detailed': return 'deep';
    default: return 'medium';
  }
}

// Adapter function to convert between QueryContext types
function adaptQueryContextForPlanner(context: QueryContext): any {
  return {
    ...context,
    clarificationNeeded: false,
    refinementHistory: [],
    preferences: {}
  };
}

// Import tools registry
import TOOL_REGISTRY, { getToolByName } from '../tools';

// Import data loader
import { getOriginalDataset } from '../data/loader';

/**
 * Request body schema for query endpoint
 */
const querySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(500, 'Query too long'),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
  context: z.object({
    sessionId: z.string().optional(),
    previousQueries: z.array(z.string()).optional(),
    userPreferences: z.record(z.string(), z.any()).optional()
  }).optional(),
  options: z.object({
    useLLM: z.boolean().optional().default(true),
    maxIterations: z.number().min(1).max(20).optional().default(config.MAX_ITERATIONS),
    confidenceThreshold: z.number().min(0).max(1).optional().default(config.CONFIDENCE_THRESHOLD),
    includeReasoning: z.boolean().optional().default(config.ENABLE_REASONING_EXPLANATION),
    verbosity: z.enum(['concise', 'standard', 'detailed']).optional().default('standard'),
    format: z.enum(['json', 'markdown', 'html']).optional().default('json')
  }).optional()
});

/**
 * Query request type
 */
type QueryRequest = z.infer<typeof querySchema>;

/**
 * Query response type
 */
interface QueryResponse {
  success: boolean;
  results: any[];
  total: number;
  reasoning?: any;
  summary: string;
  confidence: number;
  disambiguationOptions?: any;
  sessionId: string;
  metadata: {
    query: string;
    intent: string;
    iterations: number;
    executionTime: number;
    toolsUsed: string[];
    timestamp: Date;
    warnings?: string[];
    errors?: string[];
  };
}

/**
 * Main query handler with full AI reasoning orchestration
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

    // Initialize agent state
    let state = StateManager.createInitialState(query);

    // Initialize query context
    let queryContext: QueryContext = {
      originalQuery: query,
      interpretedIntent: '',
      extractedEntities: {},
      constraints: {},
      ambiguities: [],
      clarificationHistory: [],
      sessionId
    };

    console.log(`[${sessionId}] Starting query processing: "${query}"`);

    // Main agentic loop
    const maxIterations = options?.maxIterations || config.MAX_ITERATIONS;
    let iterationCount = 0;
    let shouldContinue = true;
    let lastClarificationRequest: ClarificationRequest | null = null;

    // Register all tools with executor
    const toolNames = Object.keys(TOOL_REGISTRY);
    for (const toolName of toolNames) {
      const toolRegistryEntry = TOOL_REGISTRY[toolName];
      if (toolRegistryEntry) {
        // Create a Tool object that matches what the executor expects
        const tool: Tool = {
          id: toolName,
          name: toolName,
          slug: toolName,
          description: toolRegistryEntry.metadata.description,
          tagline: toolRegistryEntry.metadata.description,
          createdBy: 'system',
          categories: {
            primary: [toolRegistryEntry.metadata.category],
            secondary: [],
            industries: [],
            userTypes: []
          },
          pricingSummary: {
            lowestMonthlyPrice: 0,
            highestMonthlyPrice: 0,
            currency: '$',
            hasFreeTier: true,
            hasCustomPricing: false,
            billingPeriods: ['monthly'],
            pricingModel: ['free']
          },
          searchKeywords: [],
          semanticTags: [],
          aliases: [],
          interface: [],
          functionality: [],
          deployment: [],
          popularity: 0,
          rating: 0,
          reviewCount: 0,
          status: 'active',
          contributor: 'system',
          dateAdded: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        ToolExecutor.registerTool(tool);
      }
    }

    while (shouldContinue && iterationCount < maxIterations) {
      iterationCount++;
      console.log(`[${sessionId}] Iteration ${iterationCount}/${maxIterations}`);

      try {
        // Phase 1: Detect ambiguities
        const ambiguities = AmbiguityDetector.detectAmbiguities(query, queryContext);
        queryContext.ambiguities = ambiguities;

        // Check if clarification is needed
        if (AmbiguityDetector.needsClarification(queryContext)) {
          console.log(`[${sessionId}] Clarification needed, generating request`);

          const clarificationRequest = AmbiguityDetector.generateClarificationRequest(
            ambiguities,
            query,
            queryContext
          );

          if (clarificationRequest) {
            lastClarificationRequest = clarificationRequest;

            // Return clarification request to user
            const response = {
              success: false,
              results: [],
              total: 0,
              reasoning: {
                phase: 'clarification',
                ambiguities: ambiguities.map(a => ({
                  type: a.type,
                  description: a.description,
                  severity: a.severity
                }))
              },
              summary: `Your query contains ambiguities that need clarification`,
              confidence: 0.3,
              disambiguationOptions: {
                question: clarificationRequest.question,
                options: clarificationRequest.options,
                priority: clarificationRequest.priority
              },
              sessionId,
              metadata: {
                query,
                intent: 'needs_clarification',
                iterations: iterationCount,
                executionTime: Date.now() - startTime,
                toolsUsed: [],
                timestamp: new Date(),
                warnings: ['Query clarification needed']
              }
            };

            return reply.status(200).send(response);
          }
        }

        // Phase 2: Plan next action
        let planningResult;

        if (options?.useLLM && config.OLLAMA_URL) {
          // Use LLM planner if available and enabled
          try {
            planningResult = await LLMPlanner.generatePlan({
              context: adaptQueryContextForPlanner(queryContext),
              state,
              availableTools: ToolExecutor.getRegisteredTools(),
              iteration: iterationCount,
              maxIterations,
              planningType: iterationCount === 1 ? 'initial' : 'iteration'
            });
          } catch (error) {
            console.warn(`[${sessionId}] LLM planner failed, falling back to rules-based:`, error);
            planningResult = await RulesBasedPlanner.planNextAction(adaptQueryContextForPlanner(queryContext), state);
          }
        } else {
          // Use rules-based planner
          planningResult = await RulesBasedPlanner.planNextAction(adaptQueryContextForPlanner(queryContext), state);
        }

        // Phase 3: Execute planned action
        const action = (planningResult as any).action || planningResult;
        console.log(`[${sessionId}] Planning result:`, JSON.stringify(planningResult, null, 2));
        console.log(`[${sessionId}] Action to execute:`, JSON.stringify(action, null, 2));

        if (!action) {
          console.log(`[${sessionId}] No action planned, completing`);
          state.isComplete = true;
          shouldContinue = false;
          break;
        }

        if (action.type === 'complete') {
          console.log(`[${sessionId}] Planner recommends completion`);
          state.isComplete = true;
          shouldContinue = false;
          break;
        }

        if (action.type === 'select_tool' && action.toolName) {
          console.log(`[${sessionId}] Executing tool: ${action.toolName}`);
          console.log(`[${sessionId}] Tool parameters:`, JSON.stringify(action.parameters, null, 2));

          const executionResult = await ToolExecutor.execute({
            toolName: action.toolName,
            parameters: action.parameters || {},
            context: queryContext,
            state,
            priority: 'medium',
            timeout: 30000
          });

          if (executionResult.success) {
            // Update state with execution results
            state = StateManager.updateStateWithResults(
              state,
              executionResult.data,
              action.toolName,
              executionResult.confidence,
              action.reasoning
            );

            console.log(`[${sessionId}] Tool execution successful: ${executionResult.data?.length || 0} results`);
          } else {
            console.error(`[${sessionId}] Tool execution failed:`, executionResult.error);

            // Add to state history but continue with error handling
            state.toolHistory = state.toolHistory || [];
            state.toolHistory.push({
              toolName: action.toolName,
              parameters: action.parameters || {},
              resultCount: 0,
              confidence: { score: 0.1, reasoning: 'Execution failed', timestamp: new Date() },
              reasoning: executionResult.error?.message || 'Unknown error',
              timestamp: new Date()
            });
          }
        }

        // Phase 4: Evaluate results
        const evaluationResult = await ResultEvaluator.evaluateResults(
          state,
          queryContext,
          mapVerbosity(options?.verbosity || 'standard')
        );

        console.log(`[${sessionId}] Evaluation score: ${evaluationResult.overallScore.toFixed(2)}, should continue: ${evaluationResult.shouldContinue}`);

        // Update state with evaluation
        state.currentConfidence = {
          score: evaluationResult.confidence,
          reasoning: evaluationResult.reasoning,
          timestamp: new Date()
        };

        // Determine if should continue
        shouldContinue = evaluationResult.shouldContinue &&
                        evaluationResult.overallScore >= (options?.confidenceThreshold || config.CONFIDENCE_THRESHOLD);

        // Apply pagination if we have results
        if (state.currentResults && state.currentResults.length > 0 && (limit || offset)) {
          const start = offset || 0;
          const end = start + (limit || 20);
          state.currentResults = state.currentResults.slice(start, end);
        }

      } catch (error) {
        console.error(`[${sessionId}] Error in iteration ${iterationCount}:`, error);

        // Add error to state but continue if possible
        state.metadata.hasError = true;
        state.metadata.lastError = error instanceof Error ? error.message : 'Unknown error';

        // If we have some results, we can continue; otherwise break
        if (!state.currentResults || state.currentResults.length === 0) {
          shouldContinue = false;
        }
      }
    }

    // Phase 5: Format response
    const evaluationResult = await ResultEvaluator.evaluateResults(
      state,
      queryContext,
      mapVerbosity(options?.verbosity || 'standard')
    );

    const formattedResponse = await ResponseFormatter.formatResponse(
      state,
      queryContext,
      evaluationResult,
      {
        includeReasoning: options?.includeReasoning ?? true,
        includeMetrics: true,
        includeConfidence: true,
        includeSuggestions: true,
        verbosity: options?.verbosity || 'standard',
        format: options?.format || 'json'
      }
    );

    const executionTime = Date.now() - startTime;

    // Final response
    const response: QueryResponse = {
      success: state.isComplete && !StateManager.hasError(state),
      results: formattedResponse.results,
      total: formattedResponse.results.length,
      reasoning: options?.includeReasoning ? formattedResponse.reasoning : undefined,
      summary: formattedResponse.summary,
      confidence: formattedResponse.confidence,
      sessionId,
      metadata: {
        query,
        intent: queryContext.interpretedIntent || 'unknown',
        iterations: iterationCount,
        executionTime,
        toolsUsed: formattedResponse.metrics.toolsUsed,
        timestamp: new Date(),
        warnings: formattedResponse.metadata.warnings,
        errors: formattedResponse.metadata.errors
      }
    };

    console.log(`[${sessionId}] Query processing completed in ${executionTime}ms, ${iterationCount} iterations`);

    return reply.status(200).send(response);

  } catch (error) {
    console.error('Query processing error:', error);

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
          errors: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        }
      });
    }

    return reply.status(500).send(errorResponse);
  }
};

/**
 * Handle clarification responses
 */
const clarificationHandler = async (
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { sessionId, selectedOption, userInput } = request.body as any;

    if (!sessionId || (!selectedOption && !userInput)) {
      return reply.status(400).send({
        success: false,
        error: 'Missing sessionId or response'
      });
    }

    // In a real implementation, we would:
    // 1. Retrieve the stored query context and state for this session
    // 2. Process the clarification response using AmbiguityDetector.processClarificationResponse
    // 3. Continue the agentic loop with the refined query

    console.log(`[${sessionId}] Received clarification response:`, { selectedOption, userInput });

    return reply.status(200).send({
      success: true,
      message: 'Clarification received, continuing search...',
      sessionId
    });

  } catch (error) {
    console.error('Clarification handling error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to process clarification'
    });
  }
};

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Health check endpoint
 */
const healthHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dataset = getOriginalDataset();
    const isLoaded = dataset && dataset.length > 0;

    return reply.status(200).send({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database: isLoaded ? 'connected' : 'disconnected',
        tools: Object.keys(TOOL_REGISTRY).length,
        ai: {
          ollama: config.OLLAMA_URL ? 'configured' : 'not_configured',
          reasoning: 'enabled'
        }
      },
      version: '1.0.0'
    });

  } catch (error) {
    return reply.status(500).send({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get tools information endpoint
 */
const toolsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const toolsInfo = Object.entries(TOOL_REGISTRY).map(([name, tool]) => ({
      name,
      category: tool.metadata.category,
      description: tool.metadata.description,
      parameters: tool.metadata.schema
    }));

    return reply.status(200).send({
      tools: toolsInfo,
      total: Object.keys(TOOL_REGISTRY).length,
      categories: [...new Set(Object.values(TOOL_REGISTRY).map(tool => tool.metadata.category))]
    });

  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve tools information'
    });
  }
};

// Route registration function
export const registerQueryRoutes = async (fastify: FastifyInstance) => {
  // POST /query endpoint
  fastify.post('/query', {
    schema: {
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', minLength: 1, maxLength: 500 },
          limit: { type: 'number', minimum: 1, maximum: 100 },
          offset: { type: 'number', minimum: 0 },
          context: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              previousQueries: { type: 'array', items: { type: 'string' } },
              userPreferences: { type: 'object' }
            }
          },
          options: {
            type: 'object',
            properties: {
              useLLM: { type: 'boolean' },
              maxIterations: { type: 'number', minimum: 1, maximum: 20 },
              confidenceThreshold: { type: 'number', minimum: 0, maximum: 1 },
              includeReasoning: { type: 'boolean' },
              verbosity: { enum: ['concise', 'standard', 'detailed'] },
              format: { enum: ['json', 'markdown', 'html'] }
            }
          }
        }
      }
    }
  }, queryHandler);

  // POST /clarification endpoint
  fastify.post('/clarification', {
    schema: {
      body: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: { type: 'string' },
          selectedOption: { type: 'string' },
          userInput: { type: 'string' }
        }
      }
    }
  }, clarificationHandler);

  // GET /health endpoint
  fastify.get('/health', {}, healthHandler);

  // GET /tools endpoint
  fastify.get('/tools', {}, toolsHandler);

  fastify.log.info('Query routes registered successfully');
};

export default registerQueryRoutes;
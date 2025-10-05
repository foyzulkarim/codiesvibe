/**
 * Query Route Handler with LangGraph Integration
 * Main orchestrator for the agentic search system using LangGraph
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, z } from 'zod';

// Import LangGraph components
import { searchWorkflow, createInitialState } from '../graph';

// Import tools registry and CustomToolExecutor
import TOOL_REGISTRY, { getToolByName } from '../tools';
import { CustomToolExecutor } from '../execution/custom-executor';

// Import data loader
import { getOriginalDataset } from '../data/loader';

// Import types
import config from '../config/agentic';

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
    graphExecutionPath?: string[];
  };
}

/**
 * Initialize all tools with the CustomToolExecutor
 */
function initializeToolsWithExecutor(): void {
  // The CustomToolExecutor will automatically register all tools from TOOL_REGISTRY
  CustomToolExecutor.initializeTools();
}

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

    console.log(`[${sessionId}] Starting LangGraph query processing: "${query}"`);

    // Register all tools with executor (only once)
    initializeToolsWithExecutor();

    // Initialize the graph state
    const initialState = createInitialState(query);
    
    // Add additional metadata
    initialState.metadata = {
      ...initialState.metadata,
      sessionId,
      maxIterations: options?.maxIterations || config.MAX_ITERATIONS,
      confidenceThreshold: options?.confidenceThreshold || config.CONFIDENCE_THRESHOLD,
      includeReasoning: options?.includeReasoning ?? config.ENABLE_REASONING_EXPLANATION,
      verbosity: options?.verbosity || 'standard',
      format: options?.format || 'json',
      useLLM: options?.useLLM ?? true
    };

    // Run the workflow
    console.log(`🔥[${sessionId}] INVOKING LANGGRAPH WORKFLOW`);
    console.log(`🔥[${sessionId}] Initial state:`, JSON.stringify(initialState, null, 2));

    const result = await searchWorkflow.invoke(initialState);

    console.log(`🔥[${sessionId}] WORKFLOW COMPLETED`);
    console.log(`🔥[${sessionId}] Final result:`, JSON.stringify(result, null, 2));

    // Parse the response
    let response: QueryResponse;
    
    if (result.response) {
      // Parse the JSON response
      const responseData = JSON.parse(result.response);
      
      // Apply pagination if needed
      if (responseData.results && (limit || offset)) {
        const start = offset || 0;
        const end = start + (limit || 20);
        responseData.results = responseData.results.slice(start, end);
        responseData.total = responseData.results.length;
      }

      const executionTime = Date.now() - startTime;

      // Create the final response
      response = {
        success: responseData.success || true,
        results: responseData.results || [],
        total: responseData.total || responseData.results?.length || 0,
        reasoning: options?.includeReasoning ? responseData.reasoning : undefined,
        summary: responseData.summary || 'Query processed',
        confidence: responseData.confidence || 0.5,
        disambiguationOptions: responseData.disambiguationOptions,
        sessionId,
        metadata: {
          query,
          intent: responseData.metadata?.intent || 'unknown',
          iterations: result.metadata?.iterationCount || 0,
          executionTime,
          toolsUsed: responseData.metadata?.toolsUsed || [],
          timestamp: new Date(),
          warnings: responseData.metadata?.warnings,
          errors: responseData.metadata?.errors,
          graphExecutionPath: result.metadata?.executionPath || []
        }
      };
    } else if (result.error) {
      // Handle error case
      const executionTime = Date.now() - startTime;
      
      response = {
        success: false,
        results: [],
        total: 0,
        summary: 'An error occurred while processing your query',
        confidence: 0,
        sessionId,
        metadata: {
          query,
          intent: 'error',
          iterations: result.metadata?.iterationCount || 0,
          executionTime,
          toolsUsed: [],
          timestamp: new Date(),
          errors: [result.error],
          graphExecutionPath: result.metadata?.executionPath || []
        }
      };
    } else {
      // Handle unexpected case
      const executionTime = Date.now() - startTime;
      
      response = {
        success: false,
        results: [],
        total: 0,
        summary: 'An unexpected error occurred while processing your query',
        confidence: 0,
        sessionId,
        metadata: {
          query,
          intent: 'error',
          iterations: result.metadata?.iterationCount || 0,
          executionTime,
          toolsUsed: [],
          timestamp: new Date(),
          errors: ['No response or error returned from workflow'],
          graphExecutionPath: result.metadata?.executionPath || []
        }
      };
    }

    console.log(`[${sessionId}] LangGraph query processing completed in ${response.metadata.executionTime}ms, ${response.metadata.iterations} iterations`);

    return reply.status(200).send(response);

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
          reasoning: 'enabled',
          langgraph: 'enabled'
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

  // LLM health check endpoint
  fastify.get('/health/llm', {}, async (_, reply) => {
    try {
      const { default: LLMService } = await import('../services/llm-service');
      const healthStatus = await LLMService.healthCheck();

      return reply.send({
        service: 'LLM',
        status: healthStatus.connected ? 'healthy' : 'unhealthy',
        details: healthStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ LLM health check failed:', error);
      return reply.status(500).send({
        service: 'LLM',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test LLM endpoint
  fastify.post('/test/llm', {}, async (request, reply) => {
    try {
      const { query } = request.body as { query?: string };
      const testQuery = query || 'What are some AI tools for productivity?';

      const { default: LLMService } = await import('../services/llm-service');
      const response = await LLMService.callLLM(
        `Analyze this query for AI tool search: "${testQuery}"`,
        `You are an AI assistant that helps analyze user queries for searching AI tools database.
Provide a JSON response with:
- intent: the main intent
- keywords: extracted keywords
- category: suggested tool category
- confidence: confidence level (0-1)`
      );

      return reply.send({
        success: true,
        query: testQuery,
        response,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ LLM test failed:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  fastify.log.info('LangGraph query routes registered successfully');
};

export default registerQueryRoutes;

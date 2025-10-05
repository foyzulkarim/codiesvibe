/**
 * Simplified Query Route Handler for Working Build
 * Basic search functionality without full AI reasoning components
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, z } from 'zod';

// Import only the working components
import { getOriginalDataset } from '../data/loader';
import { Tool } from '../types';
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
    includeReasoning: z.boolean().optional().default(true),
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
  results: Tool[];
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
 * Generate session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Simple text search function
 */
function simpleTextSearch(dataset: Tool[], query: string, limit: number, offset: number): {
  results: Tool[];
  total: number;
} {
  const lowercaseQuery = query.toLowerCase();
  const filtered = dataset.filter(tool =>
    tool.name.toLowerCase().includes(lowercaseQuery) ||
    tool.description.toLowerCase().includes(lowercaseQuery) ||
    tool.searchKeywords.some(keyword => keyword.toLowerCase().includes(lowercaseQuery)) ||
    tool.categories.primary.some(cat => cat.toLowerCase().includes(lowercaseQuery))
  );

  const total = filtered.length;
  const results = filtered.slice(offset, offset + limit);

  return { results, total };
}

/**
 * Main query handler
 */
const queryHandler = async (
  request: FastifyRequest<{ Body: QueryRequest }>,
  reply: FastifyReply
): Promise<void> => {
  const startTime = Date.now();
  const sessionId = generateSessionId();

  try {
    const { query, limit = 20, offset = 0, options } = request.body;

    console.log(`[${sessionId}] Starting query processing: "${query}"`);

    // Get dataset
    const dataset = getOriginalDataset();
    if (!dataset || dataset.length === 0) {
      return reply.status(503).send({
        success: false,
        results: [],
        total: 0,
        summary: 'Dataset not loaded',
        confidence: 0,
        sessionId,
        metadata: {
          query,
          intent: 'error',
          iterations: 0,
          executionTime: Date.now() - startTime,
          toolsUsed: [],
          timestamp: new Date(),
          errors: ['Dataset not available']
        }
      });
    }

    // Perform simple search
    const { results, total } = simpleTextSearch(dataset, query, limit, offset);

    const executionTime = Date.now() - startTime;

    // Build response
    const response: QueryResponse = {
      success: true,
      results,
      total,
      summary: `Found ${total} tools matching "${query}"`,
      confidence: 0.8,
      sessionId,
      metadata: {
        query,
        intent: 'search',
        iterations: 1,
        executionTime,
        toolsUsed: ['text-search'],
        timestamp: new Date()
      }
    };

    // Add reasoning if requested
    if (options?.includeReasoning) {
      response.reasoning = {
        steps: [
          {
            step: 1,
            action: 'text-search',
            reasoning: `Performed text search across tool names, descriptions, and keywords`,
            confidence: 0.8,
            timestamp: new Date().toISOString()
          }
        ],
        confidence: 0.8,
        factors: ['Text matching', 'Keyword relevance'],
        timestamp: new Date()
      };
    }

    console.log(`[${sessionId}] Query processing completed in ${executionTime}ms, ${total} results`);

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
 * Health check handler
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
        tools: 27, // Fixed number for now
        ai: {
          ollama: config.OLLAMA_URL ? 'configured' : 'not_configured',
          reasoning: 'simplified'
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
 * Tools info handler
 */
const toolsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dataset = getOriginalDataset();
    const categories = [...new Set(dataset.flatMap(tool => tool.categories.primary))];

    return reply.status(200).send({
      tools: [{
        name: 'text-search',
        category: 'search',
        description: 'Simple text-based search across tool names and descriptions',
        parameters: { query: 'string', limit: 'number', offset: 'number' }
      }],
      total: 1,
      categories: categories.slice(0, 10), // Limit to first 10 categories
      datasetSize: dataset.length
    });

  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Register query routes
 */
export default async function queryRoutes(fastify: FastifyInstance): Promise<void> {
  // Main query endpoint
  fastify.post('/query', queryHandler);

  
  // Tools info endpoint
  fastify.get('/tools', toolsHandler);
}
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { mcpClient } from './src/mcp';
import { SimpleLangGraphAgent } from './src/langchain';
import { logger, errorHandler, asyncHandler, validateRequest } from './src/utils';

const fastify = Fastify({
  logger: logger,
  disableRequestLogging: false
});

// Global agent instance
let agent: SimpleLangGraphAgent | null = null;

// Register error handler
fastify.setErrorHandler(errorHandler);

// CORS configuration
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
});

// Request logging hook
fastify.addHook('onRequest', async (request, reply) => {
  request.log.info(`Incoming request: ${request.method} ${request.url}`);
});

// Response logging hook
fastify.addHook('onSend', async (request, reply, payload) => {
  const responseTime = reply.getResponseTime();
  request.log.info(`Response sent: ${reply.statusCode} in ${responseTime}ms`);
});

// Health check endpoint
fastify.get('/health', asyncHandler(async (request, reply) => {
  const mcpStatus = mcpClient.getStatus();
  const agentStatus = agent?.getStatus() || { initialized: false, toolCount: 0, tools: [], llmConfig: {} };
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'fastify-api',
    version: '1.0.0',
    port: process.env.PORT || 4002,
    dependencies: {
      mcp: {
        connected: mcpStatus.connected,
        toolCount: mcpStatus.toolCount,
        baseUrl: mcpStatus.baseUrl,
        circuitBreaker: mcpStatus.circuitBreakerState
      },
      agent: {
        initialized: agentStatus.initialized,
        toolCount: agentStatus.toolCount,
        llmConfig: agentStatus.llmConfig
      }
    }
  };
}));// Service information endpoint
fastify.get('/info', asyncHandler(async (request, reply) => {
  const agentStatus = agent?.getStatus() || { initialized: false, toolCount: 0, tools: [], llmConfig: {} };
  
  return {
    service: 'Fastify API with LangGraph & MongoDB MCP',
    description: 'AI-powered API service with database tools via MCP',
    version: '1.0.0',
    endpoints: [
      'GET /health - Health check with dependency status',
      'GET /info - Service information and configuration',
      'GET /api/tools - List available tools with schemas',
      'POST /api/query - Process AI queries with tool execution'
    ],
    agent: agentStatus,
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 4002,
      mcpServerUrl: process.env.MCP_SERVER_URL || 'http://localhost:3001',
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
      logLevel: process.env.LOG_LEVEL || 'info'
    }
  };
}));

// API Routes

// Get available tools
fastify.get('/api/tools', asyncHandler(async (request, reply) => {
  if (!agent) {
    return reply.code(503).send({
      error: 'ServiceUnavailable',
      message: 'The AI agent is not initialized. Please try again later.',
      statusCode: 503,
      timestamp: new Date().toISOString()
    });
  }
  
  const tools = agent.getAvailableTools();
  const mcpTools = mcpClient.getAvailableTools();
  
  return {
    success: true,
    data: {
      langchainTools: tools,
      mcpTools: mcpTools,
      totalCount: tools.length,
      mcpToolCount: mcpTools.length
    },
    timestamp: new Date().toISOString()
  };
}));// Process AI query with tools
fastify.post('/api/query', asyncHandler(async (request, reply) => {
  // Validate request body
  validateRequest(request.body, ['query']);
  
  const { query } = request.body as { query: string };
  
  if (typeof query !== 'string' || query.trim().length === 0) {
    return reply.code(400).send({
      error: 'ValidationError',
      message: 'Query must be a non-empty string',
      statusCode: 400,
      timestamp: new Date().toISOString(),
      path: request.url
    });
  }
  
  if (query.length > 1000) {
    return reply.code(400).send({
      error: 'ValidationError',
      message: 'Query must be less than 1000 characters',
      statusCode: 400,
      timestamp: new Date().toISOString(),
      path: request.url
    });
  }
  
  if (!agent) {
    return reply.code(503).send({
      error: 'ServiceUnavailable',
      message: 'The AI agent is not initialized. Please try again later.',
      statusCode: 503,
      timestamp: new Date().toISOString(),
      path: request.url
    });
  }
  
  logger.info(`Processing query from ${request.ip}: ${query}`);
  
  const startTime = Date.now();
  const result = await agent.processQuery(query.trim());
  const processingTime = Date.now() - startTime;
  
  const response = {
    success: true,
    data: {
      query: query.trim(),
      result: result.result,
      toolCalls: result.toolCalls || [],
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    },
    ...(result.error && { 
      warning: result.error,
      partialFailure: true 
    })
  };
  
  logger.info(`Query processed successfully in ${processingTime}ms`, {
    toolCallCount: result.toolCalls?.length || 0,
    hasError: !!result.error,
    responseLength: result.result.length
  });
  
  return response;
}));// Initialize services and start server
async function startServer() {
  try {
    logger.info('🚀 Starting Fastify API server...');
    
    // Initialize MCP client
    logger.info('Initializing MCP client...');
    await mcpClient.connect();
    logger.info(`✅ MCP client connected with ${mcpClient.getAvailableTools().length} tools`);
    
    // Initialize LangGraph agent
    logger.info('Initializing LangGraph agent...');
    agent = new SimpleLangGraphAgent();
    await agent.initialize();
    logger.info(`✅ LangGraph agent initialized with ${agent.getAvailableTools().length} tools`);
    
    // Start Fastify server
    const port = parseInt(process.env.PORT || '4002');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    logger.info(`🎉 Fastify API server running on http://${host}:${port}`);
    logger.info('📋 Available endpoints:');
    logger.info('  - GET /health - Health check');
    logger.info('  - GET /info - Service information');
    logger.info('  - GET /api/tools - List available tools');
    logger.info('  - POST /api/query - Process AI queries');
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
  logger.info(`📡 Received ${signal}, shutting down gracefully...`);
  
  try {
    // Stop accepting new requests
    await fastify.close();
    logger.info('✅ HTTP server closed');
    
    // Disconnect MCP client
    if (mcpClient) {
      mcpClient.disconnect();
      logger.info('✅ MCP client disconnected');
    }
    
    // Reset agent
    agent = null;
    logger.info('✅ Agent cleaned up');
    
    logger.info('🏁 Server shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
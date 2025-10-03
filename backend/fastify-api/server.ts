import "dotenv/config";
import fastify from "fastify";
import cors from "@fastify/cors";
import { mcpClient } from "./src/mcp";
import { SimpleLangGraphAgent } from "./src/langchain";
import {
  logger,
  errorHandler,
  asyncHandler,
  validateRequest,
} from "./src/utils";

const app = fastify({
  logger: logger,
  disableRequestLogging: false,
});

// Global agent instance
let agent: SimpleLangGraphAgent | null = null;

// Error handler
app.setErrorHandler(errorHandler);

// CORS configuration
app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
});

// Request logging hook
app.addHook("onRequest", async (request, reply) => {
  request.log.info({ url: request.url, method: request.method }, "Request");
});

// Response logging hook
app.addHook("onSend", async (request, reply, payload) => {
  request.log.info({ statusCode: reply.statusCode }, "Response");
});

// Health check endpoint
app.get(
  "/health",
  asyncHandler(async (request, reply) => {
    try {
      // Check MCP client connection
      const mcpStatus = mcpClient.isClientConnected() ? "connected" : "disconnected";

      // Check agent status
      const agentStatus = agent ? "initialized" : "not_initialized";

      // Basic system checks
      const systemChecks = {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
        uptime: process.uptime(),
        nodeVersion: process.version,
      };

      const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          mcp: mcpStatus,
          agent: agentStatus,
        },
        system: systemChecks,
      };

      reply.code(200).send(healthStatus);
    } catch (error) {
      request.log.error(error, "Health check failed");
      reply.code(503).send({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
); // Added semicolon

// Server info endpoint
app.get(
  "/info",
  asyncHandler(async (request, reply) => {
    const info = {
      name: "Fastify LangGraph API",
      version: "1.0.0",
      description: "AI agent API with LangGraph and MongoDB MCP integration",
      endpoints: {
        health: "/health",
        info: "/info",
        tools: "/api/tools",
        query: "/api/query",
      },
      features: [
        "LangGraph AI Agent",
        "MongoDB MCP Integration",
        "Tool Management",
        "Query Processing",
        "Health Monitoring",
      ],
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    reply.send(info);
  }),
); // Added semicolon

// Get available tools
// Tools endpoint
app.get(
  "/api/tools",
  asyncHandler(async (request, reply) => {
    try {
      request.log.info("[API] /api/tools endpoint called");
      
      if (!mcpClient.isClientConnected()) {
        request.log.warn("[API] MCP client not connected");
        reply.code(503).send({
          error: "MCP client not connected",
          message: "Please ensure MCP server is running and accessible",
        });
        return;
      }

      request.log.info("[API] MCP client is connected, fetching tools...");
      const tools = await mcpClient.getAvailableTools();
      request.log.info(`[API] Retrieved ${tools.length} tools from MCP client`);
      
      if (tools.length === 0) {
        request.log.warn("[API] No tools returned from MCP client");
      } else {
        request.log.debug("[API] Tool names:", tools.map(t => t.name));
      }

      reply.send({
        tools,
        count: tools.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error(error, "Failed to fetch tools");
      reply.code(500).send({
        error: "Failed to fetch tools",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
); // Added semicolon

// Query endpoint
app.post(
  "/api/query",
  asyncHandler(async (request, reply) => {
    try {
      // Validate request body
      validateRequest(request.body, ["query"]);

      const { query, context = {}, options = {} } = request.body as any;

      // Initialize agent if not already done
      if (!agent) {
        request.log.info("Initializing LangGraph agent...");
        agent = new SimpleLangGraphAgent();
        await agent.initialize();
        request.log.info("Agent initialized successfully");
      }

      // Process the query
      request.log.info({ query, context }, "Processing query");
      const startTime = Date.now();

      const result = await agent.processQuery(query, {
        ...context,
        requestId: request.id,
        timestamp: new Date().toISOString(),
        ...options,
      });

      const processingTime = Date.now() - startTime;

      // Log the result
      request.log.info(
        {
          query,
          processingTime,
          resultLength: JSON.stringify(result).length,
        },
        "Query processed successfully",
      );

      reply.send({
        success: true,
        query,
        result,
        metadata: {
          processingTime,
          timestamp: new Date().toISOString(),
          requestId: request.id,
        },
      });
    } catch (error) {
      request.log.error(error, "Query processing failed");
      reply.code(500).send({
        error: "Query processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
        query: (request.body as any)?.query,
      });
    }
  }),
); // Added semicolon

// Server startup
async function startServer() {
  try {
    // Initialize MCP client
    logger.info("Initializing MCP client...");
    await mcpClient.connect();
    logger.info("MCP client connected successfully");

    // Start the server
    const port = parseInt(process.env.PORT || "4002", 10);
    const host = process.env.HOST || "0.0.0.0";

    logger.info(`Starting server on ${host}:${port}...`);
    await app.listen({ port, host });
    logger.info(`Server running on http://${host}:${port}`);

    // Log available endpoints
    logger.info("Available endpoints:");
    logger.info("  GET  /health - Health check");
    logger.info("  GET  /info - Server information");
    logger.info("  GET  /api/tools - List available tools");
    logger.info("  POST /api/query - Process AI queries");
  } catch (error) {
    logger.error(error, "Failed to start server");
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Close Fastify server
    await app.close();
    logger.info("Fastify server closed");

    // Disconnect MCP client
    if (mcpClient.isClientConnected()) {
      await mcpClient.disconnect();
      logger.info("MCP client disconnected");
    }

    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error(error, "Error during graceful shutdown");
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.fatal(error, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.fatal({ reason, promise }, "Unhandled rejection");
  process.exit(1);
});

// Start the server
startServer();
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import config from './config/agentic';
import { HealthResponse } from './types';
import { registerQueryRoutes } from './routes/query-langgraph'; // Updated to use LangGraph routes
import { connect, loadAll, getStats, disconnect } from './data/loader';

// Import the LangGraph workflow to initialize it
import './graph/workflow';

// Server startup time for uptime calculation
const serverStartTime = Date.now();

// Create Fastify instance with logger
const fastify: FastifyInstance = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Register CORS plugin
fastify.register(cors, {
  origin: true, // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Register query routes (now using LangGraph)
fastify.register(registerQueryRoutes);

// Health check route is now handled in query-langgraph.ts to avoid duplication

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  try {
    await disconnect(); // Close MongoDB connection
    await fastify.close();
    process.exit(0);
  } catch (error) {
    fastify.log.error(`Error during shutdown: ${error}`);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server function
const start = async (): Promise<void> => {
  try {
    fastify.log.info('Starting Fastify server with LangGraph integration...');
    fastify.log.info(`Configuration loaded: PORT=${config.PORT}`);
    
    // Connect to MongoDB and load dataset
    fastify.log.info('🔌 Connecting to MongoDB...');
    await connect();
    
    fastify.log.info('📥 Loading dataset into memory...');
    await loadAll();
    
    const stats = getStats();
    fastify.log.info(`✅ Dataset loaded: ${stats.count} documents`);
    
    // Start the server
    await fastify.listen({ 
      port: config.PORT, 
      host: '0.0.0.0' 
    });
    
    fastify.log.info(`🚀 Server running on http://localhost:${config.PORT}`);
    fastify.log.info(`📊 Health check available at http://localhost:${config.PORT}/health`);
    fastify.log.info(`📊 Dataset: ${stats.count} documents loaded`);
    fastify.log.info(`🔄 LangGraph workflow initialized and ready`);
    
  } catch (error) {
    fastify.log.error(`Error starting server: ${error}`);
    process.exit(1);
  }
};

// Export for testing and external use
export { fastify };

// Start server if this file is run directly
if (require.main === module) {
  start();
}

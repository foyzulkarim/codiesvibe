/**
 * Search API Server
 *
 * LangGraph-based AI search service for intelligent tool discovery
 * Refactored for better maintainability and separation of concerns
 */

// Note: dotenv is loaded automatically by env.config.ts when CONFIG is first imported
// This ensures env vars are available regardless of import order

import express from 'express';
import { mkdirSync } from 'fs';
import { validateEnvironment } from './utils/env-validator.js';
import {
  setupCoreMiddleware,
  setupSecurityMiddleware,
  setupParsingMiddleware,
  setupAuthMiddleware
} from './middleware/setup.middleware.js';
import { setupSwaggerDocs } from './docs/swagger.setup.js';
import { initializeServer } from './startup/server.startup.js';
import { searchLogger } from './config/logger.js';
import { CONFIG } from '#config/env.config.js';
import { validateCorsConfiguration } from './config/cors.config.js';

// Route imports
import searchRoutes from './routes/search.routes.js';
import toolsRoutes from './routes/tools.routes.js';
import syncRoutes from './routes/sync.routes.js';
import healthRoutes from './routes/health.routes.js';

// Validate critical environment variables
validateEnvironment();

// Validate CORS configuration specifically
validateCorsConfiguration();

// Create Express application
const app = express();

// Create logs directory if it doesn't exist
try {
  mkdirSync('logs');
} catch {
  // Directory already exists
}

// Setup middleware layers
setupCoreMiddleware(app);        // Correlation, metrics, compression, CORS
setupSecurityMiddleware(app);    // Helmet, sanitization, HPP, timeout, rate limiting
setupParsingMiddleware(app);     // JSON and URL-encoded parsing

// Setup authentication
setupAuthMiddleware(app);

// Mount routes
app.use('/', healthRoutes);
searchLogger.info('✅ Health check routes mounted', {
  service: 'search-api',
  endpoints: ['/health', '/health/live', '/health/ready', '/health/circuit-breakers', '/metrics'],
});

app.use('/api', searchRoutes);
searchLogger.info('✅ Search routes mounted at /api', {
  service: 'search-api',
  endpoints: ['POST /api/search'],
});

app.use('/api/tools', toolsRoutes);
searchLogger.info('✅ Tools CRUD routes mounted at /api/tools', {
  service: 'search-api',
  endpoints: [
    'GET /api/tools',
    'GET /api/tools/:id',
    'POST /api/tools (protected)',
    'PATCH /api/tools/:id (protected)',
    'DELETE /api/tools/:id (protected)',
    'GET /api/tools/vocabularies'
  ],
});

app.use('/api/sync', syncRoutes);
searchLogger.info('✅ Sync admin routes mounted at /api/sync', {
  service: 'search-api',
  endpoints: [
    'GET /api/sync/status (admin)',
    'GET /api/sync/stats (admin)',
    'GET /api/sync/worker (admin)',
    'POST /api/sync/sweep (admin)',
    'POST /api/sync/retry/:toolId (admin)',
    'POST /api/sync/retry-all (admin)',
    'GET /api/sync/failed (admin)',
    'GET /api/sync/pending (admin)',
  ],
});

// Error handling middleware (must be last)
import { errorHandler } from './middleware/error-handler.middleware.js';
app.use(errorHandler);
searchLogger.info('✅ Error handler middleware registered', {
  service: 'search-api',
});

// Server configuration
const PORT = CONFIG.server.PORT;

/**
 * Start the server and initialize all components
 */
async function startServer() {
  // Setup API documentation before starting server
  await setupSwaggerDocs(app);

  const server = app.listen(PORT, () => {
    searchLogger.info('🚀 Search API server started successfully', {
      service: 'search-api',
      port: PORT,
      environment: CONFIG.env.NODE_ENV
    });
    searchLogger.info('📍 Server endpoints available', {
      service: 'search-api',
      serverUrl: `http://localhost:${PORT}`,
      healthUrl: `http://localhost:${PORT}/health`,
      healthLiveUrl: `http://localhost:${PORT}/health/live`,
      healthReadyUrl: `http://localhost:${PORT}/health/ready`,
      metricsUrl: `http://localhost:${PORT}/metrics`,
      apiDocsUrl: `http://localhost:${PORT}/api-docs`,
      openAPIJsonUrl: `http://localhost:${PORT}/api-docs/openapi.json`,
      openAPIYamlUrl: `http://localhost:${PORT}/api-docs/openapi.yaml`,
      searchUrl: `http://localhost:${PORT}/api/search`
    });
  });

  // Initialize server components (database, health checks, graceful shutdown, sync worker)
  await initializeServer(server);
}

// Start the server
startServer().catch(error => {
  searchLogger.error('💥 Failed to start server', error, { service: 'search-api' });
  process.exit(1);
});

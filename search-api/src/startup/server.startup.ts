/**
 * Server Startup Logic
 *
 * Handles server initialization including database connections,
 * health check registration, and graceful shutdown setup
 */

import { Server } from 'http';
import { searchLogger } from '../config/logger.js';
import { healthCheckService } from '../services/health-check.service.js';
import { gracefulShutdown } from '../services/graceful-shutdown.service.js';
import { syncWorkerService } from '../services/sync-worker.service.js';
import { circuitBreakerManager } from '../services/circuit-breaker.service.js';
import { qdrantService } from '../services/qdrant.service.js';
import { getMongoClient, getQdrantClient, connectToMongoDB, mongoConfig } from '../config/database.js';
import { destroyHttpAgents } from '../config/http-client.js';
import { CONFIG } from '#config/env.config';

/**
 * Connect to MongoDB database
 */
async function connectDatabase(): Promise<void> {
  searchLogger.info('🔄 Connecting to MongoDB...', {
    service: 'search-api',
    database: mongoConfig.dbName,
    uri: mongoConfig.uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')
  });

  try {
    await connectToMongoDB();
    searchLogger.info('✅ Connected to MongoDB database', {
      service: 'search-api',
      database: mongoConfig.dbName,
      uri: mongoConfig.uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')
    });
  } catch (error) {
    searchLogger.error('❌ Failed to connect to MongoDB', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
      database: mongoConfig.dbName,
    });
    throw error;
  }
}

/**
 * Register database clients with health check service
 */
async function registerHealthChecks(): Promise<void> {
  const mongoClient = getMongoClient();

  if (mongoClient) {
    healthCheckService.setMongoClient(mongoClient);
    searchLogger.info('✅ MongoDB client registered with health check service', {
      service: 'search-api',
      database: CONFIG.database.MONGODB_DB_NAME,
      uri: CONFIG.database.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')
    });
  } else {
    searchLogger.warn('⚠️  MongoDB client not available for health checks', {
      service: 'search-api',
    });
  }

  // Try to initialize Qdrant client
  try {
    searchLogger.info('🔄 Initializing Qdrant client...', {
      service: 'search-api',
    });

    // STEP 1: Explicitly initialize the qdrantService singleton
    await qdrantService.initialize();

    // STEP 2: Verify initialization succeeded
    if (!qdrantService.isReady()) {
      throw new Error('Qdrant service initialization failed: client not ready');
    }

    // STEP 3: Get client for health check registration
    const qdrantClient = getQdrantClient();

    if (!qdrantClient) {
      throw new Error('Qdrant client is null after initialization');
    }

    // STEP 4: Register client with health check service
    healthCheckService.setQdrantClient(qdrantClient);
    searchLogger.info('✅ Qdrant client initialized and registered', {
      service: 'search-api',
    });

    // STEP 5: Create all 4 collections (idempotent)
    searchLogger.info('🔧 Ensuring Qdrant collections exist...', {
      service: 'search-api',
      requiredCollections: ['tools', 'functionality', 'usecases', 'interface'],
    });

    const results = await qdrantService.createMultiCollections();
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    // STEP 6: Fail-fast if any collections failed to create
    if (failedCount > 0) {
      const failedCollections = results
        .filter(r => !r.success)
        .map(r => `${r.collection}: ${r.error || 'unknown error'}`);

      throw new Error(
        `Failed to create ${failedCount} collection(s):\n  - ${failedCollections.join('\n  - ')}`
      );
    }

    // STEP 7: Log success with details
    const createdCollections = results
      .filter(r => r.message?.includes('created'))
      .map(r => r.collection);
    const existingCollections = results
      .filter(r => r.message?.includes('exists'))
      .map(r => r.collection);

    searchLogger.info(`✅ Qdrant collections ready: ${successCount}/4 initialized`, {
      service: 'search-api',
      created: createdCollections.length > 0 ? createdCollections : undefined,
      existing: existingCollections.length > 0 ? existingCollections : undefined,
    });

  } catch (error) {
    // Log detailed error
    searchLogger.error(
      '❌ Failed to initialize Qdrant (server startup aborted)',
      error as Error,
      {
        service: 'search-api',
        phase: 'qdrant-initialization',
        note: 'Qdrant collections are required for search functionality',
        troubleshooting: [
          'Check QDRANT_URL/QDRANT_HOST/QDRANT_PORT environment variables',
          'Verify Qdrant server is running and accessible',
          'Check Qdrant server logs for errors',
        ],
      }
    );

    // Fail-fast: abort server startup
    throw error;
  }
}

/**
 * Setup graceful shutdown handlers
 */
async function setupGracefulShutdown(server: Server): Promise<void> {
  const mongoClient = getMongoClient();

  // Register server with graceful shutdown service
  gracefulShutdown.registerServer(server);
  if (mongoClient) {
    gracefulShutdown.registerMongoClient(mongoClient);
  }

  // Setup graceful shutdown handlers
  gracefulShutdown.setupHandlers({
    timeout: 30000, // 30 seconds timeout
    beforeShutdown: async () => {
      searchLogger.info('🔄 Executing beforeShutdown tasks', {
        service: 'search-api',
      });
      // Stop sync worker first to prevent new operations
      syncWorkerService.stop();
      searchLogger.info('🛑 Sync worker stopped', {
        service: 'search-api',
      });
      // Shutdown circuit breakers
      await circuitBreakerManager.shutdown();
    },
    afterShutdown: async () => {
      searchLogger.info('🔄 Executing afterShutdown tasks', {
        service: 'search-api',
      });
      // Destroy HTTP connection pool agents
      destroyHttpAgents();
    },
  });

  searchLogger.info('✅ Graceful shutdown handlers configured', {
    service: 'search-api',
    timeout: '30s',
    signals: ['SIGTERM', 'SIGINT'],
  });
}

/**
 * Initialize sync worker if enabled
 */
async function initializeSyncWorker(): Promise<void> {
  if (CONFIG.features.ENABLE_SYNC_WORKER) {
    syncWorkerService.start();
    searchLogger.info('✅ Sync worker started for background Qdrant synchronization', {
      service: 'search-api',
      workerStatus: syncWorkerService.getStatus(),
    });
  } else {
    searchLogger.info('⚠️  Sync worker disabled (set ENABLE_SYNC_WORKER=true to enable)', {
      service: 'search-api',
    });
  }
}

/**
 * Initialize server with all necessary components
 * @param server - HTTP server instance
 */
export async function initializeServer(server: Server): Promise<void> {
  await connectDatabase();
  await registerHealthChecks();
  await setupGracefulShutdown(server);
  await initializeSyncWorker();
}

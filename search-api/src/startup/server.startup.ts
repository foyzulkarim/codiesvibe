/**
 * Server Startup Logic
 *
 * Handles server initialization including database connections,
 * health check registration, and graceful shutdown setup
 */

import { Server } from 'http';
import { searchLogger } from '../config/logger.js';
import { healthCheckService } from '../services/infrastructure/health-check.service.js';
import { gracefulShutdown } from '../services/infrastructure/graceful-shutdown.service.js';
import { syncWorkerService } from '../services/sync/sync-worker.service.js';
import { circuitBreakerManager } from '../services/infrastructure/circuit-breaker.service.js';
import { qdrantService } from '../services/database/qdrant.service.js';
import { getMongoClient, getQdrantClient, connectToMongoDB, mongoConfig } from '../config/database.js';
import { CONFIG } from '#config/env.config';

/**
 * Connect to MongoDB database
 */
async function connectMongoDB(): Promise<void> {
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
 * Initialize Qdrant vector database connection
 */
async function connectQdrant(): Promise<void> {
  searchLogger.info('🔄 Connecting to Qdrant...', {
    service: 'search-api',
  });

  try {
    await qdrantService.initialize();

    if (!qdrantService.isReady()) {
      throw new Error('Qdrant service initialization failed: client not ready');
    }

    const qdrantClient = getQdrantClient();
    if (!qdrantClient) {
      throw new Error('Qdrant client is null after initialization');
    }

    searchLogger.info('✅ Connected to Qdrant database', {
      service: 'search-api',
    });
  } catch (error) {
    searchLogger.error(
      '❌ Failed to connect to Qdrant',
      error instanceof Error ? error : new Error('Unknown error'),
      {
        service: 'search-api',
        troubleshooting: [
          'Check QDRANT_URL/QDRANT_HOST/QDRANT_PORT environment variables',
          'Verify Qdrant server is running and accessible',
          'Check Qdrant server logs for errors',
        ],
      }
    );
    throw error;
  }
}

/**
 * Ensure all required Qdrant collections exist
 */
async function ensureQdrantCollections(): Promise<void> {
  const requiredCollections = ['tools', 'functionality', 'usecases', 'interface'];

  searchLogger.info('🔧 Ensuring Qdrant collections exist...', {
    service: 'search-api',
    requiredCollections,
  });

  try {
    const results = await qdrantService.createMultiCollections();
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    if (failedCount > 0) {
      const failedCollections = results
        .filter(r => !r.success)
        .map(r => `${r.collection}: ${r.error || 'unknown error'}`);

      throw new Error(
        `Failed to create ${failedCount} collection(s):\n  - ${failedCollections.join('\n  - ')}`
      );
    }

    const createdCollections = results
      .filter(r => r.message?.includes('created'))
      .map(r => r.collection);
    const existingCollections = results
      .filter(r => r.message?.includes('exists'))
      .map(r => r.collection);

    searchLogger.info(`✅ Qdrant collections ready: ${successCount}/${requiredCollections.length} initialized`, {
      service: 'search-api',
      created: createdCollections.length > 0 ? createdCollections : undefined,
      existing: existingCollections.length > 0 ? existingCollections : undefined,
    });
  } catch (error) {
    searchLogger.error(
      '❌ Failed to ensure Qdrant collections',
      error instanceof Error ? error : new Error('Unknown error'),
      {
        service: 'search-api',
        requiredCollections,
      }
    );
    throw error;
  }
}

/**
 * Register database clients with health check service
 */
async function registerHealthChecks(): Promise<void> {
  const mongoClient = getMongoClient();
  const qdrantClient = getQdrantClient();

  // Register MongoDB client
  if (mongoClient) {
    healthCheckService.setMongoClient(mongoClient);
    searchLogger.info('✅ MongoDB client registered with health check service', {
      service: 'search-api',
      database: CONFIG.database.MONGODB_DB_NAME,
    });
  } else {
    searchLogger.warn('⚠️  MongoDB client not available for health checks', {
      service: 'search-api',
    });
  }

  // Register Qdrant client
  if (qdrantClient) {
    healthCheckService.setQdrantClient(qdrantClient);
    searchLogger.info('✅ Qdrant client registered with health check service', {
      service: 'search-api',
    });
  } else {
    searchLogger.warn('⚠️  Qdrant client not available for health checks', {
      service: 'search-api',
    });
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
  // 1. Connect to databases
  await connectMongoDB();
  await connectQdrant();

  // 2. Setup infrastructure
  await ensureQdrantCollections();

  // 3. Register health monitoring
  await registerHealthChecks();

  // 4. Setup shutdown handlers
  await setupGracefulShutdown(server);

  // 5. Start background workers
  await initializeSyncWorker();
}

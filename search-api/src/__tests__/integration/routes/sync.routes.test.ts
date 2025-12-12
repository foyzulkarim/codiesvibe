/**
 * Sync Routes Integration Tests
 * End-to-end tests for the sync admin API endpoints
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearToolsCollection,
  createTestTool,
  getTestDb,
} from '../../test-utils/db-setup.js';

// Store reference to test database for the mock
let testDbReference: ReturnType<typeof getTestDb> | null = null;

// Mock the database module to use test database
jest.mock('../../../config/database', () => ({
  connectToMongoDB: jest.fn(async () => {
    if (!testDbReference) {
      throw new Error('Test database not initialized. Call setupTestDatabase first.');
    }
    return testDbReference;
  }),
  disconnectFromMongoDB: jest.fn(async () => {}),
  connectToQdrant: jest.fn(async () => null), // Return null to simulate no Qdrant connection in tests
  mongoConfig: {
    uri: 'mongodb://localhost:27017',
    dbName: 'test',
    options: {},
  },
  qdrantConfig: {
    url: null,
    host: 'localhost',
    port: 6333,
    apiKey: null,
    collectionName: 'tools',
  },
}));

// Mock the rate limiters module
jest.mock('../../../middleware/rate-limiters', () => ({
  toolsMutationLimiter: (req: any, res: any, next: any) => next(),
}));

// Mock Clerk authentication middleware
jest.mock('../../../middleware/clerk-auth.middleware', () => ({
  clerkRequireAuth: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }
    req.auth = {
      userId: 'user_admin123',
      sessionId: 'sess_test123456789',
    };
    next();
  },
  isClerkAuthenticated: (req: any): boolean => !!req.auth,
  ClerkAuthenticatedRequest: {},
}));

// Mock role middleware
jest.mock('../../../middleware/role.middleware', () => ({
  attachUserRole: (req: any, res: any, next: any) => {
    req.userRole = 'admin';
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => {
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'FORBIDDEN',
      });
    }
    next();
  },
  isAdmin: (req: any): boolean => req.userRole === 'admin',
  RoleAuthenticatedRequest: {},
}));

// Mock the sync services
jest.mock('../../../services/sync/sync-worker.service.js', () => ({
  syncWorkerService: {
    getSyncStats: jest.fn().mockResolvedValue({
      total: 100,
      synced: 80,
      pending: 15,
      failed: 5,
      byCollection: {
        tools: { synced: 80, pending: 15, failed: 5 },
        functionality: { synced: 85, pending: 10, failed: 5 },
        usecases: { synced: 90, pending: 5, failed: 5 },
        interface: { synced: 75, pending: 20, failed: 5 },
      },
    }),
    getStatus: jest.fn().mockReturnValue({
      isRunning: true,
      lastSweepAt: new Date().toISOString(),
      lastSweepDuration: 1500,
      processedCount: 50,
      successCount: 45,
      failedCount: 5,
      nextSweepAt: new Date(Date.now() + 60000).toISOString(),
      config: {
        sweepInterval: 60000,
        batchSize: 50,
        maxRetries: 5,
        baseBackoffDelay: 60000,
        maxBackoffDelay: 3600000,
        enabled: true,
      },
    }),
    triggerSweep: jest.fn().mockResolvedValue({
      processed: 10,
      succeeded: 8,
      failed: 2,
      skipped: 0,
      duration: 2000,
      errors: [],
    }),
    forceRetryTool: jest.fn().mockResolvedValue({ success: true }),
    forceRetryAllFailed: jest.fn().mockResolvedValue({
      processed: 5,
      succeeded: 4,
      failed: 1,
      errors: [],
    }),
    resetRetryCount: jest.fn().mockResolvedValue(true),
    markToolAsStale: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../../services/sync/tool-sync.service.js', () => ({
  toolSyncService: {
    syncTool: jest.fn().mockResolvedValue({
      success: true,
      collections: [],
      syncedCount: 4,
      failedCount: 0,
      skippedCount: 0,
      totalDuration: 100,
    }),
    syncToolToCollections: jest.fn().mockResolvedValue({
      success: true,
      collections: [],
      syncedCount: 4,
      failedCount: 0,
      skippedCount: 0,
      totalDuration: 100,
    }),
  },
}));

// Mock the logger
jest.mock('../../../config/logger.js', () => ({
  searchLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock correlation middleware
jest.mock('../../../middleware/correlation.middleware.js', () => ({
  SearchRequest: {},
  correlationMiddleware: (req: any, res: any, next: any) => {
    req.correlationId = 'test-correlation-id';
    next();
  },
}));

import syncRoutes from '../../../routes/sync.routes.js';
import { syncWorkerService } from '../../../services/sync/sync-worker.service.js';
import { toolSyncService } from '../../../services/sync/tool-sync.service.js';

describe('Sync Routes Integration Tests', () => {
  let app: Express;
  const mockAuthToken = 'mock-admin-token';

  const mockToolData = {
    id: 'test-tool',
    name: 'Test Tool',
    slug: 'test-tool',
    description: 'A test tool for testing purposes with enough chars',
    categories: ['AI', 'Development'],
    industries: ['Technology', 'Software Development'],
    userTypes: ['Developers', 'AI Engineers'],
    pricing: [{ tier: 'Free', billingPeriod: 'Monthly', price: 0 }],
    pricingModel: ['Free', 'Paid'] as ('Free' | 'Paid')[],
    interface: ['Web', 'API'],
    functionality: ['AI Chat', 'Code Generation'],
    deployment: ['Cloud'],
    status: 'active' as const,
    contributor: 'user_test123',
    approvalStatus: 'approved' as const,
    dateAdded: new Date(),
    syncMetadata: {
      overallStatus: 'synced' as const,
      collections: {
        tools: { status: 'synced' as const, retryCount: 0, vectorVersion: 1, contentHash: 'abc123' },
        functionality: { status: 'synced' as const, retryCount: 0, vectorVersion: 1, contentHash: 'def456' },
        usecases: { status: 'synced' as const, retryCount: 0, vectorVersion: 1, contentHash: 'ghi789' },
        interface: { status: 'synced' as const, retryCount: 0, vectorVersion: 1, contentHash: 'jkl012' },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeAll(async () => {
    await setupTestDatabase();

    // Set the test database reference for the mock
    testDbReference = getTestDb();

    app = express();
    app.use(express.json());
    app.use('/api/sync', syncRoutes);
  });

  afterAll(async () => {
    testDbReference = null;
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearToolsCollection();
    jest.clearAllMocks();
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================

  describe('Authentication', () => {
    it('should return 401 without authorization header', async () => {
      await request(app)
        .get('/api/sync/status')
        .expect(401);
    });

    it('should return 401 with invalid authorization format', async () => {
      await request(app)
        .get('/api/sync/status')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('should accept valid bearer token', async () => {
      await request(app)
        .get('/api/sync/status')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);
    });
  });

  // ============================================
  // STATUS ENDPOINTS
  // ============================================

  describe('GET /api/sync/status', () => {
    it('should return combined status and stats', async () => {
      const response = await request(app)
        .get('/api/sync/status')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('worker');
      expect(response.body.stats.total).toBe(100);
      expect(response.body.worker.isRunning).toBe(true);
    });
  });

  describe('GET /api/sync/stats', () => {
    it('should return detailed sync statistics', async () => {
      const response = await request(app)
        .get('/api/sync/stats')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.total).toBe(100);
      expect(response.body.synced).toBe(80);
      expect(response.body.pending).toBe(15);
      expect(response.body.failed).toBe(5);
      expect(response.body.byCollection).toBeDefined();
    });
  });

  describe('GET /api/sync/worker', () => {
    it('should return worker status', async () => {
      const response = await request(app)
        .get('/api/sync/worker')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.isRunning).toBe(true);
      expect(response.body.config).toBeDefined();
      expect(response.body.processedCount).toBe(50);
    });
  });

  // ============================================
  // SYNC OPERATION ENDPOINTS
  // ============================================

  describe('POST /api/sync/sweep', () => {
    it('should trigger a manual sweep', async () => {
      const response = await request(app)
        .post('/api/sync/sweep')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.message).toBe('Sync sweep completed');
      expect(response.body.result.processed).toBe(10);
      expect(response.body.result.succeeded).toBe(8);
      expect(syncWorkerService.triggerSweep).toHaveBeenCalled();
    });
  });

  describe('POST /api/sync/retry/:toolId', () => {
    it('should retry sync for a specific tool', async () => {
      const response = await request(app)
        .post('/api/sync/retry/test-tool')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.message).toBe('Sync retry completed');
      expect(response.body.toolId).toBe('test-tool');
      expect(response.body.success).toBe(true);
      expect(syncWorkerService.forceRetryTool).toHaveBeenCalledWith('test-tool');
    });

    it('should return 500 on retry failure', async () => {
      (syncWorkerService.forceRetryTool as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Sync failed',
      });

      const response = await request(app)
        .post('/api/sync/retry/test-tool')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(500);

      expect(response.body.code).toBe('SYNC_RETRY_FAILED');
    });
  });

  describe('POST /api/sync/retry-all', () => {
    it('should retry all failed syncs', async () => {
      const response = await request(app)
        .post('/api/sync/retry-all')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.message).toBe('Retry all failed syncs completed');
      expect(response.body.result.processed).toBe(5);
      expect(syncWorkerService.forceRetryAllFailed).toHaveBeenCalled();
    });
  });

  describe('POST /api/sync/reset/:toolId', () => {
    it('should reset retry count for a tool', async () => {
      const response = await request(app)
        .post('/api/sync/reset/test-tool')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.message).toBe('Retry count reset');
      expect(response.body.toolId).toBe('test-tool');
      expect(syncWorkerService.resetRetryCount).toHaveBeenCalledWith('test-tool');
    });

    it('should return 404 for non-existent tool', async () => {
      (syncWorkerService.resetRetryCount as jest.Mock).mockResolvedValueOnce(false);

      await request(app)
        .post('/api/sync/reset/non-existent')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(404);
    });
  });

  describe('POST /api/sync/stale/:toolId', () => {
    it('should mark a tool as stale', async () => {
      const response = await request(app)
        .post('/api/sync/stale/test-tool')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.message).toBe('Tool marked as stale - will be re-synced');
      expect(response.body.toolId).toBe('test-tool');
      expect(syncWorkerService.markToolAsStale).toHaveBeenCalledWith('test-tool');
    });

    it('should return 404 for non-existent tool', async () => {
      (syncWorkerService.markToolAsStale as jest.Mock).mockResolvedValueOnce(false);

      await request(app)
        .post('/api/sync/stale/non-existent')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(404);
    });
  });

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  describe('POST /api/sync/batch/stale', () => {
    it('should mark multiple tools as stale', async () => {
      const response = await request(app)
        .post('/api/sync/batch/stale')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ toolIds: ['tool-1', 'tool-2', 'tool-3'] })
        .expect(200);

      expect(response.body.message).toBe('Batch stale operation completed');
      expect(response.body.totalTools).toBe(3);
      expect(response.body.results).toHaveLength(3);
    });

    it('should return 400 when toolIds is missing', async () => {
      await request(app)
        .post('/api/sync/batch/stale')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({})
        .expect(400);
    });

    it('should return 400 when toolIds is empty', async () => {
      await request(app)
        .post('/api/sync/batch/stale')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ toolIds: [] })
        .expect(400);
    });

    it('should return 400 when toolIds exceeds 100', async () => {
      const toolIds = Array.from({ length: 101 }, (_, i) => `tool-${i}`);

      await request(app)
        .post('/api/sync/batch/stale')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ toolIds })
        .expect(400);
    });
  });

  describe('POST /api/sync/batch/sync', () => {
    it('should sync multiple tools', async () => {
      await createTestTool(mockToolData);
      await createTestTool({ ...mockToolData, id: 'tool-2', slug: 'tool-2' });

      const response = await request(app)
        .post('/api/sync/batch/sync')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ toolIds: ['test-tool', 'tool-2'] })
        .expect(200);

      expect(response.body.message).toBe('Batch sync operation completed');
      expect(response.body.totalTools).toBe(2);
    });

    it('should handle non-existent tools in batch', async () => {
      const response = await request(app)
        .post('/api/sync/batch/sync')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ toolIds: ['non-existent'] })
        .expect(200);

      expect(response.body.results[0].success).toBe(false);
      expect(response.body.results[0].error).toBe('Tool not found');
    });

    it('should support collections parameter', async () => {
      await createTestTool(mockToolData);

      const response = await request(app)
        .post('/api/sync/batch/sync')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          toolIds: ['test-tool'],
          collections: ['tools', 'functionality'],
        })
        .expect(200);

      expect(toolSyncService.syncToolToCollections).toHaveBeenCalled();
    });

    it('should return 400 when toolIds exceeds 50', async () => {
      const toolIds = Array.from({ length: 51 }, (_, i) => `tool-${i}`);

      await request(app)
        .post('/api/sync/batch/sync')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ toolIds })
        .expect(400);
    });
  });

  // ============================================
  // TOOL SYNC STATUS ENDPOINTS
  // ============================================

  describe('GET /api/sync/tool/:toolId', () => {
    it('should return sync status for a tool', async () => {
      await createTestTool(mockToolData);

      const response = await request(app)
        .get('/api/sync/tool/test-tool')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.toolId).toBe('test-tool');
      expect(response.body.name).toBe('Test Tool');
      expect(response.body.syncMetadata).toBeDefined();
    });

    it('should return 404 for non-existent tool', async () => {
      await request(app)
        .get('/api/sync/tool/non-existent')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(404);
    });
  });

  describe('GET /api/sync/failed', () => {
    it('should return list of failed tools', async () => {
      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          ...mockToolData.syncMetadata,
          overallStatus: 'failed',
        },
      });

      const response = await request(app)
        .get('/api/sync/failed')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      // Create multiple failed tools
      for (let i = 0; i < 10; i++) {
        await createTestTool({
          ...mockToolData,
          id: `failed-tool-${i}`,
          slug: `failed-tool-${i}`,
          syncMetadata: {
            ...mockToolData.syncMetadata,
            overallStatus: 'failed',
          },
        });
      }

      const response = await request(app)
        .get('/api/sync/failed?page=1&limit=5')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /api/sync/pending', () => {
    it('should return list of pending tools', async () => {
      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          ...mockToolData.syncMetadata,
          overallStatus: 'pending',
        },
      });

      const response = await request(app)
        .get('/api/sync/pending')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/sync/pending?page=2&limit=10')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });
  });
});

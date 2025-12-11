/**
 * Sync Worker Service Unit Tests
 * Tests for background sync processing with exponential backoff
 */

import {
  setupTestDatabase,
  teardownTestDatabase,
  clearToolsCollection,
  createTestTool,
  findTestTool,
  getTestDb,
} from '../../test-utils/db-setup.js';
import { ITool, SyncCollectionName } from '../../../types/tool.interfaces.js';

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
  connectToQdrant: jest.fn(async () => null),
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

// Mock the tool sync service
jest.mock('../../../services/tool-sync.service.js', () => ({
  toolSyncService: {
    syncToolToCollections: jest.fn().mockResolvedValue({
      success: true,
      collections: [],
      syncedCount: 4,
      failedCount: 0,
      skippedCount: 0,
      totalDuration: 100,
    }),
    retryFailedSync: jest.fn().mockResolvedValue({
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

// Import the service after mocking
import {
  SyncWorkerService,
  syncWorkerService,
  SyncWorkerConfig,
  SyncWorkerStatus,
  SweepResult,
} from '../../../services/sync-worker.service.js';
import { toolSyncService } from '../../../services/tool-sync.service.js';

describe('SyncWorkerService', () => {
  let service: SyncWorkerService;

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
  };

  beforeAll(async () => {
    await setupTestDatabase();
    testDbReference = getTestDb();
  });

  afterAll(async () => {
    testDbReference = null;
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearToolsCollection();
    service = new SyncWorkerService({ enabled: false }); // Disable auto-start
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.stop();
  });

  describe('constructor', () => {
    it('should use default config when no options provided', () => {
      const worker = new SyncWorkerService();
      const status = worker.getStatus();

      expect(status.config.sweepInterval).toBe(60000);
      expect(status.config.batchSize).toBe(50);
      expect(status.config.maxRetries).toBe(5);
      expect(status.config.baseBackoffDelay).toBe(60000);
      expect(status.config.maxBackoffDelay).toBe(3600000);
      expect(status.config.enabled).toBe(true);

      worker.stop();
    });

    it('should merge custom config with defaults', () => {
      const worker = new SyncWorkerService({
        sweepInterval: 30000,
        batchSize: 25,
      });
      const status = worker.getStatus();

      expect(status.config.sweepInterval).toBe(30000);
      expect(status.config.batchSize).toBe(25);
      expect(status.config.maxRetries).toBe(5); // default

      worker.stop();
    });
  });

  describe('start', () => {
    it('should set isRunning to true', () => {
      const worker = new SyncWorkerService({ enabled: true });
      worker.start();

      const status = worker.getStatus();
      expect(status.isRunning).toBe(true);

      worker.stop();
    });

    it('should not start if already running', () => {
      const worker = new SyncWorkerService({ enabled: true });
      worker.start();
      worker.start(); // Second call should be ignored

      const status = worker.getStatus();
      expect(status.isRunning).toBe(true);

      worker.stop();
    });

    it('should not start if disabled', () => {
      const worker = new SyncWorkerService({ enabled: false });
      worker.start();

      const status = worker.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('stop', () => {
    it('should set isRunning to false', () => {
      const worker = new SyncWorkerService({ enabled: true });
      worker.start();
      worker.stop();

      const status = worker.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should be idempotent', () => {
      service.stop();
      service.stop(); // Should not throw

      const status = service.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return complete status object', () => {
      const status = service.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('lastSweepAt');
      expect(status).toHaveProperty('lastSweepDuration');
      expect(status).toHaveProperty('processedCount');
      expect(status).toHaveProperty('successCount');
      expect(status).toHaveProperty('failedCount');
      expect(status).toHaveProperty('nextSweepAt');
      expect(status).toHaveProperty('config');
    });

    it('should return null nextSweepAt when not running', () => {
      const status = service.getStatus();

      expect(status.nextSweepAt).toBeNull();
    });

    it('should calculate nextSweepAt when running', async () => {
      const worker = new SyncWorkerService({
        enabled: true,
        sweepInterval: 60000,
      });
      worker.start();

      // Wait for initial sweep to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Manually trigger sweep to set lastSweepAt
      await worker.triggerSweep();

      const status = worker.getStatus();
      expect(status.nextSweepAt).not.toBeNull();

      worker.stop();
    });
  });

  describe('triggerSweep', () => {
    it('should return sweep result', async () => {
      const result = await service.triggerSweep();

      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('succeeded');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('errors');
    });

    it('should process tools with pending status', async () => {
      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'pending',
          collections: {
            tools: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.triggerSweep();

      expect(result.processed).toBe(1);
    });

    it('should process tools with failed status', async () => {
      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'failed',
          collections: {
            tools: { status: 'failed', retryCount: 1, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.triggerSweep();

      expect(result.processed).toBe(1);
    });

    it('should skip non-approved tools', async () => {
      await createTestTool({
        ...mockToolData,
        approvalStatus: 'pending',
        syncMetadata: {
          overallStatus: 'pending',
          collections: {
            tools: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.triggerSweep();

      expect(result.processed).toBe(0);
    });

    it('should skip tools exceeding max retries', async () => {
      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'failed',
          collections: {
            tools: { status: 'failed', retryCount: 10, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.triggerSweep();

      expect(result.skipped).toBe(1);
      expect(result.processed).toBe(0);
    });

    it('should apply exponential backoff', async () => {
      const recentAttempt = new Date(Date.now() - 1000); // 1 second ago

      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'failed',
          collections: {
            tools: {
              status: 'failed',
              retryCount: 2,
              lastSyncAttemptAt: recentAttempt,
              vectorVersion: 1,
              contentHash: '',
            },
            functionality: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.triggerSweep();

      // Should be skipped due to backoff (2^1 * 60000ms = 120000ms > 1000ms)
      expect(result.skipped).toBe(1);
    });

    it('should prevent concurrent sweeps', async () => {
      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'pending',
          collections: {
            tools: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Trigger two sweeps concurrently
      const [result1, result2] = await Promise.all([
        service.triggerSweep(),
        service.triggerSweep(),
      ]);

      // One should be skipped
      expect(result1.processed + result2.processed).toBeLessThanOrEqual(1);
    });
  });

  describe('forceRetryTool', () => {
    it('should call toolSyncService.retryFailedSync', async () => {
      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'failed',
          collections: {
            tools: { status: 'failed', retryCount: 1, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await service.forceRetryTool('test-tool');

      expect(toolSyncService.retryFailedSync).toHaveBeenCalledWith('test-tool');
    });

    it('should return success: true on successful retry', async () => {
      const result = await service.forceRetryTool('test-tool');

      expect(result.success).toBe(true);
    });

    it('should return error on failure', async () => {
      (toolSyncService.retryFailedSync as jest.Mock).mockRejectedValueOnce(
        new Error('Retry failed')
      );

      const result = await service.forceRetryTool('test-tool');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Retry failed');
    });
  });

  describe('forceRetryAllFailed', () => {
    it('should retry all failed tools', async () => {
      await createTestTool({
        ...mockToolData,
        id: 'tool-1',
        slug: 'tool-1',
        syncMetadata: {
          overallStatus: 'failed',
          collections: {
            tools: { status: 'failed', retryCount: 1, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await createTestTool({
        ...mockToolData,
        id: 'tool-2',
        slug: 'tool-2',
        syncMetadata: {
          overallStatus: 'failed',
          collections: {
            tools: { status: 'failed', retryCount: 1, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.forceRetryAllFailed();

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(2);
    });

    it('should track failures', async () => {
      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'failed',
          collections: {
            tools: { status: 'failed', retryCount: 1, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      (toolSyncService.retryFailedSync as jest.Mock).mockResolvedValueOnce({
        success: false,
        collections: [],
        syncedCount: 0,
        failedCount: 4,
        skippedCount: 0,
        totalDuration: 100,
      });

      const result = await service.forceRetryAllFailed();

      expect(result.failed).toBe(1);
    });
  });

  describe('getSyncStats', () => {
    it('should return overall statistics', async () => {
      await createTestTool({
        ...mockToolData,
        id: 'synced-tool',
        slug: 'synced-tool',
        syncMetadata: {
          overallStatus: 'synced',
          collections: {
            tools: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await createTestTool({
        ...mockToolData,
        id: 'pending-tool',
        slug: 'pending-tool',
        syncMetadata: {
          overallStatus: 'pending',
          collections: {
            tools: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const stats = await service.getSyncStats();

      expect(stats.total).toBe(2);
      expect(stats.synced).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('should return per-collection statistics', async () => {
      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'failed',
          collections: {
            tools: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'failed', retryCount: 1, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const stats = await service.getSyncStats();

      expect(stats.byCollection.tools.synced).toBe(1);
      expect(stats.byCollection.functionality.failed).toBe(1);
      expect(stats.byCollection.usecases.pending).toBe(1);
      expect(stats.byCollection.interface.synced).toBe(1);
    });
  });

  describe('resetRetryCount', () => {
    it('should reset retry count for all collections', async () => {
      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'failed',
          collections: {
            tools: { status: 'failed', retryCount: 5, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'failed', retryCount: 3, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'synced', retryCount: 1, vectorVersion: 1, contentHash: '' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.resetRetryCount('test-tool');

      expect(result).toBe(true);

      const tool = await findTestTool('test-tool');
      expect(tool?.syncMetadata?.collections?.tools?.retryCount).toBe(0);
      expect(tool?.syncMetadata?.collections?.functionality?.retryCount).toBe(0);
    });

    it('should return false for non-existent tool', async () => {
      const result = await service.resetRetryCount('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('markToolAsStale', () => {
    it('should mark tool as pending with reset retry counts', async () => {
      await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'synced',
          collections: {
            tools: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: 'abc123' },
            functionality: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: 'def456' },
            usecases: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: 'ghi789' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: 'jkl012' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.markToolAsStale('test-tool');

      expect(result).toBe(true);

      const tool = await findTestTool('test-tool');
      expect(tool?.syncMetadata?.overallStatus).toBe('pending');
      expect(tool?.syncMetadata?.collections?.tools?.status).toBe('pending');
      expect(tool?.syncMetadata?.collections?.functionality?.status).toBe('pending');
      expect(tool?.syncMetadata?.collections?.usecases?.status).toBe('pending');
      expect(tool?.syncMetadata?.collections?.interface?.status).toBe('pending');
    });

    it('should return false for non-existent tool', async () => {
      const result = await service.markToolAsStale('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(syncWorkerService).toBeDefined();
      expect(syncWorkerService).toBeInstanceOf(SyncWorkerService);
    });
  });
});

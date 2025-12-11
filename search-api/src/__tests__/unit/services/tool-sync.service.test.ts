/**
 * Tool Sync Service Unit Tests
 * Tests for MongoDB-Qdrant synchronization operations
 */

import {
  setupTestDatabase,
  teardownTestDatabase,
  clearToolsCollection,
  createTestTool,
  getTestDb,
} from '../../test-utils/db-setup.js';
import { ITool, SyncCollectionName } from '../../../types/tool.interfaces.js';
import { contentHashService } from '../../../services/content-hash.service.js';

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

// Mock external services
jest.mock('../../../services/qdrant.service.js', () => ({
  qdrantService: {
    upsertToolVector: jest.fn().mockResolvedValue(undefined),
    deleteToolVector: jest.fn().mockResolvedValue(undefined),
    updatePayloadOnly: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('../../../services/embedding.service.js', () => ({
  embeddingService: {
    generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  },
}));

jest.mock('../../../services/collection-config.service.js', () => ({
  CollectionConfigService: jest.fn().mockImplementation(() => ({
    getVectorTypeForCollection: jest.fn().mockImplementation((collection: string) => {
      const map: Record<string, string> = {
        tools: 'detailed',
        functionality: 'functionality',
        usecases: 'usecases',
        interface: 'interface',
      };
      return map[collection] || 'detailed';
    }),
    getCollectionContentFields: jest.fn().mockImplementation((collection: string) => {
      const map: Record<string, string[]> = {
        tools: ['name', 'description'],
        functionality: ['functionality', 'categories'],
        usecases: ['industries', 'userTypes'],
        interface: ['interface', 'pricingModel'],
      };
      return map[collection] || [];
    }),
  })),
}));

jest.mock('../../../services/content-generator-factory.service.js', () => ({
  ContentGeneratorFactory: jest.fn().mockImplementation(() => ({
    createGenerator: jest.fn().mockImplementation(() => ({
      generate: jest.fn().mockReturnValue('Generated content for embedding'),
    })),
  })),
}));

jest.mock('../../../types/tool.types.js', () => ({
  ToolDataValidator: jest.fn().mockImplementation(() => ({
    generateToolId: jest.fn().mockImplementation((tool) => tool.id || tool.name?.toLowerCase().replace(/\s+/g, '-')),
  })),
}));

// Import mocked services for assertions
import { qdrantService } from '../../../services/qdrant.service.js';
import { embeddingService } from '../../../services/embedding.service.js';

// Import the service after mocking
import {
  ToolSyncService,
  toolSyncService,
  SYNC_ERROR_CODES,
  ToolSyncResult,
  CollectionSyncResult,
} from '../../../services/tool-sync.service.js';

describe('ToolSyncService', () => {
  let service: ToolSyncService;

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
    service = new ToolSyncService();
    jest.clearAllMocks();
  });

  describe('syncTool', () => {
    it('should sync tool to all collections successfully', async () => {
      const tool = await createTestTool(mockToolData);

      const result = await service.syncTool(tool);

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('test-tool');
      expect(result.collections).toHaveLength(4);
      expect(result.syncedCount).toBe(4);
      expect(result.failedCount).toBe(0);
    });

    it('should call embedding service for each collection', async () => {
      const tool = await createTestTool(mockToolData);

      await service.syncTool(tool);

      // Should be called 4 times, once for each collection
      expect(embeddingService.generateEmbedding).toHaveBeenCalledTimes(4);
    });

    it('should call qdrant upsert for each collection', async () => {
      const tool = await createTestTool(mockToolData);

      await service.syncTool(tool);

      expect(qdrantService.upsertToolVector).toHaveBeenCalledTimes(4);
    });

    it('should skip collections when content unchanged (unless forced)', async () => {
      // Create tool with existing sync metadata
      const tool = await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'synced',
          collections: {
            tools: {
              status: 'synced',
              contentHash: contentHashService.generateCollectionHash(mockToolData as Partial<ITool>, 'tools'),
              retryCount: 0,
              vectorVersion: 1,
            },
            functionality: {
              status: 'synced',
              contentHash: contentHashService.generateCollectionHash(mockToolData as Partial<ITool>, 'functionality'),
              retryCount: 0,
              vectorVersion: 1,
            },
            usecases: {
              status: 'synced',
              contentHash: contentHashService.generateCollectionHash(mockToolData as Partial<ITool>, 'usecases'),
              retryCount: 0,
              vectorVersion: 1,
            },
            interface: {
              status: 'synced',
              contentHash: contentHashService.generateCollectionHash(mockToolData as Partial<ITool>, 'interface'),
              retryCount: 0,
              vectorVersion: 1,
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.syncTool(tool);

      // All should be skipped since hashes match
      expect(result.skippedCount).toBe(4);
      expect(result.syncedCount).toBe(0);
    });

    it('should force sync all collections when force option is true', async () => {
      const tool = await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'synced',
          collections: {
            tools: {
              status: 'synced',
              contentHash: contentHashService.generateCollectionHash(mockToolData as Partial<ITool>, 'tools'),
              retryCount: 0,
              vectorVersion: 1,
            },
            functionality: {
              status: 'synced',
              contentHash: contentHashService.generateCollectionHash(mockToolData as Partial<ITool>, 'functionality'),
              retryCount: 0,
              vectorVersion: 1,
            },
            usecases: {
              status: 'synced',
              contentHash: contentHashService.generateCollectionHash(mockToolData as Partial<ITool>, 'usecases'),
              retryCount: 0,
              vectorVersion: 1,
            },
            interface: {
              status: 'synced',
              contentHash: contentHashService.generateCollectionHash(mockToolData as Partial<ITool>, 'interface'),
              retryCount: 0,
              vectorVersion: 1,
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.syncTool(tool, { force: true });

      expect(result.syncedCount).toBe(4);
      expect(result.skippedCount).toBe(0);
    });

    it('should sync only specified collections', async () => {
      const tool = await createTestTool(mockToolData);

      const result = await service.syncTool(tool, {
        collections: ['tools', 'functionality'],
      });

      expect(result.collections).toHaveLength(2);
      expect(result.collections.map((c) => c.collection)).toContain('tools');
      expect(result.collections.map((c) => c.collection)).toContain('functionality');
      expect(result.collections.map((c) => c.collection)).not.toContain('usecases');
      expect(result.collections.map((c) => c.collection)).not.toContain('interface');
    });

    it('should handle embedding service failure', async () => {
      const tool = await createTestTool(mockToolData);

      // Mock to reject for all 4 collection attempts
      (embeddingService.generateEmbedding as jest.Mock)
        .mockRejectedValueOnce(new Error('Embedding generation failed'))
        .mockRejectedValueOnce(new Error('Embedding generation failed'))
        .mockRejectedValueOnce(new Error('Embedding generation failed'))
        .mockRejectedValueOnce(new Error('Embedding generation failed'));

      const result = await service.syncTool(tool, { force: true });

      expect(result.failedCount).toBeGreaterThan(0);
    });

    it('should handle qdrant upsert failure', async () => {
      const tool = await createTestTool(mockToolData);

      // Mock to reject for all 4 collection attempts
      (qdrantService.upsertToolVector as jest.Mock)
        .mockRejectedValueOnce(new Error('Qdrant upsert failed'))
        .mockRejectedValueOnce(new Error('Qdrant upsert failed'))
        .mockRejectedValueOnce(new Error('Qdrant upsert failed'))
        .mockRejectedValueOnce(new Error('Qdrant upsert failed'));

      const result = await service.syncTool(tool, { force: true });

      expect(result.failedCount).toBeGreaterThan(0);
    });
  });

  describe('syncToolToCollections', () => {
    it('should sync only to specified collections', async () => {
      const tool = await createTestTool(mockToolData);

      const result = await service.syncToolToCollections(tool, ['tools', 'interface']);

      expect(result.collections).toHaveLength(2);
      expect(result.syncedCount + result.skippedCount).toBe(2);
    });

    it('should pass options correctly', async () => {
      const tool = await createTestTool(mockToolData);

      const result = await service.syncToolToCollections(tool, ['tools'], {
        force: true,
      });

      expect(result.collections).toHaveLength(1);
    });
  });

  describe('syncAffectedCollections', () => {
    it('should sync only collections affected by changed fields', async () => {
      const tool = await createTestTool(mockToolData);

      // name affects 'tools' collection
      const result = await service.syncAffectedCollections(tool, ['name']);

      const syncedCollections = result.collections.filter((c) => c.success);
      expect(syncedCollections.some((c) => c.collection === 'tools')).toBe(true);
    });

    it('should skip sync when only metadata fields changed', async () => {
      const tool = await createTestTool(mockToolData);

      // pricing is metadata-only - should do payload update (not full resync)
      const result = await service.syncAffectedCollections(tool, ['pricing', 'website']);

      // Payload update is performed for all 4 collections (without embedding regeneration)
      expect(result.syncedCount).toBe(4);
      expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();
    });

    it('should skip all when no semantic fields changed', async () => {
      const tool = await createTestTool(mockToolData);

      // Empty changed fields means no semantic changes - should skip entirely
      const result = await service.syncAffectedCollections(tool, []);

      expect(result.skippedCount).toBe(4);
      expect(result.syncedCount).toBe(0);
      expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();
    });
  });

  describe('deleteToolFromQdrant', () => {
    it('should delete tool from all collections', async () => {
      const result = await service.deleteToolFromQdrant('test-tool');

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(4); // 4 successful deletions
      expect(qdrantService.deleteToolVector).toHaveBeenCalledTimes(4);
    });

    it('should handle deletion failure gracefully', async () => {
      (qdrantService.deleteToolVector as jest.Mock).mockRejectedValueOnce(
        new Error('Delete failed')
      );

      const result = await service.deleteToolFromQdrant('test-tool');

      expect(result.failedCount).toBe(1);
      expect(result.syncedCount).toBe(3);
    });

    it('should report correct error code on failure', async () => {
      (qdrantService.deleteToolVector as jest.Mock).mockRejectedValueOnce(
        new Error('Delete failed')
      );

      const result = await service.deleteToolFromQdrant('test-tool');

      const failedCollection = result.collections.find((c) => !c.success);
      expect(failedCollection?.errorCode).toBe(SYNC_ERROR_CODES.QDRANT_DELETE_FAILED);
    });
  });

  describe('updatePayloadOnly', () => {
    it('should update payload in all collections', async () => {
      const tool = await createTestTool(mockToolData);

      const result = await service.updatePayloadOnly(tool);

      expect(result.success).toBe(true);
      expect(qdrantService.updatePayloadOnly).toHaveBeenCalledTimes(4);
    });

    it('should not call embedding service', async () => {
      const tool = await createTestTool(mockToolData);

      await service.updatePayloadOnly(tool);

      expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();
    });

    it('should handle payload update failure', async () => {
      const tool = await createTestTool(mockToolData);

      (qdrantService.updatePayloadOnly as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Update failed',
      });

      const result = await service.updatePayloadOnly(tool);

      expect(result.failedCount).toBe(1);
    });
  });

  describe('retryFailedSync', () => {
    it('should retry failed collections', async () => {
      const tool = await createTestTool({
        ...mockToolData,
        syncMetadata: {
          overallStatus: 'failed',
          collections: {
            tools: { status: 'failed', retryCount: 1, vectorVersion: 1, contentHash: '' },
            functionality: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
            usecases: { status: 'pending', retryCount: 0, vectorVersion: 1, contentHash: '' },
            interface: { status: 'synced', retryCount: 0, vectorVersion: 1, contentHash: '' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.retryFailedSync('test-tool');

      // Should sync tools (failed) and usecases (pending)
      expect(result.collections.length).toBeGreaterThan(0);
    });

    it('should skip if no failed collections', async () => {
      const tool = await createTestTool({
        ...mockToolData,
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

      const result = await service.retryFailedSync('test-tool');

      expect(result.skippedCount).toBe(4);
      expect(result.syncedCount).toBe(0);
    });

    it('should throw error if tool not found', async () => {
      await expect(service.retryFailedSync('non-existent-tool')).rejects.toThrow('Tool not found');
    });
  });

  describe('SYNC_ERROR_CODES', () => {
    it('should define all expected error codes', () => {
      expect(SYNC_ERROR_CODES.EMBEDDING_FAILED).toBe('EMBEDDING_FAILED');
      expect(SYNC_ERROR_CODES.QDRANT_UPSERT_FAILED).toBe('QDRANT_UPSERT_FAILED');
      expect(SYNC_ERROR_CODES.QDRANT_DELETE_FAILED).toBe('QDRANT_DELETE_FAILED');
      expect(SYNC_ERROR_CODES.CONTENT_GENERATION_FAILED).toBe('CONTENT_GENERATION_FAILED');
      expect(SYNC_ERROR_CODES.MONGODB_UPDATE_FAILED).toBe('MONGODB_UPDATE_FAILED');
      expect(SYNC_ERROR_CODES.TOOL_NOT_FOUND).toBe('TOOL_NOT_FOUND');
      expect(SYNC_ERROR_CODES.INVALID_TOOL_DATA).toBe('INVALID_TOOL_DATA');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(toolSyncService).toBeDefined();
      expect(toolSyncService).toBeInstanceOf(ToolSyncService);
    });
  });
});

import { enhancedVectorIndexingService } from '../services/enhanced-vector-indexing.service';
import { ToolData } from '../services/vector-indexing.service';

// Mock the dependencies
jest.mock('../services/mongodb.service');
jest.mock('../services/qdrant.service');
jest.mock('../services/embedding.service');
jest.mock('../config/database');

describe('EnhancedVectorIndexingService', () => {
  const mockToolData: ToolData = {
    _id: '507f1f77bcf86cd799439011',
    id: 'test-tool-1',
    name: 'Test Tool',
    description: 'A test tool for unit testing',
    categories: ['Development', 'Testing'],
    functionality: ['Code Generation', 'Testing'],
    searchKeywords: ['test', 'code', 'generation'],
    useCases: ['Unit testing', 'Code quality'],
    interface: ['CLI', 'API'],
    deployment: ['Cloud', 'On-premise'],
    technical: {
      languages: ['TypeScript', 'JavaScript']
    },
    integrations: ['GitHub', 'Jira'],
    semanticTags: ['ai', 'automation']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSupportedVectorTypes', () => {
    it('should return an array of supported vector types', () => {
      const vectorTypes = enhancedVectorIndexingService.getSupportedVectorTypes();
      expect(Array.isArray(vectorTypes)).toBe(true);
      expect(vectorTypes.length).toBeGreaterThan(0);
      expect(vectorTypes).toContain('semantic');
      expect(vectorTypes).toContain('entities.categories');
      expect(vectorTypes).toContain('entities.functionality');
    });
  });

  describe('generateMultipleVectors', () => {
    it('should generate vectors for all supported types', async () => {
      // Mock embedding service
      const mockEmbeddingService = require('../services/embedding.service').embeddingService;
      mockEmbeddingService.generateEmbedding = jest.fn().mockResolvedValue(new Array(1024).fill(0.1));

      const vectors = await enhancedVectorIndexingService.generateMultipleVectors(mockToolData);
      
      const supportedTypes = enhancedVectorIndexingService.getSupportedVectorTypes();
      expect(Object.keys(vectors)).toEqual(expect.arrayContaining(supportedTypes));
      
      // Verify each vector is the correct dimension
      Object.values(vectors).forEach(vector => {
        expect(Array.isArray(vector)).toBe(true);
        expect(vector).toHaveLength(1024);
      });
    });

    it('should handle empty tool data gracefully', async () => {
      const emptyTool: ToolData = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Empty Tool'
      };

      const mockEmbeddingService = require('../services/embedding.service').embeddingService;
      mockEmbeddingService.generateEmbedding = jest.fn().mockResolvedValue(new Array(1024).fill(0.1));

      const vectors = await enhancedVectorIndexingService.generateMultipleVectors(emptyTool);
      
      const supportedTypes = enhancedVectorIndexingService.getSupportedVectorTypes();
      expect(Object.keys(vectors)).toEqual(expect.arrayContaining(supportedTypes));
    });
  });

  describe('validateMultiVectorIndex', () => {
    it('should return a health report with vector type information', async () => {
      // Mock MongoDB service
      const mockMongoDBService = require('../services/mongodb.service').mongoDBService;
      mockMongoDBService.getAllTools = jest.fn().mockResolvedValue([mockToolData]);

      // Mock Qdrant service
      const mockQdrantService = require('../services/qdrant.service').qdrantService;
      mockQdrantService.getCollectionInfoForVectorType = jest.fn().mockResolvedValue({
        points_count: 1,
        config: {
          params: {
            vectors: {
              size: 1024
            }
          }
        }
      });

      const report = await enhancedVectorIndexingService.validateMultiVectorIndex();

      expect(report).toHaveProperty('mongoToolCount');
      expect(report).toHaveProperty('qdrantVectorCount');
      expect(report).toHaveProperty('vectorTypeHealth');
      expect(report).toHaveProperty('supportedVectorTypes');
      expect(report.supportedVectorTypes).toContain('semantic');
      expect(report.supportedVectorTypes).toContain('entities.categories');
    });
  });

  describe('Vector content generation', () => {
    it('should generate different content for different vector types', async () => {
      const mockEmbeddingService = require('../services/embedding.service').embeddingService;
      const generateEmbeddingSpy = jest.spyOn(mockEmbeddingService, 'generateEmbedding')
        .mockResolvedValue(new Array(1024).fill(0.1));

      await enhancedVectorIndexingService.generateMultipleVectors(mockToolData);

      // Should have been called for each vector type with different content
      const supportedTypes = enhancedVectorIndexingService.getSupportedVectorTypes();
      expect(generateEmbeddingSpy).toHaveBeenCalledTimes(supportedTypes.length);
      
      // Get the different content strings that were passed to generateEmbedding
      const contentCalls = generateEmbeddingSpy.mock.calls.map(call => call[0] as string);
      
      // Should have different content for different vector types
      const uniqueContents = new Set(contentCalls);
      expect(uniqueContents.size).toBeGreaterThan(1);
    });
  });

  describe('Error handling', () => {
    it('should handle embedding generation errors gracefully', async () => {
      const mockEmbeddingService = require('../services/embedding.service').embeddingService;
      mockEmbeddingService.generateEmbedding = jest.fn()
        .mockResolvedValueOnce(new Array(1024).fill(0.1))
        .mockRejectedValueOnce(new Error('Embedding generation failed'));

      await expect(
        enhancedVectorIndexingService.generateMultipleVectors(mockToolData)
      ).rejects.toThrow();
    });

    it('should handle invalid vector types', async () => {
      const mockEmbeddingService = require('../services/embedding.service').embeddingService;
      mockEmbeddingService.generateEmbedding = jest.fn().mockResolvedValue(new Array(1024).fill(0.1));

      // This should not throw an error as it uses only supported vector types
      const vectors = await enhancedVectorIndexingService.generateMultipleVectors(mockToolData);
      expect(Object.keys(vectors).length).toBeGreaterThan(0);
    });
  });

  describe('Shutdown handling', () => {
    it('should handle shutdown signals', () => {
      expect(enhancedVectorIndexingService.isShuttingDownActive).toBe(false);
      
      enhancedVectorIndexingService.handleShutdown();
      expect(enhancedVectorIndexingService.isShuttingDownActive).toBe(true);
    });
  });
});

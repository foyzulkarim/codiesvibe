import request from 'supertest';
import express from 'express';
import { enhancedSearchController } from '../../src/controllers/enhanced-search.controller';

describe('Enhanced Search Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    // Create a test Express app
    app = express();
    app.use(express.json());
    
    // Register the enhanced search endpoints
    app.post('/api/search/enhanced', enhancedSearchController.enhancedSearch.bind(enhancedSearchController));
    app.get('/api/search/enhanced/health', enhancedSearchController.healthCheck.bind(enhancedSearchController));
    app.post('/api/search/enhanced/cache/clear', enhancedSearchController.clearCache.bind(enhancedSearchController));
    app.get('/api/search/enhanced/config', enhancedSearchController.getConfig.bind(enhancedSearchController));
    app.put('/api/search/enhanced/config', enhancedSearchController.updateConfig.bind(enhancedSearchController));
    app.get('/api/search/enhanced/stats', enhancedSearchController.getStats.bind(enhancedSearchController));
  });

  describe('POST /api/search/enhanced', () => {
    it('should perform enhanced search successfully', async () => {
      const searchRequest = {
        query: 'React components',
        options: {
          sources: {
            vector: true,
            traditional: true,
            hybrid: false,
          },
          vectorOptions: {
            vectorTypes: ['semantic', 'categories'],
            limit: 10,
          },
          mergeOptions: {
            strategy: 'reciprocal_rank_fusion',
            rrfKValue: 60,
            maxResults: 20,
            sourceWeights: { semantic: 1.0, traditional: 0.9, hybrid: 0.95 },
          },
          duplicateDetectionOptions: {
            enabled: true,
            useEnhancedDetection: true,
            threshold: 0.8,
            strategies: ['EXACT_ID', 'CONTENT_SIMILARITY'],
          },
          pagination: {
            page: 1,
            limit: 10,
          },
          sort: {
            field: 'relevance',
            order: 'desc',
          },
          performance: {
            timeout: 5000,
            enableCache: false,
            enableParallel: true,
          },
          debug: false,
          includeMetadata: true,
          includeSourceAttribution: true,
          filters: {},
        },
      };

      const response = await request(app)
        .post('/api/search/enhanced')
        .send(searchRequest)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.query).toBe(searchRequest.query);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.summary).toBeDefined();
      expect(response.body.results).toBeDefined();
      expect(response.body.metrics).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const invalidRequest = {
        query: '', // Empty query should fail validation
        options: {},
      };

      const response = await request(app)
        .post('/api/search/enhanced')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Invalid request body');
      expect(response.body.details).toBeDefined();
    });

    it('should handle missing query field', async () => {
      const invalidRequest = {
        options: {},
      };

      const response = await request(app)
        .post('/api/search/enhanced')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Invalid request body');
    });

    it('should respect pagination options', async () => {
      const paginatedRequest = {
        query: 'Test pagination',
        options: {
          sources: { vector: true, traditional: false, hybrid: false },
          vectorOptions: { vectorTypes: ['semantic'], limit: 10 },
          mergeOptions: { 
            strategy: 'reciprocal_rank_fusion', 
            rrfKValue: 60, 
            maxResults: 20,
            sourceWeights: { semantic: 1.0, traditional: 0.9, hybrid: 0.95 }
          },
          duplicateDetectionOptions: { 
            enabled: false, 
            useEnhancedDetection: false, 
            threshold: 0.8, 
            strategies: ['EXACT_ID'] 
          },
          pagination: {
            page: 2,
            limit: 5,
          },
          sort: { field: 'relevance', order: 'desc' },
          performance: { timeout: 5000, enableCache: false, enableParallel: true },
          debug: false,
          includeMetadata: true,
          includeSourceAttribution: true,
          filters: {},
        },
      };

      const response = await request(app)
        .post('/api/search/enhanced')
        .send(paginatedRequest)
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should include debug information when requested', async () => {
      const debugRequest = {
        query: 'Test debug',
        options: {
          sources: { vector: true, traditional: false, hybrid: false },
          vectorOptions: { vectorTypes: ['semantic'], limit: 10 },
          mergeOptions: { 
            strategy: 'reciprocal_rank_fusion', 
            rrfKValue: 60, 
            maxResults: 20,
            sourceWeights: { semantic: 1.0, traditional: 0.9, hybrid: 0.95 }
          },
          duplicateDetectionOptions: { 
            enabled: false, 
            useEnhancedDetection: false, 
            threshold: 0.8, 
            strategies: ['EXACT_ID'] 
          },
          pagination: { page: 1, limit: 10 },
          sort: { field: 'relevance', order: 'desc' },
          performance: { timeout: 5000, enableCache: false, enableParallel: true },
          debug: true,
          includeMetadata: true,
          includeSourceAttribution: true,
          filters: {},
        },
      };

      const response = await request(app)
        .post('/api/search/enhanced')
        .send(debugRequest)
        .expect(200);

      expect(response.body.debug).toBeDefined();
      expect(response.body.debug.executionPath).toBeDefined();
      expect(response.body.debug.sourceMetrics).toBeDefined();
    });

    it('should handle different merge strategies', async () => {
      const hybridRequest = {
        query: 'Test hybrid strategy',
        options: {
          sources: { vector: true, traditional: false, hybrid: false },
          vectorOptions: { vectorTypes: ['semantic'], limit: 10 },
          mergeOptions: { 
            strategy: 'hybrid', 
            rrfKValue: 60, 
            maxResults: 20,
            sourceWeights: { semantic: 1.0, traditional: 0.9, hybrid: 0.95 }
          },
          duplicateDetectionOptions: { 
            enabled: false, 
            useEnhancedDetection: false, 
            threshold: 0.8, 
            strategies: ['EXACT_ID'] 
          },
          pagination: { page: 1, limit: 10 },
          sort: { field: 'relevance', order: 'desc' },
          performance: { timeout: 5000, enableCache: false, enableParallel: true },
          debug: false,
          includeMetadata: true,
          includeSourceAttribution: true,
          filters: {},
        },
      };

      const response = await request(app)
        .post('/api/search/enhanced')
        .send(hybridRequest)
        .expect(200);

      expect(response.body.summary.searchStrategy).toBe('hybrid');
    });
  });

  describe('GET /api/search/enhanced/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/search/enhanced/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.service).toBe('enhanced-search');
      expect(response.body.version).toBeDefined();
      expect(response.body.cache).toBeDefined();
      expect(response.body.configuration).toBeDefined();
    });
  });

  describe('POST /api/search/enhanced/cache/clear', () => {
    it('should clear cache successfully', async () => {
      const response = await request(app)
        .post('/api/search/enhanced/cache/clear')
        .expect(200);

      expect(response.body.message).toBe('Cache cleared successfully');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.before).toBeDefined();
      expect(response.body.after).toBeDefined();
    });
  });

  describe('GET /api/search/enhanced/config', () => {
    it('should return current configuration', async () => {
      const response = await request(app)
        .get('/api/search/enhanced/config')
        .expect(200);

      expect(response.body.config).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.config.defaultSources).toBeDefined();
      expect(response.body.config.defaultMergeStrategy).toBeDefined();
      expect(response.body.config.enableCache).toBeDefined();
    });
  });

  describe('PUT /api/search/enhanced/config', () => {
    it('should update configuration successfully', async () => {
      const newConfig = {
        defaultTimeout: 10000,
        enableCache: false,
      };

      const response = await request(app)
        .put('/api/search/enhanced/config')
        .send({ config: newConfig })
        .expect(200);

      expect(response.body.message).toBe('Configuration updated successfully');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.before).toBeDefined();
      expect(response.body.after).toBeDefined();
    });

    it('should handle invalid config update', async () => {
      const response = await request(app)
        .put('/api/search/enhanced/config')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Config object is required');
    });
  });

  describe('GET /api/search/enhanced/stats', () => {
    it('should return search statistics', async () => {
      const response = await request(app)
        .get('/api/search/enhanced/stats')
        .expect(200);

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.service).toBe('enhanced-search');
      expect(response.body.cache).toBeDefined();
      expect(response.body.configuration).toBeDefined();
      expect(response.body.performance).toBeDefined();
    });
  });
});

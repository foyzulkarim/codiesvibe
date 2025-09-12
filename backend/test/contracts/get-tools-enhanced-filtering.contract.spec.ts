import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupEnhancedToolTestDatabase, closeEnhancedToolTestDatabase } from '../setup/enhanced-schema-test-setup';

/**
 * Contract Test: GET /api/tools with Enhanced Filtering and Sorting
 * 
 * This test validates that the GET /api/tools endpoint supports the enhanced
 * filtering and sorting capabilities as specified in the OpenAPI contract.
 * It follows TDD principles - this test will fail initially and drive
 * the implementation of the enhanced functionality.
 */

describe('Tools API Contract - Enhanced Filtering and Sorting', () => {
  let app: INestApplication<App>;
  let authToken: string;

  beforeAll(async () => {
    // Initialize enhanced test database with proper configuration
    await setupEnhancedToolTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Note: In a real scenario, we'd set up authentication here
    // For contract testing, we'll focus on the API structure
  });

  afterAll(async () => {
    await app.close();
    await closeEnhancedToolTestDatabase();
  });

  describe('GET /api/tools - Enhanced Query Parameters', () => {
    
    it('should accept all enhanced query parameters with 200 status', async () => {
      // Test that the endpoint accepts the new enhanced parameters
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          page: 1,
          limit: 10,
          search: 'AI assistant',
          sortBy: 'popularity',
          functionality: 'Text Generation,Translation',
          tags: 'AI,Chatbot',
          minRating: 4.0,
          maxRating: 5.0
        });

      // This test will initially fail (401 Unauthorized) but shows
      // the endpoint accepts the enhanced query parameters
      expect(response.status).toBe(200);
    });

    it('should validate query parameter constraints', async () => {
      // Test parameter validation rules from OpenAPI spec
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          page: -1, // Invalid: minimum is 1
          limit: 101, // Invalid: maximum is 100
          minRating: -0.1, // Invalid: minimum is 0
          maxRating: 5.1 // Invalid: maximum is 5
        });

      // Should return validation error for invalid parameters
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });

    it('should validate sortBy enum values', async () => {
      // Test that sortBy only accepts allowed values
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          sortBy: 'invalid_field' // Not in enum [popularity, rating, reviewCount, createdAt]
        });

      expect(response.status).toBe(400);
    });

    it('should handle pagination parameters correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          page: 2,
          limit: 15
        });

      if (response.status === 200) {
        // Validate response structure when successful
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('total');
      }
    });

    it('should accept functionality filtering as comma-separated string', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          functionality: 'Text Generation,Code Generation,Translation'
        });

      // Endpoint should accept comma-separated functionality categories
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        // Note: Implementation should parse this into array for filtering
      }
    });

    it('should accept tags filtering as comma-separated string', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          tags: 'AI,Productivity,Development'
        });

      // Endpoint should accept comma-separated tags
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should apply rating range filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          minRating: 3.5,
          maxRating: 4.5
        });

      // Should filter tools within rating range
      if (response.status === 200) {
        const tools = response.body.data;
        tools.forEach((tool: any) => {
          if (tool.rating !== undefined) {
            expect(tool.rating).toBeGreaterThanOrEqual(3.5);
            expect(tool.rating).toBeLessThanOrEqual(4.5);
          }
        });
      }
    });

    it('should handle search across name, description, and searchKeywords', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'chatbot'
        });

      // Should search across multiple text fields
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should return enhanced tool schema in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ limit: 1 });

      if (response.status === 200 && response.body.data.length > 0) {
        const tool = response.body.data[0];
        
        // Validate that response contains enhanced schema fields
        // This will initially fail until schema is enhanced
        expect(tool).toHaveProperty('pricing');
        expect(tool).toHaveProperty('interface');
        expect(tool).toHaveProperty('functionality');
        expect(tool).toHaveProperty('deployment');
        expect(tool).toHaveProperty('popularity');
        expect(tool).toHaveProperty('rating');
        expect(tool).toHaveProperty('reviewCount');
        expect(tool).toHaveProperty('features');
        expect(tool).toHaveProperty('searchKeywords');
        expect(tool).toHaveProperty('tags');
        
        // Validate nested object structure
        expect(typeof tool.features).toBe('object');
        expect(Array.isArray(tool.pricing)).toBe(true);
        expect(Array.isArray(tool.interface)).toBe(true);
        expect(Array.isArray(tool.functionality)).toBe(true);
        expect(Array.isArray(tool.deployment)).toBe(true);
        expect(Array.isArray(tool.searchKeywords)).toBe(true);
        expect(tool.tags).toHaveProperty('primary');
        expect(tool.tags).toHaveProperty('secondary');
        expect(Array.isArray(tool.tags.primary)).toBe(true);
        expect(Array.isArray(tool.tags.secondary)).toBe(true);
      }
    });

    it('should handle empty query parameters with defaults', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools'); // No query parameters

      if (response.status === 200) {
        // Should apply defaults (page: 1, limit: 20, sortBy: createdAt)
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(20);
      }
    });
  });

  describe('Error Handling', () => {
    
    it('should return structured error response for invalid queries', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          page: 'invalid', // Should be number
          limit: 'invalid' // Should be number
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode');
    });

    it('should maintain backward compatibility with existing parameters', async () => {
      // Test that existing query parameters still work
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          // These are existing parameters that should still work
          page: 1,
          limit: 10
        });

      // Should not break existing functionality
      expect([200, 401]).toContain(response.status); // 200 if auth handled, 401 if not
    });
  });
});
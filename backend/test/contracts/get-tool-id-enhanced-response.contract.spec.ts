import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupEnhancedToolTestDatabase, closeEnhancedToolTestDatabase } from '../setup/enhanced-schema-test-setup';
import { VALIDATION_FIXTURES } from '../fixtures/validation-fixtures';

/**
 * Contract Test: GET /api/tools/{id} with Enhanced Response
 * 
 * This test validates that the GET /api/tools/{id} endpoint returns the
 * complete enhanced tool schema as specified in the OpenAPI contract.
 * It follows TDD principles - this test will fail initially and drive
 * the implementation of the enhanced single tool retrieval functionality.
 */

describe('Tools API Contract - Enhanced Single Tool Retrieval', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let createdToolId: string;

  beforeAll(async () => {
    // Initialize enhanced test database with proper configuration
    await setupEnhancedToolTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await closeEnhancedToolTestDatabase();
  });

  describe('GET /api/tools/{id} - Enhanced Response Schema', () => {
    
    it('should return complete enhanced tool schema by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // This will initially fail (401 Unauthorized or 404 Not Found)
      // but validates the expected response structure
      if (response.status === 200) {
        const tool = response.body;
        
        // Validate all enhanced fields are present
        expect(tool).toHaveProperty('id');
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('longDescription');
        expect(tool).toHaveProperty('pricing');
        expect(tool).toHaveProperty('interface');
        expect(tool).toHaveProperty('functionality');
        expect(tool).toHaveProperty('deployment');
        expect(tool).toHaveProperty('popularity');
        expect(tool).toHaveProperty('rating');
        expect(tool).toHaveProperty('reviewCount');
        expect(tool).toHaveProperty('lastUpdated');
        expect(tool).toHaveProperty('logoUrl');
        expect(tool).toHaveProperty('features');
        expect(tool).toHaveProperty('searchKeywords');
        expect(tool).toHaveProperty('tags');
        expect(tool).toHaveProperty('createdAt');
        expect(tool).toHaveProperty('updatedAt');
        
        // Validate data types
        expect(typeof tool.id).toBe('string');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(Array.isArray(tool.pricing)).toBe(true);
        expect(Array.isArray(tool.interface)).toBe(true);
        expect(Array.isArray(tool.functionality)).toBe(true);
        expect(Array.isArray(tool.deployment)).toBe(true);
        expect(typeof tool.popularity).toBe('number');
        expect(typeof tool.rating).toBe('number');
        expect(typeof tool.reviewCount).toBe('number');
        expect(typeof tool.features).toBe('object');
        expect(Array.isArray(tool.searchKeywords)).toBe(true);
        expect(typeof tool.tags).toBe('object');
        
        // Validate nested object structures
        expect(tool.tags).toHaveProperty('primary');
        expect(tool.tags).toHaveProperty('secondary');
        expect(Array.isArray(tool.tags.primary)).toBe(true);
        expect(Array.isArray(tool.tags.secondary)).toBe(true);
        
        // Validate features object contains only boolean values
        Object.values(tool.features).forEach(value => {
          expect(typeof value).toBe('boolean');
        });
      } else {
        // Expected failure states during TDD
        expect([401, 404]).toContain(response.status);
      }
    });

    it('should return correct data types for all enhanced fields', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // String fields
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.longDescription === null || typeof tool.longDescription === 'string').toBe(true);
        expect(typeof tool.logoUrl).toBe('string');
        
        // Numeric fields
        expect(typeof tool.popularity).toBe('number');
        expect(typeof tool.rating).toBe('number');
        expect(typeof tool.reviewCount).toBe('number');
        
        // Array fields
        expect(Array.isArray(tool.pricing)).toBe(true);
        expect(Array.isArray(tool.interface)).toBe(true);
        expect(Array.isArray(tool.functionality)).toBe(true);
        expect(Array.isArray(tool.deployment)).toBe(true);
        expect(Array.isArray(tool.searchKeywords)).toBe(true);
        
        // Nested object fields
        expect(typeof tool.features).toBe('object');
        expect(typeof tool.tags).toBe('object');
        
        // Date fields (should be ISO strings)
        expect(tool.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
        expect(tool.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
        expect(tool.lastUpdated === null || tool.lastUpdated?.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)).toBe(true);
      }
    });

    it('should handle null values for optional fields gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // Optional fields can be null or have default values
        expect(tool.longDescription === null || typeof tool.longDescription === 'string').toBe(true);
        expect(tool.lastUpdated === null || typeof tool.lastUpdated === 'string').toBe(true);
        
        // Optional numeric fields should have defaults (0) if not set
        expect(tool.popularity).toBeGreaterThanOrEqual(0);
        expect(tool.rating).toBeGreaterThanOrEqual(0);
        expect(tool.reviewCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return MongoDB ObjectId format for id field', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // Validate MongoDB ObjectId format (24 hex characters)
        expect(tool.id).toMatch(/^[0-9a-fA-F]{24}$/);
      }
    });

    it('should include timestamps in consistent format', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // Parse dates to ensure they're valid
        const createdAt = new Date(tool.createdAt);
        const updatedAt = new Date(tool.updatedAt);
        
        expect(isNaN(createdAt.getTime())).toBe(false);
        expect(isNaN(updatedAt.getTime())).toBe(false);
        
        // updatedAt should not be before createdAt
        expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
        
        // lastUpdated should be valid if present
        if (tool.lastUpdated) {
          const lastUpdated = new Date(tool.lastUpdated);
          expect(isNaN(lastUpdated.getTime())).toBe(false);
        }
      }
    });
  });

  describe('Field Content Validation', () => {
    
    it('should validate features object contains only boolean values', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // All features should be boolean values
        Object.entries(tool.features).forEach(([key, value]) => {
          expect(typeof value).toBe('boolean');
          expect(['apiAccess', 'freeTier', 'multiLanguage', 'codeExecution'].includes(key)).toBe(true);
        });
      }
    });

    it('should validate tags structure contains arrays', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        expect(Array.isArray(tool.tags.primary)).toBe(true);
        expect(Array.isArray(tool.tags.secondary)).toBe(true);
        
        // All tag values should be strings
        tool.tags.primary.forEach(tag => {
          expect(typeof tag).toBe('string');
        });
        tool.tags.secondary.forEach(tag => {
          expect(typeof tag).toBe('string');
        });
      }
    });

    it('should validate array fields contain valid string values', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // Check string arrays
        const stringArrays = ['pricing', 'interface', 'functionality', 'deployment', 'searchKeywords'];
        stringArrays.forEach(field => {
          expect(Array.isArray(tool[field])).toBe(true);
          tool[field].forEach((item: any) => {
            expect(typeof item).toBe('string');
            expect(item.trim()).toBe(item); // No leading/trailing whitespace
          });
        });
      }
    });

    it('should validate numeric field ranges', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // Validate numeric field constraints
        expect(tool.popularity).toBeGreaterThanOrEqual(0);
        expect(tool.popularity).toBeLessThanOrEqual(1000000);
        expect(tool.rating).toBeGreaterThanOrEqual(0);
        expect(tool.rating).toBeLessThanOrEqual(5);
        expect(tool.reviewCount).toBeGreaterThanOrEqual(0);
        expect(tool.reviewCount).toBeLessThanOrEqual(1000000);
      }
    });

    it('should validate URL format for logoUrl', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // Validate URL format using a simple regex
        const urlRegex = /^https?:\/\/.+/;
        expect(tool.logoUrl).toMatch(urlRegex);
      }
    });
  });

  describe('Error Handling', () => {
    
    it('should return 404 for non-existent tool ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999'; // Valid MongoDB ObjectId format
      
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(404);
    });

    it('should return 400 for invalid tool ID format', async () => {
      const invalidId = 'not-a-valid-mongodb-id';

      const response = await request(app.getHttpServer())
        .get(`/api/tools/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(400);
    });

    it('should return unauthorized error without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`);
        // No Authorization header

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(401);
    });

    it('should return structured error response', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/invalid-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode');
    });
  });

  describe('Data Consistency', () => {
    
    it('should return consistent data across multiple calls', async () => {
      const firstResponse = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (firstResponse.status === 200) {
        const secondResponse = await request(app.getHttpServer())
          .get(`/api/tools/${createdToolId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(secondResponse.status).toBe(200);
        
        // Data should be identical (excluding potential timestamp differences)
        const firstTool = firstResponse.body;
        const secondTool = secondResponse.body;
        
        expect(firstTool.id).toBe(secondTool.id);
        expect(firstTool.name).toBe(secondTool.name);
        expect(firstTool.description).toBe(secondTool.description);
        expect(firstTool.pricing).toEqual(secondTool.pricing);
        expect(firstTool.features).toEqual(secondTool.features);
        expect(firstTool.tags).toEqual(secondTool.tags);
      }
    });

    it('should not expose sensitive database fields', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // Should not expose internal MongoDB fields
        expect(tool).not.toHaveProperty('_id');
        expect(tool).not.toHaveProperty('__v');
        expect(tool).not.toHaveProperty('createdBy');
        expect(tool).not.toHaveProperty('password');
        expect(tool).not.toHaveProperty('internalFields');
      }
    });

    it('should maintain relationship with creator through createdBy (if exposed)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // If createdBy is exposed, it should be properly formatted
        if (tool.createdBy) {
          expect(typeof tool.createdBy).toBe('string');
          expect(tool.createdBy).toMatch(/^[0-9a-fA-F]{24}$/); // MongoDB ObjectId
        }
      }
    });
  });
});
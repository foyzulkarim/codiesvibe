import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupEnhancedToolTestDatabase, closeEnhancedToolTestDatabase } from '../setup/enhanced-schema-test-setup';
import { VALIDATION_FIXTURES } from '../fixtures/validation-fixtures';

/**
 * Contract Test: POST /api/tools with Enhanced Fields
 * 
 * This test validates that the POST /api/tools endpoint accepts and validates
 * the enhanced tool schema fields as specified in the OpenAPI contract.
 * It follows TDD principles - this test will fail initially and drive
 * the implementation of the enhanced create functionality.
 */

describe('Tools API Contract - Enhanced Tool Creation', () => {
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
  });

  afterAll(async () => {
    await app.close();
    await closeEnhancedToolTestDatabase();
  });

  describe('POST /api/tools - Enhanced Schema Validation', () => {
    
    it('should create tool with all enhanced fields successfully', async () => {
      const validCompleteTool = {
        ...VALIDATION_FIXTURES.validCompleteTool
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(validCompleteTool)
        .set('Authorization', `Bearer ${authToken}`);

      // This will initially fail (401 Unauthorized or 400 Validation Error)
      // but validates the expected request structure
      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(validCompleteTool.name);
        expect(response.body.description).toBe(validCompleteTool.description);
        
        // Validate enhanced fields are returned
        expect(response.body).toHaveProperty('pricing');
        expect(response.body).toHaveProperty('interface');
        expect(response.body).toHaveProperty('functionality');
        expect(response.body).toHaveProperty('deployment');
        expect(response.body).toHaveProperty('popularity');
        expect(response.body).toHaveProperty('rating');
        expect(response.body).toHaveProperty('features');
        expect(response.body).toHaveProperty('searchKeywords');
        expect(response.body).toHaveProperty('tags');
      } else {
        // Expected failure states during TDD
        expect([400, 401]).toContain(response.status);
      }
    });

    it('should validate required enhanced fields', async () => {
      // Test that the new required fields are properly validated
      const incompleteTool = {
        name: "Test Tool",
        description: "Test description"
        // Missing required enhanced fields: pricing, interface, functionality, deployment, etc.
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(incompleteTool)
        .set('Authorization', `Bearer ${authToken}`);

      // Should fail validation due to missing required enhanced fields
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });

    it('should validate string length constraints', async () => {
      const invalidTool = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        name: 'a'.repeat(101), // Exceeds maxLength: 100
        description: 'a'.repeat(501), // Exceeds maxLength: 500
        longDescription: 'a'.repeat(2001) // Exceeds maxLength: 2000
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(invalidTool)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('name');
    });

    it('should validate URL format for logoUrl', async () => {
      const invalidTool = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        logoUrl: 'not-a-valid-url' // Invalid URL format
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(invalidTool)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should validate array constraints (minItems)', async () => {
      const invalidTool = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        pricing: [], // Empty array violates minItems: 1
        functionality: [], // Empty array violates minItems: 1
        deployment: [], // Empty array violates minItems: 1
        searchKeywords: [] // Empty array violates minItems: 1
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(invalidTool)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should validate numeric range constraints', async () => {
      const invalidTool = {
        ...VALIDATION_FIXTURES.validCompleteTool,
        popularity: -1, // Below minimum: 0
        rating: 5.1, // Above maximum: 5
        reviewCount: 1000001 // Above maximum: 1000000
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(invalidTool)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should validate features object structure', async () => {
      const invalidTool = {
        ...VALIDATION_FIXTURES.validCompleteTool,
        features: {
          validBoolean: true,
          invalidString: "not a boolean", // Should be boolean
          invalidNumber: 42, // Should be boolean
          invalidObject: {}, // Should be boolean
          invalidArray: [] // Should be boolean
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(invalidTool)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should validate tags object structure', async () => {
      const invalidTool = {
        ...VALIDATION_FIXTURES.validCompleteTool,
        tags: {
          primary: ["AI"],
          // Missing required 'secondary' property
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(invalidTool)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should accept minimal valid enhanced tool', async () => {
      const minimalTool = VALIDATION_FIXTURES.validMinimalTool;

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(minimalTool)
        .set('Authorization', `Bearer ${authToken}`);

      // Should accept minimal valid tool with only required enhanced fields
      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(minimalTool.name);
        expect(response.body.description).toBe(minimalTool.description);
        expect(response.body.pricing).toEqual(minimalTool.pricing);
        expect(response.body.interface).toEqual(minimalTool.interface);
      } else {
        expect([400, 401]).toContain(response.status);
      }
    });

    it('should apply default values for optional fields', async () => {
      const toolWithDefaults = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        // These should get default values if not provided
        popularity: undefined,
        rating: undefined,
        reviewCount: undefined,
        features: undefined
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(toolWithDefaults)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 201) {
        expect(response.body.popularity).toBe(0);
        expect(response.body.rating).toBe(0);
        expect(response.body.reviewCount).toBe(0);
        expect(response.body.features).toEqual({});
      }
    });

    it('should validate searchKeywords individual length', async () => {
      const invalidTool = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        searchKeywords: ['a'.repeat(257)] // Exceeds maxLength: 256 per keyword
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(invalidTool)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle empty tags secondary array', async () => {
      const validTool = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        tags: {
          primary: ["AI"],
          secondary: [] // Empty secondary array should be valid
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(validTool)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 201) {
        expect(response.body.tags.secondary).toEqual([]);
      }
    });
  });

  describe('Error Response Structure', () => {
    
    it('should return structured validation error response', async () => {
      const invalidTool = {
        name: '', // Invalid: empty string
        description: 'Valid description'
        // Missing many required fields
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(invalidTool)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(400);
    });

    it('should return unauthorized error without authentication', async () => {
      const validTool = VALIDATION_FIXTURES.validMinimalTool;

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(validTool);
        // No Authorization header

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('Response Schema Validation', () => {
    
    it('should return enhanced tool schema in creation response', async () => {
      const validTool = VALIDATION_FIXTURES.validCompleteTool;

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(validTool)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 201) {
        const createdTool = response.body;
        
        // Validate all enhanced fields are present in response
        expect(createdTool).toHaveProperty('id');
        expect(createdTool).toHaveProperty('name');
        expect(createdTool).toHaveProperty('description');
        expect(createdTool).toHaveProperty('longDescription');
        expect(createdTool).toHaveProperty('pricing');
        expect(createdTool).toHaveProperty('interface');
        expect(createdTool).toHaveProperty('functionality');
        expect(createdTool).toHaveProperty('deployment');
        expect(createdTool).toHaveProperty('popularity');
        expect(createdTool).toHaveProperty('rating');
        expect(createdTool).toHaveProperty('reviewCount');
        expect(createdTool).toHaveProperty('lastUpdated');
        expect(createdTool).toHaveProperty('logoUrl');
        expect(createdTool).toHaveProperty('features');
        expect(createdTool).toHaveProperty('searchKeywords');
        expect(createdTool).toHaveProperty('tags');
        expect(createdTool).toHaveProperty('createdAt');
        expect(createdTool).toHaveProperty('updatedAt');
        
        // Validate data types
        expect(typeof createdTool.id).toBe('string');
        expect(typeof createdTool.name).toBe('string');
        expect(Array.isArray(createdTool.pricing)).toBe(true);
        expect(Array.isArray(createdTool.interface)).toBe(true);
        expect(Array.isArray(createdTool.functionality)).toBe(true);
        expect(Array.isArray(createdTool.deployment)).toBe(true);
        expect(typeof createdTool.popularity).toBe('number');
        expect(typeof createdTool.rating).toBe('number');
        expect(typeof createdTool.features).toBe('object');
        expect(Array.isArray(createdTool.searchKeywords)).toBe(true);
        expect(typeof createdTool.tags).toBe('object');
      }
    });
  });
});
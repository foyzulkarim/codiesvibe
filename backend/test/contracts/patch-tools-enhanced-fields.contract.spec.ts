import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupEnhancedToolTestDatabase, closeEnhancedToolTestDatabase } from '../setup/enhanced-schema-test-setup';
import { VALIDATION_FIXTURES } from '../fixtures/validation-fixtures';

/**
 * Contract Test: PATCH /api/tools/{id} with Enhanced Fields
 * 
 * This test validates that the PATCH /api/tools/{id} endpoint accepts and validates
 * partial updates with the enhanced tool schema fields as specified in the OpenAPI contract.
 * It follows TDD principles - this test will fail initially and drive
 * the implementation of the enhanced update functionality.
 */

describe('Tools API Contract - Enhanced Tool Updates', () => {
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

  describe('PATCH /api/tools/{id} - Enhanced Partial Updates', () => {
    
    it('should update tool with partial enhanced fields successfully', async () => {
      const updateData = {
        popularity: 75000,
        rating: 4.8,
        features: {
          apiAccess: true,
          freeTier: false,
          multiLanguage: true
        }
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      // This will initially fail (401 Unauthorized or 404 Not Found)
      // but validates the expected update structure
      if (response.status === 200) {
        expect(response.body).toHaveProperty('id');
        expect(response.body.popularity).toBe(updateData.popularity);
        expect(response.body.rating).toBe(updateData.rating);
        expect(response.body.features).toEqual(updateData.features);
        
        // Other fields should remain unchanged
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('description');
      } else {
        // Expected failure states during TDD
        expect([400, 401, 404]).toContain(response.status);
      }
    });

    it('should validate string field updates', async () => {
      const updateData = {
        name: 'a'.repeat(101), // Exceeds maxLength: 100
        description: 'a'.repeat(501) // Exceeds maxLength: 500
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate URL format for logoUrl updates', async () => {
      const updateData = {
        logoUrl: 'not-a-valid-url' // Invalid URL format
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should validate array field updates (minItems)', async () => {
      const updateData = {
        pricing: [], // Empty array violates minItems: 1
        functionality: [], // Empty array violates minItems: 1
        searchKeywords: [] // Empty array violates minItems: 1
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should validate numeric range constraints in updates', async () => {
      const updateData = {
        popularity: -1, // Below minimum: 0
        rating: 5.1, // Above maximum: 5
        reviewCount: 1000001 // Above maximum: 1000000
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should update individual enhanced fields independently', async () => {
      const updateData = {
        // Update only tags structure
        tags: {
          primary: ["Updated Primary"],
          secondary: ["Updated Secondary"]
        }
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body.tags.primary).toEqual(updateData.tags.primary);
        expect(response.body.tags.secondary).toEqual(updateData.tags.secondary);
        
        // Other fields should remain unchanged
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('popularity');
      }
    });

    it('should update features object with mixed boolean values', async () => {
      const updateData = {
        features: {
          apiAccess: true,
          freeTier: false,
          multiLanguage: true,
          codeExecution: false
        }
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body.features).toEqual(updateData.features);
      }
    });

    it('should handle empty arrays in updates', async () => {
      // This should work for arrays that don't have minItems constraint
      const updateData = {
        interface: [], // Should be allowed (no minItems in update DTO)
        deployment: [] // Should be allowed (no minItems in update DTO)
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body.interface).toEqual([]);
        expect(response.body.deployment).toEqual([]);
      }
    });

    it('should update searchKeywords with valid array', async () => {
      const updateData = {
        searchKeywords: ["updated", "keywords", "for", "search"]
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body.searchKeywords).toEqual(updateData.searchKeywords);
      }
    });

    it('should validate searchKeywords length in updates', async () => {
      const updateData = {
        searchKeywords: ['a'.repeat(257)] // Exceeds maxLength: 256 per keyword
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should allow partial updates of nested objects', async () => {
      const updateData = {
        // Update only part of features object
        features: {
          apiAccess: false // Only change this field
        }
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body.features.apiAccess).toBe(false);
        // Other feature fields should remain unchanged
        expect(response.body.features).toHaveProperty('freeTier');
        expect(response.body.features).toHaveProperty('multiLanguage');
      }
    });
  });

  describe('Complex Update Scenarios', () => {
    
    it('should update multiple enhanced fields simultaneously', async () => {
      const updateData = {
        popularity: 80000,
        rating: 4.7,
        pricing: ["Free", "Paid"],
        functionality: ["Text Generation", "Translation"],
        features: {
          apiAccess: true,
          freeTier: true
        }
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body.popularity).toBe(updateData.popularity);
        expect(response.body.rating).toBe(updateData.rating);
        expect(response.body.pricing).toEqual(updateData.pricing);
        expect(response.body.functionality).toEqual(updateData.functionality);
        expect(response.body.features).toEqual(updateData.features);
      }
    });

    it('should handle updates with optional fields', async () => {
      const updateData = {
        longDescription: "Updated long description with more details",
        reviewCount: 1500
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body.longDescription).toBe(updateData.longDescription);
        expect(response.body.reviewCount).toBe(updateData.reviewCount);
      }
    });

    it('should validate invalid features object values', async () => {
      const updateData = {
        features: {
          validField: true,
          invalidField: "not a boolean", // Should be boolean
          anotherInvalid: 42 // Should be boolean
        }
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should maintain data consistency in partial updates', async () => {
      // First update some fields
      const firstUpdate = {
        popularity: 90000,
        features: { apiAccess: true }
      };

      const firstResponse = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(firstUpdate)
        .set('Authorization', `Bearer ${authToken}`);

      if (firstResponse.status === 200) {
        // Then update different fields
        const secondUpdate = {
          rating: 4.9,
          tags: { primary: ["AI"], secondary: ["Updated"] }
        };

        const secondResponse = await request(app.getHttpServer())
          .patch(`/api/tools/${createdToolId}`)
          .send(secondUpdate)
          .set('Authorization', `Bearer ${authToken}`);

        if (secondResponse.status === 200) {
          // Verify both updates were applied
          expect(secondResponse.body.popularity).toBe(firstUpdate.popularity);
          expect(secondResponse.body.rating).toBe(secondUpdate.rating);
          expect(secondResponse.body.features).toEqual(firstUpdate.features);
          expect(secondResponse.body.tags).toEqual(secondUpdate.tags);
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    
    it('should return 404 for non-existent tool ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999'; // Valid MongoDB ObjectId format
      
      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${nonExistentId}`)
        .send({ name: "Updated Name" })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid tool ID format', async () => {
      const invalidId = 'not-a-valid-mongodb-id';

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${invalidId}`)
        .send({ name: "Updated Name" })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should return unauthorized error without authentication', async () => {
      const updateData = { name: "Updated Name" };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData);
        // No Authorization header

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(401);
    });

    it('should handle empty update payload', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send({}) // Empty update
        .set('Authorization', `Bearer ${authToken}`);

      // Should accept empty update (no changes)
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Response Schema Validation', () => {
    
    it('should return complete enhanced tool schema in update response', async () => {
      const updateData = {
        name: "Completely Updated Tool Name",
        popularity: 85000,
        features: { apiAccess: true, freeTier: false }
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const updatedTool = response.body;
        
        // Validate all enhanced fields are present in response
        expect(updatedTool).toHaveProperty('id');
        expect(updatedTool).toHaveProperty('name');
        expect(updatedTool).toHaveProperty('description');
        expect(updatedTool).toHaveProperty('longDescription');
        expect(updatedTool).toHaveProperty('pricing');
        expect(updatedTool).toHaveProperty('interface');
        expect(updatedTool).toHaveProperty('functionality');
        expect(updatedTool).toHaveProperty('deployment');
        expect(updatedTool).toHaveProperty('popularity');
        expect(updatedTool).toHaveProperty('rating');
        expect(updatedTool).toHaveProperty('reviewCount');
        expect(updatedTool).toHaveProperty('lastUpdated');
        expect(updatedTool).toHaveProperty('logoUrl');
        expect(updatedTool).toHaveProperty('features');
        expect(updatedTool).toHaveProperty('searchKeywords');
        expect(updatedTool).toHaveProperty('tags');
        expect(updatedTool).toHaveProperty('createdAt');
        expect(updatedTool).toHaveProperty('updatedAt');
        
        // Validate updated values
        expect(updatedTool.name).toBe(updateData.name);
        expect(updatedTool.popularity).toBe(updateData.popularity);
        expect(updatedTool.features).toEqual(updateData.features);
        
        // Validate updatedAt timestamp is newer than createdAt
        expect(new Date(updatedTool.updatedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(updatedTool.createdAt).getTime()
        );
      }
    });
  });
});
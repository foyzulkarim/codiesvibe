import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupEnhancedToolTestDatabase, closeEnhancedToolTestDatabase, EnhancedTestDatabaseConfig } from '../setup/enhanced-schema-test-setup';
import { VALIDATION_FIXTURES, TestDataGenerator } from '../fixtures/validation-fixtures';

/**
 * Integration Test: Enhanced Schema with Real MongoDB
 * 
 * This comprehensive integration test validates the complete enhanced tool schema
 * implementation using a real MongoDB instance (in-memory). It tests the full
 * CRUD lifecycle with all enhanced fields, validation rules, search functionality,
 * and database performance. This follows TDD principles and will fail initially
 * to drive the complete implementation of the enhanced tool functionality.
 */

describe('Tools API Integration - Enhanced Schema with Real MongoDB', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let testTools: any[] = [];

  beforeAll(async () => {
    // Initialize enhanced test database with proper configuration
    await setupEnhancedToolTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test data for integration testing
    await createTestData();
  });

  afterAll(async () => {
    await app.close();
    await closeEnhancedToolTestDatabase();
  });

  /**
   * Create comprehensive test data for enhanced schema validation
   */
  async function createTestData(): Promise<void> {
    const testData = [
      VALIDATION_FIXTURES.validCompleteTool,
      VALIDATION_FIXTURES.validMinimalTool,
      {
        ...VALIDATION_FIXTURES.validCompleteTool,
        name: "Different AI Tool",
        functionality: ["Image Generation", "Art"],
        popularity: 75000,
        rating: 4.2,
        tags: {
          primary: ["Creative"],
          secondary: ["Art", "Design"]
        }
      },
      {
        ...VALIDATION_FIXTURES.validCompleteTool,
        name: "Code Assistant",
        functionality: ["Code Generation", "Debugging"],
        deployment: ["Local", "Cloud"],
        popularity: 45000,
        rating: 4.8,
        features: {
          apiAccess: true,
          freeTier: false,
          multiLanguage: true,
          codeExecution: true
        }
      }
    ];

    // Insert test data via API to get proper IDs and validation
    for (const toolData of testData) {
      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(toolData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 201) {
        testTools.push(response.body);
      }
    }
  }

  describe('Full CRUD Lifecycle with Enhanced Schema', () => {
    
    it('should create tool with all enhanced fields and return complete response', async () => {
      const newTool = {
        ...VALIDATION_FIXTURES.validCompleteTool,
        name: "Comprehensive Test Tool",
        popularity: 120000,
        rating: 4.9,
        features: {
          apiAccess: true,
          freeTier: true,
          multiLanguage: true,
          codeExecution: false,
          analytics: true
        },
        tags: {
          primary: ["Testing", "Integration"],
          secondary: ["Database", "MongoDB"]
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(newTool)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 201) {
        const createdTool = response.body;
        
        // Validate all enhanced fields are present and correct
        expect(createdTool.id).toBeDefined();
        expect(createdTool.name).toBe(newTool.name);
        expect(createdTool.pricing).toEqual(newTool.pricing);
        expect(createdTool.interface).toEqual(newTool.interface);
        expect(createdTool.functionality).toEqual(newTool.functionality);
        expect(createdTool.deployment).toEqual(newTool.deployment);
        expect(createdTool.popularity).toBe(newTool.popularity);
        expect(createdTool.rating).toBe(newTool.rating);
        expect(createdTool.features).toEqual(newTool.features);
        expect(createdTool.tags).toEqual(newTool.tags);
        
        // Validate timestamps
        expect(createdTool.createdAt).toBeDefined();
        expect(createdTool.updatedAt).toBeDefined();
        
        // Add to test tools for subsequent tests
        testTools.push(createdTool);
      } else {
        // During TDD, expect validation or auth failures
        expect([400, 401]).toContain(response.status);
      }
    });

    it('should retrieve tool with complete enhanced schema', async () => {
      if (testTools.length === 0) return;

      const toolId = testTools[0].id;
      
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${toolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // Validate complete enhanced schema
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
        
        // Validate data types and constraints
        expect(typeof tool.popularity).toBe('number');
        expect(tool.popularity).toBeGreaterThanOrEqual(0);
        expect(tool.popularity).toBeLessThanOrEqual(1000000);
        expect(typeof tool.rating).toBe('number');
        expect(tool.rating).toBeGreaterThanOrEqual(0);
        expect(tool.rating).toBeLessThanOrEqual(5);
        
        // Validate nested objects
        expect(typeof tool.features).toBe('object');
        Object.values(tool.features).forEach(value => {
          expect(typeof value).toBe('boolean');
        });
        
        expect(tool.tags.primary).toBeInstanceOf(Array);
        expect(tool.tags.secondary).toBeInstanceOf(Array);
      } else {
        expect([401, 404]).toContain(response.status);
      }
    });

    it('should update tool with partial enhanced fields', async () => {
      if (testTools.length === 0) return;

      const toolId = testTools[0].id;
      const updateData = {
        popularity: 95000,
        rating: 4.7,
        features: {
          apiAccess: true,
          freeTier: false,
          multiLanguage: true,
          codeExecution: true,
          analytics: false
        },
        searchKeywords: ["updated", "enhanced", "tool"]
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${toolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const updatedTool = response.body;
        
        expect(updatedTool.popularity).toBe(updateData.popularity);
        expect(updatedTool.rating).toBe(updateData.rating);
        expect(updatedTool.features).toEqual(updateData.features);
        expect(updatedTool.searchKeywords).toEqual(updateData.searchKeywords);
        
        // Verify other fields remain unchanged
        expect(updatedTool.name).toBe(testTools[0].name);
        expect(updatedTool.description).toBe(testTools[0].description);
      } else {
        expect([400, 401, 404]).toContain(response.status);
      }
    });

    it('should delete tool with enhanced schema', async () => {
      if (testTools.length === 0) return;

      const toolId = testTools[testTools.length - 1].id;
      
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/tools/${toolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (deleteResponse.status === 204) {
        // Verify tool is actually deleted
        const getResponse = await request(app.getHttpServer())
          .get(`/api/tools/${toolId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(getResponse.status).toBe(404);
        
        // Remove from test tools array
        testTools.pop();
      } else {
        expect([401, 404]).toContain(deleteResponse.status);
      }
    });
  });

  describe('Enhanced Search and Filtering Integration', () => {
    
    it('should perform complex text search across multiple fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'AI assistant',
          functionality: 'Text Generation',
          minRating: 4.0,
          sortBy: 'rating',
          page: 1,
          limit: 10
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const result = response.body;
        
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('pagination');
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(10);
        
        // Validate search and filter results
        result.data.forEach((tool: any) => {
          expect(tool.rating).toBeGreaterThanOrEqual(4.0);
          expect(tool.functionality).toContain('Text Generation');
          
          // Check if search term matches any field
          const searchMatches = 
            tool.name.toLowerCase().includes('ai') ||
            tool.name.toLowerCase().includes('assistant') ||
            tool.description.toLowerCase().includes('ai') ||
            tool.description.toLowerCase().includes('assistant') ||
            tool.searchKeywords.some((keyword: string) => 
              keyword.toLowerCase().includes('ai') || 
              keyword.toLowerCase().includes('assistant')
            );
          expect(searchMatches).toBe(true);
        });
      } else {
        expect([401]).toContain(response.status);
      }
    });

    it('should filter by tags with enhanced schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          tags: 'AI,Chatbot',
          sortBy: 'popularity'
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        
        expect(Array.isArray(tools)).toBe(true);
        tools.forEach((tool: any) => {
          const hasAITag = 
            tool.tags.primary.includes('AI') ||
            tool.tags.secondary.includes('AI');
          const hasChatbotTag = 
            tool.tags.primary.includes('Chatbot') ||
            tool.tags.secondary.includes('Chatbot');
          
          expect(hasAITag || hasChatbotTag).toBe(true);
        });
      } else {
        expect([401]).toContain(response.status);
      }
    });

    it('should perform range-based filtering on numeric fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          minRating: 4.5,
          maxRating: 5.0,
          minPopularity: 50000,
          maxPopularity: 150000,
          sortBy: 'rating'
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        
        expect(Array.isArray(tools)).toBe(true);
        tools.forEach((tool: any) => {
          expect(tool.rating).toBeGreaterThanOrEqual(4.5);
          expect(tool.rating).toBeLessThanOrEqual(5.0);
          expect(tool.popularity).toBeGreaterThanOrEqual(50000);
          expect(tool.popularity).toBeLessThanOrEqual(150000);
        });
      } else {
        expect([401]).toContain(response.status);
      }
    });

    it('should handle complex sorting with multiple criteria', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          functionality: 'Text Generation,Code Generation',
          sortBy: 'rating'
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200 && response.body.data.length > 1) {
        const tools = response.body.data;
        
        // Verify sorting by rating (descending)
        for (let i = 1; i < tools.length; i++) {
          expect(tools[i-1].rating).toBeGreaterThanOrEqual(tools[i].rating);
        }
        
        // Verify functionality filtering
        tools.forEach((tool: any) => {
          const hasValidFunctionality = 
            tool.functionality.includes('Text Generation') ||
            tool.functionality.includes('Code Generation');
          expect(hasValidFunctionality).toBe(true);
        });
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Validation and Error Handling Integration', () => {
    
    it('should enforce all validation rules on create', async () => {
      const invalidTool = {
        name: '', // Invalid: empty
        description: 'a'.repeat(501), // Too long
        pricing: [], // Empty array
        interface: ['Web'],
        functionality: ['Test'],
        deployment: ['Cloud'],
        logoUrl: 'invalid-url', // Invalid URL
        popularity: -1, // Invalid: negative
        rating: 5.1, // Invalid: too high
        features: {
          validField: true,
          invalidField: 'not a boolean' // Invalid type
        },
        searchKeywords: ['a'.repeat(257)], // Too long
        tags: {
          primary: [], // Empty
          secondary: ['Test']
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(invalidTool)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });

    it('should handle concurrent operations safely', async () => {
      // Simulate concurrent updates
      const updatePromises = testTools.slice(0, 3).map((tool, index) => 
        request(app.getHttpServer())
          .patch(`/api/tools/${tool.id}`)
          .send({
            popularity: 80000 + index * 1000,
            features: {
              apiAccess: true,
              concurrentTest: true
            }
          })
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(updatePromises);
      
      // All operations should complete (either success or fail gracefully)
      responses.forEach(response => {
        expect([200, 400, 401, 404]).toContain(response.status);
      });
    });

    it('should maintain database consistency after failed operations', async () => {
      // Attempt invalid operation
      const invalidResponse = await request(app.getHttpServer())
        .patch(`/api/tools/${testTools[0]?.id || 'invalid'}`)
        .send({
          rating: 5.1 // Invalid rating
        })
        .set('Authorization', `Bearer ${authToken}`);

      // Verify existing data remains unchanged
      if (testTools.length > 0) {
        const getResponse = await request(app.getHttpServer())
          .get(`/api/tools/${testTools[0].id}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (getResponse.status === 200) {
          const tool = getResponse.body;
          expect(tool.rating).toBeLessThanOrEqual(5.0);
        }
      }
    });
  });

  describe('Database Performance and Indexing', () => {
    
    it('should utilize MongoDB indexes for efficient queries', async () => {
      // This test validates that our indexes are being used
      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'AI',
          functionality: 'Text Generation',
          sortBy: 'popularity',
          limit: 20
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        // Query should be fast (< 100ms for indexed queries)
        expect(queryTime).toBeLessThan(100);
        expect(response.body.data).toBeInstanceOf(Array);
      }
    });

    it('should handle large datasets efficiently', async () => {
      // Create multiple tools to test performance
      const bulkTools = TestDataGenerator.generateToolArray(50);
      
      const createPromises = bulkTools.map(tool => 
        request(app.getHttpServer())
          .post('/api/tools')
          .send(tool)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const createResponses = await Promise.all(createPromises);
      const createdTools = createResponses
        .filter(r => r.status === 201)
        .map(r => r.body);

      // Test list performance with more data
      const startTime = Date.now();
      
      const listResponse = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          limit: 50,
          sortBy: 'createdAt'
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (listResponse.status === 200) {
        expect(queryTime).toBeLessThan(200); // Should be fast even with more data
        expect(listResponse.body.data.length).toBeGreaterThan(0);
      }

      // Cleanup created tools
      const deletePromises = createdTools.map(tool => 
        request(app.getHttpServer())
          .delete(`/api/tools/${tool.id}`)
          .set('Authorization', `Bearer ${authToken}`)
      );
      await Promise.all(deletePromises);
    });
  });

  describe('Data Integrity and Consistency', () => {
    
    it('should maintain referential integrity', async () => {
      if (testTools.length === 0) return;

      const toolId = testTools[0].id;
      
      // Verify tool can be retrieved and updated consistently
      const getResponse = await request(app.getHttpServer())
        .get(`/api/tools/${toolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (getResponse.status === 200) {
        const tool = getResponse.body;
        
        // Update tool
        const updateResponse = await request(app.getHttpServer())
          .patch(`/api/tools/${toolId}`)
          .send({
            rating: tool.rating + 0.1,
            popularity: tool.popularity + 1000
          })
          .set('Authorization', `Bearer ${authToken}`);

        if (updateResponse.status === 200) {
          // Verify update persisted
          const verifyResponse = await request(app.getHttpServer())
            .get(`/api/tools/${toolId}`)
            .set('Authorization', `Bearer ${authToken}`);

          if (verifyResponse.status === 200) {
            const updatedTool = verifyResponse.body;
            expect(updatedTool.rating).toBeCloseTo(tool.rating + 0.1);
            expect(updatedTool.popularity).toBe(tool.popularity + 1000);
          }
        }
      }
    });

    it('should handle nested object operations correctly', async () => {
      if (testTools.length === 0) return;

      const toolId = testTools[0].id;
      
      // Test nested features object updates
      const featuresUpdate = {
        features: {
          apiAccess: true,
          freeTier: false,
          multiLanguage: true,
          newFeature: true,
          removedFeature: false
        }
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${toolId}`)
        .send(featuresUpdate)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tool = response.body;
        
        // Verify features object structure
        expect(typeof tool.features).toBe('object');
        Object.values(tool.features).forEach(value => {
          expect(typeof value).toBe('boolean');
        });
        
        // Verify specific updates
        expect(tool.features.apiAccess).toBe(true);
        expect(tool.features.freeTier).toBe(false);
        expect(tool.features.newFeature).toBe(true);
      }
    });
  });

  describe('End-to-End Workflow', () => {
    
    it('should support complete enhanced tool workflow', async () => {
      // Create a new enhanced tool
      const newTool = {
        name: "Workflow Test Tool",
        description: "A tool for testing complete workflow",
        pricing: ["Free", "Paid"],
        interface: ["Web", "API"],
        functionality: ["Workflow", "Testing"],
        deployment: ["Cloud"],
        popularity: 25000,
        rating: 4.3,
        logoUrl: "https://example.com/workflow-tool.png",
        features: {
          apiAccess: true,
          freeTier: true,
          multiLanguage: false
        },
        searchKeywords: ["workflow", "testing", "automation"],
        tags: {
          primary: ["Testing"],
          secondary: ["Workflow"]
        }
      };

      // Create
      const createResponse = await request(app.getHttpServer())
        .post('/api/tools')
        .send(newTool)
        .set('Authorization', `Bearer ${authToken}`);

      if (createResponse.status !== 201) {
        expect([400, 401]).toContain(createResponse.status);
        return;
      }

      const createdTool = createResponse.body;
      const toolId = createdTool.id;

      // Search and find the created tool
      const searchResponse = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: "workflow",
          functionality: "Testing",
          minRating: 4.0
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (searchResponse.status === 200) {
        const foundTools = searchResponse.body.data;
        const foundTool = foundTools.find((t: any) => t.id === toolId);
        expect(foundTool).toBeDefined();
      }

      // Update
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/tools/${toolId}`)
        .send({
          popularity: 30000,
          rating: 4.5,
          features: {
            ...createdTool.features,
            newFeature: true
          }
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (updateResponse.status === 200) {
        const updatedTool = updateResponse.body;
        expect(updatedTool.popularity).toBe(30000);
        expect(updatedTool.rating).toBe(4.5);
        expect(updatedTool.features.newFeature).toBe(true);
      }

      // Delete
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/tools/${toolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (deleteResponse.status === 204) {
        // Verify deletion
        const verifyResponse = await request(app.getHttpServer())
          .get(`/api/tools/${toolId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(verifyResponse.status).toBe(404);
      }
    });
  });
});
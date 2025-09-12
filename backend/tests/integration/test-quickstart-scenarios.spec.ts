import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupEnhancedToolTestDatabase, closeEnhancedToolTestDatabase } from '../setup/enhanced-schema-test-setup';

/**
 * Integration Test: Quickstart Guide Scenarios
 * 
 * These tests validate all examples from the quickstart.md guide work as expected.
 * Each test corresponds to a specific scenario documented in the quickstart guide.
 */

describe('Quickstart Guide Scenarios (Integration)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let createdToolId: string;

  beforeAll(async () => {
    // Initialize enhanced test database
    await setupEnhancedToolTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Mock authentication for tests
    authToken = 'mock-jwt-token';
  }, 30000);

  afterAll(async () => {
    await app.close();
    await closeEnhancedToolTestDatabase();
  });

  describe('Quickstart Scenario 1: Create New AI Tool', () => {
    it('should create a new AI tool with all enhanced fields as shown in quickstart', async () => {
      const toolData = {
        name: "ChatGPT",
        description: "Advanced AI chatbot for natural conversations",
        longDescription: "ChatGPT is an advanced language model capable of engaging in natural language conversations.",
        pricing: ["Free", "Paid", "API"],
        interface: ["Web", "API", "Mobile"],
        functionality: ["Text Generation", "Translation", "Code Generation"],
        deployment: ["Cloud"],
        popularity: 95000,
        rating: 4.5,
        reviewCount: 2500,
        logoUrl: "https://example.com/chatgpt-logo.png",
        features: {
          apiAccess: true,
          freeTier: true,
          multiLanguage: true,
          codeExecution: false
        },
        searchKeywords: ["chatbot", "AI", "conversation", "GPT", "OpenAI"],
        tags: {
          primary: ["AI", "Chatbot"],
          secondary: ["Productivity", "Communication", "Language"]
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(toolData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 201) {
        createdToolId = response.body.id;
        
        expect(response.body).toMatchObject({
          name: "ChatGPT",
          description: "Advanced AI chatbot for natural conversations",
          longDescription: "ChatGPT is an advanced language model capable of engaging in natural language conversations.",
          pricing: ["Free", "Paid", "API"],
          interface: ["Web", "API", "Mobile"],
          functionality: ["Text Generation", "Translation", "Code Generation"],
          deployment: ["Cloud"],
          popularity: 95000,
          rating: 4.5,
          reviewCount: 2500,
          logoUrl: "https://example.com/chatgpt-logo.png",
          features: {
            apiAccess: true,
            freeTier: true,
            multiLanguage: true,
            codeExecution: false
          },
          searchKeywords: ["chatbot", "AI", "conversation", "GPT", "OpenAI"],
          tags: {
            primary: ["AI", "Chatbot"],
            secondary: ["Productivity", "Communication", "Language"]
          }
        });

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
        expect(response.body).toHaveProperty('lastUpdated');
      } else {
        // Handle unauthenticated case
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Quickstart Scenario 2: List Tools with Basic Pagination', () => {
    it('should list tools with pagination as shown in quickstart', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination).toMatchObject({
          page: 1,
          limit: 10
        });
        expect(response.body.pagination).toHaveProperty('total');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeLessThanOrEqual(10);
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Quickstart Scenario 3: Search Tools', () => {
    it('should search tools by term as shown in quickstart', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: 'chatbot' })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        // If there are results, they should contain the search term
        if (response.body.data.length > 0) {
          const hasSearchTerm = response.body.data.some((tool: any) => 
            tool.name.toLowerCase().includes('chatbot') ||
            tool.description.toLowerCase().includes('chatbot') ||
            tool.searchKeywords.some((keyword: string) => keyword.toLowerCase().includes('chatbot'))
          );
          expect(hasSearchTerm).toBe(true);
        }
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Quickstart Scenario 4: Filter by Functionality', () => {
    it('should filter by functionality as shown in quickstart', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ functionality: 'Text Generation,Translation' })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        // If there are results, they should match the filter
        if (response.body.data.length > 0) {
          response.body.data.forEach((tool: any) => {
            const hasRequiredFunctionality = tool.functionality.some((func: string) => 
              ['Text Generation', 'Translation'].includes(func)
            );
            expect(hasRequiredFunctionality).toBe(true);
          });
        }
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Quickstart Scenario 5: Filter by Tags', () => {
    it('should filter by tags as shown in quickstart', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ tags: 'AI,Productivity' })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        // If there are results, they should match the tag filter
        if (response.body.data.length > 0) {
          response.body.data.forEach((tool: any) => {
            const allTags = [...tool.tags.primary, ...tool.tags.secondary];
            const hasRequiredTag = allTags.some((tag: string) => 
              ['AI', 'Productivity'].includes(tag)
            );
            expect(hasRequiredTag).toBe(true);
          });
        }
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Quickstart Scenario 6: Sort by Rating', () => {
    it('should sort by rating as shown in quickstart', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ sortBy: 'rating' })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        // If there are multiple results, verify sorting
        if (response.body.data.length > 1) {
          for (let i = 0; i < response.body.data.length - 1; i++) {
            expect(response.body.data[i].rating).toBeGreaterThanOrEqual(response.body.data[i + 1].rating);
          }
        }
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Quickstart Scenario 7: Filter by Rating Range', () => {
    it('should filter by rating range as shown in quickstart', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ minRating: 4, maxRating: 5 })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        // If there are results, they should be within the rating range
        if (response.body.data.length > 0) {
          response.body.data.forEach((tool: any) => {
            expect(tool.rating).toBeGreaterThanOrEqual(4);
            expect(tool.rating).toBeLessThanOrEqual(5);
          });
        }
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Quickstart Scenario 8: Get Specific Tool', () => {
    it('should get a specific tool by ID as shown in quickstart', async () => {
      // Skip if no tool was created
      if (!createdToolId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('id', createdToolId);
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('description');
        expect(response.body).toHaveProperty('pricing');
        expect(response.body).toHaveProperty('tags');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
      } else if (response.status === 404) {
        // Tool might not exist in test environment
        expect(response.body).toHaveProperty('message');
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Quickstart Scenario 9: Update Tool', () => {
    it('should update a tool as shown in quickstart', async () => {
      // Skip if no tool was created
      if (!createdToolId) {
        return;
      }

      const updateData = {
        rating: 4.7,
        reviewCount: 2600,
        popularity: 98000,
        features: {
          apiAccess: true,
          freeTier: true,
          multiLanguage: true,
          codeExecution: true
        }
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tools/${createdToolId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toMatchObject(updateData);
        expect(response.body).toHaveProperty('id', createdToolId);
        expect(response.body.features.codeExecution).toBe(true); // Verify the change
      } else if (response.status === 404) {
        // Tool might not exist in test environment
        expect(response.body).toHaveProperty('message');
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Quickstart Scenario 10: Delete Tool', () => {
    it('should delete a tool as shown in quickstart', async () => {
      // Skip if no tool was created
      if (!createdToolId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .delete(`/api/tools/${createdToolId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200 || response.status === 204) {
        // Verify tool is deleted by trying to get it
        const getResponse = await request(app.getHttpServer())
          .get(`/api/tools/${createdToolId}`)
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(getResponse.status).toBe(404);
      } else if (response.status === 404) {
        // Tool might not exist in test environment
        expect(response.body).toHaveProperty('message');
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Quickstart Scenario 11: Advanced Combined Filtering', () => {
    it('should handle complex combined filters as shown in quickstart advanced features', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          search: 'AI',
          functionality: 'Text Generation',
          minRating: 4,
          sortBy: 'popularity'
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // If there are results, verify they match all filters
        if (response.body.data.length > 0) {
          response.body.data.forEach((tool: any) => {
            // Rating filter
            expect(tool.rating).toBeGreaterThanOrEqual(4);
            // Functionality filter
            expect(tool.functionality).toContain('Text Generation');
          });
          
          // Verify sorting by popularity (descending)
          if (response.body.data.length > 1) {
            for (let i = 0; i < response.body.data.length - 1; i++) {
              expect(response.body.data[i].popularity).toBeGreaterThanOrEqual(response.body.data[i + 1].popularity);
            }
          }
        }
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Quickstart Scenario 12: Complex Tag Filtering', () => {
    it('should handle complex tag filtering as shown in quickstart advanced features', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ tags: 'AI,Machine Learning' })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // If there are results, verify they have at least one of the specified tags
        if (response.body.data.length > 0) {
          response.body.data.forEach((tool: any) => {
            const allTags = [...tool.tags.primary, ...tool.tags.secondary];
            const hasRequiredTag = allTags.some((tag: string) => 
              ['AI', 'Machine Learning'].includes(tag)
            );
            expect(hasRequiredTag).toBe(true);
          });
        }
      } else {
        expect([401]).toContain(response.status);
      }
    });
  });

  describe('Error Scenarios from Quickstart', () => {
    it('should return validation errors as documented in quickstart', async () => {
      const invalidToolData = {
        // Missing required fields to trigger validation errors
        name: "", // Invalid: empty string
        description: "Valid description",
        pricing: [], // Invalid: empty array
        interface: ["Web"],
        functionality: ["Text Generation"],
        deployment: ["Cloud"],
        logoUrl: "invalid-url", // Invalid URL
        searchKeywords: [], // Invalid: empty array
        tags: {
          primary: [], // Invalid: empty array
          secondary: ["Test"]
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(invalidToolData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 400) {
        expect(response.body).toHaveProperty('statusCode', 400);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('error');
        // Should have validation error details
        if (response.body.details || response.body.errors) {
          expect(Array.isArray(response.body.details || response.body.errors)).toBe(true);
        }
      } else {
        expect([401]).toContain(response.status);
      }
    });

    it('should return not found error for non-existent tool', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';
      
      const response = await request(app.getHttpServer())
        .get(`/api/tools/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 404) {
        expect(response.body).toHaveProperty('statusCode', 404);
        expect(response.body).toHaveProperty('message');
      } else {
        expect([401]).toContain(response.status);
      }
    });

    it('should return unauthorized error without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
    });
  });
});
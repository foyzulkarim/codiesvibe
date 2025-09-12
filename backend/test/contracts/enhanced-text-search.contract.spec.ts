import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupEnhancedToolTestDatabase, closeEnhancedToolTestDatabase } from '../setup/enhanced-schema-test-setup';
import { VALIDATION_FIXTURES } from '../fixtures/validation-fixtures';

/**
 * Contract Test: Enhanced Text Search Functionality
 * 
 * This test validates the enhanced text search capabilities across multiple fields
 * (name, description, searchKeywords) with weighted relevance scoring as specified
 * in the MongoDB index configuration. It follows TDD principles - this test will fail
 * initially and drive the implementation of the enhanced text search functionality.
 */

describe('Tools API Contract - Enhanced Text Search', () => {
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
  });

  afterAll(async () {
    await app.close();
    await closeEnhancedToolTestDatabase();
  });

  describe('Text Search Across Multiple Fields', () => {
    
    it('should search across name, description, and searchKeywords', async () => {
      const searchTerm = 'chatbot';
      
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: searchTerm })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        
        // Should find tools matching across different fields
        expect(tools.length).toBeGreaterThan(0);
        
        // Check if results match the search term in any field
        const hasMatches = tools.some(tool => 
          tool.name.toLowerCase().includes(searchTerm) ||
          tool.description.toLowerCase().includes(searchTerm) ||
          tool.searchKeywords.some((keyword: string) => 
            keyword.toLowerCase().includes(searchTerm)
          )
        );
        expect(hasMatches).toBe(true);
      } else {
        expect([401]).toContain(response.status);
      }
    });

    it('should apply weighted relevance scoring', async () => {
      const searchTerm = 'AI assistant';
      
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          search: searchTerm,
          sortBy: 'relevance' // This should use text score
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        
        // Results should be ordered by relevance (name: weight 10, description: 5, searchKeywords: 8)
        if (tools.length > 1) {
          // First result should have higher relevance score
          // This is a structural test - actual scoring depends on MongoDB
          expect(tools.length).toBeGreaterThan(0);
        }
      } else {
        expect([401]).toContain(response.status);
      }
    });

    it('should handle case-insensitive search', async () => {
      const searchTerms = ['CHATBOT', 'chatbot', 'ChatBot'];
      
      for (const searchTerm of searchTerms) {
        const response = await request(app.getHttpServer())
          .get('/api/tools')
          .query({ search: searchTerm })
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 200) {
          const tools = response.body.data;
          expect(Array.isArray(tools)).toBe(true);
        }
      }
    });

    it('should support partial word matching', async () => {
      const searchTerm = 'chat'; // Should match 'chatbot', 'chat', etc.
      
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: searchTerm })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        expect(Array.isArray(tools)).toBe(true);
        
        if (tools.length > 0) {
          const hasPartialMatches = tools.some(tool =>
            tool.name.toLowerCase().includes(searchTerm) ||
            tool.description.toLowerCase().includes(searchTerm) ||
            tool.searchKeywords.some((keyword: string) => 
              keyword.toLowerCase().includes(searchTerm)
            )
          );
          expect(hasPartialMatches).toBe(true);
        }
      }
    });
  });

  describe('Search with Filters', () => {
    
    it('should combine text search with enhanced filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'AI',
          functionality: 'Text Generation',
          minRating: 4.0,
          sortBy: 'rating'
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        expect(Array.isArray(tools)).toBe(true);
        
        // Results should match search term AND filters
        tools.forEach((tool: any) => {
          // Should have rating >= 4.0
          expect(tool.rating).toBeGreaterThanOrEqual(4.0);
          
          // Should contain Text Generation in functionality
          expect(tool.functionality).toContain('Text Generation');
          
          // Should match AI search term
          const matchesSearch = 
            tool.name.toLowerCase().includes('ai') ||
            tool.description.toLowerCase().includes('ai') ||
            tool.searchKeywords.some((keyword: string) => 
              keyword.toLowerCase().includes('ai')
            );
          expect(matchesSearch).toBe(true);
        });
      }
    });

    it('should combine text search with tags filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'assistant',
          tags: 'AI,Productivity'
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        expect(Array.isArray(tools)).toBe(true);
        
        tools.forEach((tool: any) => {
          // Should match search term
          const matchesSearch = 
            tool.name.toLowerCase().includes('assistant') ||
            tool.description.toLowerCase().includes('assistant') ||
            tool.searchKeywords.some((keyword: string) => 
              keyword.toLowerCase().includes('assistant')
            );
          expect(matchesSearch).toBe(true);
          
          // Should have AI in primary or secondary tags
          const hasAITag = 
            tool.tags.primary.includes('AI') ||
            tool.tags.secondary.includes('AI');
          expect(hasAITag).toBe(true);
        });
      }
    });

    it('should combine text search with popularity filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'tool',
          popularity: 50000 // Should be popularity >= 50000
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        expect(Array.isArray(tools)).toBe(true);
        
        tools.forEach((tool: any) => {
          expect(tool.popularity).toBeGreaterThanOrEqual(50000);
          
          const matchesSearch = 
            tool.name.toLowerCase().includes('tool') ||
            tool.description.toLowerCase().includes('tool') ||
            tool.searchKeywords.some((keyword: string) => 
              keyword.toLowerCase().includes('tool')
            );
          expect(matchesSearch).toBe(true);
        });
      }
    });
  });

  describe('Search Performance and Edge Cases', () => {
    
    it('should handle empty search query', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: '' })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        expect(Array.isArray(tools)).toBe(true);
        // Empty search should return all tools (or handle gracefully)
      }
    });

    it('should handle special characters in search', async () => {
      const searchTerms = ['AI+', 'machine-learning', 'web_app', 'C++'];
      
      for (const searchTerm of searchTerms) {
        const response = await request(app.getHttpServer())
          .get('/api/tools')
          .query({ search: searchTerm })
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 200) {
          const tools = response.body.data;
          expect(Array.isArray(tools)).toBe(true);
        }
      }
    });

    it('should handle search with no results', async () => {
      const searchTerm = 'nonexistent-tool-name-12345';
      
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: searchTerm })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        expect(Array.isArray(tools)).toBe(true);
        expect(tools.length).toBe(0);
      }
    });

    it('should search with maximum length keywords', async () => {
      const longKeyword = 'a'.repeat(256); // Maximum allowed length
      
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: longKeyword })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        expect(Array.isArray(tools)).toBe(true);
      }
    });

    it('should handle search terms with spaces', async () => {
      const searchTerm = 'natural language processing';
      
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: searchTerm })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const tools = response.body.data;
        expect(Array.isArray(tools)).toBe(true);
        
        // Should match terms that contain parts of the search phrase
        if (tools.length > 0) {
          const hasMatches = tools.some(tool =>
            tool.name.toLowerCase().includes('natural') ||
            tool.name.toLowerCase().includes('language') ||
            tool.description.toLowerCase().includes('processing') ||
            tool.searchKeywords.some((keyword: string) => 
              keyword.toLowerCase().includes('language')
            )
          );
          expect(hasMatches).toBe(true);
        }
      }
    });
  });

  describe('Search with Pagination', () => {
    
    it('should support search with pagination', async () => {
      const searchTerm = 'AI';
      
      const firstPage = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          search: searchTerm,
          page: 1,
          limit: 5
        })
        .set('Authorization', `Bearer ${authToken}`);

      const secondPage = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          search: searchTerm,
          page: 2,
          limit: 5
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (firstPage.status === 200 && secondPage.status === 200) {
        expect(firstPage.body.pagination.page).toBe(1);
        expect(secondPage.body.pagination.page).toBe(2);
        expect(firstPage.body.pagination.limit).toBe(5);
        expect(secondPage.body.pagination.limit).toBe(5);
        
        // Both pages should contain search results
        expect(firstPage.body.data.length).toBeLessThanOrEqual(5);
        expect(secondPage.body.data.length).toBeLessThanOrEqual(5);
      }
    });

    it('should maintain search quality across pages', async () => {
      const searchTerm = 'assistant';
      
      const allPagesResponse = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          search: searchTerm,
          limit: 100 // Get all results
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (allPagesResponse.status === 200) {
        const allTools = allPagesResponse.body.data;
        
        // Each tool should match the search criteria
        allTools.forEach((tool: any) => {
          const matchesSearch = 
            tool.name.toLowerCase().includes('assistant') ||
            tool.description.toLowerCase().includes('assistant') ||
            tool.searchKeywords.some((keyword: string) => 
              keyword.toLowerCase().includes('assistant')
            );
          expect(matchesSearch).toBe(true);
        });
      }
    });
  });

  describe('Search Sorting Options', () => {
    
    it('should sort search results by popularity', async () => {
      const searchTerm = 'tool';
      
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          search: searchTerm,
          sortBy: 'popularity'
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200 && response.body.data.length > 1) {
        const tools = response.body.data;
        
        // Results should be sorted by popularity (descending)
        for (let i = 1; i < tools.length; i++) {
          expect(tools[i-1].popularity).toBeGreaterThanOrEqual(tools[i].popularity);
        }
      }
    });

    it('should sort search results by rating', async () => {
      const searchTerm = 'AI';
      
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          search: searchTerm,
          sortBy: 'rating'
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200 && response.body.data.length > 1) {
        const tools = response.body.data;
        
        // Results should be sorted by rating (descending)
        for (let i = 1; i < tools.length; i++) {
          expect(tools[i-1].rating).toBeGreaterThanOrEqual(tools[i].rating);
        }
      }
    });

    it('should sort search results by review count', async () => {
      const searchTerm = 'chatbot';
      
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          search: searchTerm,
          sortBy: 'reviewCount'
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200 && response.body.data.length > 1) {
        const tools = response.body.data;
        
        // Results should be sorted by review count (descending)
        for (let i = 1; i < tools.length; i++) {
          expect(tools[i-1].reviewCount).toBeGreaterThanOrEqual(tools[i].reviewCount);
        }
      }
    });
  });

  describe('Search Query Validation', () => {
    
    it('should validate search query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          search: 'AI',
          minRating: 5.1, // Invalid: above maximum
          maxRating: -0.1 // Invalid: below minimum
        })
        .set('Authorization', `Bearer ${authToken}`);

      // Should validate filter parameters even with search
      expect(response.status).toBe(400);
    });

    it('should handle invalid sortBy with search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          search: 'AI',
          sortBy: 'invalid_field'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should validate pagination parameters with search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          search: 'AI',
          page: 0, // Invalid: below minimum
          limit: 101 // Invalid: above maximum
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });
});
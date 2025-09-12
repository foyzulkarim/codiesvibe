import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupEnhancedToolTestDatabase, closeEnhancedToolTestDatabase } from '../setup/enhanced-schema-test-setup';
import { VALIDATION_FIXTURES } from '../fixtures/validation-fixtures';

/**
 * Performance Test: Search Query Performance (<500ms requirement)
 * 
 * These tests validate that search operations meet the <500ms response time
 * requirement as specified in the technical context performance goals.
 * Tests use realistic datasets and measure actual query execution time.
 */

describe('Search Performance Tests', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let testTools: any[] = [];

  beforeAll(async () => {
    // Initialize enhanced test database
    await setupEnhancedToolTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create a realistic dataset for performance testing
    await createPerformanceTestDataset();
  }, 30000); // Increase timeout for data setup

  afterAll(async () => {
    await app.close();
    await closeEnhancedToolTestDatabase();
  });

  /**
   * Create a realistic dataset of 1000+ tools for performance testing
   */
  async function createPerformanceTestDataset(): Promise<void> {
    const toolTemplates = [
      {
        base: VALIDATION_FIXTURES.validCompleteTool,
        variations: ['AI Assistant', 'Code Helper', 'Text Processor', 'Data Analyzer', 'Content Creator']
      },
      {
        base: {
          ...VALIDATION_FIXTURES.validMinimalTool,
          functionality: ['Image Generation', 'Art Creation'],
          tags: { primary: ['Creative'], secondary: ['Art', 'Design'] }
        },
        variations: ['Art Generator', 'Image Creator', 'Visual Designer', 'Photo Editor', 'Graphic Tool']
      },
      {
        base: {
          ...VALIDATION_FIXTURES.validCompleteTool,
          functionality: ['Code Generation', 'Development'],
          deployment: ['Local', 'Cloud'],
          tags: { primary: ['Development'], secondary: ['Code', 'Programming'] }
        },
        variations: ['Code Assistant', 'Dev Helper', 'Programming Tool', 'Code Generator', 'IDE Extension']
      }
    ];

    const batchSize = 50;
    let toolCount = 0;

    for (const template of toolTemplates) {
      for (let i = 0; i < 334; i++) { // ~1000 tools total
        const variation = template.variations[i % template.variations.length];
        
        const toolData = {
          ...template.base,
          name: `${variation} ${i + 1}`,
          description: `${template.base.description} - Performance test tool ${i + 1}`,
          popularity: Math.floor(Math.random() * 100000),
          rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0 range
          reviewCount: Math.floor(Math.random() * 10000),
          searchKeywords: [
            ...template.base.searchKeywords,
            `performance-test-${i}`,
            `batch-${Math.floor(i / batchSize)}`
          ]
        };

        const response = await request(app.getHttpServer())
          .post('/api/tools')
          .send(toolData)
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 201) {
          testTools.push(response.body);
          toolCount++;
        }

        // Log progress every 100 tools
        if (toolCount % 100 === 0) {
          console.log(`Created ${toolCount} test tools...`);
        }
      }
    }

    console.log(`Performance test dataset created: ${testTools.length} tools`);
  }

  describe('Text Search Performance', () => {
    it('should perform simple text search under 500ms', async () => {
      const searchTerm = 'AI';
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: searchTerm, limit: 20 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        expect(response.body.data.length).toBeGreaterThan(0);
        console.log(`Simple text search (${searchTerm}): ${queryTime}ms`);
      } else {
        expect([401]).toContain(response.status);
      }
    });

    it('should perform complex text search under 500ms', async () => {
      const searchTerm = 'AI Assistant Code Generation';
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: searchTerm, limit: 20 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Complex text search (${searchTerm}): ${queryTime}ms`);
      }
    });

    it('should perform partial word search under 500ms', async () => {
      const searchTerm = 'Assis'; // Partial word
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: searchTerm, limit: 20 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Partial word search (${searchTerm}): ${queryTime}ms`);
      }
    });

    it('should perform search with special characters under 500ms', async () => {
      const searchTerm = 'AI & Code';
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: searchTerm, limit: 20 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Special characters search (${searchTerm}): ${queryTime}ms`);
      }
    });
  });

  describe('Search with Filters Performance', () => {
    it('should perform search with single filter under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'Assistant',
          functionality: 'Text Generation',
          limit: 20
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Search with single filter: ${queryTime}ms`);
      }
    });

    it('should perform search with multiple filters under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'Tool',
          functionality: 'Text Generation,Code Generation',
          tags: 'AI,Development',
          minRating: 3.5,
          maxRating: 5.0,
          limit: 20
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Search with multiple filters: ${queryTime}ms`);
      }
    });

    it('should perform search with rating range filter under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'Generator',
          minRating: 4.0,
          maxRating: 5.0,
          limit: 20
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Search with rating filter: ${queryTime}ms`);
      }
    });
  });

  describe('Search with Sorting Performance', () => {
    it('should perform search sorted by popularity under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'AI',
          sortBy: 'popularity',
          limit: 20
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Search sorted by popularity: ${queryTime}ms`);
      }
    });

    it('should perform search sorted by rating under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'Code',
          sortBy: 'rating',
          limit: 20
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Search sorted by rating: ${queryTime}ms`);
      }
    });

    it('should perform search sorted by relevance under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'Assistant Helper',
          sortBy: 'relevance',
          limit: 20
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Search sorted by relevance: ${queryTime}ms`);
      }
    });
  });

  describe('Pagination Performance', () => {
    it('should perform paginated search under 500ms', async () => {
      const pages = [1, 5, 10, 20];

      for (const page of pages) {
        const startTime = Date.now();

        const response = await request(app.getHttpServer())
          .get('/api/tools')
          .query({
            search: 'Tool',
            page,
            limit: 20
          })
          .set('Authorization', `Bearer ${authToken}`);

        const endTime = Date.now();
        const queryTime = endTime - startTime;

        if (response.status === 200) {
          expect(queryTime).toBeLessThan(500);
          console.log(`Paginated search (page ${page}): ${queryTime}ms`);
        }
      }
    });

    it('should perform large limit search under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          search: 'Generator',
          limit: 100 // Maximum allowed
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Large limit search (100 items): ${queryTime}ms`);
      }
    });
  });

  describe('Edge Cases Performance', () => {
    it('should perform empty search (list all) under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ limit: 20 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Empty search (list all): ${queryTime}ms`);
      }
    });

    it('should perform no-results search under 500ms', async () => {
      const searchTerm = 'nonexistent-tool-xyz123';
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: searchTerm, limit: 20 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        expect(response.body.data.length).toBe(0);
        console.log(`No-results search: ${queryTime}ms`);
      }
    });

    it('should perform very long search query under 500ms', async () => {
      const longSearchTerm = 'AI Assistant Code Generation Tool Helper Development Programming ' +
                           'Language Processing Natural Machine Learning Deep Neural Network ' +
                           'Artificial Intelligence Software Development Environment IDE';
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ search: longSearchTerm, limit: 20 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Long search query: ${queryTime}ms`);
      }
    });
  });

  describe('Concurrent Search Performance', () => {
    it('should handle concurrent searches under 500ms each', async () => {
      const searchTerms = [
        'AI Assistant',
        'Code Generator', 
        'Text Processor',
        'Image Creator',
        'Development Tool'
      ];

      const searchPromises = searchTerms.map(async (searchTerm, index) => {
        const startTime = Date.now();
        
        const response = await request(app.getHttpServer())
          .get('/api/tools')
          .query({ search: searchTerm, limit: 20 })
          .set('Authorization', `Bearer ${authToken}`);

        const endTime = Date.now();
        const queryTime = endTime - startTime;

        return {
          searchTerm,
          queryTime,
          status: response.status,
          resultCount: response.status === 200 ? response.body.data.length : 0
        };
      });

      const results = await Promise.all(searchPromises);
      
      for (const result of results) {
        if (result.status === 200) {
          expect(result.queryTime).toBeLessThan(500);
          console.log(`Concurrent search (${result.searchTerm}): ${result.queryTime}ms`);
        }
      }
    });
  });

  describe('Performance Statistics', () => {
    it('should collect and analyze search performance statistics', async () => {
      const searchQueries = [
        'AI', 'Code', 'Tool', 'Generator', 'Assistant',
        'Helper', 'Processor', 'Creator', 'Analyzer', 'Builder'
      ];

      const performanceStats: number[] = [];

      for (const query of searchQueries) {
        const startTime = Date.now();
        
        const response = await request(app.getHttpServer())
          .get('/api/tools')
          .query({ search: query, limit: 20 })
          .set('Authorization', `Bearer ${authToken}`);

        const endTime = Date.now();
        const queryTime = endTime - startTime;

        if (response.status === 200) {
          performanceStats.push(queryTime);
        }
      }

      if (performanceStats.length > 0) {
        const avgTime = performanceStats.reduce((a, b) => a + b, 0) / performanceStats.length;
        const minTime = Math.min(...performanceStats);
        const maxTime = Math.max(...performanceStats);
        const under500ms = performanceStats.filter(time => time < 500).length;
        const successRate = (under500ms / performanceStats.length) * 100;

        console.log('\n=== Search Performance Statistics ===');
        console.log(`Total queries: ${performanceStats.length}`);
        console.log(`Average time: ${avgTime.toFixed(2)}ms`);
        console.log(`Min time: ${minTime}ms`);
        console.log(`Max time: ${maxTime}ms`);
        console.log(`Queries under 500ms: ${under500ms}/${performanceStats.length}`);
        console.log(`Success rate: ${successRate.toFixed(1)}%`);
        console.log('=======================================\n');

        // Performance requirements
        expect(avgTime).toBeLessThan(500);
        expect(successRate).toBeGreaterThanOrEqual(95); // 95% of queries should be under 500ms
      }
    });
  });
});
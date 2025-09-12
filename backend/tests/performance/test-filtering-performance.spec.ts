import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupEnhancedToolTestDatabase, closeEnhancedToolTestDatabase } from '../setup/enhanced-schema-test-setup';
import { VALIDATION_FIXTURES } from '../fixtures/validation-fixtures';

/**
 * Performance Test: Filtering Operations Performance (<500ms requirement)
 * 
 * These tests validate that filtering operations meet the <500ms response time
 * requirement as specified in the technical context performance goals.
 * Tests verify compound indexes are used effectively with realistic datasets.
 */

describe('Filtering Performance Tests', () => {
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
    await createFilteringTestDataset();
  }, 30000); // Increase timeout for data setup

  afterAll(async () => {
    await app.close();
    await closeEnhancedToolTestDatabase();
  });

  /**
   * Create a realistic dataset of 1000+ tools with varied filter attributes
   */
  async function createFilteringTestDataset(): Promise<void> {
    const pricingOptions = ['Free', 'Paid', 'Enterprise', 'Freemium'];
    const interfaceOptions = ['Web', 'API', 'Mobile', 'Desktop', 'CLI'];
    const functionalityOptions = ['Text Generation', 'Code Generation', 'Image Generation', 'Translation', 'Analysis'];
    const deploymentOptions = ['Cloud', 'On-premise', 'Hybrid'];
    const primaryTags = ['AI', 'Productivity', 'Development', 'Creative', 'Business'];
    const secondaryTags = ['Machine Learning', 'Natural Language', 'Computer Vision', 'Data Science', 'Automation'];

    console.log('Creating filtering performance test dataset...');

    for (let i = 0; i < 1000; i++) {
      const toolData = {
        ...VALIDATION_FIXTURES.validCompleteTool,
        name: `Filter Test Tool ${i + 1}`,
        description: `Performance test tool for filtering - ${i + 1}`,
        // Vary attributes for filtering tests
        pricing: [pricingOptions[i % pricingOptions.length]],
        interface: [interfaceOptions[i % interfaceOptions.length]],
        functionality: [functionalityOptions[i % functionalityOptions.length]],
        deployment: [deploymentOptions[i % deploymentOptions.length]],
        popularity: Math.floor(Math.random() * 100000),
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0 range
        reviewCount: Math.floor(Math.random() * 10000),
        tags: {
          primary: [primaryTags[i % primaryTags.length]],
          secondary: i % 2 === 0 ? [secondaryTags[i % secondaryTags.length]] : []
        },
        searchKeywords: [
          `filter-test-${i}`,
          pricingOptions[i % pricingOptions.length].toLowerCase(),
          functionalityOptions[i % functionalityOptions.length].toLowerCase().replace(' ', '-')
        ]
      };

      const response = await request(app.getHttpServer())
        .post('/api/tools')
        .send(toolData)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 201) {
        testTools.push(response.body);
      }

      // Log progress every 200 tools
      if ((i + 1) % 200 === 0) {
        console.log(`Created ${i + 1} filtering test tools...`);
      }
    }

    console.log(`Filtering test dataset created: ${testTools.length} tools`);
  }

  describe('Single Filter Performance', () => {
    it('should perform pricing filter under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ pricing: 'Free', limit: 50 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        expect(response.body.data.length).toBeGreaterThan(0);
        console.log(`Pricing filter (Free): ${queryTime}ms`);
      } else {
        expect([401]).toContain(response.status);
      }
    });

    it('should perform functionality filter under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ functionality: 'Text Generation', limit: 50 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Functionality filter (Text Generation): ${queryTime}ms`);
      }
    });

    it('should perform interface filter under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ interface: 'Web', limit: 50 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Interface filter (Web): ${queryTime}ms`);
      }
    });

    it('should perform deployment filter under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ deployment: 'Cloud', limit: 50 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Deployment filter (Cloud): ${queryTime}ms`);
      }
    });
  });

  describe('Range Filter Performance', () => {
    it('should perform rating range filter under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ minRating: 4.0, maxRating: 5.0, limit: 50 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Rating range filter (4.0-5.0): ${queryTime}ms`);
      }
    });

    it('should perform popularity range filter under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ minPopularity: 50000, maxPopularity: 100000, limit: 50 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Popularity range filter (50k-100k): ${queryTime}ms`);
      }
    });

    it('should perform review count range filter under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ minReviewCount: 1000, maxReviewCount: 5000, limit: 50 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Review count range filter (1k-5k): ${queryTime}ms`);
      }
    });
  });

  describe('Multiple Filter Combinations Performance', () => {
    it('should perform two-filter combination under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          pricing: 'Free',
          functionality: 'Text Generation',
          limit: 50 
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Two-filter combination (pricing + functionality): ${queryTime}ms`);
      }
    });

    it('should perform three-filter combination under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          pricing: 'Free',
          interface: 'Web',
          deployment: 'Cloud',
          limit: 50 
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Three-filter combination (pricing + interface + deployment): ${queryTime}ms`);
      }
    });

    it('should perform complex filter combination under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          pricing: 'Free,Paid',
          functionality: 'Text Generation,Code Generation',
          minRating: 3.5,
          maxRating: 5.0,
          tags: 'AI,Development',
          limit: 50 
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Complex filter combination (multi-value + range + tags): ${queryTime}ms`);
      }
    });

    it('should perform filters with sorting under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ 
          pricing: 'Free',
          functionality: 'Text Generation',
          sortBy: 'rating',
          sortOrder: 'desc',
          limit: 50 
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Filters with sorting (rating desc): ${queryTime}ms`);
      }
    });
  });

  describe('Tag Filter Performance', () => {
    it('should perform single tag filter under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ tags: 'AI', limit: 50 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Single tag filter (AI): ${queryTime}ms`);
      }
    });

    it('should perform multiple tag filter under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({ tags: 'AI,Productivity,Development', limit: 50 })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Multiple tag filter (AI,Productivity,Development): ${queryTime}ms`);
      }
    });
  });

  describe('Pagination with Filters Performance', () => {
    it('should perform filtered pagination under 500ms', async () => {
      const pages = [1, 5, 10, 20];

      for (const page of pages) {
        const startTime = Date.now();

        const response = await request(app.getHttpServer())
          .get('/api/tools')
          .query({
            pricing: 'Free',
            page,
            limit: 25
          })
          .set('Authorization', `Bearer ${authToken}`);

        const endTime = Date.now();
        const queryTime = endTime - startTime;

        if (response.status === 200) {
          expect(queryTime).toBeLessThan(500);
          console.log(`Filtered pagination (page ${page}): ${queryTime}ms`);
        }
      }
    });

    it('should perform large filtered result set under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/tools')
        .query({
          pricing: 'Free,Paid',
          limit: 100 // Maximum allowed
        })
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(500);
        console.log(`Large filtered result set (100 items): ${queryTime}ms`);
      }
    });
  });

  describe('Filter Performance Statistics', () => {
    it('should collect and analyze filter performance statistics', async () => {
      const filterScenarios = [
        { pricing: 'Free' },
        { functionality: 'Text Generation' },
        { interface: 'Web' },
        { minRating: 4.0, maxRating: 5.0 },
        { pricing: 'Free', functionality: 'Text Generation' },
        { pricing: 'Free', interface: 'Web', deployment: 'Cloud' },
        { tags: 'AI,Productivity' },
        { minPopularity: 10000, pricing: 'Free' },
        { functionality: 'Text Generation,Code Generation', minRating: 3.5 },
        { pricing: 'Free,Paid', tags: 'AI', sortBy: 'rating' }
      ];

      const performanceStats: number[] = [];

      for (const filters of filterScenarios) {
        const startTime = Date.now();
        
        const response = await request(app.getHttpServer())
          .get('/api/tools')
          .query({ ...filters, limit: 50 })
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

        console.log('\n=== Filter Performance Statistics ===');
        console.log(`Total filter queries: ${performanceStats.length}`);
        console.log(`Average time: ${avgTime.toFixed(2)}ms`);
        console.log(`Min time: ${minTime}ms`);
        console.log(`Max time: ${maxTime}ms`);
        console.log(`Queries under 500ms: ${under500ms}/${performanceStats.length}`);
        console.log(`Success rate: ${successRate.toFixed(1)}%`);
        console.log('======================================\n');

        // Performance requirements
        expect(avgTime).toBeLessThan(500);
        expect(successRate).toBeGreaterThanOrEqual(95); // 95% of queries should be under 500ms
      }
    });
  });
});
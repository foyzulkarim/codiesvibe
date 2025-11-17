/**
 * E2E API Tests for Search API
 * Tests all endpoints with real HTTP requests
 */

import request from 'supertest';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// Base URL for the API
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4003';

describe('Search API - E2E Tests', () => {
  let mongoClient: MongoClient;

  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Connect to MongoDB for test data verification
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
  });

  afterAll(async () => {
    if (mongoClient) {
      await mongoClient.close();
    }
  });

  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(BASE_URL)
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('server', 'running');
      expect(response.body.services).toHaveProperty('search', 'available');
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 for liveness probe', async () => {
      const response = await request(BASE_URL)
        .get('/health/live')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should respond quickly (< 500ms)', async () => {
      const start = Date.now();
      await request(BASE_URL).get('/health/live').expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when all services are ready', async () => {
      const response = await request(BASE_URL)
        .get('/health/ready')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status');
      expect(['healthy', 'degraded']).toContain(response.body.status);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('checks');

      // Check MongoDB health
      if (response.body.checks.mongodb) {
        expect(response.body.checks.mongodb).toHaveProperty('status');
        expect(['pass', 'fail']).toContain(response.body.checks.mongodb.status);
      }

      // Check Qdrant health
      if (response.body.checks.qdrant) {
        expect(response.body.checks.qdrant).toHaveProperty('status');
        expect(['pass', 'fail']).toContain(response.body.checks.qdrant.status);
      }

      // Check system metrics
      if (response.body.system) {
        expect(response.body.system).toHaveProperty('memory');
        expect(response.body.system).toHaveProperty('cpu');
      }
    });
  });

  describe('GET /health/circuit-breakers', () => {
    it('should return circuit breaker status', async () => {
      const response = await request(BASE_URL)
        .get('/health/circuit-breakers')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('circuitBreakers');
      expect(Array.isArray(response.body.circuitBreakers)).toBe(true);
    });
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(BASE_URL)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should include HTTP request metrics', async () => {
      const response = await request(BASE_URL).get('/metrics').expect(200);

      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_request_duration_seconds');
    });

    it('should include search metrics', async () => {
      const response = await request(BASE_URL).get('/metrics').expect(200);

      expect(response.text).toContain('search_queries_total');
      expect(response.text).toContain('search_query_duration_seconds');
    });
  });

  describe('GET /api-docs', () => {
    it('should return Swagger UI HTML', async () => {
      const response = await request(BASE_URL)
        .get('/api-docs')
        .expect(200);

      expect(response.text).toContain('swagger');
      expect(response.headers['content-type']).toContain('text/html');
    });
  });

  describe('GET /api-docs/openapi.json', () => {
    it('should return OpenAPI specification in JSON', async () => {
      const response = await request(BASE_URL)
        .get('/api-docs/openapi.json')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
      expect(response.body.paths).toHaveProperty('/search');
      expect(response.body.paths).toHaveProperty('/health');
    });
  });

  describe('POST /search', () => {
    it('should return 400 for missing query', async () => {
      const response = await request(BASE_URL)
        .post('/search')
        .send({})
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body).toHaveProperty('details');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should return 400 for empty query', async () => {
      const response = await request(BASE_URL)
        .post('/search')
        .send({ query: '' })
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 for query with invalid characters', async () => {
      const response = await request(BASE_URL)
        .post('/search')
        .send({ query: '<script>alert("xss")</script>' })
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 for query exceeding max length', async () => {
      const longQuery = 'a'.repeat(1001);
      const response = await request(BASE_URL)
        .post('/search')
        .send({ query: longQuery })
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 for invalid limit (too low)', async () => {
      const response = await request(BASE_URL)
        .post('/search')
        .send({ query: 'AI tools', limit: 0 })
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 for invalid limit (too high)', async () => {
      const response = await request(BASE_URL)
        .post('/search')
        .send({ query: 'AI tools', limit: 101 })
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 200 for valid search query', async () => {
      const response = await request(BASE_URL)
        .post('/search')
        .send({ query: 'AI tools for coding' })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('query');
      expect(response.body).toHaveProperty('originalQuery');
      expect(response.body).toHaveProperty('executionTime');
      expect(response.body).toHaveProperty('phase');
      expect(response.body).toHaveProperty('candidates');
      expect(Array.isArray(response.body.candidates)).toBe(true);
    }, 70000); // 70 second timeout for search

    it('should respect limit parameter', async () => {
      const limit = 5;
      const response = await request(BASE_URL)
        .post('/search')
        .send({ query: 'AI tools', limit })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.candidates.length).toBeLessThanOrEqual(limit);
    }, 70000);

    it('should return correlation ID in response headers', async () => {
      const correlationId = `test-${Date.now()}`;
      const response = await request(BASE_URL)
        .post('/search')
        .set('X-Correlation-ID', correlationId)
        .send({ query: 'AI tools' })
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe(correlationId);
      expect(response.headers['x-request-id']).toBe(correlationId);
    }, 70000);

    it('should generate correlation ID if not provided', async () => {
      const response = await request(BASE_URL)
        .post('/search')
        .send({ query: 'AI tools' })
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeDefined();
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-correlation-id']).toBe(response.headers['x-request-id']);
    }, 70000);

    it('should include compressed response when Accept-Encoding header is set', async () => {
      const response = await request(BASE_URL)
        .post('/search')
        .set('Accept-Encoding', 'gzip, deflate')
        .send({ query: 'AI tools' })
        .expect(200);

      // If response is large enough, it should be compressed
      if (response.headers['content-length'] && parseInt(response.headers['content-length']) > 1024) {
        expect(response.headers['content-encoding']).toBeDefined();
      }
    }, 70000);
  });

  describe('Rate Limiting', () => {
    it('should enforce search endpoint rate limiting', async () => {
      // Make 31 requests rapidly (limit is 30 per minute)
      const requests = [];
      for (let i = 0; i < 31; i++) {
        requests.push(
          request(BASE_URL)
            .post('/search')
            .send({ query: `test query ${i}` })
        );
      }

      const responses = await Promise.all(requests);

      // At least one request should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Check rate limit response format
      if (rateLimitedResponses.length > 0) {
        const rateLimited = rateLimitedResponses[0];
        expect(rateLimited.body).toHaveProperty('error');
        expect(rateLimited.body).toHaveProperty('code');
        expect(rateLimited.body.code).toContain('RATE_LIMIT');
      }
    }, 120000); // 2 minute timeout
  });

  describe('CORS', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(BASE_URL)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle OPTIONS preflight request', async () => {
      const response = await request(BASE_URL)
        .options('/search')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(BASE_URL)
        .get('/non-existent-endpoint')
        .expect(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(BASE_URL)
        .post('/search')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });

  describe('Security', () => {
    it('should include security headers', async () => {
      const response = await request(BASE_URL).get('/health').expect(200);

      // Check for security headers (helmet)
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    it('should sanitize NoSQL injection attempts', async () => {
      const response = await request(BASE_URL)
        .post('/search')
        .send({
          query: 'test',
          $where: '1 == 1', // NoSQL injection attempt
        })
        .expect(200);

      // Should not crash, injection should be sanitized
      expect(response.body).toHaveProperty('candidates');
    }, 70000);
  });

  describe('Performance', () => {
    it('should respond to health check within 200ms', async () => {
      const start = Date.now();
      await request(BASE_URL).get('/health').expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('should respond to liveness probe within 100ms', async () => {
      const start = Date.now();
      await request(BASE_URL).get('/health/live').expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should complete search within 60 seconds', async () => {
      const start = Date.now();
      await request(BASE_URL)
        .post('/search')
        .send({ query: 'AI tools for coding' })
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(60000);
    }, 70000);
  });
});

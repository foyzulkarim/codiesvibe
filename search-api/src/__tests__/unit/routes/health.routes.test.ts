/**
 * Health Routes Unit Tests
 * Tests for health check, liveness, readiness, metrics, and circuit breaker endpoints
 */

import { Request, Response } from 'express';
import request from 'supertest';
import express from 'express';

// Mock dependencies before importing routes
jest.mock('../../../services/infrastructure/health-check.service', () => ({
  healthCheckService: {
    checkLiveness: jest.fn(),
    checkReadiness: jest.fn(),
  },
}));

jest.mock('../../../services/infrastructure/metrics.service', () => ({
  metricsService: {
    getContentType: jest.fn().mockReturnValue('text/plain; version=0.0.4'),
    getMetrics: jest.fn(),
  },
}));

jest.mock('../../../services/infrastructure/circuit-breaker.service', () => ({
  circuitBreakerManager: {
    getAllStats: jest.fn(),
  },
}));

jest.mock('../../../config/logger', () => ({
  searchLogger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../../utils/error-responses', () => ({
  internalServerError: jest.fn((msg: string) => ({
    error: msg,
  })),
}));

import healthRoutes from '../../../routes/health.routes.js';
import { healthCheckService } from '../../../services/infrastructure/health-check.service.js';
import { metricsService } from '../../../services/infrastructure/metrics.service.js';
import { circuitBreakerManager } from '../../../services/infrastructure/circuit-breaker.service.js';

describe('Health Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(healthRoutes);
  });

  describe('GET /health', () => {
    it('should return healthy status with timestamp and uptime', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.services).toEqual({
        server: 'running',
        search: 'available',
      });
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 when liveness check passes', async () => {
      (healthCheckService.checkLiveness as jest.Mock).mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 1000,
        system: {
          memory: { used: '1 GB', total: '8 GB', percentage: 12 },
          cpu: { loadAverage: [0.5, 0.5, 0.5], cores: 4 },
        },
      });

      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(healthCheckService.checkLiveness).toHaveBeenCalledTimes(1);
    });

    it('should return 200 when liveness check returns degraded', async () => {
      (healthCheckService.checkLiveness as jest.Mock).mockResolvedValue({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: 1000,
      });

      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
    });

    it('should return 503 when liveness check returns unhealthy', async () => {
      (healthCheckService.checkLiveness as jest.Mock).mockResolvedValue({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 1000,
      });

      const response = await request(app).get('/health/live');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
    });

    it('should return 503 when liveness check throws an error', async () => {
      (healthCheckService.checkLiveness as jest.Mock).mockRejectedValue(
        new Error('Liveness check failed')
      );

      const response = await request(app).get('/health/live');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Liveness check failed');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when all dependencies are healthy', async () => {
      (healthCheckService.checkReadiness as jest.Mock).mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 1000,
        checks: {
          mongodb: { status: 'pass', latency: '5ms' },
          qdrant: { status: 'pass', latency: '10ms' },
        },
      });

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.checks.mongodb.status).toBe('pass');
      expect(response.body.checks.qdrant.status).toBe('pass');
    });

    it('should return 200 when readiness check returns degraded', async () => {
      (healthCheckService.checkReadiness as jest.Mock).mockResolvedValue({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: 1000,
        checks: {
          mongodb: { status: 'pass' },
          qdrant: { status: 'fail', message: 'Connection timeout' },
        },
      });

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
    });

    it('should return 503 when readiness check returns unhealthy', async () => {
      (healthCheckService.checkReadiness as jest.Mock).mockResolvedValue({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 1000,
        checks: {
          mongodb: { status: 'fail', message: 'Connection refused' },
          qdrant: { status: 'fail', message: 'Connection refused' },
        },
      });

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
    });

    it('should return 503 when readiness check throws an error', async () => {
      (healthCheckService.checkReadiness as jest.Mock).mockRejectedValue(
        new Error('Readiness check failed')
      );

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Readiness check failed');
    });
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics with correct content type', async () => {
      const mockMetrics = `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 100`;

      (metricsService.getMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toBe(mockMetrics);
      expect(metricsService.getContentType).toHaveBeenCalled();
      expect(metricsService.getMetrics).toHaveBeenCalled();
    });

    it('should return 500 when metrics generation fails', async () => {
      (metricsService.getMetrics as jest.Mock).mockRejectedValue(
        new Error('Metrics generation failed')
      );

      const response = await request(app).get('/metrics');

      expect(response.status).toBe(500);
      // Note: The route sets Content-Type before the try block, so on error
      // we parse the JSON manually from the text response
      const body = JSON.parse(response.text);
      expect(body).toMatchObject({
        error: 'Failed to generate metrics',
        code: 'METRICS_ERROR',
      });
    });
  });

  describe('GET /health/circuit-breakers', () => {
    it('should return 200 when all circuit breakers are closed', async () => {
      (circuitBreakerManager.getAllStats as jest.Mock).mockReturnValue([
        { name: 'mongodb', state: 'closed', failures: 0 },
        { name: 'qdrant', state: 'closed', failures: 0 },
      ]);

      const response = await request(app).get('/health/circuit-breakers');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.circuitBreakers).toHaveLength(2);
      expect(response.body.circuitBreakers[0].state).toBe('closed');
    });

    it('should return 503 when any circuit breaker is open', async () => {
      (circuitBreakerManager.getAllStats as jest.Mock).mockReturnValue([
        { name: 'mongodb', state: 'closed', failures: 0 },
        { name: 'qdrant', state: 'open', failures: 5 },
      ]);

      const response = await request(app).get('/health/circuit-breakers');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('degraded');
    });

    it('should return 503 when circuit breaker is half-open', async () => {
      (circuitBreakerManager.getAllStats as jest.Mock).mockReturnValue([
        { name: 'mongodb', state: 'half-open', failures: 2 },
      ]);

      const response = await request(app).get('/health/circuit-breakers');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('degraded');
    });

    it('should return 500 when circuit breaker check fails', async () => {
      (circuitBreakerManager.getAllStats as jest.Mock).mockImplementation(() => {
        throw new Error('Circuit breaker error');
      });

      const response = await request(app).get('/health/circuit-breakers');

      expect(response.status).toBe(500);
      expect(response.body.code).toBe('CIRCUIT_BREAKER_ERROR');
    });

    it('should return healthy when no circuit breakers exist', async () => {
      (circuitBreakerManager.getAllStats as jest.Mock).mockReturnValue([]);

      const response = await request(app).get('/health/circuit-breakers');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.circuitBreakers).toHaveLength(0);
    });
  });
});

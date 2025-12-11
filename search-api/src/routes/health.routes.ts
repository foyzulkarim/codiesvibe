/**
 * Health Check Routes
 *
 * Endpoints for health monitoring, liveness/readiness probes,
 * circuit breaker status, and Prometheus metrics
 */

import { Router, Request, Response } from 'express';
import { healthCheckService } from '../services/health-check.service.js';
import { metricsService } from '../services/metrics.service.js';
import { circuitBreakerManager } from '../services/circuit-breaker.service.js';
import { searchLogger } from '../config/logger.js';
import { internalServerError } from '../utils/error-responses.js';

const router = Router();

/**
 * GET /health
 * Basic health check - backwards compatible
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        server: 'running',
        search: 'available'
      }
    });
  } catch (error) {
    searchLogger.error('Health endpoint error', error as Error, {
      service: 'search-api',
    });
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /health/live
 * Liveness probe - for container orchestrators
 * Fast check (<100ms) - doesn't check external dependencies
 */
router.get('/health/live', async (req: Request, res: Response) => {
  try {
    const health = await healthCheckService.checkLiveness();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    searchLogger.error('Liveness check failed', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe - for container orchestrators
 * Comprehensive check - includes MongoDB, Qdrant, and system metrics
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const health = await healthCheckService.checkReadiness();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    searchLogger.error('Readiness check failed', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /metrics
 * Prometheus metrics endpoint
 * Exposes application metrics in Prometheus format
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', metricsService.getContentType());
    const metrics = await metricsService.getMetrics();
    res.send(metrics);
  } catch (error) {
    searchLogger.error('Failed to generate metrics', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
    });
    res.status(500).json({
      ...internalServerError('Failed to generate metrics'),
      code: 'METRICS_ERROR',
    });
  }
});

/**
 * GET /health/circuit-breakers
 * Circuit breaker status endpoint
 * Shows the state of all circuit breakers
 */
router.get('/health/circuit-breakers', (req: Request, res: Response) => {
  try {
    const stats = circuitBreakerManager.getAllStats();
    const allClosed = stats.every(s => s.state === 'closed');

    res.status(allClosed ? 200 : 503).json({
      status: allClosed ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      circuitBreakers: stats,
    });
  } catch (error) {
    searchLogger.error('Failed to get circuit breaker status', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
    });
    res.status(500).json({
      ...internalServerError('Failed to get circuit breaker status'),
      code: 'CIRCUIT_BREAKER_ERROR',
    });
  }
});

export default router;

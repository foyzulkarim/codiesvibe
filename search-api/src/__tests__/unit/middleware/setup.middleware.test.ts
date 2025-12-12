/**
 * Setup Middleware Unit Tests
 * Tests for middleware setup functions
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';

// Mock dependencies before importing middleware
jest.mock('../../../config/security.config', () => ({
  securityConfig: {
    enableSecurityHeaders: true,
    enableRateLimiting: true,
    requestBodyLimit: '10mb',
    hppWhitelist: ['query', 'limit'],
    helmetConfig: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    },
  },
}));

jest.mock('../../../config/cors.config', () => ({
  createCorsMiddleware: jest.fn(() => (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  }),
}));

jest.mock('../../../config/compression.config', () => ({
  compressionOptions: {
    level: 6,
    threshold: 1024,
  },
}));

jest.mock('../../../middleware/correlation.middleware', () => ({
  correlationMiddleware: (req: Request, res: Response, next: NextFunction) => {
    (req as any).correlationId = 'test-correlation-id';
    next();
  },
}));

jest.mock('../../../middleware/timeout.middleware', () => ({
  globalTimeout: (req: Request, res: Response, next: NextFunction) => {
    next();
  },
}));

jest.mock('../../../middleware/rate-limiters', () => ({
  limiter: (req: Request, res: Response, next: NextFunction) => {
    next();
  },
}));

jest.mock('../../../services/infrastructure/metrics.service', () => ({
  metricsService: {
    trackHttpMetrics: jest.fn(() => (req: Request, res: Response, next: NextFunction) => {
      next();
    }),
  },
}));

jest.mock('../../../config/logger', () => ({
  searchLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (req: Request, res: Response, next: NextFunction) => {
    (req as any).auth = { userId: 'test-user' };
    next();
  }),
}));

import {
  setupCoreMiddleware,
  setupSecurityMiddleware,
  setupParsingMiddleware,
  setupAuthMiddleware,
} from '../../../middleware/setup.middleware.js';
import { searchLogger } from '../../../config/logger.js';
import { securityConfig } from '../../../config/security.config.js';
import { createCorsMiddleware } from '../../../config/cors.config.js';
import { metricsService } from '../../../services/infrastructure/metrics.service.js';
import { clerkMiddleware } from '@clerk/express';

describe('Setup Middleware', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
  });

  describe('setupCoreMiddleware', () => {
    it('should apply correlation middleware', async () => {
      setupCoreMiddleware(app);

      app.get('/test', (req: Request, res: Response) => {
        res.json({ correlationId: (req as any).correlationId });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.correlationId).toBe('test-correlation-id');
    });

    it('should apply metrics middleware', () => {
      setupCoreMiddleware(app);

      expect(metricsService.trackHttpMetrics).toHaveBeenCalled();
    });

    it('should apply CORS middleware', async () => {
      setupCoreMiddleware(app);

      app.get('/test', (req: Request, res: Response) => {
        res.json({ ok: true });
      });

      const response = await request(app).get('/test');

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(createCorsMiddleware).toHaveBeenCalled();
    });

    it('should log compression enabled', () => {
      setupCoreMiddleware(app);

      expect(searchLogger.info).toHaveBeenCalledWith(
        '✅ Response compression enabled',
        expect.objectContaining({
          service: 'search-api',
          threshold: '1KB',
          level: 6,
        })
      );
    });
  });

  describe('setupSecurityMiddleware', () => {
    beforeEach(() => {
      // Reset securityConfig mock for individual tests
      (securityConfig as any).enableSecurityHeaders = true;
      (securityConfig as any).enableRateLimiting = true;
    });

    it('should apply security middleware when enabled', async () => {
      setupSecurityMiddleware(app);

      app.get('/test', (req: Request, res: Response) => {
        res.json({ ok: true });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      // Check that helmet headers are present (X-Content-Type-Options is a common one)
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should log warning when security headers are disabled', () => {
      (securityConfig as any).enableSecurityHeaders = false;

      setupSecurityMiddleware(app);

      expect(searchLogger.warn).toHaveBeenCalledWith(
        '⚠️  Security headers are disabled (ENABLE_SECURITY_HEADERS=false)',
        expect.objectContaining({
          service: 'search-api',
        })
      );
    });

    it('should log warning when rate limiting is disabled', () => {
      (securityConfig as any).enableRateLimiting = false;

      setupSecurityMiddleware(app);

      expect(searchLogger.warn).toHaveBeenCalledWith(
        '⚠️  Rate limiting is disabled (ENABLE_RATE_LIMITING=false)',
        expect.objectContaining({
          service: 'search-api',
        })
      );
    });

    it('should log timeout protection enabled', () => {
      setupSecurityMiddleware(app);

      expect(searchLogger.info).toHaveBeenCalledWith(
        '✅ Request timeout protection enabled',
        expect.objectContaining({
          service: 'search-api',
          globalTimeout: '30s',
          searchTimeout: '60s',
        })
      );
    });
  });

  describe('setupParsingMiddleware', () => {
    it('should parse JSON request bodies', async () => {
      setupParsingMiddleware(app);

      app.post('/test', (req: Request, res: Response) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/test')
        .send({ message: 'hello' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.received).toEqual({ message: 'hello' });
    });

    it('should parse URL-encoded request bodies', async () => {
      setupParsingMiddleware(app);

      app.post('/test', (req: Request, res: Response) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/test')
        .send('message=hello&name=world')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.status).toBe(200);
      expect(response.body.received).toEqual({ message: 'hello', name: 'world' });
    });

    it('should reject bodies exceeding size limit', async () => {
      // Temporarily override the limit to test
      const originalLimit = securityConfig.requestBodyLimit;
      (securityConfig as any).requestBodyLimit = '1b'; // 1 byte limit

      const testApp = express();
      setupParsingMiddleware(testApp);

      testApp.post('/test', (req: Request, res: Response) => {
        res.json({ received: req.body });
      });

      // Add error handler
      testApp.use((err: any, req: Request, res: Response, next: NextFunction) => {
        res.status(413).json({ error: 'Payload too large' });
      });

      const response = await request(testApp)
        .post('/test')
        .send({ message: 'this is a long message that exceeds 1 byte' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(413);

      // Restore original limit
      (securityConfig as any).requestBodyLimit = originalLimit;
    });
  });

  describe('setupAuthMiddleware', () => {
    it('should skip auth for /health endpoints', async () => {
      setupAuthMiddleware(app);

      app.get('/health', (req: Request, res: Response) => {
        res.json({ auth: (req as any).auth });
      });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      // Auth should not be set since we skip it for health endpoints
      expect(response.body.auth).toBeUndefined();
      expect(clerkMiddleware).not.toHaveBeenCalled();
    });

    it('should skip auth for /health/ready endpoints', async () => {
      setupAuthMiddleware(app);

      app.get('/health/ready', (req: Request, res: Response) => {
        res.json({ ok: true });
      });

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(clerkMiddleware).not.toHaveBeenCalled();
    });

    it('should skip auth for /metrics endpoint', async () => {
      setupAuthMiddleware(app);

      app.get('/metrics', (req: Request, res: Response) => {
        res.json({ ok: true });
      });

      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(clerkMiddleware).not.toHaveBeenCalled();
    });

    it('should skip auth for /api-docs endpoint', async () => {
      setupAuthMiddleware(app);

      app.get('/api-docs', (req: Request, res: Response) => {
        res.json({ ok: true });
      });

      const response = await request(app).get('/api-docs');

      expect(response.status).toBe(200);
      expect(clerkMiddleware).not.toHaveBeenCalled();
    });

    it('should apply auth for regular API endpoints', async () => {
      setupAuthMiddleware(app);

      app.get('/api/tools', (req: Request, res: Response) => {
        res.json({ auth: (req as any).auth });
      });

      const response = await request(app).get('/api/tools');

      expect(response.status).toBe(200);
      expect(response.body.auth).toEqual({ userId: 'test-user' });
      expect(clerkMiddleware).toHaveBeenCalled();
    });

    it('should log auth middleware enabled', () => {
      setupAuthMiddleware(app);

      expect(searchLogger.info).toHaveBeenCalledWith(
        '✅ Clerk authentication middleware enabled',
        expect.objectContaining({
          service: 'search-api',
          authProvider: 'Clerk',
          skippedPaths: ['/health*', '/metrics', '/api-docs*'],
        })
      );
    });
  });
});

/**
 * Middleware Setup
 *
 * Centralized middleware configuration and setup functions
 */

import { Express } from 'express';
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';
import { clerkMiddleware } from '@clerk/express';
import { securityConfig } from '../config/security.config.js';
import { createCorsMiddleware } from '../config/cors.config.js';
import { compressionOptions } from '../config/compression.config.js';
import { correlationMiddleware } from './correlation.middleware.js';
import { globalTimeout } from './timeout.middleware.js';
import { limiter } from './rate-limiters.js';
import { metricsService } from '../services/infrastructure/metrics.service.js';
import { searchLogger } from '../config/logger.js';

/**
 * Setup core middleware (correlation, metrics, compression, CORS)
 * These should be applied first in the middleware chain
 */
export function setupCoreMiddleware(app: Express): void {
  // Apply correlation middleware first
  app.use(correlationMiddleware);

  // Apply Prometheus metrics middleware (track all HTTP requests)
  app.use(metricsService.trackHttpMetrics());

  // Apply compression middleware for response compression
  app.use(compression(compressionOptions));
  searchLogger.info('✅ Response compression enabled', {
    service: 'search-api',
    threshold: '1KB',
    level: 6,
  });

  // Apply CORS configuration
  app.use(createCorsMiddleware());
}

/**
 * Setup security middleware (helmet, sanitization, hpp, timeout, rate limiting)
 */
export function setupSecurityMiddleware(app: Express): void {
  // Security headers (conditional)
  if (securityConfig.enableSecurityHeaders) {
    app.use(helmet(securityConfig.helmetConfig));
  } else {
    searchLogger.warn('⚠️  Security headers are disabled (ENABLE_SECURITY_HEADERS=false)', {
      service: 'search-api',
      securitySetting: 'ENABLE_SECURITY_HEADERS=false'
    });
  }

  // NoSQL injection protection
  app.use(mongoSanitize());

  // HTTP Parameter Pollution protection with whitelist
  app.use(hpp({
    whitelist: securityConfig.hppWhitelist
  }));

  // Apply global timeout middleware (30 seconds)
  app.use(globalTimeout);
  searchLogger.info('✅ Request timeout protection enabled', {
    service: 'search-api',
    globalTimeout: '30s',
    searchTimeout: '60s',
  });

  // Apply conditional rate limiting
  if (securityConfig.enableRateLimiting) {
    app.use(limiter);
  } else {
    searchLogger.warn('⚠️  Rate limiting is disabled (ENABLE_RATE_LIMITING=false)', {
      service: 'search-api',
      securitySetting: 'ENABLE_RATE_LIMITING=false'
    });
  }
}

/**
 * Setup request parsing middleware (JSON, URL-encoded)
 */
export function setupParsingMiddleware(app: Express): void {
  app.use(express.json({ limit: securityConfig.requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: securityConfig.requestBodyLimit }));
}

/**
 * Setup authentication middleware (Clerk)
 * Skips health endpoints to avoid authentication issues in CI/CD
 */
export function setupAuthMiddleware(app: Express): void {
  app.use((req, res, next) => {
    // Skip Clerk middleware for health, metrics, and API docs endpoints
    if (req.path.startsWith('/health') || req.path.startsWith('/metrics') || req.path.startsWith('/api-docs')) {
      return next();
    }
    return clerkMiddleware()(req, res, next);
  });
  searchLogger.info('✅ Clerk authentication middleware enabled', {
    service: 'search-api',
    authProvider: 'Clerk',
    skippedPaths: ['/health*', '/metrics', '/api-docs*'],
  });
}

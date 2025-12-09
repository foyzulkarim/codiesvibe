/**
 * Rate Limiting Middleware
 *
 * Centralized rate limiting configuration for different API endpoints.
 * This module exports rate limiters to prevent circular dependencies
 * when importing into routes and server files.
 */

import rateLimit from 'express-rate-limit';
import { searchLogger } from '#config/logger';
import { SearchRequest } from './correlation.middleware.js';

/**
 * General API rate limiter
 * Applies to all API endpoints by default
 */
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    const searchReq = req as SearchRequest;
    searchLogger.logSecurityEvent('Rate limit exceeded', {
      correlationId: searchReq.correlationId,
      service: 'search-api',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    }, 'warn');
    res.status(429).json({
      error: 'Too many requests from this IP',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Stricter rate limiting for search endpoint
 * Prevents abuse of the computationally expensive search operations
 */
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 search requests per minute
  message: {
    error: 'Too many search requests',
    code: 'SEARCH_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const searchReq = req as SearchRequest;
    searchLogger.logSecurityEvent('Search rate limit exceeded', {
      correlationId: searchReq.correlationId,
      service: 'search-api',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      query: req.body?.query,
      timestamp: new Date().toISOString()
    }, 'warn');
    res.status(429).json({
      error: 'Too many search requests',
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 minute'
    });
  }
});

/**
 * Rate limiting for tools create/update operations
 * Prevents spam tool submissions and excessive updates
 */
export const toolsMutationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 create/update operations per 5 minutes
  message: {
    error: 'Too many tool modifications',
    code: 'TOOLS_MUTATION_RATE_LIMIT_EXCEEDED',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const searchReq = req as SearchRequest;
    searchLogger.logSecurityEvent('Tools mutation rate limit exceeded', {
      correlationId: searchReq.correlationId,
      service: 'search-api',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      userId: (req as any).auth?.userId,
      timestamp: new Date().toISOString()
    }, 'warn');
    res.status(429).json({
      error: 'Too many tool modifications',
      code: 'TOOLS_MUTATION_RATE_LIMIT_EXCEEDED',
      retryAfter: '5 minutes'
    });
  }
});

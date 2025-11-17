/**
 * Request Timeout Middleware
 * Prevents requests from hanging indefinitely
 */

import { Request, Response, NextFunction } from 'express';
import { searchLogger } from '../config/logger';
import { SearchRequest } from './correlation.middleware';

export interface TimeoutOptions {
  timeout: number; // Timeout in milliseconds
  onTimeout?: (req: Request, res: Response) => void;
}

/**
 * Create a timeout middleware with configurable timeout duration
 */
export function createTimeoutMiddleware(options: TimeoutOptions) {
  const { timeout, onTimeout } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const searchReq = req as SearchRequest;
    let timeoutTriggered = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (res.headersSent) {
        // Response already sent, nothing to do
        return;
      }

      timeoutTriggered = true;

      // Log timeout event
      searchLogger.warn('Request timeout', {
        correlationId: searchReq.correlationId,
        service: 'search-api',
        method: req.method,
        path: req.path,
        timeout: `${timeout}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      }, {
        function: 'timeoutMiddleware',
        module: 'Middleware',
      });

      // Track timeout as error in metrics
      if (typeof (global as any).metricsService !== 'undefined') {
        (global as any).metricsService.trackError('request_timeout', 'medium');
      }

      // Call custom timeout handler if provided
      if (onTimeout) {
        onTimeout(req, res);
      } else {
        // Default timeout response
        res.status(408).json({
          error: 'Request timeout',
          code: 'REQUEST_TIMEOUT',
          timeout: `${timeout}ms`,
          message: 'The request took too long to process',
        });
      }
    }, timeout);

    // Clean up timeout when response finishes
    const originalEnd = res.end;
    res.end = function (this: Response, ...args: any[]): Response {
      clearTimeout(timeoutId);

      // Log if request completed just before timeout
      if (!timeoutTriggered) {
        const elapsed = Date.now() - (searchReq.startTime || Date.now());
        if (elapsed > timeout * 0.9) {
          searchLogger.warn('Request completed close to timeout threshold', {
            correlationId: searchReq.correlationId,
            service: 'search-api',
            method: req.method,
            path: req.path,
            timeout: `${timeout}ms`,
            elapsed: `${elapsed}ms`,
            threshold: `${timeout * 0.9}ms`,
          }, {
            function: 'timeoutMiddleware',
            module: 'Middleware',
          });
        }
      }

      return originalEnd.apply(this, args);
    } as any;

    // Prevent further processing if timeout was triggered
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
}

/**
 * Global timeout middleware (30 seconds)
 */
export const globalTimeout = createTimeoutMiddleware({
  timeout: 30000, // 30 seconds
});

/**
 * Search endpoint timeout middleware (60 seconds)
 */
export const searchTimeout = createTimeoutMiddleware({
  timeout: 60000, // 60 seconds
  onTimeout: (req, res) => {
    const searchReq = req as SearchRequest;
    searchLogger.error('Search request timeout', new Error('Search timeout'), {
      correlationId: searchReq.correlationId,
      service: 'search-api',
      query: (req.body as any)?.query || 'unknown',
      timeout: '60s',
    }, {
      function: 'searchTimeout',
      module: 'Middleware',
    });

    res.status(408).json({
      error: 'Search request timeout',
      code: 'SEARCH_TIMEOUT',
      timeout: '60s',
      message: 'The search query took too long to process. Please try with a simpler query.',
    });
  },
});

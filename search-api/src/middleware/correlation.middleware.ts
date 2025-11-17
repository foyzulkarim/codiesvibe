import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { searchLogger, SearchLogContext } from '../config/logger';
import { correlationContext } from '../utils/correlation-context';

export interface SearchRequest extends Request {
  correlationId?: string;
  startTime?: number;
}

/**
 * Middleware to add correlation ID to requests and log them with structured context
 * Accepts incoming correlation ID from X-Correlation-ID or X-Request-ID headers
 */
export function correlationMiddleware(req: SearchRequest, res: Response, next: NextFunction): void {
  // Use incoming correlation ID if provided, otherwise generate new one
  const incomingCorrelationId = req.get('X-Correlation-ID') || req.get('X-Request-ID');
  const correlationId = incomingCorrelationId || req.correlationId || uuidv4();
  req.correlationId = correlationId;
  req.startTime = Date.now();

  // Set correlation ID in response headers for client tracing
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', correlationId);

  // Extract request context
  const requestContext: SearchLogContext = {
    correlationId,
    service: 'search-api',
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  // Log incoming request with correlation ID
  searchLogger.info('Incoming request', requestContext, {
    function: 'correlationMiddleware',
    module: 'Middleware'
  });

  // Run the rest of the request in correlation context
  // This makes correlation ID available throughout the async call stack
  correlationContext.run(
    {
      correlationId,
      startTime: req.startTime,
      metadata: {}
    },
    () => {
      // Override res.end to log response completion
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]): Response {
        const responseTime = Date.now() - (req.startTime || Date.now());

        const responseContext: SearchLogContext = {
          ...requestContext,
          statusCode: res.statusCode,
          responseTime,
          timestamp: new Date().toISOString()
        };

        if (res.statusCode >= 400) {
          searchLogger.warn('Request completed with error', responseContext, {
            function: 'correlationMiddleware',
            module: 'Middleware'
          });
        } else {
          searchLogger.info('Request completed successfully', responseContext, {
            function: 'correlationMiddleware',
            module: 'Middleware'
          });
        }

        return originalEnd.apply(this, args);
      } as any;

      next();
    }
  );
}
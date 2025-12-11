/**
 * Error Handler Middleware
 *
 * Catches and handles all errors thrown by routes and middleware
 */

import { Response, NextFunction } from 'express';
import type { AppRequest } from '#types/express.types.js';
import { searchLogger } from '../config/logger.js';
import { CONFIG } from '#config/env.config';

export function errorHandler(
  err: Error,
  req: AppRequest,
  res: Response,
  next: NextFunction
): void {
  // Log the error with full details
  searchLogger.error('Unhandled error in request', err, {
    service: 'search-api',
    method: req.method,
    path: req.path,
    correlationId: req.correlationId,
    stack: err.stack,
  });

  // Don't send error if response already started
  if (res.headersSent) {
    return next(err);
  }

  // Send error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: CONFIG.env.IS_PRODUCTION ? 'An error occurred' : err.message,
    correlationId: req.correlationId,
  });
}

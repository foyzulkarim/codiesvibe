/**
 * Joi Validation Middleware
 *
 * Generic middleware factory for Joi schema validation
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validationErrorResponse } from '../utils/error-responses.js';
import { searchLogger } from '../config/logger.js';
import { SearchRequest } from './correlation.middleware.js';

/**
 * Create a validation middleware for the given Joi schema
 * @param schema - Joi schema to validate against
 * @returns Express middleware function
 */
export function validateJoi(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Collect all errors
      stripUnknown: true, // Remove unknown properties
    });

    if (error) {
      const searchReq = req as SearchRequest;

      // Log validation failure
      searchLogger.logSecurityEvent('Joi validation failed', {
        correlationId: searchReq.correlationId,
        service: 'search-api',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        errors: error.details,
        body: req.body,
        timestamp: new Date().toISOString()
      }, 'warn');

      return res.status(400).json(validationErrorResponse(error.details));
    }

    // Replace req.body with validated/sanitized data
    req.body = value;
    next();
  };
}

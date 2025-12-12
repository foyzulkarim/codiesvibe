/**
 * Error Response Utilities
 *
 * Consistent error response formatting across the API
 */

import Joi from 'joi';
import { CONFIG } from '#config/env.config.js';

/**
 * Format validation error response
 */
export function validationErrorResponse(errors: Joi.ValidationErrorItem[]) {
  return {
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.context?.value
    }))
  };
}

/**
 * Format search error response
 */
export function searchErrorResponse(error: Error, executionTime: number) {
  const message = CONFIG.env.IS_PRODUCTION
    ? 'An error occurred during search processing'
    : error.message;

  return {
    error: message,
    code: 'SEARCH_ERROR',
    phase: 'Error during search execution',
    executionTime: `${executionTime}ms`
  };
}

/**
 * Format generic internal server error
 */
export function internalServerError(message: string = 'Internal server error') {
  return {
    error: message,
    code: 'INTERNAL_SERVER_ERROR'
  };
}

/**
 * Format not found error
 */
export function notFoundError(resource: string) {
  return {
    error: `${resource} not found`,
    code: 'NOT_FOUND'
  };
}

/**
 * Search Validation
 *
 * Joi schemas and validation utilities for search endpoints
 */

import Joi from 'joi';
import { containsMaliciousPattern } from '../config/security.config.js';

/**
 * Custom Joi validator for malicious content
 */
const maliciousContentValidator = (value: string, helpers: Joi.CustomHelpers) => {
  if (containsMaliciousPattern(value)) {
    return helpers.error('string.malicious');
  }
  return value;
};

/**
 * Joi schema for search query validation
 */
export const searchQuerySchema = Joi.object({
  query: Joi.string()
    .min(1)
    .max(1000)
    .pattern(/^[^<>{}[\]\\]*$/) // No HTML brackets or common injection chars
    .custom(maliciousContentValidator, 'malicious content validation')
    .required()
    .messages({
      'string.empty': 'Query cannot be empty',
      'string.min': 'Query cannot be empty',
      'string.max': 'Query too long (max 1000 characters)',
      'string.pattern.base': 'Query contains invalid characters',
      'string.malicious': 'Query contains potentially malicious content',
      'any.required': 'Query is required'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  debug: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Debug must be a boolean'
    })
});

/**
 * Enhanced query sanitization function
 * Removes control characters and potentially dangerous characters
 */
export function sanitizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F<>{}[\]\\]/g, ''); // Remove control characters and potentially dangerous characters
}

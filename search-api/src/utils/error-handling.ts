import {
  ApplicationError,
  ErrorContext,
  SerializedError,
} from '#types/error.types.js';

/**
 * Type guard to check if value is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if value is an ApplicationError instance
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/**
 * Extract error message from any error type
 * Handles Error objects, ApplicationError, strings, and unknown types
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unknown error occurred';
}

/**
 * Extract stack trace from error if available
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }

  return undefined;
}

/**
 * Extract error code from ApplicationError or error objects with code property
 */
export function getErrorCode(error: unknown): string | number | undefined {
  if (isApplicationError(error)) {
    return error.code;
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string' || typeof code === 'number') {
      return code;
    }
  }

  return undefined;
}

/**
 * Serialize any error type to a consistent JSON format
 * Handles ApplicationError, Error, and unknown error types
 */
export function serializeError(
  error: unknown,
  context?: ErrorContext
): SerializedError {
  // Handle ApplicationError with full serialization
  if (isApplicationError(error)) {
    const serialized = error.toJSON();
    return {
      ...serialized,
      // Merge context if provided
      ...(context && {
        metadata: {
          ...context,
          ...(serialized.details &&
          typeof serialized.details === 'object' &&
          !Array.isArray(serialized.details)
            ? serialized.details
            : { details: serialized.details }),
        },
      }),
    };
  }

  // Handle standard Error objects
  if (isError(error)) {
    return {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      ...(context && { metadata: context }),
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      name: 'Error',
      timestamp: new Date().toISOString(),
      ...(context && { metadata: context }),
    };
  }

  // Handle unknown error types
  return {
    message: 'An unknown error occurred',
    name: 'UnknownError',
    timestamp: new Date().toISOString(),
    details: error,
    ...(context && { metadata: context }),
  };
}

/**
 * Format error for structured logging with context
 * Returns an object suitable for JSON logging with all relevant error information
 */
export function formatErrorForLogging(
  error: unknown,
  context?: ErrorContext
): Record<string, unknown> {
  const serialized = serializeError(error, context);

  return {
    level: 'error',
    message: serialized.message,
    error: {
      name: serialized.name,
      code: serialized.code,
      statusCode: serialized.statusCode,
      stack: serialized.stack,
      details: serialized.details,
    },
    context: context || {},
    timestamp: serialized.timestamp || new Date().toISOString(),
    // Add environment info
    environment: process.env.NODE_ENV || 'development',
  };
}

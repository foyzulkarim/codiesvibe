/**
 * Serialized error representation for API responses and logging
 */
export interface SerializedError {
  message: string;
  name?: string;
  stack?: string;
  code?: string | number;
  statusCode?: number;
  details?: unknown;
  timestamp?: string;
}

/**
 * Context information for error tracking and debugging
 */
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  correlationId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Base application error class with support for HTTP status codes and context
 */
export class ApplicationError extends Error {
  public readonly code: string | number;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly context?: ErrorContext;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string | number,
    statusCode: number = 500,
    details?: unknown,
    context?: ErrorContext
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error to JSON format for API responses
   */
  toJSON(): SerializedError {
    return {
      message: this.message,
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: unknown, context?: ErrorContext) {
    super(message, 'VALIDATION_ERROR', 400, details, context);
  }
}

/**
 * Resource not found error (404 Not Found)
 */
export class NotFoundError extends ApplicationError {
  constructor(message: string, details?: unknown, context?: ErrorContext) {
    super(message, 'NOT_FOUND', 404, details, context);
  }
}

/**
 * Unauthorized error (401 Unauthorized)
 */
export class UnauthorizedError extends ApplicationError {
  constructor(message: string, details?: unknown, context?: ErrorContext) {
    super(message, 'UNAUTHORIZED', 401, details, context);
  }
}

/**
 * Forbidden error (403 Forbidden)
 */
export class ForbiddenError extends ApplicationError {
  constructor(message: string, details?: unknown, context?: ErrorContext) {
    super(message, 'FORBIDDEN', 403, details, context);
  }
}

/**
 * Conflict error (409 Conflict)
 */
export class ConflictError extends ApplicationError {
  constructor(message: string, details?: unknown, context?: ErrorContext) {
    super(message, 'CONFLICT', 409, details, context);
  }
}

/**
 * Internal server error (500 Internal Server Error)
 */
export class InternalServerError extends ApplicationError {
  constructor(message: string, details?: unknown, context?: ErrorContext) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, details, context);
  }
}

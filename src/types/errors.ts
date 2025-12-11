/**
 * Standardized Error Types
 *
 * Provides consistent error handling and response types across the application.
 * All API errors should use these types for consistent error handling.
 */

/**
 * Standard error codes for consistent error handling
 */
export enum ErrorCode {
  // Client Errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // Application Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
}

/**
 * Base API error response structure
 */
export interface ApiError {
  /**
   * Error code for programmatic handling
   */
  code: ErrorCode | string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * HTTP status code
   */
  statusCode?: number;

  /**
   * Additional error details (e.g., validation errors)
   */
  details?: Record<string, unknown>;

  /**
   * Timestamp when the error occurred
   */
  timestamp: string;

  /**
   * Unique request ID for tracking
   */
  requestId?: string;

  /**
   * Path or endpoint where the error occurred
   */
  path?: string;
}

/**
 * Validation error for form/input validation
 */
export interface ValidationError {
  /**
   * Field name that failed validation
   */
  field: string;

  /**
   * Validation error message
   */
  message: string;

  /**
   * Validation rule that failed
   */
  rule?: string;

  /**
   * Additional context
   */
  context?: Record<string, unknown>;
}

/**
 * API error with validation details
 */
export interface ApiValidationError extends ApiError {
  code: ErrorCode.VALIDATION_ERROR;
  details: {
    errors: ValidationError[];
  };
}

/**
 * Network error structure
 */
export interface NetworkError extends Error {
  code: ErrorCode.NETWORK_ERROR | ErrorCode.TIMEOUT_ERROR | ErrorCode.CONNECTION_ERROR;
  statusCode?: number;
  isNetworkError: true;
}

/**
 * Type guard to check if an error is an ApiError
 */
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'timestamp' in error
  );
};

/**
 * Type guard to check if an error is a ValidationError
 */
export const isValidationError = (error: unknown): error is ApiValidationError => {
  return (
    isApiError(error) &&
    error.code === ErrorCode.VALIDATION_ERROR &&
    'details' in error &&
    typeof error.details === 'object' &&
    error.details !== null &&
    'errors' in error.details
  );
};

/**
 * Type guard to check if an error is a NetworkError
 */
export const isNetworkError = (error: unknown): error is NetworkError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isNetworkError' in error &&
    error.isNetworkError === true
  );
};

/**
 * Create a standardized API error
 */
export const createApiError = (
  code: ErrorCode | string,
  message: string,
  options?: {
    statusCode?: number;
    details?: Record<string, unknown>;
    requestId?: string;
    path?: string;
  }
): ApiError => {
  return {
    code,
    message,
    timestamp: new Date().toISOString(),
    ...options,
  };
};

/**
 * Create a validation error
 */
export const createValidationError = (
  errors: ValidationError[],
  message = 'Validation failed'
): ApiValidationError => {
  return {
    code: ErrorCode.VALIDATION_ERROR,
    message,
    timestamp: new Date().toISOString(),
    statusCode: 400,
    details: {
      errors,
    },
  };
};

/**
 * Convert unknown error to ApiError
 */
export const normalizeError = (error: unknown): ApiError => {
  // Already an ApiError
  if (isApiError(error)) {
    return error;
  }

  // Network error
  if (isNetworkError(error)) {
    return createApiError(error.code, error.message, {
      statusCode: error.statusCode,
    });
  }

  // Standard Error object
  if (error instanceof Error) {
    return createApiError(ErrorCode.UNKNOWN_ERROR, error.message);
  }

  // String error
  if (typeof error === 'string') {
    return createApiError(ErrorCode.UNKNOWN_ERROR, error);
  }

  // Unknown error type
  return createApiError(
    ErrorCode.UNKNOWN_ERROR,
    'An unexpected error occurred',
    {
      details: { originalError: error },
    }
  );
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyMessage = (error: ApiError): string => {
  const errorMessages: Record<string, string> = {
    [ErrorCode.BAD_REQUEST]: 'Invalid request. Please check your input and try again.',
    [ErrorCode.UNAUTHORIZED]: 'You need to be logged in to perform this action.',
    [ErrorCode.FORBIDDEN]: "You don't have permission to perform this action.",
    [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
    [ErrorCode.CONFLICT]: 'This action conflicts with existing data.',
    [ErrorCode.VALIDATION_ERROR]: 'Please correct the errors and try again.',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Something went wrong on our end. Please try again.',
    [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later.',
    [ErrorCode.GATEWAY_TIMEOUT]: 'Request timed out. Please try again.',
    [ErrorCode.NETWORK_ERROR]: 'Network connection error. Please check your connection.',
    [ErrorCode.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
    [ErrorCode.CONNECTION_ERROR]: 'Connection failed. Please check your internet connection.',
    [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
    [ErrorCode.PARSE_ERROR]: 'Failed to process the response. Please try again.',
  };

  return errorMessages[error.code] || error.message || errorMessages[ErrorCode.UNKNOWN_ERROR];
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: ApiError): boolean => {
  const retryableCodes = [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT_ERROR,
    ErrorCode.CONNECTION_ERROR,
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.GATEWAY_TIMEOUT,
    ErrorCode.INTERNAL_SERVER_ERROR,
  ];

  return retryableCodes.includes(error.code as ErrorCode);
};

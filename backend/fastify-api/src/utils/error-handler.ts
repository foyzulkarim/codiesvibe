import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logError } from './logger';

// Custom error classes
export class MCPError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'MCPError';
  }
}

export class AgentError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AgentError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Error response interface
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: any;
}

// Global error handler for Fastify
export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  const errorInfo = logError(error, `${request.method} ${request.url}`);
  
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorType = 'InternalServerError';
  
  // Handle different error types
  if (error instanceof MCPError) {
    statusCode = error.statusCode;
    message = error.message;
    errorType = 'MCPError';
  } else if (error instanceof AgentError) {
    statusCode = error.statusCode;
    message = error.message;
    errorType = 'AgentError';
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    message = error.message;
    errorType = 'ValidationError';
  } else if (error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
    errorType = error.name || 'HTTPError';
  }
  
  const errorResponse: ErrorResponse = {
    error: errorType,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: request.url,
    ...(process.env.NODE_ENV === 'development' && { details: errorInfo })
  };
  
  reply.code(statusCode).send(errorResponse);
};// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await fn(request, reply);
    } catch (error) {
      throw error; // Let Fastify's error handler catch it
    }
  };
};

// Validation helper
export const validateRequest = (data: any, requiredFields: string[]): void => {
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new ValidationError(`Missing required field: ${field}`, field);
    }
  }
};

// Retry utility for external service calls
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError!;
};

// Circuit breaker pattern for external services
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}
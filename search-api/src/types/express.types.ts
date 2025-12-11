import type { Request, Response, NextFunction } from 'express';

/**
 * Authenticated request with Clerk authentication data
 */
export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
    claims?: Record<string, unknown>;
  };
}

/**
 * Request with correlation and tracking identifiers
 */
export interface CorrelatedRequest extends Request {
  correlationId?: string;
  requestId?: string;
  startTime?: number;
}

/**
 * Combined application request type with authentication and correlation
 */
export type AppRequest = AuthenticatedRequest & CorrelatedRequest;

/**
 * Error object with HTTP status information
 */
export interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Type-safe async request handler for Express middleware
 */
export type AsyncRequestHandler<
  TRequest extends Request = Request,
  TResponse = unknown
> = (
  req: TRequest,
  res: Response,
  next: NextFunction
) => Promise<void | TResponse>;

/**
 * Standard Express middleware function type
 */
export type RequestHandler<TRequest extends Request = Request> = (
  req: TRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Error handling middleware type
 */
export type ErrorRequestHandler<TRequest extends Request = Request> = (
  err: ErrorWithStatus,
  req: TRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

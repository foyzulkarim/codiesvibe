import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '@clerk/express';

/**
 * Extended Express Request with Clerk authentication
 */
export interface ClerkAuthenticatedRequest extends Request {
  auth: {
    userId: string;
    sessionId: string;
    [key: string]: any;
  };
}

/**
 * Clerk authentication middleware
 * Requires a valid Clerk session and attaches user info to req.auth
 */
export const clerkRequireAuth = requireAuth();

/**
 * Type guard to check if request has Clerk auth
 */
export function isClerkAuthenticated(req: Request): req is ClerkAuthenticatedRequest {
  return 'auth' in req && req.auth !== null && typeof (req.auth as any).userId === 'string';
}

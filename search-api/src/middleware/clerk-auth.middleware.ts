import { Request, Response, NextFunction } from 'express';
import { requireAuth, getAuth } from '@clerk/express';
import { searchLogger } from '../config/logger';

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
 * Debug middleware to log authentication state before requireAuth
 * Only logs in development environment with DEBUG_AUTH=true
 */
export const debugAuthState = (req: Request, res: Response, next: NextFunction) => {
  // Only log in development environment with explicit debug flag
  if (process.env.NODE_ENV !== 'development' || process.env.DEBUG_AUTH !== 'true') {
    next();
    return;
  }

  const auth = getAuth(req);

  searchLogger.info('[DEBUG] Auth state', {
    service: 'clerk-auth-middleware',
    path: req.path,
    method: req.method,
    hasAuthHeader: !!req.headers.authorization,
    authState: auth ? {
      userId: auth.userId,
      hasSessionClaims: !!auth.sessionClaims,
    } : 'not authenticated',
  });

  next();
};

/**
 * Clerk authentication middleware
 * Requires a valid Clerk session and attaches user info to req.auth
 */
const clerkRequireAuthBase = requireAuth();

export const clerkRequireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Run debug logging first (only in dev with DEBUG_AUTH=true)
  debugAuthState(req, res, () => {
    // Then run the actual requireAuth
    clerkRequireAuthBase(req, res, (err?: any) => {
      if (err) {
        // Only log auth failures (not verbose success logging)
        searchLogger.warn('Authentication failed', {
          service: 'clerk-auth-middleware',
          path: req.path,
          method: req.method,
          errorCode: err.code || err.status,
        });
      }
      next(err);
    });
  });
};


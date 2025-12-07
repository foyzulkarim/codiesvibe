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
 */
export const debugAuthState = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const hasAuthHeader = !!authHeader;
  const authHeaderPreview = authHeader
    ? `${authHeader.substring(0, 30)}...${authHeader.substring(authHeader.length - 20)}`
    : 'none';

  // Try to get auth state from clerkMiddleware
  const auth = getAuth(req);

  searchLogger.info('🔐 [DEBUG] Auth state before requireAuth', {
    service: 'clerk-auth-middleware',
    path: req.path,
    method: req.method,
    hasAuthHeader,
    authHeaderPreview,
    authFromClerkMiddleware: auth ? {
      userId: auth.userId,
      sessionId: auth.sessionId,
      sessionClaims: auth.sessionClaims ? 'present' : 'missing',
    } : 'null/undefined',
    reqAuthExists: 'auth' in req,
    reqAuth: (req as any).auth ? {
      userId: (req as any).auth.userId,
      sessionId: (req as any).auth.sessionId,
    } : 'not set',
    clerkEnvCheck: {
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
      secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 15) + '...',
      hasPublishableKey: !!process.env.CLERK_PUBLISHABLE_KEY,
    },
  });

  next();
};

/**
 * Wrapper around requireAuth that logs errors
 */
const clerkRequireAuthBase = requireAuth();

export const clerkRequireAuth = (req: Request, res: Response, next: NextFunction) => {
  // First run debug logging
  debugAuthState(req, res, () => {
    // Then run the actual requireAuth
    clerkRequireAuthBase(req, res, (err?: any) => {
      if (err) {
        searchLogger.error('🔐 [DEBUG] requireAuth failed', err, {
          service: 'clerk-auth-middleware',
          path: req.path,
          method: req.method,
          errorMessage: err.message,
          errorName: err.name,
          errorCode: err.code,
          errorStatus: err.status,
          errorClerkError: err.clerkError,
        });
      } else {
        const authReq = req as ClerkAuthenticatedRequest;
        searchLogger.info('🔐 [DEBUG] requireAuth succeeded', {
          service: 'clerk-auth-middleware',
          path: req.path,
          method: req.method,
          userId: authReq.auth?.userId,
          sessionId: authReq.auth?.sessionId,
        });
      }
      next(err);
    });
  });
};


import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { ClerkAuthenticatedRequest } from './clerk-auth.middleware';
import { searchLogger } from '../config/logger';
import { SearchRequest } from './correlation.middleware';

// User roles
export type UserRole = 'admin' | 'maintainer';

// Extended request with role information
export interface RoleAuthenticatedRequest extends ClerkAuthenticatedRequest {
  userRole: UserRole;
}

/**
 * Default role for authenticated users without explicit role assignment
 */
const DEFAULT_ROLE: UserRole = 'maintainer';

/**
 * Get user role from Clerk session claims (JWT)
 *
 * IMPORTANT: This requires configuring the Clerk Dashboard to include the role
 * in the session token. Go to Clerk Dashboard > Sessions > Customize session token
 * and add: { "metadata": "{{user.public_metadata}}" }
 *
 * This avoids making an API call to Clerk on every request.
 * Falls back to 'maintainer' if no role is set.
 */
function getUserRoleFromClaims(req: Request): UserRole {
  const auth = getAuth(req);

  // Access role from session claims
  // The structure depends on your Clerk session token configuration
  // With { "metadata": "{{user.public_metadata}}" }, it will be at auth.sessionClaims?.metadata?.role
  const sessionClaims = auth?.sessionClaims as Record<string, unknown> | undefined;
  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  const role = metadata?.role as string | undefined;

  if (role === 'admin') {
    return 'admin';
  }

  return DEFAULT_ROLE;
}

/**
 * Middleware to attach user role to request
 * Must be used after clerkRequireAuth middleware
 *
 * Reads role from JWT session claims (no API call required)
 */
export const attachUserRole = (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = getUserRoleFromClaims(req);
    (req as RoleAuthenticatedRequest).userRole = role;
    next();
  } catch (error) {
    const searchReq = req as SearchRequest;
    searchLogger.error('Failed to attach user role', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'role-middleware',
      correlationId: searchReq.correlationId,
    });

    return res.status(500).json({
      error: 'Failed to process authentication',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Middleware to require admin role
 * Must be used after attachUserRole middleware
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const roleReq = req as RoleAuthenticatedRequest;

  if (roleReq.userRole !== 'admin') {
    const searchReq = req as SearchRequest;
    searchLogger.logSecurityEvent('Admin access denied', {
      service: 'role-middleware',
      correlationId: searchReq.correlationId,
      userId: roleReq.auth?.userId,
      userRole: roleReq.userRole,
      path: req.path,
      method: req.method,
    }, 'warn');

    return res.status(403).json({
      error: 'Admin access required',
      code: 'FORBIDDEN',
    });
  }

  next();
};

/**
 * Type guard to check if request has role attached
 * Should only be called after clerkRequireAuth and attachUserRole middleware
 */
export function hasRole(req: Request): req is RoleAuthenticatedRequest {
  return 'auth' in req && 'userRole' in req;
}

/**
 * Check if user is admin
 */
export function isAdmin(req: Request): boolean {
  return hasRole(req) && req.userRole === 'admin';
}

/**
 * Check if user is the owner of a resource
 * Should only be called after clerkRequireAuth middleware
 */
export function isOwner(req: Request, contributorId: string): boolean {
  const authReq = req as ClerkAuthenticatedRequest;
  return authReq.auth?.userId === contributorId;
}

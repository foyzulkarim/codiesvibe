import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/express';
import { ClerkAuthenticatedRequest, isClerkAuthenticated } from './clerk-auth.middleware';
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
 * Get user role from Clerk public metadata
 * Falls back to 'maintainer' if no role is set
 */
async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const user = await clerkClient.users.getUser(userId);
    const role = user.publicMetadata?.role as string | undefined;

    if (role === 'admin') {
      return 'admin';
    }

    return DEFAULT_ROLE;
  } catch (error) {
    searchLogger.error('Failed to fetch user role from Clerk', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'role-middleware',
      userId,
    });
    return DEFAULT_ROLE;
  }
}

/**
 * Middleware to attach user role to request
 * Must be used after clerkRequireAuth middleware
 */
export const attachUserRole = async (req: Request, res: Response, next: NextFunction) => {
  if (!isClerkAuthenticated(req)) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
  }

  try {
    const role = await getUserRole(req.auth.userId);
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
 */
export function hasRole(req: Request): req is RoleAuthenticatedRequest {
  return isClerkAuthenticated(req) && 'userRole' in req;
}

/**
 * Check if user is admin
 */
export function isAdmin(req: Request): boolean {
  return hasRole(req) && req.userRole === 'admin';
}

/**
 * Check if user is the owner of a resource
 */
export function isOwner(req: Request, contributorId: string): boolean {
  if (!isClerkAuthenticated(req)) {
    return false;
  }
  return req.auth.userId === contributorId;
}

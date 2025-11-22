import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { JWTPayload } from '../schemas/auth.schema';
import { searchLogger } from '../config/logger';
import { SearchRequest } from './correlation.middleware';

// Extend Express Request to include user
export interface AuthenticatedRequest extends SearchRequest {
  user?: JWTPayload;
}

/**
 * Extract JWT token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Expect "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Middleware to authenticate JWT token
 * Returns 401 if token is missing or invalid
 */
export function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (!token) {
    searchLogger.logSecurityEvent('Authentication failed - no token provided', {
      correlationId: req.correlationId,
      service: 'auth-middleware',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    }, 'warn');

    res.status(401).json({
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
    return;
  }

  const payload = authService.verifyToken(token);

  if (!payload) {
    searchLogger.logSecurityEvent('Authentication failed - invalid token', {
      correlationId: req.correlationId,
      service: 'auth-middleware',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    }, 'warn');

    res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
    return;
  }

  // Attach user payload to request
  req.user = payload;

  searchLogger.info('User authenticated', {
    service: 'auth-middleware',
    correlationId: req.correlationId,
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  });

  next();
}

/**
 * Optional authentication middleware
 * Attaches user to request if valid token present, but doesn't fail if missing
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (token) {
    const payload = authService.verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

/**
 * Middleware to require specific role(s)
 * Must be used after authenticateJWT middleware
 */
export function requireRole(...roles: Array<'admin' | 'user'>) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      searchLogger.logSecurityEvent('Authorization failed - insufficient role', {
        correlationId: req.correlationId,
        service: 'auth-middleware',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      }, 'warn');

      res.status(403).json({
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require admin role
 * Convenience wrapper for requireRole('admin')
 */
export const requireAdmin = requireRole('admin');

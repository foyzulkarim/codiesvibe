/**
 * Auth Middleware Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../../config/logger', () => ({
  searchLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logSecurityEvent: jest.fn(),
  },
}));

// Set test environment
process.env.JWT_SECRET = 'test-jwt-secret-for-middleware-testing';

// Import after mocking
import {
  authenticateJWT,
  optionalAuth,
  requireRole,
  AuthenticatedRequest,
} from '../../../middleware/auth.middleware';

describe('Auth Middleware', () => {
  const mockJwtSecret = 'test-jwt-secret-for-middleware-testing';
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      get: jest.fn((header: string) => {
        if (header === 'authorization' || header === 'Authorization') {
          return mockRequest.headers?.authorization;
        }
        return undefined;
      }),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('authenticateJWT', () => {
    it('should return 401 if no authorization header is provided', () => {
      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header format is invalid', () => {
      mockRequest.headers = { authorization: 'InvalidFormat token123' };

      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token.here' };

      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next and set user on request for valid token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
      };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedRequest).user).toBeDefined();
      expect((mockRequest as AuthenticatedRequest).user?.userId).toBe(payload.userId);
      expect((mockRequest as AuthenticatedRequest).user?.email).toBe(payload.email);
    });

    it('should return 401 for expired token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
      };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '-1h' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should call next without setting user if no token provided', () => {
      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
    });

    it('should call next without setting user for invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token' };

      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
    });

    it('should set user for valid token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
      };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedRequest).user).toBeDefined();
      expect((mockRequest as AuthenticatedRequest).user?.userId).toBe(payload.userId);
    });
  });

  describe('requireRole', () => {
    it('should return 403 if user is not authenticated', () => {
      const middleware = requireRole('admin');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to access this resource',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 if user role does not match', () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
      };
      const middleware = requireRole('admin');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next if user has required role', () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
      };
      const middleware = requireRole('admin');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should call next if user has one of multiple allowed roles', () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
      };
      const middleware = requireRole('admin', 'user');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});

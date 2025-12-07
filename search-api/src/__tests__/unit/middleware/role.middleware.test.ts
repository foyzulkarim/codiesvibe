/**
 * Role Middleware Unit Tests
 * Tests for RBAC middleware functions
 */

import { Request, Response, NextFunction } from 'express';

// Mock getAuth from @clerk/express before importing the middleware
jest.mock('@clerk/express', () => ({
  getAuth: jest.fn(),
}));

// Mock logger to prevent console output during tests
jest.mock('../../../config/logger', () => ({
  searchLogger: {
    error: jest.fn(),
    logSecurityEvent: jest.fn(),
  },
}));

import { getAuth } from '@clerk/express';
import {
  attachUserRole,
  requireAdmin,
  hasRole,
  isAdmin,
  isOwner,
  RoleAuthenticatedRequest,
} from '../../../middleware/role.middleware.js';

describe('Role Middleware', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockReq = {
      path: '/api/tools',
      method: 'GET',
      auth: {
        userId: 'user_test123',
        sessionId: 'sess_test123',
      },
    };

    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    mockNext = jest.fn();
  });

  describe('attachUserRole', () => {
    it('should attach admin role when session claims include admin role', () => {
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_test123',
        sessionClaims: {
          metadata: { role: 'admin' },
        },
      });

      attachUserRole(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as RoleAuthenticatedRequest).userRole).toBe('admin');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach maintainer role when session claims have no role', () => {
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_test123',
        sessionClaims: {
          metadata: {},
        },
      });

      attachUserRole(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as RoleAuthenticatedRequest).userRole).toBe('maintainer');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach maintainer role when metadata is undefined', () => {
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_test123',
        sessionClaims: {},
      });

      attachUserRole(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as RoleAuthenticatedRequest).userRole).toBe('maintainer');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach maintainer role when sessionClaims is undefined', () => {
      (getAuth as jest.Mock).mockReturnValue({
        userId: 'user_test123',
      });

      attachUserRole(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as RoleAuthenticatedRequest).userRole).toBe('maintainer');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach maintainer role when getAuth returns null', () => {
      (getAuth as jest.Mock).mockReturnValue(null);

      attachUserRole(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as RoleAuthenticatedRequest).userRole).toBe('maintainer');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 500 when getAuth throws an error', () => {
      (getAuth as jest.Mock).mockImplementation(() => {
        throw new Error('Auth error');
      });

      attachUserRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to process authentication',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('requireAdmin', () => {
    it('should call next() when user is admin', () => {
      (mockReq as RoleAuthenticatedRequest).userRole = 'admin';

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return 403 when user is maintainer', () => {
      (mockReq as RoleAuthenticatedRequest).userRole = 'maintainer';

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'FORBIDDEN',
      });
    });

    it('should return 403 when userRole is undefined', () => {
      // userRole not set
      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('hasRole', () => {
    it('should return true when request has auth and userRole', () => {
      (mockReq as RoleAuthenticatedRequest).userRole = 'admin';

      expect(hasRole(mockReq as Request)).toBe(true);
    });

    it('should return false when request has no userRole', () => {
      expect(hasRole(mockReq as Request)).toBe(false);
    });

    it('should return false when request has no auth', () => {
      delete (mockReq as any).auth;

      expect(hasRole(mockReq as Request)).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true when user is admin', () => {
      (mockReq as RoleAuthenticatedRequest).userRole = 'admin';

      expect(isAdmin(mockReq as Request)).toBe(true);
    });

    it('should return false when user is maintainer', () => {
      (mockReq as RoleAuthenticatedRequest).userRole = 'maintainer';

      expect(isAdmin(mockReq as Request)).toBe(false);
    });

    it('should return false when userRole is not set', () => {
      expect(isAdmin(mockReq as Request)).toBe(false);
    });
  });

  describe('isOwner', () => {
    it('should return true when userId matches contributorId', () => {
      expect(isOwner(mockReq as Request, 'user_test123')).toBe(true);
    });

    it('should return false when userId does not match contributorId', () => {
      expect(isOwner(mockReq as Request, 'user_other456')).toBe(false);
    });

    it('should return false when auth is not present', () => {
      delete (mockReq as any).auth;

      expect(isOwner(mockReq as Request, 'user_test123')).toBe(false);
    });
  });
});

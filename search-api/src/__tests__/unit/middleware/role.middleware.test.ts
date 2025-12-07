/**
 * Role Middleware Unit Tests
 * Tests for RBAC middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/express';

// Mock Clerk client before importing the middleware
jest.mock('@clerk/express', () => ({
  clerkClient: {
    users: {
      getUser: jest.fn(),
    },
  },
}));

// Mock logger to prevent console output during tests
jest.mock('../../../config/logger', () => ({
  searchLogger: {
    error: jest.fn(),
    logSecurityEvent: jest.fn(),
  },
}));

import {
  attachUserRole,
  requireAdmin,
  hasRole,
  isAdmin,
  isOwner,
  RoleAuthenticatedRequest,
} from '../../../middleware/role.middleware';

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
    it('should attach admin role when user has admin in publicMetadata', async () => {
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        publicMetadata: { role: 'admin' },
      });

      await attachUserRole(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as RoleAuthenticatedRequest).userRole).toBe('admin');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach maintainer role when user has no role in publicMetadata', async () => {
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        publicMetadata: {},
      });

      await attachUserRole(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as RoleAuthenticatedRequest).userRole).toBe('maintainer');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach maintainer role when publicMetadata is undefined', async () => {
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({});

      await attachUserRole(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as RoleAuthenticatedRequest).userRole).toBe('maintainer');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should default to maintainer role on Clerk API error', async () => {
      (clerkClient.users.getUser as jest.Mock).mockRejectedValue(new Error('Clerk API error'));

      await attachUserRole(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as RoleAuthenticatedRequest).userRole).toBe('maintainer');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call Clerk API with correct userId', async () => {
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        publicMetadata: { role: 'admin' },
      });

      await attachUserRole(mockReq as Request, mockRes as Response, mockNext);

      expect(clerkClient.users.getUser).toHaveBeenCalledWith('user_test123');
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

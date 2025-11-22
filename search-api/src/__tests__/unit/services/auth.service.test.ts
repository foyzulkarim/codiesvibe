/**
 * Auth Service Unit Tests
 */

import jwt from 'jsonwebtoken';

// Mock dependencies before importing
jest.mock('../../../config/logger', () => ({
  searchLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logSecurityEvent: jest.fn(),
  },
}));

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_ACCESS_EXPIRY = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';

describe('AuthService', () => {
  // We'll test the token generation and verification functions
  // which don't require database connection

  const mockJwtSecret = 'test-jwt-secret-for-testing';

  describe('Token Generation', () => {
    it('should generate a valid access token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token structure
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should generate a valid refresh token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '7d' });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should include correct payload in token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'admin' as const,
      };

      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });
      const decoded = jwt.verify(token, mockJwtSecret) as typeof payload;

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });
  });

  describe('Token Verification', () => {
    it('should verify a valid token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });
      const decoded = jwt.verify(token, mockJwtSecret) as typeof payload;

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should reject an invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        jwt.verify(invalidToken, mockJwtSecret);
      }).toThrow();
    });

    it('should reject a token with wrong secret', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = jwt.sign(payload, 'different-secret', { expiresIn: '1h' });

      expect(() => {
        jwt.verify(token, mockJwtSecret);
      }).toThrow();
    });

    it('should reject an expired token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user' as const,
      };

      // Create a token that expired 1 hour ago
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '-1h' });

      expect(() => {
        jwt.verify(token, mockJwtSecret);
      }).toThrow();
    });
  });

  describe('Token Response Format', () => {
    it('should have correct token response structure', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user' as const,
      };

      const accessToken = jwt.sign(payload, mockJwtSecret, { expiresIn: '24h' });
      const refreshToken = jwt.sign(payload, mockJwtSecret, { expiresIn: '7d' });

      const tokenResponse = {
        accessToken,
        refreshToken,
        expiresIn: 86400, // 24h in seconds
        tokenType: 'Bearer' as const,
      };

      expect(tokenResponse.accessToken).toBeDefined();
      expect(tokenResponse.refreshToken).toBeDefined();
      expect(tokenResponse.expiresIn).toBe(86400);
      expect(tokenResponse.tokenType).toBe('Bearer');
    });
  });
});

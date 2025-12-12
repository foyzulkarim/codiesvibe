/**
 * Environment Validator CORS Tests
 * Tests for CORS validation in environment validator
 */

import { validateEnvironment } from '../../../utils/env-validator.js';

// Mock the logger to avoid console output during tests
jest.mock('../../../config/logger.js', () => ({
  searchLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSecurityEvent: jest.fn(),
  },
}));

describe('Environment Validator - CORS Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { 
      ...originalEnv,
      // Set minimal required environment variables to avoid unrelated validation failures
      MONGODB_URI: 'mongodb://localhost:27017/test',
      QDRANT_HOST: 'localhost',
      QDRANT_PORT: '6333',
      CLERK_SECRET_KEY: 'sk_test_test_key',
      CLERK_PUBLISHABLE_KEY: 'pk_test_test_key',
      TOGETHER_API_KEY: 'test_key'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // Mock process.exit to prevent Jest from exiting
  const originalExit = process.exit;

  beforeEach(() => {
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('ALLOWED_ORIGINS Validation', () => {
    // NOTE: ALLOWED_ORIGINS is optional in env-validator.ts (required: false)
    // The validate function is only called when a value is provided
    // So validateEnvironment() does NOT fail when ALLOWED_ORIGINS is missing in production
    // Production CORS enforcement should be done via validateCorsConfiguration() instead
    it('should NOT require ALLOWED_ORIGINS in production (it is optional in env-validator)', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;

      // validateEnvironment does NOT fail for missing ALLOWED_ORIGINS because:
      // 1. ALLOWED_ORIGINS has required: false
      // 2. For optional vars without value, validation is skipped (line 180)
      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should accept valid ALLOWED_ORIGINS in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://www.example.com';
      
      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should reject ALLOWED_ORIGINS with invalid URL format', () => {
      process.env.ALLOWED_ORIGINS = 'invalid-url,https://example.com';
      
      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should reject ALLOWED_ORIGINS without protocol', () => {
      process.env.ALLOWED_ORIGINS = 'example.com,www.example.com';
      
      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should accept ALLOWED_ORIGINS with localhost URLs', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://localhost:3001';
      
      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle empty ALLOWED_ORIGINS in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;
      
      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('CORS_ORIGINS Validation', () => {
    it('should accept valid CORS_ORIGINS', () => {
      process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001';
      
      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should reject CORS_ORIGINS with invalid URL format', () => {
      process.env.CORS_ORIGINS = 'invalid-url,http://localhost:3000';
      
      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should reject CORS_ORIGINS without protocol', () => {
      process.env.CORS_ORIGINS = 'localhost:3000,localhost:3001';
      
      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle empty CORS_ORIGINS', () => {
      delete process.env.CORS_ORIGINS;
      
      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('URL Format Edge Cases', () => {
    it('should handle malformed URLs', () => {
      process.env.ALLOWED_ORIGINS = 'https://,https://example.com:invalid-port';

      try {
        validateEnvironment();
      } catch (error) {
        // May throw due to process.exit
      }

      // validateEnvironment calls process.exit(1) on validation failure, not throw
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle whitespace in comma-separated values', () => {
      process.env.ALLOWED_ORIGINS = ' https://example.com , https://www.example.com ';
      
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should handle empty values in comma-separated list', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,,https://www.example.com';
      
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should accept URLs with ports', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com:8080,http://localhost:3000';
      
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should accept URLs with different protocols', () => {
      process.env.ALLOWED_ORIGINS = 'http://example.com,https://api.example.com';
      
      expect(() => validateEnvironment()).not.toThrow();
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should allow all origins in development when CORS_ORIGINS is not set', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.CORS_ORIGINS;
      
      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should allow all origins in test environment', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.CORS_ORIGINS;
      
      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should validate origins even in development when they are provided', () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOWED_ORIGINS = 'invalid-url';
      
      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
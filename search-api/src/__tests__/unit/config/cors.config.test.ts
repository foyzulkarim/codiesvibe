/**
 * CORS Configuration Unit Tests
 * Tests for fail-fast CORS validation and configuration
 */

import { validateCorsConfiguration } from '../../../config/cors.config.js';
import { rebuildConfig } from '../../../config/env.config.js';
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

describe('CORS Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateCorsConfiguration', () => {
    it('should pass in development when ALLOWED_ORIGINS is not set', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;
      
      // Rebuild config to reflect the environment changes
      const config = rebuildConfig();
      
      expect(() => validateCorsConfiguration()).not.toThrow();
    });

    it('should pass in development when ALLOWED_ORIGINS is set', () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOWED_ORIGINS = 'https://localhost:3000';
      
      const config = rebuildConfig();
      
      expect(() => validateCorsConfiguration()).not.toThrow();
    });

    it('should fail in production when ALLOWED_ORIGINS is not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;
      
      const config = rebuildConfig();
      
      expect(() => validateCorsConfiguration()).toThrow(
        'Production CORS validation failed: ALLOWED_ORIGINS environment variable is required'
      );
    });

    it('should fail in production when ALLOWED_ORIGINS is empty', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = '';
      
      const config = rebuildConfig();
      
      expect(() => validateCorsConfiguration()).toThrow(
        'Production CORS validation failed: ALLOWED_ORIGINS environment variable is required'
      );
    });

    it('should fail in production when origin does not start with http:// or https://', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'localhost:3000,https://example.com';
      
      const config = rebuildConfig();
      
      expect(() => validateCorsConfiguration()).toThrow(
        'Production CORS validation failed: Invalid origin format "localhost:3000"'
      );
    });

    it('should pass in production with valid ALLOWED_ORIGINS', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://www.example.com';
      
      const config = rebuildConfig();
      
      expect(() => validateCorsConfiguration()).not.toThrow();
    });

    it('should pass in production with localhost origins for testing', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://localhost:3001';
      
      const config = rebuildConfig();
      
      expect(() => validateCorsConfiguration()).not.toThrow();
    });
  });

  describe('Environment Validation Integration', () => {
    // Mock process.exit to prevent Jest from exiting
    const originalExit = process.exit;

    beforeEach(() => {
      process.exit = jest.fn() as any;
    });

    afterEach(() => {
      process.exit = originalExit;
    });

    it('should validate ALLOWED_ORIGINS format in environment validation', () => {
      process.env.ALLOWED_ORIGINS = 'invalid-url,https://example.com';
      
      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should validate CORS_ORIGINS format in environment validation', () => {
      process.env.CORS_ORIGINS = 'invalid-url,https://localhost:3000';
      
      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should require ALLOWED_ORIGINS in production during environment validation', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;
      
      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should pass environment validation with valid CORS origins', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://www.example.com';
      process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001';
      
      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should pass environment validation when CORS variables are not set in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.CORS_ORIGINS;
      
      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('URL Format Validation', () => {
    it('should reject URLs without protocol', () => {
      process.env.ALLOWED_ORIGINS = 'example.com,www.example.com';
      
      expect(() => validateEnvironment()).toThrow(
        'Invalid origin format: "example.com"'
      );
    });

    it('should reject malformed URLs', () => {
      process.env.ALLOWED_ORIGINS = 'https://,https://example.com:invalid-port';
      
      expect(() => validateEnvironment()).toThrow(
        'Invalid URL format: "https://"'
      );
    });

    it('should accept valid URLs with different protocols', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com,https://api.example.com:8080';
      
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should handle whitespace in comma-separated values', () => {
      process.env.ALLOWED_ORIGINS = ' https://example.com , https://www.example.com ';
      
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should handle empty values in comma-separated list', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,,https://www.example.com';
      
      expect(() => validateEnvironment()).not.toThrow();
    });
  });
});
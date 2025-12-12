/**
 * CORS Configuration Unit Tests
 * Tests for fail-fast CORS validation and configuration
 */

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

  // Set all required env vars needed by validateEnvironment()
  // NOTE: Does NOT set CORS-related vars (ALLOWED_ORIGINS, CORS_ORIGINS) - tests should set these explicitly
  const setRequiredEnvVars = () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.QDRANT_HOST = 'localhost';
    process.env.QDRANT_PORT = '6333';
    process.env.CLERK_SECRET_KEY = 'sk_test_mockkey123';
    process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_mockkey123';
    process.env.TOGETHER_API_KEY = 'test-api-key';
  };

  beforeEach(() => {
    jest.resetModules();
    // Copy originalEnv but explicitly remove CORS vars to ensure tests control them
    const { ALLOWED_ORIGINS, CORS_ORIGINS, ...envWithoutCors } = originalEnv as Record<string, string | undefined>;
    process.env = { ...envWithoutCors };
    // Set required env vars for base test environment
    setRequiredEnvVars();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateCorsConfiguration', () => {
    it('should pass in development when ALLOWED_ORIGINS is not set', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;

      // Dynamic import after setting env vars
      const { validateCorsConfiguration } = await import('../../../config/cors.config.js');

      expect(() => validateCorsConfiguration()).not.toThrow();
    });

    it('should pass in development when ALLOWED_ORIGINS is set', async () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOWED_ORIGINS = 'https://localhost:3000';

      const { validateCorsConfiguration } = await import('../../../config/cors.config.js');

      expect(() => validateCorsConfiguration()).not.toThrow();
    });

    it('should fail in production when ALLOWED_ORIGINS is not set', async () => {
      // Must delete ALLOWED_ORIGINS after setRequiredEnvVars()
      // Also delete any value that might be in the system environment
      delete process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'production';

      const { validateCorsConfiguration } = await import('../../../config/cors.config.js');

      expect(() => validateCorsConfiguration()).toThrow(
        'Production CORS validation failed: ALLOWED_ORIGINS environment variable is required'
      );
    });

    it('should fail in production when ALLOWED_ORIGINS is empty', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = '';

      const { validateCorsConfiguration } = await import('../../../config/cors.config.js');

      expect(() => validateCorsConfiguration()).toThrow(
        'Production CORS validation failed: ALLOWED_ORIGINS environment variable is required'
      );
    });

    it('should fail in production when origin does not start with http:// or https://', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'localhost:3000,https://example.com';

      const { validateCorsConfiguration } = await import('../../../config/cors.config.js');

      expect(() => validateCorsConfiguration()).toThrow(
        'Production CORS validation failed: Invalid origin format "localhost:3000"'
      );
    });

    it('should pass in production with valid ALLOWED_ORIGINS', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://www.example.com';

      const { validateCorsConfiguration } = await import('../../../config/cors.config.js');

      expect(() => validateCorsConfiguration()).not.toThrow();
    });

    it('should pass in production with localhost origins for testing', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://localhost:3001';

      const { validateCorsConfiguration } = await import('../../../config/cors.config.js');

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

    it('should validate ALLOWED_ORIGINS format in environment validation', async () => {
      process.env.ALLOWED_ORIGINS = 'invalid-url,https://example.com';

      const { validateEnvironment } = await import('../../../utils/env-validator.js');

      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should validate CORS_ORIGINS format in environment validation', async () => {
      process.env.CORS_ORIGINS = 'invalid-url,https://localhost:3000';

      const { validateEnvironment } = await import('../../../utils/env-validator.js');

      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    // NOTE: ALLOWED_ORIGINS is optional in env-validator.ts (required: false)
    // validateEnvironment() does NOT enforce ALLOWED_ORIGINS in production
    // Production CORS enforcement is done via validateCorsConfiguration() instead
    it('should NOT require ALLOWED_ORIGINS in production during environment validation (optional)', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;

      const { validateEnvironment } = await import('../../../utils/env-validator.js');

      // validateEnvironment does NOT fail for missing ALLOWED_ORIGINS
      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should pass environment validation with valid CORS origins', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://www.example.com';
      process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001';

      const { validateEnvironment } = await import('../../../utils/env-validator.js');

      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should pass environment validation when CORS variables are not set in development', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.CORS_ORIGINS;

      const { validateEnvironment } = await import('../../../utils/env-validator.js');

      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('URL Format Validation', () => {
    // Mock process.exit to prevent Jest from exiting
    const originalExit = process.exit;

    beforeEach(() => {
      process.exit = jest.fn() as any;
    });

    afterEach(() => {
      process.exit = originalExit;
    });

    it('should reject URLs without protocol', async () => {
      process.env.ALLOWED_ORIGINS = 'example.com,www.example.com';

      const { validateEnvironment } = await import('../../../utils/env-validator.js');

      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }

      // validateEnvironment calls process.exit(1) on validation failure
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should reject malformed URLs', async () => {
      process.env.ALLOWED_ORIGINS = 'https://,https://example.com:invalid-port';

      const { validateEnvironment } = await import('../../../utils/env-validator.js');

      try {
        validateEnvironment();
      } catch (error) {
        // Expected to throw due to process.exit
      }

      // validateEnvironment calls process.exit(1) on validation failure
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should accept valid URLs with different protocols', async () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com,https://api.example.com:8080';

      const { validateEnvironment } = await import('../../../utils/env-validator.js');

      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle whitespace in comma-separated values', async () => {
      process.env.ALLOWED_ORIGINS = ' https://example.com , https://www.example.com ';

      const { validateEnvironment } = await import('../../../utils/env-validator.js');

      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle empty values in comma-separated list', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,,https://www.example.com';

      const { validateEnvironment } = await import('../../../utils/env-validator.js');

      expect(() => validateEnvironment()).not.toThrow();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });
});

/**
 * Environment Configuration Unit Tests
 * Tests for type-safe parsing utilities and config building
 */

import {
  parseBoolean,
  parseBooleanInverse,
  parseIntSafe,
  parseFloatSafe,
  parseArray,
  parseString,
  rebuildConfig,
} from '../../../config/env.config.js';

describe('Environment Config Parsing Utilities', () => {
  describe('parseBoolean', () => {
    it('should return default value when value is undefined', () => {
      expect(parseBoolean(undefined, true)).toBe(true);
      expect(parseBoolean(undefined, false)).toBe(false);
    });

    it('should return true when value is "true" (case insensitive)', () => {
      expect(parseBoolean('true', false)).toBe(true);
      expect(parseBoolean('TRUE', false)).toBe(true);
      expect(parseBoolean('True', false)).toBe(true);
    });

    it('should return false for any other value', () => {
      expect(parseBoolean('false', true)).toBe(false);
      expect(parseBoolean('FALSE', true)).toBe(false);
      expect(parseBoolean('yes', true)).toBe(false);
      expect(parseBoolean('1', true)).toBe(false);
      expect(parseBoolean('', true)).toBe(false);
    });
  });

  describe('parseBooleanInverse', () => {
    it('should return default value when value is undefined', () => {
      expect(parseBooleanInverse(undefined, true)).toBe(true);
      expect(parseBooleanInverse(undefined, false)).toBe(false);
    });

    it('should return false when value is "false" (case insensitive)', () => {
      expect(parseBooleanInverse('false', true)).toBe(false);
      expect(parseBooleanInverse('FALSE', true)).toBe(false);
      expect(parseBooleanInverse('False', true)).toBe(false);
    });

    it('should return true for any other value', () => {
      expect(parseBooleanInverse('true', false)).toBe(true);
      expect(parseBooleanInverse('yes', false)).toBe(true);
      expect(parseBooleanInverse('1', false)).toBe(true);
      expect(parseBooleanInverse('', false)).toBe(true);
    });
  });

  describe('parseIntSafe', () => {
    it('should return default value when value is undefined', () => {
      expect(parseIntSafe(undefined, 42)).toBe(42);
      expect(parseIntSafe(undefined, 0)).toBe(0);
    });

    it('should parse valid integer strings', () => {
      expect(parseIntSafe('123', 0)).toBe(123);
      expect(parseIntSafe('0', 10)).toBe(0);
      expect(parseIntSafe('-456', 0)).toBe(-456);
    });

    it('should return default value for invalid integers', () => {
      expect(parseIntSafe('abc', 42)).toBe(42);
      expect(parseIntSafe('12.34', 0)).toBe(12); // parseInt truncates decimals
      expect(parseIntSafe('', 42)).toBe(42);
      expect(parseIntSafe('NaN', 42)).toBe(42);
    });

    it('should handle string with leading/trailing spaces', () => {
      expect(parseIntSafe('  123  ', 0)).toBe(123);
    });
  });

  describe('parseFloatSafe', () => {
    it('should return default value when value is undefined', () => {
      expect(parseFloatSafe(undefined, 3.14)).toBe(3.14);
      expect(parseFloatSafe(undefined, 0)).toBe(0);
    });

    it('should parse valid float strings', () => {
      expect(parseFloatSafe('3.14', 0)).toBe(3.14);
      expect(parseFloatSafe('0.5', 0)).toBe(0.5);
      expect(parseFloatSafe('-2.5', 0)).toBe(-2.5);
      expect(parseFloatSafe('100', 0)).toBe(100);
    });

    it('should return default value for invalid floats', () => {
      expect(parseFloatSafe('abc', 3.14)).toBe(3.14);
      expect(parseFloatSafe('', 3.14)).toBe(3.14);
      expect(parseFloatSafe('NaN', 3.14)).toBe(3.14);
    });
  });

  describe('parseArray', () => {
    it('should return empty array when value is undefined', () => {
      expect(parseArray(undefined)).toEqual([]);
    });

    it('should return empty array when value is empty string', () => {
      expect(parseArray('')).toEqual([]);
      expect(parseArray('   ')).toEqual([]);
    });

    it('should parse comma-separated values', () => {
      expect(parseArray('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(parseArray('one,two,three')).toEqual(['one', 'two', 'three']);
    });

    it('should trim whitespace from values', () => {
      expect(parseArray('a , b , c')).toEqual(['a', 'b', 'c']);
      expect(parseArray('  one  ,  two  ')).toEqual(['one', 'two']);
    });

    it('should filter out empty values', () => {
      expect(parseArray('a,,b')).toEqual(['a', 'b']);
      expect(parseArray('a,  ,b')).toEqual(['a', 'b']);
    });

    it('should support custom delimiters', () => {
      expect(parseArray('a|b|c', '|')).toEqual(['a', 'b', 'c']);
      expect(parseArray('a;b;c', ';')).toEqual(['a', 'b', 'c']);
    });

    it('should handle single value', () => {
      expect(parseArray('single')).toEqual(['single']);
    });
  });

  describe('parseString', () => {
    it('should return default value when value is undefined', () => {
      expect(parseString(undefined, 'default')).toBe('default');
    });

    it('should return default value when value is empty string', () => {
      expect(parseString('', 'default')).toBe('default');
    });

    it('should return the value when provided', () => {
      expect(parseString('custom', 'default')).toBe('custom');
      expect(parseString('0', 'default')).toBe('0');
    });
  });
});

describe('rebuildConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should build config with default values when env vars are not set', () => {
    // Clear relevant env vars
    delete process.env.PORT;
    delete process.env.MONGODB_URI;
    delete process.env.NODE_ENV;

    const config = rebuildConfig();

    expect(config.server.PORT).toBe(4003);
    expect(config.database.MONGODB_URI).toBe('mongodb://localhost:27017');
    expect(config.env.NODE_ENV).toBe('development');
    expect(config.env.IS_DEVELOPMENT).toBe(true);
  });

  it('should use environment variables when set', () => {
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://custom:27017';
    process.env.NODE_ENV = 'production';

    const config = rebuildConfig();

    expect(config.server.PORT).toBe(5000);
    expect(config.database.MONGODB_URI).toBe('mongodb://custom:27017');
    expect(config.env.NODE_ENV).toBe('production');
    expect(config.env.IS_PRODUCTION).toBe(true);
    expect(config.env.IS_DEVELOPMENT).toBe(false);
  });

  it('should correctly set environment flags', () => {
    process.env.NODE_ENV = 'test';
    const testConfig = rebuildConfig();
    expect(testConfig.env.IS_TEST).toBe(true);
    expect(testConfig.env.IS_PRODUCTION).toBe(false);
    expect(testConfig.env.IS_DEVELOPMENT).toBe(false);

    process.env.NODE_ENV = 'production';
    const prodConfig = rebuildConfig();
    expect(prodConfig.env.IS_PRODUCTION).toBe(true);
    expect(prodConfig.env.IS_TEST).toBe(false);

    process.env.NODE_ENV = 'development';
    const devConfig = rebuildConfig();
    expect(devConfig.env.IS_DEVELOPMENT).toBe(true);
    expect(devConfig.env.IS_PRODUCTION).toBe(false);
  });

  it('should parse feature flags correctly', () => {
    process.env.ENABLE_CACHE = 'true';
    process.env.ENABLE_RATE_LIMITING = 'false';
    process.env.CACHE_TTL = '7200';

    const config = rebuildConfig();

    expect(config.features.ENABLE_CACHE).toBe(true);
    expect(config.features.ENABLE_RATE_LIMITING).toBe(false);
    expect(config.features.CACHE_TTL).toBe(7200);
  });

  it('should parse CORS origins as arrays', () => {
    process.env.ALLOWED_ORIGINS = 'https://example.com, https://api.example.com';
    process.env.CORS_ORIGINS = 'http://localhost:3000';

    const config = rebuildConfig();

    expect(config.cors.ALLOWED_ORIGINS).toEqual([
      'https://example.com',
      'https://api.example.com',
    ]);
    expect(config.cors.CORS_ORIGINS).toEqual(['http://localhost:3000']);
  });

  it('should handle search configuration floats', () => {
    process.env.SEARCH_SCORE_THRESHOLD = '0.75';
    process.env.QUERY_EXECUTOR_HIGH_THRESHOLD = '0.85';

    const config = rebuildConfig();

    expect(config.search.SEARCH_SCORE_THRESHOLD).toBe(0.75);
    expect(config.search.QUERY_EXECUTOR_HIGH_THRESHOLD).toBe(0.85);
  });

  it('should handle null values for optional configs', () => {
    delete process.env.QDRANT_URL;
    delete process.env.QDRANT_API_KEY;
    delete process.env.TOGETHER_API_KEY;

    const config = rebuildConfig();

    expect(config.qdrant.QDRANT_URL).toBeNull();
    expect(config.qdrant.QDRANT_API_KEY).toBeNull();
    expect(config.ai.TOGETHER_API_KEY).toBeNull();
  });
});

/**
 * Centralized Environment Configuration
 *
 * Single source of truth for all environment variables.
 * Validates and exposes environment variables through a type-safe CONFIG object.
 *
 * IMPORTANT: This module loads dotenv automatically when imported to ensure
 * environment variables are available before CONFIG is built.
 */

// Load dotenv FIRST before any other code runs
// This ensures process.env is populated regardless of import order
import 'dotenv/config';

// =============================================================================
// Type-Safe Parsing Utilities
// =============================================================================

export const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const parseBooleanInverse = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() !== 'false';
};

export const parseIntSafe = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const parseFloatSafe = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const parseArray = (value: string | undefined, delimiter: string = ','): string[] => {
  if (!value || value.trim() === '') return [];
  return value.split(delimiter).map(s => s.trim()).filter(Boolean);
};

export const parseString = (value: string | undefined, defaultValue: string): string => {
  return value || defaultValue;
};

// =============================================================================
// Application Configuration Interface
// =============================================================================

export interface AppConfig {
  // Environment
  env: {
    NODE_ENV: 'development' | 'production' | 'test';
    IS_PRODUCTION: boolean;
    IS_DEVELOPMENT: boolean;
    IS_TEST: boolean;
  };

  // Server
  server: {
    PORT: number;
    FRONTEND_URL: string;
  };

  // Database - MongoDB
  database: {
    MONGODB_URI: string;
    MONGODB_DB_NAME: string;
    MONGODB_MAX_POOL_SIZE: number;
    MONGODB_MIN_POOL_SIZE: number;
  };

  // Database - Qdrant
  qdrant: {
    QDRANT_URL: string | null;
    QDRANT_HOST: string;
    QDRANT_PORT: number;
    QDRANT_API_KEY: string | null;
    QDRANT_COLLECTION_NAME: string;
    QDRANT_USE_ENHANCED_COLLECTION: boolean;
    // Collection names for multi-vector search
    collections: {
      SEMANTIC: string;
      CATEGORIES: string;
      FUNCTIONALITY: string;
      INTERFACE: string;
      INDUSTRIES: string;
      USER_TYPES: string;
      ALIASES: string;
      TOOL_TYPE: string;
    };
  };

  // Authentication - Clerk
  auth: {
    CLERK_PUBLISHABLE_KEY: string;
    CLERK_SECRET_KEY: string;
    DEBUG_AUTH: boolean;
  };

  // AI Services
  ai: {
    TOGETHER_API_KEY: string | null;
    VLLM_BASE_URL: string | null;
    VLLM_MODEL: string;
    OLLAMA_BASE_URL: string;
    OLLAMA_MODEL: string;
    OLLAMA_EMBEDDING_MODEL: string;
  };

  // Search Configuration
  search: {
    SEARCH_USE_MULTIVECTOR: boolean;
    SEARCH_RRF_K: number;
    SEARCH_SCORE_THRESHOLD: number;
    QUERY_EXECUTOR_SCORE_THRESHOLD: number;
    QUERY_EXECUTOR_HIGH_THRESHOLD: number;
  };

  // Logging
  logging: {
    LOG_LEVEL: string;
    LOGGLY_ENABLED: boolean;
    LOGGLY_TOKEN: string | null;
    LOGGLY_SUBDOMAIN: string;
    npm_package_version: string;
  };

  // CORS
  cors: {
    ALLOWED_ORIGINS: string[];
    CORS_ORIGINS: string[];
  };

  // Feature Flags
  features: {
    ENABLE_CACHE: boolean;
    CACHE_TTL: number;
    ENABLE_VECTOR_VALIDATION: boolean;
    ENABLE_RATE_LIMITING: boolean;
    ENABLE_SECURITY_HEADERS: boolean;
    ENABLE_SYNC_WORKER: boolean;
    ENSURE_QDRANT_COLLECTIONS: boolean;
  };

  // Debug
  debug: {
    DEBUG: string;
  };
}

// =============================================================================
// Build Configuration Object
// =============================================================================

/**
 * Build the configuration object from environment variables
 * All type parsing happens here - no parsing in application code
 */
function buildConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';

  return {
    // Environment
    env: {
      NODE_ENV: nodeEnv,
      IS_PRODUCTION: nodeEnv === 'production',
      IS_DEVELOPMENT: nodeEnv === 'development',
      IS_TEST: nodeEnv === 'test',
    },

    // Server
    server: {
      PORT: parseIntSafe(process.env.PORT, 4003),
      FRONTEND_URL: parseString(process.env.FRONTEND_URL, 'http://localhost:3000'),
    },

    // Database - MongoDB
    database: {
      MONGODB_URI: parseString(process.env.MONGODB_URI, 'mongodb://localhost:27017'),
      MONGODB_DB_NAME: parseString(process.env.MONGODB_DB_NAME, 'toolsearch'),
      MONGODB_MAX_POOL_SIZE: parseIntSafe(process.env.MONGODB_MAX_POOL_SIZE, 10),
      MONGODB_MIN_POOL_SIZE: parseIntSafe(process.env.MONGODB_MIN_POOL_SIZE, 2),
    },

    // Database - Qdrant
    qdrant: {
      QDRANT_URL: process.env.QDRANT_URL || null,
      QDRANT_HOST: parseString(process.env.QDRANT_HOST, 'localhost'),
      QDRANT_PORT: parseIntSafe(process.env.QDRANT_PORT, 6333),
      QDRANT_API_KEY: process.env.QDRANT_API_KEY || null,
      QDRANT_COLLECTION_NAME: parseString(process.env.QDRANT_COLLECTION_NAME, 'tools'),
      QDRANT_USE_ENHANCED_COLLECTION: parseBoolean(process.env.QDRANT_USE_ENHANCED_COLLECTION, false),
      collections: {
        SEMANTIC: parseString(process.env.QDRANT_COLLECTION_SEMANTIC, 'tools_semantic'),
        CATEGORIES: parseString(process.env.QDRANT_COLLECTION_CATEGORIES, 'tools_categories'),
        FUNCTIONALITY: parseString(process.env.QDRANT_COLLECTION_FUNCTIONALITY, 'tools_functionality'),
        INTERFACE: parseString(process.env.QDRANT_COLLECTION_INTERFACE, 'tools_interface'),
        INDUSTRIES: parseString(process.env.QDRANT_COLLECTION_INDUSTRIES, 'tools_industries'),
        USER_TYPES: parseString(process.env.QDRANT_COLLECTION_USER_TYPES, 'tools_user_types'),
        ALIASES: parseString(process.env.QDRANT_COLLECTION_ALIASES, 'tools_aliases'),
        TOOL_TYPE: parseString(process.env.QDRANT_COLLECTION_TOOL_TYPE, 'tools_tool_type'),
      },
    },

    // Authentication - Clerk
    auth: {
      CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
      DEBUG_AUTH: parseBoolean(process.env.DEBUG_AUTH, false),
    },

    // AI Services
    ai: {
      TOGETHER_API_KEY: process.env.TOGETHER_API_KEY || null,
      VLLM_BASE_URL: process.env.VLLM_BASE_URL || null,
      VLLM_MODEL: parseString(process.env.VLLM_MODEL, 'Qwen/Qwen3-0.6B'),
      OLLAMA_BASE_URL: parseString(process.env.OLLAMA_BASE_URL, 'http://localhost:11434'),
      OLLAMA_MODEL: parseString(process.env.OLLAMA_MODEL, 'qwen3:4b'),
      OLLAMA_EMBEDDING_MODEL: parseString(process.env.OLLAMA_EMBEDDING_MODEL, 'mxbai-embed-large:latest'),
    },

    // Search Configuration
    search: {
      SEARCH_USE_MULTIVECTOR: parseBoolean(process.env.SEARCH_USE_MULTIVECTOR, true),
      SEARCH_RRF_K: parseIntSafe(process.env.SEARCH_RRF_K, 60),
      SEARCH_SCORE_THRESHOLD: parseFloatSafe(process.env.SEARCH_SCORE_THRESHOLD, 0.5),
      QUERY_EXECUTOR_SCORE_THRESHOLD: parseFloatSafe(process.env.QUERY_EXECUTOR_SCORE_THRESHOLD, 0.5),
      QUERY_EXECUTOR_HIGH_THRESHOLD: parseFloatSafe(process.env.QUERY_EXECUTOR_HIGH_THRESHOLD, 0.7),
    },

    // Logging
    logging: {
      LOG_LEVEL: parseString(process.env.LOG_LEVEL, 'info'),
      LOGGLY_ENABLED: parseBoolean(process.env.LOGGLY_ENABLED, false),
      LOGGLY_TOKEN: process.env.LOGGLY_TOKEN || null,
      LOGGLY_SUBDOMAIN: parseString(process.env.LOGGLY_SUBDOMAIN, 'self18'),
      npm_package_version: process.env.npm_package_version || '1.0.0',
    },

    // CORS
    cors: {
      ALLOWED_ORIGINS: parseArray(process.env.ALLOWED_ORIGINS),
      CORS_ORIGINS: parseArray(process.env.CORS_ORIGINS),
    },

    // Feature Flags
    features: {
      ENABLE_CACHE: parseBoolean(process.env.ENABLE_CACHE, false),
      CACHE_TTL: parseIntSafe(process.env.CACHE_TTL, 3600),
      ENABLE_VECTOR_VALIDATION: parseBoolean(process.env.ENABLE_VECTOR_VALIDATION, true),
      ENABLE_RATE_LIMITING: parseBooleanInverse(process.env.ENABLE_RATE_LIMITING, true),
      ENABLE_SECURITY_HEADERS: parseBooleanInverse(process.env.ENABLE_SECURITY_HEADERS, true),
      ENABLE_SYNC_WORKER: parseBoolean(process.env.ENABLE_SYNC_WORKER, false),
      ENSURE_QDRANT_COLLECTIONS: parseBoolean(process.env.ENSURE_QDRANT_COLLECTIONS, true),
    },

    // Debug
    debug: {
      DEBUG: parseString(process.env.DEBUG, ''),
    },
  };
}

// =============================================================================
// Frozen Configuration Export
// =============================================================================

/**
 * Frozen configuration object - immutable after initialization
 * This prevents accidental modifications at runtime
 *
 * Usage:
 * ```typescript
 * import { CONFIG } from '#config/env.config.js';
 *
 * const port = CONFIG.server.PORT;
 * const isProduction = CONFIG.env.IS_PRODUCTION;
 * const mongoUri = CONFIG.database.MONGODB_URI;
 * ```
 */
export const CONFIG: Readonly<AppConfig> = Object.freeze(buildConfig());

/**
 * Re-export buildConfig for testing purposes
 * Allows tests to rebuild config with different env vars
 *
 * Usage in tests:
 * ```typescript
 * jest.mock('#config/env.config', () => ({
 *   CONFIG: buildConfig(),
 *   buildConfig,
 * }));
 * ```
 */
export const rebuildConfig = buildConfig;

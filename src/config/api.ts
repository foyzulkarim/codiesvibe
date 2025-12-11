/**
 * API Configuration
 *
 * Centralized configuration for all API-related settings.
 * All values come from validated environment variables with sensible defaults.
 *
 * Environment variables are validated using Zod for type safety.
 */

import { env, isDevelopment } from './env';

/**
 * API Configuration Object
 *
 * Provides type-safe access to all API configuration values
 */
export const apiConfig = {
  /**
   * Search API URL
   * Default: http://localhost:4003/api
   */
  searchApiUrl: env.VITE_SEARCH_API_URL ?? 'http://localhost:4003/api',

  /**
   * Global API timeout in milliseconds
   * Default: 300000 (5 minutes) - increased for AI operations
   */
  timeout: env.VITE_API_TIMEOUT ?? 300000,

  /**
   * Search-specific configuration
   */
  search: {
    /**
     * Debounce delay for search input in milliseconds
     * Default: 300 (0.3 seconds)
     */
    debounceDelay: env.VITE_SEARCH_DEBOUNCE_DELAY ?? 300,

    /**
     * Minimum query length to trigger search
     * Default: 2 characters
     */
    minLength: env.VITE_SEARCH_MIN_LENGTH ?? 2,

    /**
     * Default number of results to fetch
     * Default: 20
     */
    defaultLimit: env.VITE_SEARCH_DEFAULT_LIMIT ?? 20,

    /**
     * Search request timeout in milliseconds
     * Default: 600000 (10 minutes) - longer for AI-powered search with LLM calls
     */
    timeout: env.VITE_SEARCH_TIMEOUT ?? 600000,
  },

  /**
   * React Query configuration
   */
  query: {
    /**
     * How long data stays fresh before refetching (milliseconds)
     * Default: 300000 (5 minutes)
     */
    staleTime: env.VITE_QUERY_STALE_TIME ?? 5 * 60 * 1000,

    /**
     * How long inactive data stays in cache (milliseconds)
     * Default: 600000 (10 minutes)
     */
    cacheTime: env.VITE_QUERY_CACHE_TIME ?? 10 * 60 * 1000,

    /**
     * Number of retry attempts for failed queries
     * Default: 3
     */
    retryCount: env.VITE_QUERY_RETRY_COUNT ?? 3,
  },

  /**
   * Request timeout configurations (in milliseconds)
   */
  timeouts: {
    /** Default API timeout (5 minutes) */
    default: env.VITE_API_TIMEOUT ?? 300000,

    /** Search API timeout (10 minutes) - for AI operations */
    search: env.VITE_SEARCH_TIMEOUT ?? 600000,

    /** Sync operation timeouts */
    sync: {
      /** Sweep operations - processes multiple tools (10 minutes) */
      sweep: 600000,
      /** Single tool sync retry (5 minutes) */
      retry: 300000,
      /** Retry all failed syncs (10 minutes) */
      retryAll: 600000,
      /** Batch sync operations (10 minutes) */
      batch: 600000,
    },
  },

  /**
   * Feature flags and development tools
   */
  features: {
    /**
     * Enable React Query DevTools
     * Default: true in development, false in production
     */
    enableDevtools: env.VITE_ENABLE_DEVTOOLS ?? isDevelopment,

    /**
     * Enable request/response logging in console
     * Default: true in development, false in production
     */
    enableRequestLogging: env.VITE_ENABLE_REQUEST_LOGGING ?? isDevelopment,

    /**
     * Enable debug mode
     * Default: true in development, false in production
     */
    debug: env.VITE_DEBUG ?? isDevelopment,
  },

  /**
   * Application metadata
   */
  app: {
    /**
     * Application name
     * Default: CodiesVibe
     */
    name: env.VITE_APP_NAME ?? 'CodiesVibe',

    /**
     * Environment name
     * Default: development
     */
    environment: env.VITE_ENVIRONMENT ?? 'development',

    /**
     * Application version
     * Default: local-dev
     */
    version: env.VITE_APP_VERSION ?? 'local-dev',
  },
} as const;

/**
 * Debug logging to verify configuration
 */

/**
 * Validate configuration on app startup
 * Logs warnings for missing required configuration
 */
export const validateApiConfig = (): void => {
  const warnings: string[] = [];

  // Check for default Search API URL in production
  if (!isDevelopment && apiConfig.searchApiUrl === 'http://localhost:4003/api') {
    warnings.push('Using default Search API URL in production. Set VITE_SEARCH_API_URL environment variable.');
  }

  // Check for very short timeout
  if (apiConfig.timeout < 5000) {
    warnings.push(`API timeout is very short (${apiConfig.timeout}ms). Requests may fail frequently.`);
  }

  // Check for search configuration
  if (apiConfig.search.minLength < 1) {
    warnings.push('Search minimum length is less than 1. This may cause performance issues.');
  }

  // Log warnings if any
  if (warnings.length > 0) {
    console.warn('API Configuration Warnings:', warnings);
  }
};

/**
 * Type export for external use
 */
export type ApiConfig = typeof apiConfig;

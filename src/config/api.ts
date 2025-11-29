/**
 * API Configuration
 *
 * Centralized configuration for all API-related settings.
 * All values come from environment variables with sensible defaults.
 *
 * Environment variables are prefixed with VITE_ for Vite to include them in the build.
 */

/**
 * Parse environment variable as number with fallback
 */
const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse environment variable as boolean with fallback
 */
const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') return defaultValue;
  return value === 'true' || value === '1';
};

/**
 * Parse environment variable as string with fallback
 */
const getEnvString = (key: string, defaultValue: string): string => {
  const value = import.meta.env[key];
  return value !== undefined && value !== '' ? value : defaultValue;
};

/**
 * API Configuration Object
 *
 * Provides type-safe access to all API configuration values
 */
export const apiConfig = {
  /**
   * Base API URL
   * Default: https://api.codiesvibe.com/api
   */
  baseUrl: getEnvString('VITE_API_URL', 'https://api.codiesvibe.com/api'),

  /**
   * Global API timeout in milliseconds
   * Default: 10000 (10 seconds)
   */
  timeout: getEnvNumber('VITE_API_TIMEOUT', 10000),

  /**
   * Enable credentials (cookies) in requests
   * Default: false
   */
  enableCredentials: getEnvBoolean('VITE_ENABLE_CREDENTIALS', false),

  /**
   * Search-specific configuration
   */
  search: {
    /**
     * Debounce delay for search input in milliseconds
     * Default: 300 (0.3 seconds)
     */
    debounceDelay: getEnvNumber('VITE_SEARCH_DEBOUNCE_DELAY', 300),

    /**
     * Minimum query length to trigger search
     * Default: 2 characters
     */
    minLength: getEnvNumber('VITE_SEARCH_MIN_LENGTH', 2),

    /**
     * Default number of results to fetch
     * Default: 20
     */
    defaultLimit: getEnvNumber('VITE_SEARCH_DEFAULT_LIMIT', 20),

    /**
     * Search request timeout in milliseconds
     * Default: 60000 (60 seconds) - longer for AI-powered search
     */
    timeout: getEnvNumber('VITE_SEARCH_TIMEOUT', 60000),
  },

  /**
   * React Query configuration
   */
  query: {
    /**
     * How long data stays fresh before refetching (milliseconds)
     * Default: 300000 (5 minutes)
     */
    staleTime: getEnvNumber('VITE_QUERY_STALE_TIME', 5 * 60 * 1000),

    /**
     * How long inactive data stays in cache (milliseconds)
     * Default: 600000 (10 minutes)
     */
    cacheTime: getEnvNumber('VITE_QUERY_CACHE_TIME', 10 * 60 * 1000),

    /**
     * Number of retry attempts for failed queries
     * Default: 3
     */
    retryCount: getEnvNumber('VITE_QUERY_RETRY_COUNT', 3),
  },

  /**
   * Feature flags and development tools
   */
  features: {
    /**
     * Enable React Query DevTools
     * Default: true in development, false in production
     */
    enableDevtools: getEnvBoolean('VITE_ENABLE_DEVTOOLS', import.meta.env.DEV),

    /**
     * Enable request/response logging in console
     * Default: true in development, false in production
     */
    enableRequestLogging: getEnvBoolean('VITE_ENABLE_REQUEST_LOGGING', import.meta.env.DEV),

    /**
     * Enable debug mode
     * Default: true in development, false in production
     */
    debug: getEnvBoolean('VITE_DEBUG', import.meta.env.DEV),
  },

  /**
   * Application metadata
   */
  app: {
    /**
     * Application name
     * Default: CodiesVibe
     */
    name: getEnvString('VITE_APP_NAME', 'CodiesVibe'),

    /**
     * Environment name
     * Default: development
     */
    environment: getEnvString('VITE_ENVIRONMENT', 'development'),

    /**
     * Application version
     * Default: local-dev
     */
    version: getEnvString('VITE_APP_VERSION', 'local-dev'),
  },
} as const;

/**
 * Debug logging to verify configuration
 */
if (import.meta.env.DEV || apiConfig.features.debug) {
  console.log('🔍 API Configuration Debug:');
  console.log('  VITE_API_URL from env:', import.meta.env.VITE_API_URL);
  console.log('  Final baseUrl:', apiConfig.baseUrl);
  console.log('  NODE_ENV:', import.meta.env.NODE_ENV);
  console.log('  DEV mode:', import.meta.env.DEV);
}

/**
 * Validate configuration on app startup
 * Logs warnings for missing required configuration
 */
export const validateApiConfig = (): void => {
  const warnings: string[] = [];

  // Check for default API URL in production
  if (!import.meta.env.DEV && apiConfig.baseUrl === 'https://api.codiesvibe.com/api') {
    warnings.push('Using default API URL in production. Set VITE_API_URL environment variable.');
  }

  // Check for very short timeout
  if (apiConfig.timeout < 5000) {
    warnings.push(`API timeout is very short (${apiConfig.timeout}ms). Requests may fail frequently.`);
  }

  // Check for search configuration
  if (apiConfig.search.minLength < 1) {
    warnings.push('Search minimum length is less than 1. This may cause performance issues.');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('⚠️  API Configuration Warnings:');
    warnings.forEach((warning) => console.warn(`   - ${warning}`));
  }

  // Log configuration in development
  if (import.meta.env.DEV) {
    console.log('🔧 API Configuration:', {
      baseUrl: apiConfig.baseUrl,
      timeout: `${apiConfig.timeout}ms`,
      credentials: apiConfig.enableCredentials,
      search: {
        debounce: `${apiConfig.search.debounceDelay}ms`,
        minLength: apiConfig.search.minLength,
        limit: apiConfig.search.defaultLimit,
      },
      query: {
        staleTime: `${apiConfig.query.staleTime}ms`,
        cacheTime: `${apiConfig.query.cacheTime}ms`,
        retries: apiConfig.query.retryCount,
      },
      features: apiConfig.features,
    });
  }
};

/**
 * Type export for external use
 */
export type ApiConfig = typeof apiConfig;

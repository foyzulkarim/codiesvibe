/**
 * Environment Variable Validation
 *
 * Validates all environment variables at application startup using Zod.
 * Provides type-safe access to environment variables throughout the application.
 */

import { z } from 'zod';

/**
 * Environment variable schema
 * All environment variables are validated at runtime to prevent configuration errors
 */
const envSchema = z.object({
  // Authentication
  VITE_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'Clerk publishable key is required')
    .startsWith('pk_', 'Clerk publishable key must start with pk_'),

  // API Configuration
  VITE_SEARCH_API_URL: z
    .string()
    .url('Search API URL must be a valid URL')
    .default('http://localhost:4003/api'),

  // Timeouts (optional with defaults)
  VITE_API_TIMEOUT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .optional(),

  VITE_SEARCH_TIMEOUT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .optional(),

  // Search Configuration (optional)
  VITE_SEARCH_DEBOUNCE_DELAY: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().nonnegative())
    .optional(),

  VITE_SEARCH_MIN_LENGTH: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .optional(),

  VITE_SEARCH_DEFAULT_LIMIT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .optional(),

  // React Query Configuration (optional)
  VITE_QUERY_STALE_TIME: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().nonnegative())
    .optional(),

  VITE_QUERY_CACHE_TIME: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().nonnegative())
    .optional(),

  VITE_QUERY_RETRY_COUNT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().nonnegative())
    .optional(),

  // Feature Flags (optional)
  VITE_ENABLE_DEVTOOLS: z
    .enum(['true', 'false', '0', '1'])
    .transform((val) => val === 'true' || val === '1')
    .optional(),

  VITE_ENABLE_REQUEST_LOGGING: z
    .enum(['true', 'false', '0', '1'])
    .transform((val) => val === 'true' || val === '1')
    .optional(),

  VITE_DEBUG: z
    .enum(['true', 'false', '0', '1'])
    .transform((val) => val === 'true' || val === '1')
    .optional(),

  // Application Metadata (optional)
  VITE_APP_NAME: z.string().optional(),
  VITE_ENVIRONMENT: z.string().optional(),
  VITE_APP_VERSION: z.string().optional(),

  // Vite built-in environment variables
  DEV: z.boolean().optional(),
  PROD: z.boolean().optional(),
  MODE: z.string().optional(),
});

/**
 * Parse and validate environment variables
 * Throws an error if validation fails
 */
function validateEnv() {
  try {
    // Extract all environment variables that match our schema
    const envVars = {
      VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
      VITE_SEARCH_API_URL: import.meta.env.VITE_SEARCH_API_URL,
      VITE_API_TIMEOUT: import.meta.env.VITE_API_TIMEOUT,
      VITE_SEARCH_TIMEOUT: import.meta.env.VITE_SEARCH_TIMEOUT,
      VITE_SEARCH_DEBOUNCE_DELAY: import.meta.env.VITE_SEARCH_DEBOUNCE_DELAY,
      VITE_SEARCH_MIN_LENGTH: import.meta.env.VITE_SEARCH_MIN_LENGTH,
      VITE_SEARCH_DEFAULT_LIMIT: import.meta.env.VITE_SEARCH_DEFAULT_LIMIT,
      VITE_QUERY_STALE_TIME: import.meta.env.VITE_QUERY_STALE_TIME,
      VITE_QUERY_CACHE_TIME: import.meta.env.VITE_QUERY_CACHE_TIME,
      VITE_QUERY_RETRY_COUNT: import.meta.env.VITE_QUERY_RETRY_COUNT,
      VITE_ENABLE_DEVTOOLS: import.meta.env.VITE_ENABLE_DEVTOOLS,
      VITE_ENABLE_REQUEST_LOGGING: import.meta.env.VITE_ENABLE_REQUEST_LOGGING,
      VITE_DEBUG: import.meta.env.VITE_DEBUG,
      VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
      VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
      VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD,
      MODE: import.meta.env.MODE,
    } satisfies Record<string, string | boolean | undefined>;

    return envSchema.parse(envVars);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      });

      throw new Error(
        `Environment variable validation failed:\n${errorMessages.join('\n')}\n\n` +
          'Please check your .env.local file and ensure all required variables are set correctly.'
      );
    }
    throw error;
  }
}

/**
 * Validated and type-safe environment variables
 * Use this instead of import.meta.env for type safety
 */
export const env = validateEnv();

/**
 * Type export for external use
 */
export type Env = typeof env;

/**
 * Helper function to check if we're in development mode
 */
export const isDevelopment = env.DEV ?? false;

/**
 * Helper function to check if we're in production mode
 */
export const isProduction = env.PROD ?? false;

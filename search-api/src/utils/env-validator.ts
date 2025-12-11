/**
 * Environment Validator
 *
 * Validates critical environment variables on application startup
 */

import { searchLogger } from '../config/logger.js';

interface EnvVar {
  name: string;
  required: boolean;
  validate?: (value: string) => boolean | string;
  description: string;
}

export const REQUIRED_ENV_VARS: EnvVar[] = [
  // Database
  {
    name: 'MONGODB_URI',
    required: true,
    validate: (val) => val.startsWith('mongodb://') || val.startsWith('mongodb+srv://') || 'Must start with mongodb:// or mongodb+srv://',
    description: 'MongoDB connection string'
  },

  // Vector Database
  {
    name: 'QDRANT_HOST',
    required: true,
    description: 'Qdrant host address'
  },
  {
    name: 'QDRANT_PORT',
    required: true,
    validate: (val) => !isNaN(Number(val)) || 'Must be a valid port number',
    description: 'Qdrant port number'
  },

  // Authentication
  {
    name: 'CLERK_SECRET_KEY',
    required: true,
    validate: (val) => val.startsWith('sk_test_') || val.startsWith('sk_live_') || 'Must start with sk_test_ or sk_live_',
    description: 'Clerk secret API key'
  },
  {
    name: 'CLERK_PUBLISHABLE_KEY',
    required: true,
    validate: (val) => val.startsWith('pk_test_') || val.startsWith('pk_live_') || 'Must start with pk_test_ or pk_live_',
    description: 'Clerk publishable API key'
  },

  // AI Service (at least one required - checked separately below)
  {
    name: 'TOGETHER_API_KEY',
    required: false, // Optional if VLLM_BASE_URL is provided
    description: 'Together AI API key'
  },
  {
    name: 'VLLM_BASE_URL',
    required: false, // Optional if TOGETHER_API_KEY is provided
    description: 'vLLM server base URL'
  },

  // Server Config
  {
    name: 'PORT',
    required: false,
    validate: (val) => !isNaN(Number(val)) || 'Must be a valid port number',
    description: 'Server port (defaults to 4003)'
  },
  {
    name: 'NODE_ENV',
    required: false,
    validate: (val) => ['development', 'production', 'test'].includes(val) || 'Must be development, production, or test',
    description: 'Node environment'
  },

  // Feature Flags (all optional with defaults)
  {
    name: 'ENABLE_CACHE',
    required: false,
    validate: (val) => ['true', 'false'].includes(val.toLowerCase()) || 'Must be true or false',
    description: 'Enable caching'
  },
  {
    name: 'ENABLE_VECTOR_VALIDATION',
    required: false,
    validate: (val) => ['true', 'false'].includes(val.toLowerCase()) || 'Must be true or false',
    description: 'Enable vector validation'
  },
  {
    name: 'ENABLE_RATE_LIMITING',
    required: false,
    validate: (val) => ['true', 'false'].includes(val.toLowerCase()) || 'Must be true or false',
    description: 'Enable rate limiting'
  },
  {
    name: 'ENABLE_SECURITY_HEADERS',
    required: false,
    validate: (val) => ['true', 'false'].includes(val.toLowerCase()) || 'Must be true or false',
    description: 'Enable security headers'
  },
  {
    name: 'ENSURE_QDRANT_COLLECTIONS',
    required: false,
    validate: (val) => ['true', 'false'].includes(val.toLowerCase()) || 'Must be true or false',
    description: 'Ensure Qdrant collections on startup'
  }
];

/**
 * Validate critical environment variables
 * Exits process if validation fails
 */
export function validateEnvironment(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check all required variables
  REQUIRED_ENV_VARS.forEach(envVar => {
    const value = process.env[envVar.name];

    // Check if required variable is missing
    if (envVar.required && !value) {
      errors.push(`❌ Missing required env var: ${envVar.name}\n   Description: ${envVar.description}`);
      return;
    }

    // Skip validation if optional and not provided
    if (!value) return;

    // Run custom validation if provided
    if (envVar.validate) {
      const result = envVar.validate(value);
      if (result !== true) {
        errors.push(`❌ Invalid value for ${envVar.name}: ${result}\n   Current value: ${value}`);
      }
    }
  });

  // Special case: At least one AI service must be configured
  if (!process.env.TOGETHER_API_KEY && !process.env.VLLM_BASE_URL) {
    errors.push(`❌ At least one AI service must be configured:\n   - TOGETHER_API_KEY (for Together AI)\n   - VLLM_BASE_URL (for local vLLM server)`);
  }

  // Log results
  if (errors.length > 0) {
    console.error('\n🚨 Environment validation failed!\n');
    console.error('The following environment variables are missing or invalid:\n');
    errors.forEach(err => console.error(err));
    console.error('\n💡 Tip: Check your .env file and ensure all required variables are set.\n');

    searchLogger.error('Environment validation failed', new Error('Missing or invalid environment variables'), {
      service: 'search-api',
      errors
    });

    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:\n');
    warnings.forEach(warn => console.warn(warn));
    console.warn('');
  }

  // Success message
  searchLogger.info('✅ Environment validation passed', {
    service: 'search-api',
    validatedVars: REQUIRED_ENV_VARS.length
  });
}

/**
 * CORS Configuration
 *
 * Enhanced CORS configuration with production/development distinction
 * and custom origin validation with security logging.
 */

import cors, { CorsOptions } from 'cors';
import { searchLogger } from './logger.js';
import { CONFIG } from './env.config.js';

/**
 * Get allowed origins based on environment
 */
function getAllowedOrigins(): string[] | boolean {
  if (CONFIG.env.IS_PRODUCTION) {
    // Production: Use specific allowed origins
    const allowedOrigins = CONFIG.cors.ALLOWED_ORIGINS.length > 0
      ? CONFIG.cors.ALLOWED_ORIGINS
      : ['https://yourdomain.com', 'https://www.yourdomain.com'];
    return allowedOrigins;
  } else {
    // Development: Allow all origins or specific development origins
    const devOrigins = CONFIG.cors.CORS_ORIGINS;
    if (devOrigins && devOrigins.length > 0) {
      return devOrigins;
    }
    return true; // Allow all origins in development
  }
}

/**
 * Create CORS middleware with enhanced configuration
 */
export function createCorsMiddleware() {
  const corsOptions: CorsOptions = {
    origin: getAllowedOrigins(),
    credentials: false, // No credentials for this API
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  // Add custom origin validation for production
  if (CONFIG.env.IS_PRODUCTION) {
    corsOptions.origin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = CONFIG.cors.ALLOWED_ORIGINS.length > 0
        ? CONFIG.cors.ALLOWED_ORIGINS
        : [];

      // Log CORS attempts in production
      searchLogger.info('CORS request', {
        service: 'search-api',
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString()
      }, {
        function: 'createCorsMiddleware',
        module: 'CORS'
      });

      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        // Log blocked CORS attempt
        searchLogger.logSecurityEvent('CORS request blocked - origin not allowed', {
          service: 'search-api',
          origin,
          allowedOrigins,
          userAgent: 'Unknown', // Will be captured in request middleware
          timestamp: new Date().toISOString()
        }, 'warn');
        return callback(new Error('Not allowed by CORS'), false);
      }
    };
  }

  return cors(corsOptions);
}

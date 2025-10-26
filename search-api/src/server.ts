import 'module-alias/register';
import express from 'express';
import axios from 'axios';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import Joi from 'joi';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cors from 'cors';
import winston from 'winston';
import { StateAnnotation } from "./types/state";
import { vectorIndexingService, HealthReport } from "./services";
import { searchLogger, SearchLogContext } from "./config/logger";
import { correlationMiddleware, SearchRequest } from "./middleware/correlation.middleware";
import { v4 as uuidv4 } from 'uuid';

// Import LangGraph orchestration - NEW 3-Node Pipeline
import { searchWithAgenticPipeline } from "./graphs/agentic-search.graph";
import { threadManager } from "./utils/thread-manager";

dotenv.config();

// Use the enhanced logger from config/logger.ts
// Legacy securityLogger is replaced by searchLogger with enhanced capabilities

// Validate critical environment variables
function validateEnvironment(): void {
  const required = ['MONGODB_URI', 'QDRANT_HOST', 'QDRANT_PORT'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    searchLogger.error('❌ Missing required environment variables', new Error('Environment validation failed'), {
      service: 'search-api',
      missingVariables: missing,
      message: 'Please check your .env file and ensure all required variables are set.'
    });
    process.exit(1);
  }

  searchLogger.info('✅ Environment validation passed', {
    service: 'search-api',
    validatedVariables: required
  });
}

validateEnvironment();

const app = express();

// Create logs directory if it doesn't exist
import { writeFileSync, mkdirSync } from 'fs';
try {
  mkdirSync('logs');
} catch (error) {
  // Directory already exists
}

// Advanced rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    const searchReq = req as SearchRequest;
    searchLogger.logSecurityEvent('Rate limit exceeded', {
      correlationId: searchReq.correlationId,
      service: 'search-api',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    }, 'warn');
    res.status(429).json({
      error: 'Too many requests from this IP',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    });
  }
});

// Stricter rate limiting for search endpoint
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 search requests per minute
  message: {
    error: 'Too many search requests',
    code: 'SEARCH_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const searchReq = req as SearchRequest;
    searchLogger.logSecurityEvent('Search rate limit exceeded', {
      correlationId: searchReq.correlationId,
      service: 'search-api',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      query: req.body?.query,
      timestamp: new Date().toISOString()
    }, 'warn');
    res.status(429).json({
      error: 'Too many search requests',
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 minute'
    });
  }
});

// Security middleware stack (conditional)
if (process.env.ENABLE_SECURITY_HEADERS !== 'false') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for API compatibility
  }));
} else {
  searchLogger.warn('⚠️  Security headers are disabled (ENABLE_SECURITY_HEADERS=false)', {
    service: 'search-api',
    securitySetting: 'ENABLE_SECURITY_HEADERS=false'
  });
}

// Enhanced CORS configuration
const configureCORS = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const enableSecurityHeaders = process.env.ENABLE_SECURITY_HEADERS !== 'false';

  // Parse allowed origins from environment variables
  const getAllowedOrigins = (): string[] | boolean => {
    if (isProduction) {
      // Production: Use specific allowed origins
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'https://yourdomain.com',
        'https://www.yourdomain.com'
      ];
      return allowedOrigins.map(origin => origin.trim());
    } else {
      // Development: Allow all origins or specific development origins
      const devOrigins = process.env.CORS_ORIGINS?.split(',');
      if (devOrigins && devOrigins.length > 0 && devOrigins[0] !== 'true') {
        return devOrigins.map(origin => origin.trim());
      }
      return true; // Allow all origins in development
    }
  };

  const corsOptions: any = {
    origin: getAllowedOrigins(),
    credentials: false, // No credentials for this API
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  // Add custom origin validation for production
  if (isProduction) {
    corsOptions.origin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

      // Log CORS attempts in production
      searchLogger.info('CORS request', {
        service: 'search-api',
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString()
      }, {
        function: 'configureCORS',
        module: 'Server'
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
};

// Apply correlation middleware first
app.use(correlationMiddleware);

// Apply CORS configuration
app.use(configureCORS());

// NoSQL injection protection
app.use(mongoSanitize());

// HTTP Parameter Pollution protection
app.use(hpp());

// Apply conditional rate limiting
if (process.env.ENABLE_RATE_LIMITING !== 'false') {
  app.use(limiter);
} else {
  searchLogger.warn('⚠️  Rate limiting is disabled (ENABLE_RATE_LIMITING=false)', {
    service: 'search-api',
    securitySetting: 'ENABLE_RATE_LIMITING=false'
  });
}

// Request logging is now handled by correlationMiddleware - no need for duplicate logging

app.use(express.json({ limit: '10mb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input validation schemas
const searchQuerySchema = Joi.object({
  query: Joi.string()
    .min(1)
    .max(1000)
    .pattern(/^[^<>{}[\]\\]*$/) // No HTML brackets or common injection chars
    .required()
    .messages({
      'string.empty': 'Query cannot be empty',
      'string.min': 'Query cannot be empty',
      'string.max': 'Query too long (max 1000 characters)',
      'string.pattern.base': 'Query contains invalid characters',
      'any.required': 'Query is required'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  debug: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Debug must be a boolean'
    })
});

// Express-validator middleware for search endpoint
const validateSearchRequest = [
  body('query')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Query must be between 1 and 1000 characters')
    .matches(/^[^<>{}[\]\\]*$/)
    .withMessage('Query contains invalid characters')
    .trim()
    .escape(),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  body('debug')
    .optional()
    .isBoolean()
    .withMessage('Debug must be a boolean'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const searchReq = req as SearchRequest;
      searchLogger.logSecurityEvent('Validation failed', {
        correlationId: searchReq.correlationId,
        service: 'search-api',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        errors: errors.array(),
        body: req.body,
        timestamp: new Date().toISOString()
      }, 'warn');

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array().map(err => ({
          field: err.type === 'field' ? (err.path || 'unknown') : 'unknown',
          message: err.msg,
          value: err.type === 'field' ? err.value : undefined
        }))
      });
    }
    next();
  }
];

const PORT = process.env.PORT || 4003;
const ENABLE_VECTOR_VALIDATION = process.env.ENABLE_VECTOR_VALIDATION !== 'false'; // Default to true

// Health check endpoint - simplified
app.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      server: 'running',
      search: 'available'
    }
  });
});

/**
 * Validate vector index health on startup
 * This function checks if vectors exist in Qdrant and validates index integrity
 * It doesn't block server startup but provides clear feedback about any issues
 */
async function validateVectorIndexOnStartup(): Promise<void> {
  // Skip validation if explicitly disabled
  if (!ENABLE_VECTOR_VALIDATION) {
    searchLogger.info('🔄 Vector index validation is disabled via ENABLE_VECTOR_VALIDATION=false', {
      service: 'search-api',
      validationStatus: 'disabled'
    });
    return;
  }

  searchLogger.info('🔍 Starting vector index health validation...', {
    service: 'search-api',
    validationPhase: 'start'
  });

  try {
    // Use the VectorIndexingService's validateIndex method
    const healthReport: HealthReport = await vectorIndexingService.validateIndex();

    // Log appropriate messages based on health report
    if (healthReport.collectionHealthy &&
      healthReport.sampleValidationPassed &&
      healthReport.missingVectors === 0 &&
      healthReport.orphanedVectors === 0) {
      searchLogger.info('✅ Vector index is healthy and fully synchronized', {
        service: 'search-api',
        validationStatus: 'healthy',
        mongoToolCount: healthReport.mongoToolCount,
        qdrantVectorCount: healthReport.qdrantVectorCount
      });
    } else {
      // Log warnings if there are issues
      searchLogger.warn('⚠️  Vector index health issues detected', {
        service: 'search-api',
        validationStatus: 'issues_detected',
        collectionHealthy: healthReport.collectionHealthy,
        sampleValidationPassed: healthReport.sampleValidationPassed,
        missingVectors: healthReport.missingVectors,
        orphanedVectors: healthReport.orphanedVectors
      });

      if (!healthReport.collectionHealthy) {
        searchLogger.error('❌ Vector collection configuration is unhealthy', undefined, {
          service: 'search-api',
          issue: 'collection_unhealthy'
        });
      }

      if (!healthReport.sampleValidationPassed) {
        searchLogger.error('❌ Sample embedding validation failed', undefined, {
          service: 'search-api',
          issue: 'sample_validation_failed'
        });
      }

      if (healthReport.missingVectors > 0) {
        searchLogger.warn(`⚠️  ${healthReport.missingVectors} tools missing from vector index`, {
          service: 'search-api',
          issue: 'missing_vectors',
          count: healthReport.missingVectors
        });
      }

      if (healthReport.orphanedVectors > 0) {
        searchLogger.warn(`⚠️  ${healthReport.orphanedVectors} orphaned vectors found`, {
          service: 'search-api',
          issue: 'orphaned_vectors',
          count: healthReport.orphanedVectors
        });
      }

      // Log recommendations
      if (healthReport.recommendations.length > 0) {
        searchLogger.info('📝 Vector index recommendations available', {
          service: 'search-api',
          recommendations: healthReport.recommendations,
          fixCommands: [
            'npm run seed-vectors  # Re-index all tools to Qdrant',
            'npm run seed-vectors -- --force  # Force re-index (clears existing data)',
            'or use the VectorIndexingService directly'
          ]
        });
      }
    }

    searchLogger.info('🔍 Vector index validation completed', {
      service: 'search-api',
      validationPhase: 'completed'
    });

  } catch (error) {
    // Don't fail startup, but provide clear feedback
    searchLogger.error('🔄 Vector index validation could not be completed', 
      error instanceof Error ? error : new Error('Unknown error'),
      {
        service: 'search-api',
        validationStatus: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        troubleshootingTips: [
          'Ensure MongoDB and Qdrant services are running',
          'Check environment variables for service connections',
        'Run validation manually after startup if needed'
      ]
    });
  }
}


// Enhanced query sanitization function
function sanitizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>{}[\]\\]/g, ''); // Remove potentially dangerous characters
}

// Enhanced search endpoint with comprehensive security
app.post('/search', searchLimiter, validateSearchRequest, async (req, res) => {
  const startTime = Date.now();
  const searchReq = req as SearchRequest;
  const clientId = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const correlationId = searchReq.correlationId || uuidv4();

  try {
    const { query, limit = 10, debug = false } = req.body;

    // Additional Joi validation for extra security
    const { error: joiError, value: validatedData } = searchQuerySchema.validate(req.body);
    if (joiError) {
      searchLogger.logSecurityEvent('Joi validation failed', {
        correlationId,
        service: 'search-api',
        ip: clientId,
        userAgent,
        error: joiError.details,
        body: req.body,
        timestamp: new Date().toISOString()
      }, 'warn');

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: joiError.details.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.context?.value
        }))
      });
    }

    // Sanitize the query
    const sanitizedQuery = sanitizeQuery(validatedData.query);

    // Log search request using enhanced logger
    searchLogger.logSearchRequest(correlationId, {
      service: 'search-api',
      ip: clientId,
      userAgent,
      query: sanitizedQuery,
      queryLength: sanitizedQuery.length,
      limit: validatedData.limit,
      debug: validatedData.debug,
      timestamp: new Date().toISOString()
    });

    searchLogger.info('Starting search request', {
      service: 'search-api',
      correlationId,
      clientId,
      query: sanitizedQuery,
      limit: validatedData.limit,
      debug: validatedData.debug
    });

    // NEW: Agentic search orchestration with 3-node LLM-first pipeline
    const searchResult = await searchWithAgenticPipeline(sanitizedQuery, {
      enableCheckpoints: false,
      metadata: { debug: validatedData.debug, client: clientId }
    });

    console.log('server.ts search result', JSON.stringify(searchResult));

    const executionTime = Date.now() - startTime;

    const response = {
      query: sanitizedQuery, // Use sanitized query in response
      originalQuery: validatedData.query, // Include original for debugging if needed
      // NEW: Intent from our 3-node pipeline

      executionTime: `${executionTime}ms`,
      phase: "3-Node LLM-First Pipeline",
      ...searchResult
    };

    searchLogger.info('Search completed successfully', {
      service: 'search-api',
      correlationId,
      clientId,
      executionTimeMs: executionTime,
      resultsCount: response.candidates?.length || 0,
      totalResults: response.candidates?.length || 0
    });

    // Log successful request using enhanced logger
    searchLogger.logSearchSuccess(correlationId, {
      service: 'search-api',
      ip: clientId,
      userAgent,
      query: sanitizedQuery,
      queryLength: sanitizedQuery.length,
      resultCount: response.candidates.length,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });

    res.json(response);
  } catch (error) {
    const executionTime = Date.now() - startTime;

    // Enhanced error logging using search logger
    searchLogger.logSearchError(correlationId, error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
      ip: clientId,
      userAgent,
      query: req.body?.query || 'unknown',
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });

    searchLogger.error(
      `Search error for client ${clientId}`,
      error instanceof Error ? error : new Error('Unknown error'),
      {
        service: 'search-api',
        clientId,
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      }
    );

    // Don't expose internal error details to clients
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'An error occurred during search processing'
      : (error instanceof Error ? error.message : 'Unknown error');

    res.status(500).json({
      error: errorMessage,
      code: 'SEARCH_ERROR',
      phase: 'Error during search execution',
      executionTime: `${executionTime}ms`
    });
  }
});

// Start server with vector index validation
async function startServer() {
  // Perform vector index validation before starting the server
  // await validateVectorIndexOnStartup();

  app.listen(PORT, () => {
    searchLogger.info('🚀 Search API server started successfully', {
      service: 'search-api',
      port: PORT,
      healthEndpoint: `http://localhost:${PORT}/health`,
      searchEndpoint: `http://localhost:${PORT}/search`,
      environment: process.env.NODE_ENV || 'development'
    });
    searchLogger.info('Server endpoints available', {
      service: 'search-api',
      serverUrl: `http://localhost:${PORT}`,
      healthUrl: `http://localhost:${PORT}/health`,
      searchUrl: `http://localhost:${PORT}/search`
    });
  });
}

// Start the server
startServer().catch(error => {
  searchLogger.error('💥 Failed to start server', error, { service: 'search-api' });
  process.exit(1);
});

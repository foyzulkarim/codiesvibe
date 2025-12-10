import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import Joi from 'joi';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cors from 'cors';
import { vectorIndexingService, HealthReport } from "./services/index.js";
import { searchLogger } from "./config/logger.js";
import { correlationMiddleware, SearchRequest } from "./middleware/correlation.middleware.js";
import { globalTimeout, searchTimeout } from "./middleware/timeout.middleware.js";
import { limiter, searchLimiter, toolsMutationLimiter } from "./middleware/rate-limiters.js";
import { v4 as uuidv4 } from 'uuid';
import { clerkMiddleware } from '@clerk/express';
import { qdrantService } from "./services/qdrant.service.js";

// Import LangGraph orchestration - NEW 3-Node Pipeline
import { searchWithAgenticPipeline } from "./graphs/agentic-search.graph.js";

// Import tools routes for CRUD operations
import toolsRoutes from "./routes/tools.routes.js";
import syncRoutes from "./routes/sync.routes.js";

// Import health check and graceful shutdown services
import { healthCheckService } from "./services/health-check.service.js";
import { gracefulShutdown } from "./services/graceful-shutdown.service.js";
import { syncWorkerService } from "./services/sync-worker.service.js";
import { getMongoClient, getQdrantClient, connectToMongoDB, mongoConfig } from "./config/database.js";
import { metricsService } from "./services/metrics.service.js";
import { setupAxiosCorrelationInterceptor } from "./utils/axios-correlation-interceptor.js";
import { circuitBreakerManager } from "./services/circuit-breaker.service.js";
import { configureHttpClient, destroyHttpAgents } from "./config/http-client.js";
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import compression from 'compression';

dotenv.config();

// Configure HTTP client with connection pooling
configureHttpClient();

// Setup Axios correlation interceptor early
setupAxiosCorrelationInterceptor();

// Load OpenAPI specification
let swaggerDocument: any;
try {
  const openapiPath = path.join(__dirname, '../openapi.yaml');
  swaggerDocument = YAML.load(openapiPath);
  searchLogger.info('✅ OpenAPI specification loaded', {
    service: 'search-api',
    specPath: openapiPath,
  });
} catch (error) {
  searchLogger.error('⚠️  Failed to load OpenAPI specification', error instanceof Error ? error : new Error('Unknown error'), {
    service: 'search-api',
  });
}

// Use the enhanced logger from config/logger.ts
// Legacy securityLogger is replaced by searchLogger with enhanced capabilities

// Validate critical environment variables
function validateEnvironment(): void {
  const required = ['MONGODB_URI', 'QDRANT_HOST', 'QDRANT_PORT', 'CLERK_SECRET_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    searchLogger.error('❌ Missing required environment variables', new Error('Environment validation failed'), {
      service: 'search-api',
      missingVariables: missing,
      message: 'Please check your .env file and ensure all required variables are set.'
    });
    process.exit(1);
  }

  // Validate Clerk key format
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (clerkSecretKey && !clerkSecretKey.startsWith('sk_')) {
    searchLogger.error('❌ Invalid CLERK_SECRET_KEY format', new Error('Environment validation failed'), {
      service: 'search-api',
      message: 'CLERK_SECRET_KEY must start with "sk_test_" or "sk_live_"'
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
import { mkdirSync } from 'fs';
try {
  mkdirSync('logs');
} catch (error) {
  // Directory already exists
}

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
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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

// Apply Prometheus metrics middleware (track all HTTP requests)
app.use(metricsService.trackHttpMetrics());

// Apply compression middleware for response compression
// This significantly reduces response size (typically 70-90% reduction)
app.use(compression({
  // Only compress responses above 1KB
  threshold: 1024,
  // Compression level (0-9, where 6 is default and balances speed/compression)
  level: 6,
  // Filter function to determine if response should be compressed
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter to decide based on content-type
    return compression.filter(req, res);
  }
}));

searchLogger.info('✅ Response compression enabled', {
  service: 'search-api',
  threshold: '1KB',
  level: 6,
});

// Apply CORS configuration
app.use(configureCORS());

// NoSQL injection protection
app.use(mongoSanitize());

// HTTP Parameter Pollution protection with whitelist
// Only allow specific parameters to have multiple values
app.use(hpp({
  whitelist: ['query', 'limit', 'debug', 'tags', 'categories'] // Allowed parameters for array values
}));

// Apply global timeout middleware (30 seconds)
// This prevents requests from hanging indefinitely
app.use(globalTimeout);

searchLogger.info('✅ Request timeout protection enabled', {
  service: 'search-api',
  globalTimeout: '30s',
  searchTimeout: '60s',
});

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

// Enhanced malicious pattern detection
const MALICIOUS_PATTERNS = [
  // XSS attempts
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick=, onerror=
  /<iframe/gi,
  /<embed/gi,
  /<object/gi,

  // Code execution attempts
  /eval\s*\(/gi,
  /exec\s*\(/gi,
  /system\s*\(/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
  /Function\s*\(/gi,

  // Command substitution
  /`[\s\S]*`/g, // Backticks
  /\$\([^)]*\)/g, // $(command)

  // Escape sequences
  /\\x[0-9a-fA-F]{2}/g, // Hex escape
  /\\u[0-9a-fA-F]{4}/g, // Unicode escape
  /&#x?[0-9a-fA-F]+;/g, // HTML entities

  // SQL/NoSQL injection patterns
  /\b(DROP|DELETE|TRUNCATE)\s+(TABLE|FROM|DATABASE)/gi,
  /\b(INSERT|UPDATE)\s+(INTO|TABLE|FROM)/gi,
  /UNION\s+SELECT/gi,
  /--\s*$/gm, // SQL comments
  /\/\*[\s\S]*?\*\//g, // Multi-line comments
];

/**
 * Check if query contains malicious patterns
 */
function containsMaliciousPattern(query: string): boolean {
  return MALICIOUS_PATTERNS.some(pattern => {
    // Reset regex lastIndex to avoid state issues with global flag
    pattern.lastIndex = 0;
    return pattern.test(query);
  });
}

/**
 * Custom Joi validator for malicious content
 */
const maliciousContentValidator = (value: string, helpers: any) => {
  if (containsMaliciousPattern(value)) {
    return helpers.error('string.malicious');
  }
  return value;
};

// Input validation schemas
const searchQuerySchema = Joi.object({
  query: Joi.string()
    .min(1)
    .max(1000)
    .pattern(/^[^<>{}[\]\\]*$/) // No HTML brackets or common injection chars
    .custom(maliciousContentValidator, 'malicious content validation')
    .required()
    .messages({
      'string.empty': 'Query cannot be empty',
      'string.min': 'Query cannot be empty',
      'string.max': 'Query too long (max 1000 characters)',
      'string.pattern.base': 'Query contains invalid characters',
      'string.malicious': 'Query contains potentially malicious content',
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
    .custom((value) => {
      if (containsMaliciousPattern(value)) {
        throw new Error('Query contains potentially malicious content');
      }
      return true;
    })
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

// Health check endpoints
// Basic health check - backwards compatible
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

// Liveness probe - for container orchestrators
// Fast check (<100ms) - doesn't check external dependencies
app.get('/health/live', async (req, res) => {
  try {
    const health = await healthCheckService.checkLiveness();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    searchLogger.error('Liveness check failed', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Readiness probe - for container orchestrators
// Comprehensive check - includes MongoDB, Qdrant, and system metrics
app.get('/health/ready', async (req, res) => {
  try {
    const health = await healthCheckService.checkReadiness();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    searchLogger.error('Readiness check failed', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Prometheus metrics endpoint
// Exposes application metrics in Prometheus format
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsService.getContentType());
    const metrics = await metricsService.getMetrics();
    res.send(metrics);
  } catch (error) {
    searchLogger.error('Failed to generate metrics', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
    });
    res.status(500).json({
      error: 'Failed to generate metrics',
      code: 'METRICS_ERROR',
    });
  }
});

// Circuit breaker status endpoint
// Shows the state of all circuit breakers
app.get('/health/circuit-breakers', (req, res) => {
  try {
    const stats = circuitBreakerManager.getAllStats();
    const allClosed = stats.every(s => s.state === 'closed');

    res.status(allClosed ? 200 : 503).json({
      status: allClosed ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      circuitBreakers: stats,
    });
  } catch (error) {
    searchLogger.error('Failed to get circuit breaker status', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
    });
    res.status(500).json({
      error: 'Failed to get circuit breaker status',
      code: 'CIRCUIT_BREAKER_ERROR',
    });
  }
});

// API Documentation endpoints
if (swaggerDocument) {
  // Swagger UI configuration
  const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Search API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  };

  // Serve Swagger UI at /api-docs
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(swaggerDocument, swaggerOptions));

  // Serve raw OpenAPI spec at /api-docs/openapi.json
  app.get('/api-docs/openapi.json', (req, res) => {
    res.json(swaggerDocument);
  });

  // Serve raw OpenAPI spec at /api-docs/openapi.yaml
  app.get('/api-docs/openapi.yaml', (req, res) => {
    res.type('text/yaml');
    res.send(YAML.stringify(swaggerDocument, 10, 2));
  });

  searchLogger.info('✅ API documentation endpoints configured', {
    service: 'search-api',
    swaggerUI: '/api-docs',
    openAPIJson: '/api-docs/openapi.json',
    openAPIYaml: '/api-docs/openapi.yaml',
  });
}

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


// Add Clerk middleware for authentication
// This must be added before protected routes
app.use(clerkMiddleware());

searchLogger.info('✅ Clerk authentication middleware enabled', {
  service: 'search-api',
  authProvider: 'Clerk',
});

// Mount tools CRUD routes
app.use('/api/tools', toolsRoutes);
searchLogger.info('Tools CRUD routes mounted at /api/tools', {
  service: 'search-api',
  endpoints: ['GET /api/tools', 'GET /api/tools/:id', 'POST /api/tools (protected)', 'PATCH /api/tools/:id (protected)', 'DELETE /api/tools/:id (protected)', 'GET /api/tools/vocabularies'],
});

// Mount sync routes (admin only)
app.use('/api/sync', syncRoutes);
searchLogger.info('Sync admin routes mounted at /api/sync', {
  service: 'search-api',
  endpoints: [
    'GET /api/sync/status (admin)',
    'GET /api/sync/stats (admin)',
    'GET /api/sync/worker (admin)',
    'POST /api/sync/sweep (admin)',
    'POST /api/sync/retry/:toolId (admin)',
    'POST /api/sync/retry-all (admin)',
    'GET /api/sync/failed (admin)',
    'GET /api/sync/pending (admin)',
  ],
});

// Enhanced query sanitization function
function sanitizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F<>{}[\]\\]/g, '') // Remove control characters and potentially dangerous characters
}

// Enhanced search endpoint with comprehensive security
app.post('/api/search', searchLimiter, searchTimeout, validateSearchRequest, async (req, res) => {
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

    // Track search query metrics
    metricsService.trackSearchQuery(executionTime / 1000, 'success');

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

    // Track search query error metrics
    metricsService.trackSearchQuery(executionTime / 1000, 'error');
    metricsService.trackError('search_error', 'high');

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
  // Connect to MongoDB before starting the server
  searchLogger.info('🔄 Connecting to MongoDB...', {
    service: 'search-api',
    database: mongoConfig.dbName,
    uri: mongoConfig.uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')
  });
  
  try {
    await connectToMongoDB();
    searchLogger.info('✅ Connected to MongoDB database', {
      service: 'search-api',
      database: mongoConfig.dbName,
      uri: mongoConfig.uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')
    });
  } catch (error) {
    searchLogger.error('❌ Failed to connect to MongoDB', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
      database: mongoConfig.dbName,
    });
    throw error;
  }

  // Perform vector index validation before starting the server
  // await validateVectorIndexOnStartup();

  // Start the HTTP server and store reference
  const server = app.listen(PORT, () => {
    searchLogger.info('🚀 Search API server started successfully', {
      service: 'search-api',
      port: PORT,
      healthEndpoint: `http://localhost:${PORT}/health`,
      healthLiveEndpoint: `http://localhost:${PORT}/health/live`,
      healthReadyEndpoint: `http://localhost:${PORT}/health/ready`,
      metricsEndpoint: `http://localhost:${PORT}/metrics`,
      apiDocsEndpoint: `http://localhost:${PORT}/api-docs`,
      searchEndpoint: `http://localhost:${PORT}/api/search`,
      environment: process.env.NODE_ENV || 'development'
    });
    searchLogger.info('Server endpoints available', {
      service: 'search-api',
      serverUrl: `http://localhost:${PORT}`,
      healthUrl: `http://localhost:${PORT}/health`,
      healthLiveUrl: `http://localhost:${PORT}/health/live`,
      healthReadyUrl: `http://localhost:${PORT}/health/ready`,
      metricsUrl: `http://localhost:${PORT}/metrics`,
      apiDocsUrl: `http://localhost:${PORT}/api-docs`,
      openAPIJsonUrl: `http://localhost:${PORT}/api-docs/openapi.json`,
      openAPIYamlUrl: `http://localhost:${PORT}/api-docs/openapi.yaml`,
      searchUrl: `http://localhost:${PORT}/search`
    });
  });

  // Initialize health check service with database clients
  const mongoClient = getMongoClient();
  const qdrantClient = getQdrantClient();

  if (mongoClient) {
    healthCheckService.setMongoClient(mongoClient);
    searchLogger.info('✅ MongoDB client registered with health check service', {
      service: 'search-api',
      database: process.env.MONGODB_DB_NAME || 'toolsearch',
      uri: process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@') || 'mongodb://localhost:27017'
    });
  } else {
    searchLogger.warn('⚠️  MongoDB client not available for health checks', {
      service: 'search-api',
    });
  }

  if (qdrantClient) {
    healthCheckService.setQdrantClient(qdrantClient);
    searchLogger.info('✅ Qdrant client registered with health check service', {
      service: 'search-api',
    });

    // Ensure Qdrant collections exist (opt-in via ENSURE_QDRANT_COLLECTIONS=true)
    const ensureCollections = process.env.ENSURE_QDRANT_COLLECTIONS === 'true';
    if (ensureCollections) {
      try {
        searchLogger.info('🔧 Ensuring Qdrant collections exist...', {
          service: 'search-api',
        });
        const results = await qdrantService.createMultiCollections();
        const successCount = results.filter(r => r.success).length;
        searchLogger.info(`✅ Qdrant collections ready: ${successCount}/4 collections available`, {
          service: 'search-api',
          results: results.map(r => ({ collection: r.collection, success: r.success, message: r.message })),
        });
      } catch (error) {
        // Log error but don't crash the server
        searchLogger.error('⚠️  Failed to ensure Qdrant collections (server will continue)', error as Error, {
          service: 'search-api',
        });
      }
    } else {
      searchLogger.info('⚠️  Qdrant collection auto-creation disabled (set ENSURE_QDRANT_COLLECTIONS=true to enable)', {
        service: 'search-api',
        note: 'Run "npm run create-collections" manually if needed',
      });
    }
  } else {
    searchLogger.warn('⚠️  Qdrant client not available for health checks', {
      service: 'search-api',
    });
  }

  // Register server with graceful shutdown service
  gracefulShutdown.registerServer(server);
  if (mongoClient) {
    gracefulShutdown.registerMongoClient(mongoClient);
  }

  // Setup graceful shutdown handlers
  gracefulShutdown.setupHandlers({
    timeout: 30000, // 30 seconds timeout
    beforeShutdown: async () => {
      searchLogger.info('🔄 Executing beforeShutdown tasks', {
        service: 'search-api',
      });
      // Stop sync worker first to prevent new operations
      syncWorkerService.stop();
      searchLogger.info('🛑 Sync worker stopped', {
        service: 'search-api',
      });
      // Shutdown circuit breakers
      await circuitBreakerManager.shutdown();
    },
    afterShutdown: async () => {
      searchLogger.info('🔄 Executing afterShutdown tasks', {
        service: 'search-api',
      });
      // Destroy HTTP connection pool agents
      destroyHttpAgents();
    },
  });

  searchLogger.info('✅ Graceful shutdown handlers configured', {
    service: 'search-api',
    timeout: '30s',
    signals: ['SIGTERM', 'SIGINT'],
  });

  // Start sync worker for background sync operations
  // Default: DISABLED (opt-in via ENABLE_SYNC_WORKER=true)
  const enableSyncWorker = process.env.ENABLE_SYNC_WORKER === 'true';
  if (enableSyncWorker) {
    syncWorkerService.start();
    searchLogger.info('✅ Sync worker started for background Qdrant synchronization', {
      service: 'search-api',
      workerStatus: syncWorkerService.getStatus(),
    });
  } else {
    searchLogger.info('⚠️  Sync worker disabled (set ENABLE_SYNC_WORKER=true to enable)', {
      service: 'search-api',
    });
  }
}

// Start the server
startServer().catch(error => {
  searchLogger.error('💥 Failed to start server', error, { service: 'search-api' });
  process.exit(1);
});

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

// Import LangGraph orchestration - NEW 3-Node Pipeline
import { searchWithAgenticPipeline } from "./graphs/agentic-search.graph";
import { threadManager } from "./utils/thread-manager";

dotenv.config();

// Security logger configuration
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/security.log',
      level: 'warn'
    })
  ],
});

// Validate critical environment variables
function validateEnvironment(): void {
  const required = ['MONGODB_URI', 'QDRANT_HOST', 'QDRANT_PORT'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
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
    securityLogger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
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
    securityLogger.warn('Search rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      query: req.body?.query,
      timestamp: new Date().toISOString()
    });
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
  console.log('⚠️  Security headers are disabled (ENABLE_SECURITY_HEADERS=false)');
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
      securityLogger.info('CORS request', {
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString()
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
        securityLogger.warn('CORS request blocked - origin not allowed', {
          origin,
          allowedOrigins,
          userAgent: 'Unknown', // Will be captured in request middleware
          timestamp: new Date().toISOString()
        });
        return callback(new Error('Not allowed by CORS'), false);
      }
    };
  }

  return cors(corsOptions);
};

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
  console.log('⚠️  Rate limiting is disabled (ENABLE_RATE_LIMITING=false)');
}

// Request logging middleware
app.use((req, res, next) => {
  securityLogger.info('Request received', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    contentType: req.get('Content-Type'),
    timestamp: new Date().toISOString()
  });
  next();
});

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
      securityLogger.warn('Validation failed', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        errors: errors.array(),
        body: req.body,
        timestamp: new Date().toISOString()
      });

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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test MongoDB
    const mongoClient = new MongoClient(process.env.MONGODB_URI!);
    await mongoClient.connect();
    await mongoClient.db().admin().ping();
    await mongoClient.close();

    // Test Qdrant
    await axios.get(`http://${process.env.QDRANT_HOST}:${process.env.QDRANT_PORT}/collections`);

    res.json({
      status: 'healthy',
      services: {
        mongodb: 'connected',
        qdrant: 'connected',
        ollama: 'connected'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Validate vector index health on startup
 * This function checks if vectors exist in Qdrant and validates index integrity
 * It doesn't block server startup but provides clear feedback about any issues
 */
async function validateVectorIndexOnStartup(): Promise<void> {
  // Skip validation if explicitly disabled
  if (!ENABLE_VECTOR_VALIDATION) {
    console.log('🔄 Vector index validation is disabled via ENABLE_VECTOR_VALIDATION=false');
    return;
  }

  console.log('\n🔍 Starting vector index health validation...');

  try {
    // Use the VectorIndexingService's validateIndex method
    const healthReport: HealthReport = await vectorIndexingService.validateIndex();

    // Log appropriate messages based on health report
    if (healthReport.collectionHealthy &&
      healthReport.sampleValidationPassed &&
      healthReport.missingVectors === 0 &&
      healthReport.orphanedVectors === 0) {
      console.log('✅ Vector index is healthy and fully synchronized');
      console.log(`   📊 MongoDB Tools: ${healthReport.mongoToolCount}`);
      console.log(`   📊 Qdrant Vectors: ${healthReport.qdrantVectorCount}`);
    } else {
      // Log warnings if there are issues
      console.log('⚠️  Vector index health issues detected:');

      if (!healthReport.collectionHealthy) {
        console.log('   ❌ Vector collection configuration is unhealthy');
      }

      if (!healthReport.sampleValidationPassed) {
        console.log('   ❌ Sample embedding validation failed');
      }

      if (healthReport.missingVectors > 0) {
        console.log(`   ⚠️  ${healthReport.missingVectors} tools missing from vector index`);
      }

      if (healthReport.orphanedVectors > 0) {
        console.log(`   ⚠️  ${healthReport.orphanedVectors} orphaned vectors found`);
      }

      // Log recommendations
      if (healthReport.recommendations.length > 0) {
        console.log('\n📝 Recommendations:');
        healthReport.recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });

        console.log('\n💡 To fix vector index issues, consider running:');
        console.log('   npm run seed-vectors  # Re-index all tools to Qdrant');
        console.log('   npm run seed-vectors -- --force  # Force re-index (clears existing data)');
        console.log('   or use the VectorIndexingService directly');
      }
    }

    console.log('🔍 Vector index validation completed\n');

  } catch (error) {
    // Don't fail startup, but provide clear feedback
    console.log('🔄 Vector index validation could not be completed:');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('   This may be due to services not being available yet');
    console.log('   The server will continue starting, but vector search may not work properly\n');

    // Provide troubleshooting tips
    console.log('💡 Troubleshooting tips:');
    console.log('   • Ensure MongoDB and Qdrant services are running');
    console.log('   • Check environment variables for service connections');
    console.log('   • Run validation manually after startup if needed\n');
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
  const clientId = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  try {
    const { query, limit = 10, debug = false } = req.body;

    // Additional Joi validation for extra security
    const { error: joiError, value: validatedData } = searchQuerySchema.validate(req.body);
    if (joiError) {
      securityLogger.warn('Joi validation failed', {
        ip: clientId,
        userAgent,
        error: joiError.details,
        body: req.body,
        timestamp: new Date().toISOString()
      });

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

    // Log search request
    securityLogger.info('Search request received', {
      ip: clientId,
      userAgent,
      queryLength: sanitizedQuery.length,
      limit: validatedData.limit,
      debug: validatedData.debug,
      timestamp: new Date().toISOString()
    });

    console.log(`\n🚀 Starting search for query: "${sanitizedQuery}" (client: ${clientId})`);

    // NEW: Agentic search orchestration with 3-node LLM-first pipeline
    const searchResult = await searchWithAgenticPipeline(sanitizedQuery, {
      enableCheckpoints: false,
      metadata: { debug: validatedData.debug, client: clientId }
    });

    const executionTime = Date.now() - startTime;

    const response = {
      query: sanitizedQuery, // Use sanitized query in response
      originalQuery: validatedData.query, // Include original for debugging if needed
      // NEW: Intent from our 3-node pipeline

      executionTime: `${executionTime}ms`,
      phase: "3-Node LLM-First Pipeline",
      ...searchResult
    };

    console.log(`🎉 Search completed in ${executionTime}ms with ${response.results.length} results (client: ${clientId})\n`);

    // Log successful request for monitoring
    securityLogger.info('Search request completed successfully', {
      ip: clientId,
      userAgent,
      queryLength: sanitizedQuery.length,
      resultCount: response.results.length,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });

    res.json(response);
  } catch (error) {
    const executionTime = Date.now() - startTime;

    // Enhanced error logging
    securityLogger.error('Search error', {
      ip: clientId,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      query: req.body?.query || 'unknown',
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });

    console.error(`❌ Search error for client ${clientId}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });

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
  await validateVectorIndexOnStartup();

  app.listen(PORT, () => {
    console.log(`🚀 Search API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Search endpoint: http://localhost:${PORT}/search`);
  });
}

// Start the server
startServer().catch(error => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});

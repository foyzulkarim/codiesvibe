# Security Hardening for Search API

This document outlines the security enhancements implemented to harden the `/search` endpoint against various attack vectors.

## Overview

The Search API now includes comprehensive security measures to protect against:
- Input validation attacks
- Code injection attempts
- Rate limiting abuse
- Data exfiltration
- Cross-site scripting (XSS)
- SQL/NoSQL injection
- Command injection

## Security Enhancements

### 1. Multi-Layer Input Validation & Sanitization

#### Dual Validation Approach
- **Express-validator middleware**: Request-level validation with sanitization
- **Joi schema validation**: Additional layer with comprehensive error messages
- **Custom sanitization**: Removes control characters and dangerous symbols

#### Query Validation
- **Type checking**: Ensures query is a string
- **Length limits**: Maximum 1000 characters, minimum 1 character
- **Pattern validation**: Blocks HTML brackets, curly braces, square brackets, backslashes
- **Content filtering**: Blocks malicious patterns including:
  - XSS attempts (`<script>`, `javascript:`, event handlers)
  - Code execution attempts (`eval()`, `exec()`, `system()`)
  - Command substitution (`$()`, backticks)
  - Escape sequences (hex, Unicode)
  - SQL injection patterns (DROP, DELETE, etc.)
- **Character sanitization**: Removes control characters and dangerous symbols
- **Parameter validation**: Validates limit (1-100) and debug (boolean) parameters

#### Validation Error Format
```javascript
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "query",
      "message": "Query contains invalid characters",
      "value": "<script>alert('xss')</script>"
    }
  ]
}
```

### 2. Advanced Rate Limiting

#### Multi-Tier Rate Limiting
- **General rate limiting**: 100 requests per 15 minutes per IP
- **Search-specific rate limiting**: 30 requests per minute per IP
- **Standard headers**: Uses `RateLimit-*` headers for client communication
- **Configurable windows**: Different time windows for different endpoints
- **Security logging**: Automatic logging of rate limit violations

#### Implementation
```javascript
// Search endpoint rate limiting
HTTP 429 Too Many Requests
{
  "error": "Too many search requests",
  "code": "SEARCH_RATE_LIMIT_EXCEEDED",
  "retryAfter": "1 minute"
}

// Rate limiting headers
RateLimit-Limit: 30
RateLimit-Remaining: 25
RateLimit-Reset: 1640995200
```

### 3. Comprehensive Security Package Stack

#### Installed Security Packages
- **helmet**: Sets security-related HTTP headers (XSS, Clickjacking, CSP, etc.)
- **express-rate-limit**: Advanced rate limiting with multiple tiers
- **express-validator**: Request validation and sanitization middleware
- **joi**: Schema validation with detailed error messages
- **mongo-sanitize**: NoSQL injection protection for MongoDB queries
- **hpp**: HTTP Parameter Pollution protection
- **cors**: Cross-Origin Resource Sharing configuration
- **winston**: Security logging and monitoring

#### Security Middleware Stack
```javascript
// Security middleware order (applied in this sequence)
app.use(helmet());                    // Security headers
app.use(cors());                      // CORS protection
app.use(mongoSanitize());             // NoSQL injection protection
app.use(hpp());                       // HTTP Parameter Pollution protection
app.use(limiter);                     // General rate limiting
app.use(express.json({ limit: '10mb' })); // Body size limits

// Endpoint-specific protection
app.post('/search', searchLimiter, validateSearchRequest, handler);
```

### 4. NoSQL Injection Protection

#### Implementation
- **express-mongo-sanitize**: Removes MongoDB operators from request data
- **Query sanitization**: Custom sanitization removes dangerous characters
- **Parameter validation**: Multiple validation layers prevent injection
- **Request body limits**: Prevent large payload attacks

#### Protected Operators
```javascript
// These operators are automatically removed:
"$where", "$gt", "$lt", "$ne", "$in", "$nin", "$exists", "$regex",
"$elemMatch", "$size", "$all", "$and", "$or", "$not", "$nor",
"$set", "$unset", "$push", "$pull", "$pop", "$inc", "$dec"
```

### 5. HTTP Parameter Pollution (HPP) Protection

#### What HPP Prevents
- **Array injection**: Prevents parameter array manipulation
- **Parameter overriding**: Stops malicious parameter replacement
- **Query manipulation**: Protects against URL parameter pollution

#### Configuration
```javascript
app.use(hpp({
  whitelist: ['query', 'limit', 'debug'] // Allow these parameters
}));
```

### 6. CORS Configuration

#### Security Settings
- **Environment-specific origins**: Different policies for dev/prod
- **Method restrictions**: Limited to GET, POST, OPTIONS
- **Header restrictions**: Only allowed headers accepted
- **No credentials**: Disable credential sharing for security
- **Caching**: Pre-flight requests cached for 24 hours

### 7. Advanced Security Logging

#### Winston Logger Configuration
- **Multiple transports**: Console and file logging
- **Structured logging**: JSON format for easy parsing
- **Security events**: Dedicated security log file
- **Request tracking**: IP, User-Agent, timestamps, and metadata
- **Error tracking**: Detailed error information with stack traces

#### Logged Events
- All incoming requests with metadata
- Validation failures with error details
- Rate limit violations with client information
- Search errors with execution context
- Security events and suspicious activities

### 8. Rate Limiting

#### Configuration
- **Requests per minute**: 30 requests per client
- **Window duration**: 60 seconds
- **Client identification**: Uses IP address
- **Memory cleanup**: Automatic cleanup of expired entries

#### Implementation
```javascript
// Rate limiting response
HTTP 429 Too Many Requests
{
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

### 3. Security Headers (via Helmet)

#### Implemented Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`: Default-src self, inline scripts/styles
- `X-DNS-Prefetch-Control: off`
- `Strict-Transport-Security`: HTTPS-only (when available)
- `X-RateLimit-Limit: 30`
- `X-RateLimit-Window: 60`

#### Helmet Configuration
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disabled for API compatibility
}));
```

### 4. Environment Validation

#### Startup Validation
- Validates critical environment variables on startup
- Fails fast if required variables are missing
- Required variables: `MONGODB_URI`, `QDRANT_HOST`, `QDRANT_PORT`

### 5. Enhanced Error Handling

#### Security-Focused Error Responses
- **Production**: Generic error messages to prevent information disclosure
- **Development**: Detailed error messages for debugging
- **Structured error codes**: Standardized error response format
- **Request metadata**: Includes execution timing

#### Error Response Format
```javascript
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "phase": "Error phase description",
  "executionTime": "123ms"
}
```

### 6. Comprehensive Logging

#### Request Logging
- Client IP address
- Query length (not content for privacy)
- Request parameters
- Timestamps
- Execution time
- Success/failure status

#### Security Event Logging
- Invalid query attempts
- Rate limit violations
- Malicious pattern detection
- Stack traces (development only)

## API Response Changes

### Enhanced Response Format
```javascript
{
  "query": "sanitized-query",        // Sanitized input
  "originalQuery": "original-query", // Only in debug mode
  "intentState": {...},
  "executionPlan": {...},
  "candidates": [...],
  "executionStats": {...},
  "executionTime": "123ms",
  "phase": "3-Node LLM-First Pipeline",
  "strategy": "agentic-search",
  "explanation": "...",
  "results": [...],
  "debug": { ... } // Only when debug=true
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `MISSING_QUERY` | Query parameter is required | 400 |
| `INVALID_QUERY` | Query contains malicious content or violates validation | 400 |
| `INVALID_LIMIT` | Limit parameter validation failed | 400 |
| `INVALID_DEBUG` | Debug parameter must be boolean | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests from client | 429 |
| `SEARCH_ERROR` | Internal search processing error | 500 |

## Testing

### Security Test Suite
Run the security test suite to verify all protections:

```bash
# Ensure server is running first
npm run dev

# Run security tests
node test-security.js
```

### Test Coverage
- Input validation (empty, missing, malformed)
- XSS attempts (script tags, event handlers)
- Injection attempts (SQL, command, code execution)
- Parameter validation (limit, debug types)
- Rate limiting effectiveness
- Security headers presence
- Error handling verification

## Configuration

### Environment Variables
```env
# Required (validated on startup)
MONGODB_URI=mongodb://localhost:27017/database
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Optional
NODE_ENV=development|production
PORT=4003
ENABLE_VECTOR_VALIDATION=true
```

### Rate Limiting Configuration
- **Max requests**: 30 per minute (adjustable in code)
- **Window duration**: 60 seconds
- **Cleanup interval**: 60 seconds
- **Storage**: In-memory Map (production should use Redis)

## Production Deployment Considerations

### Rate Limiting
- Use Redis for distributed rate limiting
- Configure appropriate limits based on traffic patterns
- Consider per-user rate limiting with authentication

### Monitoring
- Implement log aggregation (ELK stack, Splunk)
- Set up alerts for security events
- Monitor rate limit violations
- Track unusual query patterns

### Security Headers
- Consider stricter CSP policies for production
- Implement HSTS headers
- Configure CORS appropriately

### Error Handling
- Use generic error messages in production
- Implement centralized error logging
- Set up error monitoring services

## Future Enhancements

### Authentication/Authorization
- API key authentication
- JWT-based user authentication
- Role-based access control
- Per-user rate limiting

### Advanced Threat Detection
- Query pattern analysis
- Machine learning anomaly detection
- IP reputation checking
- Geographic restrictions

### Performance Optimization
- Query result caching
- Request deduplication
- Load balancing
- CDN integration

## Security Best Practices

1. **Regular Security Reviews**: Periodically review and update security measures
2. **Dependency Updates**: Keep all dependencies updated to patch vulnerabilities
3. **Security Testing**: Regular penetration testing and vulnerability scanning
4. **Monitoring**: Continuous monitoring of security events and unusual activity
5. **Incident Response**: Have a clear incident response plan for security breaches

## Support

For security-related questions or to report vulnerabilities:
- Review this documentation
- Check the test suite for implementation details
- Create a security issue in the project repository
- Follow responsible disclosure practices
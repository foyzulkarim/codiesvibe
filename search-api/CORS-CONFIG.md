# CORS Configuration Guide

This guide explains how to configure Cross-Origin Resource Sharing (CORS) for different environments in the Search API.

## Overview

The Search API uses environment-based CORS configuration to provide:
- **Development**: Open access for local development
- **Production**: Restricted access to specific domains only

## Environment Variables

### Required Environment Variables

#### `NODE_ENV`
- **Development**: `NODE_ENV=development`
- **Production**: `NODE_ENV=production`

#### `ALLOWED_ORIGINS` (Production Only)
Comma-separated list of allowed domains for production.
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com
```

#### `CORS_ORIGINS` (Development Only)
Comma-separated list of allowed origins for development, or `true` to allow all origins.
```env
# Allow all origins (default)
CORS_ORIGINS=true

# Allow specific origins
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
```

## Configuration Examples

### Development Configuration (.env.development)
```env
NODE_ENV=development
PORT=4003

# Development CORS - Allow all origins
CORS_ORIGINS=true

# Optional: Restrict to specific development origins
# CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Security features can be disabled for easier development
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true
```

### Production Configuration (.env.production)
```env
NODE_ENV=production
PORT=4003

# Production CORS - Restrict to specific domains only
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com

# Security features should be enabled in production
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true
```

### Staging Configuration (.env.staging)
```env
NODE_ENV=production
PORT=4003

# Staging CORS - Allow staging and local development
ALLOWED_ORIGINS=https://staging.yourdomain.com,http://localhost:3000

# Security features enabled
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true
```

## CORS Behavior by Environment

### Development (`NODE_ENV=development`)

**Default Behavior**: Allows all origins

**Options**:
1. **Allow all origins** (default)
   ```env
   CORS_ORIGINS=true
   ```
   - Any domain can make requests
   - Perfect for local development
   - No origin restrictions

2. **Allow specific origins**
   ```env
   CORS_ORIGINS=http://localhost:3000,http://localhost:3001
   ```
   - Only specified origins can make requests
   - Useful for testing with specific frontend ports
   - More restrictive than allowing all origins

### Production (`NODE_ENV=production`)

**Behavior**: Restricts to specific domains only

**Required Configuration**:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Features**:
- ✅ **Origin validation**: Only allowed domains can make requests
- ✅ **Security logging**: All CORS attempts are logged
- ✅ **Blocked requests**: Unauthorized origins are logged and blocked
- ✅ **No origin requests**: Allows requests from tools like curl, mobile apps

## Security Features

### Production CORS Security

1. **Origin Validation**
   ```javascript
   // Only these domains can make requests:
   const allowedOrigins = [
     'https://yourdomain.com',
     'https://www.yourdomain.com',
     'https://app.yourdomain.com'
   ];
   ```

2. **Request Logging**
   ```javascript
   // All CORS attempts are logged:
   securityLogger.info('CORS request', {
     origin: 'https://example.com',
     allowedOrigins: ['https://yourdomain.com'],
     timestamp: '2024-01-01T00:00:00.000Z'
   });
   ```

3. **Blocked Request Logging**
   ```javascript
   // Blocked attempts are logged with warnings:
   securityLogger.warn('CORS request blocked - origin not allowed', {
     origin: 'https://malicious-site.com',
     allowedOrigins: ['https://yourdomain.com'],
     timestamp: '2024-01-01T00:00:00.000Z'
   });
   ```

## CORS Headers

### Standard Headers
- **Access-Control-Allow-Origin**: Allowed origins (dynamic or specific)
- **Access-Control-Allow-Methods**: `GET, POST, OPTIONS`
- **Access-Control-Allow-Headers**: `Content-Type, Authorization`
- **Access-Control-Max-Age**: `86400` (24 hours)

### Security Headers (when enabled)
- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `disallow`
- **X-XSS-Protection**: `1; mode=block`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Content-Security-Policy**: Default policy

## Testing CORS Configuration

### Test Local Development
```bash
# Test from different origins
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://localhost:4003/search

# Test the actual request
curl -H "Origin: http://localhost:3000" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:4003/search \
     -d '{"query": "test", "limit": 5}'
```

### Test Production Restrictions
```bash
# Test with allowed origin (should succeed)
curl -H "Origin: https://yourdomain.com" \
     -H "Content-Type: application/json" \
     -X POST https://api.yourdomain.com/search \
     -d '{"query": "test", "limit": 5}'

# Test with blocked origin (should fail)
curl -H "Origin: https://malicious-site.com" \
     -H "Content-Type: application/json" \
     -X POST https://api.yourdomain.com/search \
     -d '{"query": "test", "limit": 5}'
```

## Common CORS Issues and Solutions

### 1. CORS Error in Browser
**Error**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Solutions**:
- Check if your origin is in `ALLOWED_ORIGINS` (production)
- Verify `NODE_ENV` is set correctly
- Check server logs for CORS blocking messages

### 2. Preflight Request Failing
**Error**: `Response to preflight request doesn't pass access control check`

**Solutions**:
- Ensure `OPTIONS` method is allowed
- Check that required headers are in `allowedHeaders`
- Verify preflight requests return 204 status

### 3. Credentials Not Allowed
**Error**: `Credentials mode is 'include', but Access-Control-Allow-Credentials is 'false'`

**Solutions**:
- This API doesn't support credentials (security decision)
- Remove `credentials: 'include'` from frontend requests
- Use token-based authentication instead

## Deployment Considerations

### Cloud Deployments

#### AWS API Gateway
```env
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Vercel
```env
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Docker
```dockerfile
# In Dockerfile or docker-compose.yml
environment:
  - NODE_ENV=production
  - ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### CDN and Reverse Proxy

#### Nginx Configuration
```nginx
# Add CORS headers at reverse proxy level
location /api/ {
    proxy_pass http://search-api:4003/;

    # CORS headers
    add_header Access-Control-Allow-Origin $http_origin;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    add_header Access-Control-Max-Age 86400;
}
```

#### Cloudflare Workers
```javascript
// Add CORS headers at edge
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Add CORS headers
  const response = await fetch(API_URL + request.url);
  const newResponse = new Response(response.body, response);

  newResponse.headers.set('Access-Control-Allow-Origin', request.headers.get('origin'));
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return newResponse;
}
```

## Monitoring CORS

### Log Monitoring
Monitor these log patterns for CORS issues:
- `CORS request blocked - origin not allowed`
- `CORS request` (for all requests in production)

### Metrics to Track
1. **CORS Success Rate**: Percentage of successful CORS requests
2. **Blocked Origins**: Number of requests from unauthorized origins
3. **Top Origins**: Most frequent allowed origins
4. **Error Rate**: CORS-related errors

### Example Monitoring Setup
```javascript
// In your monitoring system
monitorCorsMetrics = {
  allowedOrigins: ['https://yourdomain.com'],
  blockedAttempts: 0,
  successfulRequests: 0,
  topOrigins: {
    'https://yourdomain.com': 1250,
    'https://www.yourdomain.com': 890
  }
};
```

## Security Best Practices

### 1. Environment-Specific Configuration
- Always use different configurations for development and production
- Never use `CORS_ORIGINS=true` in production
- Regularly audit allowed origins list

### 2. Origin Validation
- Use exact domain matches (no wildcards in production)
- Include all subdomains if needed
- Consider CDN domains in allowed list

### 3. Monitoring and Logging
- Log all CORS attempts in production
- Set up alerts for blocked origin spikes
- Regularly review CORS access patterns

### 4. Testing
- Test CORS configuration in both environments
- Verify production restrictions work
- Test with different browsers and tools

## Troubleshooting Checklist

### CORS Issues
- [ ] `NODE_ENV` is set correctly
- [ ] `ALLOWED_ORIGINS` contains your domain (production)
- [ ] No typos in domain names
- [ ] HTTPS/HTTP mismatch (protocol must match)
- [ ] Port number is correct if using non-standard ports
- [ ] Server logs show CORS requests

### Security Headers
- [ ] `ENABLE_SECURITY_HEADERS=true` (or not set)
- [ ] Headers appear in response
- [ ] No conflicting headers from reverse proxy

### Rate Limiting
- [ ] `ENABLE_RATE_LIMITING=true` (or not set)
- [ ] Rate limits work as expected
- [ ] 429 responses include retry information

## Support

For CORS-related issues:
1. Check server logs for CORS messages
2. Verify environment variables are set correctly
3. Test with curl to isolate browser issues
4. Review this documentation for configuration details
5. Create an issue with your configuration details
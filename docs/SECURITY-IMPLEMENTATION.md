# Security Implementation: Domain-Based Access with Cookie Validation

## Overview
This implementation provides robust security for production while maintaining development flexibility. The system uses cookie-based session management with domain validation and CSRF protection.

## Architecture

### Backend Components

#### 1. Session Management (`/src/auth/`)
- **SessionService**: Handles session creation, validation, and cleanup
- **AuthController**: Provides endpoints for session management
- **DTOs**: Type-safe request/response objects

#### 2. Security Guards (`/src/common/guards/`)
- **SessionGuard**: Validates session and CSRF tokens
- **IpGuard**: IP-based rate limiting and blocking

#### 3. Security Middleware
- **Domain Validation**: Only allows requests from authorized domains
- **CORS Configuration**: Environment-based origin control
- **Security Headers**: Helmet middleware for comprehensive protection

### Frontend Components

#### 1. Session Management (`/src/hooks/`)
- **useSession**: React hook for session lifecycle management
- **Auto-refresh**: Automatic session renewal before expiry

#### 2. API Client (`/src/api/`)
- **CSRF Token Handling**: Automatic token inclusion in requests
- **Session Retry**: Automatic session refresh on 401 errors

## Security Features

### 1. Cookie-Based Authentication
- **Secure Cookies**: HttpOnly, Secure, SameSite=Strict
- **Signed Cookies**: HMAC-based tamper protection
- **Session Timeout**: 15-minute expiry with auto-refresh

### 2. CSRF Protection
- **Double Submit Pattern**: CSRF token in cookie + header
- **Token Rotation**: New tokens on session refresh
- **Timing-Safe Comparison**: Prevents timing attacks

### 3. Domain Validation
- **Production Only**: Enforced only in production environment
- **Subdomain Support**: Wildcard domain matching
- **Origin Headers**: Validates Origin and Referer headers

### 4. Rate Limiting
- **Multiple Windows**: 1s, 10s, 1min, 1hour limits
- **IP Blocking**: Temporary blocks for abusive behavior
- **Session-Based**: Per-user rate limiting

## Environment Configuration

### Development (.env)
```bash
NODE_ENV=development
# Permissive CORS for local development
# No domain restrictions
# Session validation disabled
```

### Production (.env)
```bash
NODE_ENV=production
ALLOWED_DOMAINS=yourdomain.com,www.yourdomain.com
COOKIE_SECRET=your-super-secure-secret-32-chars-min
CSRF_SECRET=your-super-secure-secret-32-chars-min
SESSION_TIMEOUT=900000
```

## API Endpoints

### Authentication
- `POST /api/auth/session` - Create new session
- `POST /api/auth/verify` - Verify session validity
- `POST /api/auth/refresh` - Refresh existing session
- `GET /api/auth/csrf` - Get CSRF token

### Protected Endpoints
- `POST /api/tools/ai-search` - AI search with session validation
- `GET /api/tools` - List tools (public)
- `GET /api/tools/:id` - Get tool details (public)
- `GET /health` - Health check (public)

## Request Flow

### 1. Session Initialization
```typescript
// Frontend automatically initializes session on app load
const { session, isLoading } = useSession();
```

### 2. API Request with Session
```typescript
// Automatic CSRF token inclusion and session validation
const response = await apiClient.post('/tools/ai-search', {
  query: 'AI assistant',
  limit: 10
});
```

### 3. Session Refresh
```typescript
// Automatic refresh 2 minutes before expiry
// Manual refresh available if needed
await refreshSession();
```

## Security Headers

### Production Headers
- **Content-Security-Policy**: Restricts resource loading
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Strict-Transport-Security**: Enforces HTTPS
- **X-XSS-Protection**: XSS protection

## Error Handling

### Session Errors
- **401 Unauthorized**: Session expired or invalid
- **403 Forbidden**: Domain not allowed
- **429 Too Many Requests**: Rate limit exceeded

### Automatic Recovery
- **Session Refresh**: Automatic retry on 401
- **Reinitialization**: New session if refresh fails
- **Graceful Degradation**: Error states handled gracefully

## Testing

### Development Testing
```bash
# Start backend with development settings
cd backend && npm run dev

# Session validation disabled
# CORS allows all origins
# No domain restrictions
```

### Production Testing
```bash
# Set production environment
NODE_ENV=production ALLOWED_DOMAINS=yourdomain.com npm run dev

# Session validation enabled
# Domain restrictions enforced
# CSRF protection active
```

## Migration Guide

### From GET to POST
```typescript
// Old: GET with query params
const response = await axios.get('/tools/ai-search?q=AI+assistant');

// New: POST with body
const response = await axios.post('/tools/ai-search', {
  query: 'AI assistant',
  limit: 10
});
```

### Frontend Integration
```typescript
// Wrap app with SessionProvider
<SessionProvider>
  <App />
</SessionProvider>

// Use session-aware API client
import { apiClient } from '@/api/client';
```

## Monitoring

### Session Metrics
- Session creation rate
- Session refresh frequency
- Failed validation attempts
- CSRF token validation failures

### Security Events
- Domain violation attempts
- Rate limit triggers
- IP blocking events
- Session abuse patterns

## Best Practices

### 1. Secret Management
- Use strong, random secrets (32+ characters)
- Rotate secrets regularly
- Store secrets securely (environment variables)

### 2. Domain Configuration
- List all valid domains and subdomains
- Include both www and non-www versions
- Test domain validation in staging

### 3. Session Management
- Monitor session lifecycle
- Implement session cleanup
- Track session abuse patterns

### 4. Error Handling
- Log security events appropriately
- Provide user-friendly error messages
- Implement graceful fallbacks

This implementation provides enterprise-grade security while maintaining excellent developer experience and user experience.
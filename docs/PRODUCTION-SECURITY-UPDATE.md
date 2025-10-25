# Production Security Update: Nginx Reverse Proxy Architecture

## 🏗️ **Production Architecture Analysis**

Based on `docker-compose.production.yml` and `nginx.conf`, the production setup uses:

### **Infrastructure Layout:**
- **Frontend**: `codiesvibe.com` (served by Nginx)
- **Backend API**: `api.codiesvibe.com` (proxied to NestJS backend)
- **Reverse Proxy**: Nginx with Cloudflare integration
- **Infrastructure**: MongoDB, Redis, monitoring stack

### **Security Implications:**
1. **Cross-Subdomain Requests**: Frontend calls API across subdomains
2. **Cookie Domain Scope**: Must work across `*.codiesvibe.com`
3. **CORS Configuration**: Allow cross-subdomain requests
4. **Trust Proxy**: Backend trusts Nginx's forwarded headers

## 🔧 **Security Implementation Updates**

### **1. Cookie Configuration for Cross-Subdomain**
```typescript
// Production cookie settings
res.cookie('session', cookieValue, {
  httpOnly: true,
  secure: true,
  sameSite: 'none', // Required for cross-subdomain
  maxAge: 15 * 60 * 1000,
  path: '/',
  domain: '.codiesvibe.com', // Works across all subdomains
});
```

### **2. CORS Configuration**
```typescript
// Allow cross-subdomain requests
const corsOrigins = [
  'https://codiesvibe.com',
  'https://www.codiesvibe.com', 
  'https://api.codiesvibe.com'
];
```

### **3. Trust Proxy Configuration**
```typescript
// Trust Nginx's forwarded headers
if (isProduction) {
  app.set('trust proxy', true);
}
```

### **4. Origin Validation**
```typescript
// Validate allowed origins in production
const allowedOrigins = [
  'https://codiesvibe.com',
  'https://www.codiesvibe.com',
  'https://api.codiesvibe.com',
  ...this.allowedDomains
];
```

## 🛡️ **Security Layers in Production**

### **Layer 1: Nginx Reverse Proxy**
- **Rate Limiting**: Multiple zones (API: 10r/s, Auth: 5r/s, General: 2r/s)
- **Security Headers**: HSTS, CSP, XSS protection, frame options
- **Bot Protection**: Block malicious user agents
- **Connection Limiting**: Per-IP connection limits
- **Cloudflare Integration**: Real IP handling and DDoS protection

### **Layer 2: Backend Security**
- **Session Validation**: Cookie + CSRF token verification
- **Domain Validation**: Only allowed origins can access
- **Rate Limiting**: Application-level throttling
- **Input Validation**: Sanitized and validated inputs
- **IP Blocking**: Temporary blocks for abusive behavior

### **Layer 3: Infrastructure Security**
- **Container Security**: Read-only filesystem, dropped capabilities
- **Network Isolation**: External Docker network
- **Secret Management**: Environment variable-based secrets
- **Resource Limits**: Memory and CPU constraints

## 🔄 **Request Flow in Production**

### **1. Session Initialization**
```
User (codiesvibe.com) 
  → POST /auth/session 
  → Nginx (api.codiesvibe.com) 
  → Backend (session creation)
  → Set cookie (.codiesvibe.com)
```

### **2. API Request with Session**
```
User (codiesvibe.com)
  → POST /api/tools/ai-search 
  → Nginx (api.codiesvibe.com)
  → Backend (session + CSRF validation)
  → Process request
```

### **3. Session Refresh**
```
User (codiesvibe.com)
  → POST /auth/refresh
  → Nginx (api.codiesvibe.com)
  → Backend (session validation + renewal)
  → Set new cookie (.codiesvibe.com)
```

## 🌐 **Domain Configuration**

### **Environment Variables**
```bash
# Production domains
ALLOWED_DOMAINS=codiesvibe.com,www.codiesvibe.com,api.codiesvibe.com

# CORS origins
CORS_ORIGIN=https://codiesvibe.com,https://www.codiesvibe.com,https://api.codiesvibe.com

# Frontend API URL
VITE_API_URL=https://api.codiesvibe.com/api
```

### **Cookie Domain Strategy**
- **Domain**: `.codiesvibe.com` (covers all subdomains)
- **SameSite**: `none` (required for cross-subdomain)
- **Secure**: `true` (HTTPS only)
- **HttpOnly**: `true` (prevents XSS access)

## 🚀 **Deployment Configuration**

### **Docker Compose Services**
```yaml
services:
  nginx:
    # Frontend + reverse proxy
    # Handles SSL termination
    # Rate limiting and security headers
    
  backend:
    # NestJS application
    # Session management
    # API endpoints
    # Trust proxy enabled
    
  frontend-init:
    # Build and copy assets
    # One-time initialization
```

### **Security Headers via Nginx**
```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'; ...";
```

## 🔍 **Monitoring and Logging**

### **Nginx Logging**
- **Access Logs**: JSON format with Cloudflare data
- **Error Logs**: Detailed error tracking
- **Rate Limiting**: Log blocked requests
- **Upstream Timing**: Backend performance metrics

### **Backend Monitoring**
- **Session Metrics**: Creation, refresh, validation rates
- **Security Events**: Failed validations, domain violations
- **Performance**: Request timing, error rates
- **Infrastructure**: Prometheus metrics, Grafana dashboards

## 🛠️ **Development vs Production**

### **Development**
```bash
NODE_ENV=development
# Permissive CORS
# No domain restrictions
# Session validation disabled
# Local cookie domain
```

### **Production**
```bash
NODE_ENV=production
# Strict CORS (subdomains only)
# Domain validation enabled
# Session validation required
# Cross-subdomain cookies
```

## 📋 **Security Checklist**

### **✅ Implemented**
- [x] Cross-subdomain cookie support
- [x] Production CORS configuration
- [x] Trust proxy for Nginx
- [x] Domain validation
- [x] CSRF protection
- [x] Rate limiting (Nginx + Backend)
- [x] Security headers
- [x] Session management

### **🔧 Configuration Required**
- [ ] Set production secrets
- [ ] Configure SSL certificates
- [ ] Set up monitoring alerts
- [ ] Test domain validation
- [ ] Verify cookie behavior

## 🎯 **Key Benefits**

1. **Zero Trust Architecture**: Every request validated
2. **Cross-Subdomain Security**: Secure cookie sharing
3. **Multi-Layer Protection**: Nginx + Backend + Infrastructure
4. **Production Hardening**: Comprehensive security headers
5. **Scalable Architecture**: Load balancing and caching
6. **Monitoring Ready**: Comprehensive logging and metrics

This implementation provides enterprise-grade security optimized for the Nginx reverse proxy architecture while maintaining excellent performance and user experience.
# Production Deployment Guide

This guide explains how to properly deploy CodiesVibe in production with correct frontend-backend communication.

## 🚨 The Issue We Fixed

Previously, the frontend was making requests to `localhost:4000` in production, which failed because:
1. Vite environment variables are embedded at **BUILD TIME**, not runtime
2. The frontend container couldn't reach `localhost:4000` from within the container network
3. Production should use nginx proxy (`/api`) instead of direct backend access

## ✅ The Solution

We implemented proper build-time environment variable handling:

### 1. Frontend Dockerfile Changes
```dockerfile
# Build arguments for Vite environment variables
ARG VITE_API_URL=/api
ARG NODE_ENV=production

# Set environment variables from build arguments
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_ENV=${NODE_ENV}
```

### 2. Docker Compose Production Changes
```yaml
frontend:
  build:
    args:
      # Vite build-time environment variables
      - VITE_API_URL=/api
      - NODE_ENV=production
```

### 3. Frontend Code Configuration
The frontend already had proper environment variable handling:
```typescript
// src/api/client.ts
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});
```

## 🚀 How to Deploy

### Prerequisites
1. Start infrastructure services:
   ```bash
   docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml --env-file .env.production up -d
   ```

### Step 1: Create Production Environment File
```bash
# Copy the example file and edit with your values
cp .env.production.example .env.production

# Edit with your actual secrets and configuration
nano .env.production  # or your preferred editor
```

**⚠️ Important**: Never commit `.env.production` to git! It contains sensitive secrets.

### Step 2: Automated Deployment (Recommended)
```bash
# Use the deployment script
./scripts/deploy-production.sh
```

### Step 3: Manual Deployment (Alternative)
```bash
# Build and deploy with environment file
docker-compose -f docker-compose.production.yml --env-file .env.production up -d --build

# Verify deployment
curl http://localhost/health      # Frontend
curl http://localhost/api/health  # Backend through nginx
```

## 🔍 Debugging

### Verify API Configuration in Built Files
```bash
# Run the debug script
./scripts/debug-api-config.sh
```

This script will:
- Extract built frontend files
- Search for hardcoded localhost references
- Verify `/api` configuration is embedded
- Test the frontend container

### Expected Debug Results
```
✅ No localhost references found
✅ Found /api references in built files
✅ No port 4000 references found
✅ Found baseURL configuration in built file
```

### Manual Verification
```bash
# Check if frontend makes correct API calls
docker logs codiesvibe-nginx

# Should show requests to backend:4000, not localhost:4000
```

## 🌐 Architecture

```
Browser → Nginx (port 80) → Gateway (internal port 4000) → NestJS API (internal port 4001)
                ↓                                      ↓
           Static Files (Frontend)              Fastify API (internal port 4002)
```

- **Infrastructure Layer**: MongoDB, Redis, Prometheus, Grafana, Loki (environment-agnostic)
- **Frontend**: Built with `/api` as base URL, served by nginx
- **Gateway**: Nginx-based API gateway that handles routing, rate limiting, and security headers
- **NestJS API**: Main backend API accessible only through the gateway at internal port 4001
- **Fastify API**: Secondary backend API accessible only through the gateway at internal port 4002
- **nginx**: Routes `/api/*` to gateway, serves static files for everything else

### Clean Separation Benefits
- **Infrastructure Independence**: Same infrastructure definition for dev/prod
- **Application Isolation**: Backend services only depend on external network
- **Environment Parity**: Development exactly matches production architecture
- **Scalable Design**: Infrastructure and applications can scale independently

### Gateway Integration Benefits
- **Rate Limiting**: Protects backend from excessive requests
- **Security Headers**: Adds comprehensive security headers to API responses
- **Load Balancing**: Ready for horizontal scaling of backend services
- **Centralized Logging**: Gateway logs all API requests for monitoring
- **SSL Termination**: Handles SSL/TLS for API endpoints

## 🔧 Environment Variables

### Build-time Variables (Embedded in Frontend)
```env
VITE_API_URL=/api          # Required for production
NODE_ENV=production        # Required for optimization
```

### Runtime Variables (Backend/Infrastructure)
```env
# Infrastructure service connections (from docker-compose.infra.yml)
MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin
REDIS_URL=redis://:redis123@redis:6379

# Application configuration
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret
CSRF_SECRET=your-csrf-secret
CORS_ORIGIN=https://your-domain.com
TRUST_PROXY=true

# GitHub OAuth
GITHUB_CLIENT_ID=your_production_github_client_id
GITHUB_CLIENT_SECRET=your_production_github_client_secret
GITHUB_CALLBACK_URL=https://your-domain.com/api/auth/github/callback
```

## 🚨 Common Issues

### Issue: Frontend still shows localhost:4000 in browser network tab
**Cause**: Old build cached or environment variables not passed at build time
**Fix**:
```bash
docker-compose -f docker-compose.production.yml build --no-cache frontend
```

### Issue: 502 Bad Gateway for /api requests
**Cause**: Gateway or backend not accessible from nginx
**Fix**:
```bash
# Check if infrastructure is running
docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml --env-file .env.production ps

# Check if gateway is running
docker logs codiesvibe-gateway-prod

# Check if backend is running
docker logs codiesvibe-backend-prod

# Check network connectivity from nginx to gateway
docker exec codiesvibe-nginx curl http://gateway:4000/health

# Check network connectivity from gateway to backend
docker exec codiesvibe-gateway-prod curl http://nestjs-api:4001/health
```

### Issue: Frontend shows blank page
**Cause**: Build failed or static files not served correctly
**Fix**:
```bash
# Check frontend build logs
docker logs codiesvibe-frontend-prod

# Verify static files exist
docker exec codiesvibe-nginx ls -la /usr/share/nginx/html/
```

## 📋 Health Checks

After deployment, verify these endpoints:

- **Frontend**: `http://localhost/` - Should load the React app
- **Gateway**: `http://localhost:4000/` - Should return gateway info (direct access for testing)
- **Backend Health**: `http://localhost/api/health` - Should return `{"status":"ok"}` (via gateway)
- **API Documentation**: `http://localhost/api/docs` - Should load Swagger UI (via gateway)
- **nginx**: `http://localhost/nginx-health` - Should return `healthy`
- **API**: `http://localhost/api/tools` - Should return tools data (via gateway)

## 🔐 Security Considerations

1. **Secrets**: Use proper secrets management in real production
2. **HTTPS**: Configure SSL/TLS certificates for production domain
3. **CORS**: Update `CORS_ORIGIN` to your actual domain
4. **Rate Limiting**: nginx includes rate limiting configuration
5. **Security Headers**: nginx adds comprehensive security headers

## 📝 Files Created/Modified

- `Dockerfile.frontend` - Added build-time environment variable support
- `Dockerfile.backend` - Production Dockerfile for NestJS backend
- `backend/gateway/Dockerfile.gateway` - Gateway service Dockerfile
- `backend/gateway/nginx.conf` - Gateway nginx configuration with rate limiting and security
- `docker-compose.production.yml` - Production application services with clean separation
- `docker-compose.backend.yml` - Development backend services with clean separation
- `docker-compose/infrastructure/docker-compose.infra.yml` - Infrastructure services (environment-agnostic)
- `.env.production.example` - Production environment template with infrastructure credentials
- `.env.dev.example` - Development environment template with infrastructure credentials
- `scripts/dev-backend.sh` - Development convenience script for clean separation
- `scripts/deploy-production.sh` - Automated deployment script
- `scripts/debug-api-config.sh` - Debug and verification script
- `README-infra.md` - Updated with clean separation architecture documentation
- `DOCKER-COMPOSE-ARCHITECTURE-SUMMARY.md` - Updated with clean separation details
- `docs/PRODUCTION-DEPLOYMENT-GUIDE.md` - This guide
- `docs/PORT-ALLOCATION.md` - Updated port allocation strategy

## ✅ Success Verification

Your deployment is successful when:
1. No `localhost:4000` references in browser network tab
2. API calls go to `/api/*` paths
3. All health checks pass
4. No 502 errors in nginx logs
5. Application functions normally

For issues or questions, check the nginx and backend container logs for detailed error information.
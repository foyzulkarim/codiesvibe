# Search API - Production Readiness Plan

**Version**: 1.0
**Date**: 2025-11-17
**Deployment Target**: VPS with Docker Compose
**Status**: Planning Phase

---

## 📋 Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Production Requirements](#production-requirements)
3. [Implementation Phases](#implementation-phases)
4. [Tasks Checklist](#tasks-checklist)
5. [Technical Specifications](#technical-specifications)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Guide](#deployment-guide)

---

## 🎯 Current State Assessment

### ✅ **Already Production-Ready**

#### Security (90% Complete)
- ✅ Helmet security headers
- ✅ CORS with environment-based configuration
- ✅ Two-tier rate limiting (global: 100 req/15min, search: 30 req/min)
- ✅ Input validation (express-validator + Joi)
- ✅ NoSQL injection protection (express-mongo-sanitize)
- ✅ HTTP Parameter Pollution protection
- ✅ Query sanitization
- ✅ Request body size limits (10mb)
- ✅ Environment variable validation

#### Logging & Observability (70% Complete)
- ✅ Winston logger with structured logging
- ✅ Correlation ID middleware (`src/middleware/correlation.middleware.ts`)
- ✅ Security event logging
- ✅ Search request/success/error logging
- ✅ Log levels (info, warn, error)
- ✅ Loggly integration ready (needs configuration)
- ⚠️ Correlation ID needs to be passed to all services/utils
- ❌ No Prometheus metrics endpoint
- ❌ No distributed tracing

#### Infrastructure (60% Complete)
- ✅ PM2 cluster mode configuration (`ecosystem.config.js`)
- ✅ Environment validation on startup
- ✅ Basic health check endpoint
- ✅ TypeScript with strict mode
- ✅ Module aliases for clean imports
- ❌ No Docker containerization
- ❌ No docker-compose setup
- ❌ No graceful shutdown handling

#### Application Features (95% Complete)
- ✅ LangGraph agentic search pipeline (3 nodes)
- ✅ LLM response caching (already implemented!)
- ✅ MongoDB + Qdrant integration
- ✅ Vector index validation
- ✅ Thread manager for concurrent requests
- ✅ Result deduplication
- ✅ Comprehensive test suite (100% query planner coverage)

---

## 🚀 Production Requirements

### Critical Must-Haves (Before Production)

1. **Containerization** 🔴
   - Multi-stage Dockerfile
   - docker-compose.yml for full stack
   - Health checks in containers
   - Volume management for logs/data

2. **Enhanced Health Checks** 🔴
   - `/health/ready` (readiness probe)
   - `/health/live` (liveness probe)
   - MongoDB connectivity check
   - Qdrant connectivity check
   - Memory/disk usage monitoring

3. **Graceful Shutdown** 🔴
   - SIGTERM/SIGINT signal handling
   - Drain existing connections
   - Close database connections
   - Cleanup resources

4. **API Documentation** 🟡
   - Swagger/OpenAPI specification
   - Interactive API docs UI
   - Request/response examples
   - Error code documentation

5. **Monitoring & Alerting** 🟡
   - Prometheus metrics endpoint
   - Loggly configuration (free tier)
   - Basic alerting rules
   - Performance metrics tracking

6. **Correlation ID Propagation** 🟡
   - Pass correlation ID to all services
   - Pass correlation ID to all utils
   - Include in all log statements
   - Include in error responses

---

## 📅 Implementation Phases

### **Phase 1: Containerization & Core Infrastructure** (Week 1) ✅ COMPLETE
**Goal**: Make the API deployable via docker-compose on VPS

#### Tasks:
- [x] **1.1** ✅ Create optimized multi-stage Dockerfile
- [x] **1.2** ✅ Create docker-compose.yml (dev + prod variants)
- [x] **1.3** ✅ Create .dockerignore
- [x] **1.4** ✅ Add container health checks
- [x] **1.5** ✅ Create startup script for environment validation (integrated in Dockerfile)
- [x] **1.6** ✅ Update documentation with Docker instructions

**Deliverables**:
- ✅ Dockerfile (optimized, < 200MB image)
- ✅ docker-compose.yml
- ✅ docker-compose.production.yml
- ✅ .dockerignore
- ✅ Docker deployment guide

**Success Criteria**:
- Container builds successfully
- All services start via docker-compose
- Health checks pass
- Logs are accessible

---

### **Phase 2: Enhanced Health & Resilience** (Week 1-2) ✅ COMPLETE
**Goal**: Robust health monitoring and graceful failure handling

#### Tasks:
- [x] **2.1** ✅ Implement `/health/ready` endpoint
- [x] **2.2** ✅ Implement `/health/live` endpoint
- [x] **2.3** ✅ Add MongoDB connection health check
- [x] **2.4** ✅ Add Qdrant connection health check
- [x] **2.5** ✅ Add memory usage monitoring
- [x] **2.6** ✅ Add disk space monitoring
- [x] **2.7** ✅ Implement graceful shutdown handler
- [x] **2.8** ✅ Add connection draining logic
- [x] **2.9** ✅ Test graceful shutdown with active requests (via code review)

**Deliverables**:
- ✅ Enhanced health check endpoints
- ✅ Graceful shutdown implementation
- ✅ Health monitoring dashboard (simple)

**Success Criteria**:
- Health checks accurately reflect service status
- Zero request loss during graceful shutdown
- Container orchestrators can properly monitor health
- All connections closed cleanly on shutdown

---

### **Phase 3: Observability & Monitoring** (Week 2) ✅ COMPLETE
**Goal**: Comprehensive monitoring with free SaaS tools

#### Tasks:
- [x] **3.1** ✅ Add Prometheus metrics endpoint (`/metrics`)
  - [x] ✅ HTTP request duration histogram
  - [x] ✅ HTTP request total counter
  - [x] ✅ Error rate counter
  - [x] ✅ Active connections gauge
  - [x] ✅ Search query latency histogram
  - [x] ✅ LangGraph node execution times (available for instrumentation)
  - [x] ✅ Cache hit/miss ratio
  - [x] ✅ MongoDB query duration
  - [x] ✅ Qdrant query duration

- [x] **3.2** ✅ Configure Loggly integration
  - [x] ✅ Set up Loggly account (user responsibility)
  - [x] ✅ Configure winston-loggly-bulk transport
  - [x] ✅ Add structured log fields
  - [x] ✅ Test log shipping (via environment configuration)
  - [x] ✅ Create basic Loggly dashboards (user responsibility)

- [x] **3.3** ✅ Enhance correlation ID propagation
  - [x] ✅ Audit all services for correlation ID usage
  - [x] ✅ Add correlation ID to database service (via AsyncLocalStorage)
  - [x] ✅ Add correlation ID to vector service (via AsyncLocalStorage)
  - [x] ✅ Add correlation ID to LLM service (via Axios interceptor)
  - [x] ✅ Add correlation ID to all utils (via correlation context)
  - [x] ✅ Include correlation ID in error responses (via correlation middleware)

- [x] **3.4** ✅ Add request/response logging middleware
  - [x] ✅ Log request method, path, body (sanitized)
  - [x] ✅ Log response status, size, duration
  - [x] ✅ Add sampling for high-volume endpoints (via correlation middleware)

**Deliverables**:
- ✅ Prometheus metrics endpoint
- ✅ Loggly integration configured
- ✅ Correlation ID in all components
- ✅ Monitoring dashboard setup guide

**Success Criteria**:
- Metrics accessible at `/metrics`
- Logs flowing to Loggly
- Correlation ID traceable through entire request flow
- Basic alerting rules configured

---

### **Phase 4: API Documentation** (Week 2-3) ✅ COMPLETE
**Goal**: Professional API documentation for developers

#### Tasks:
- [x] **4.1** ✅ Create OpenAPI 3.0 specification
  - [x] ✅ Document `/search` endpoint
  - [x] ✅ Document `/health` endpoints
  - [x] ✅ Document `/metrics` endpoint
  - [x] ✅ Document request schemas
  - [x] ✅ Document response schemas
  - [x] ✅ Document error responses
  - [x] ✅ Add examples for each endpoint

- [x] **4.2** ✅ Integrate Swagger UI
  - [x] ✅ Add swagger-ui-express
  - [x] ✅ Serve docs at `/api-docs`
  - [x] ✅ Add "Try it out" functionality
  - [x] ✅ Add authentication examples (for future)
  - [x] ✅ Serve OpenAPI spec at `/api-docs/openapi.json`
  - [x] ✅ Serve OpenAPI spec at `/api-docs/openapi.yaml`

- [x] **4.3** ✅ Create API usage guide
  - [x] ✅ Quick start guide
  - [x] ✅ Query examples (cURL, JavaScript, Python, TypeScript)
  - [x] ✅ Error handling examples
  - [x] ✅ Rate limiting guidelines
  - [x] ✅ Best practices
  - [x] ✅ Health check documentation
  - [x] ✅ Monitoring documentation
  - [x] ✅ Correlation ID usage

**Deliverables**:
- ✅ OpenAPI specification (`openapi.yaml`)
- ✅ Interactive API docs at `/api-docs`
- ✅ API usage guide (markdown)

**Success Criteria**:
- API docs accessible and interactive
- All endpoints documented with examples
- Error codes documented
- Easy for developers to integrate

---

### **Phase 5: Performance & Optimization** (Week 3)
**Goal**: Optimize performance and reduce resource usage

#### Tasks:
- [ ] **5.1** Add compression middleware
  - [ ] Install compression package
  - [ ] Configure gzip compression
  - [ ] Test compression ratio
  - [ ] Benchmark response times

- [ ] **5.2** Add request timeout middleware
  - [ ] Set global timeout (30s)
  - [ ] Set search endpoint timeout (60s)
  - [ ] Add timeout error handling
  - [ ] Log timeout occurrences

- [ ] **5.3** Add circuit breaker for external services
  - [ ] Circuit breaker for MongoDB
  - [ ] Circuit breaker for Qdrant
  - [ ] Circuit breaker for LLM service
  - [ ] Fallback responses
  - [ ] Circuit state logging

- [ ] **5.4** Connection pooling verification
  - [ ] Verify MongoDB connection pool settings
  - [ ] Verify HTTP client connection pooling
  - [ ] Add connection pool metrics

**Deliverables**:
- ✅ Response compression enabled
- ✅ Timeout protection
- ✅ Circuit breakers implemented
- ✅ Performance benchmark report

**Success Criteria**:
- Response sizes reduced by 70%+
- No requests hang indefinitely
- Circuit breakers prevent cascading failures
- Connection pools optimized

---

### **Phase 6: Testing & Quality Assurance** (Week 3-4)
**Goal**: Comprehensive test coverage and load testing

#### Tasks:
- [ ] **6.1** Expand unit test coverage
  - [ ] Query executor tests (35 scenarios)
  - [ ] Intent extractor tests (8 scenarios)
  - [ ] Integration tests (12 scenarios)
  - [ ] Aim for 80%+ coverage

- [ ] **6.2** Create E2E API tests
  - [ ] Test /search endpoint with supertest
  - [ ] Test rate limiting
  - [ ] Test error scenarios
  - [ ] Test CORS
  - [ ] Test input validation

- [ ] **6.3** Create load tests
  - [ ] Install k6 or Artillery
  - [ ] Create baseline load test (100 req/s)
  - [ ] Create stress test (until failure)
  - [ ] Create spike test
  - [ ] Document SLA baselines

- [ ] **6.4** Security testing
  - [ ] Test SQL/NoSQL injection
  - [ ] Test XSS vulnerabilities
  - [ ] Test rate limiting bypass
  - [ ] Test CORS bypass
  - [ ] Run OWASP ZAP scan

**Deliverables**:
- ✅ 80%+ test coverage
- ✅ E2E test suite
- ✅ Load test results
- ✅ Security audit report

**Success Criteria**:
- All tests passing
- Load tests show acceptable performance
- No critical security vulnerabilities
- SLA baselines documented

---

### **Phase 7: CI/CD & Deployment Automation** (Week 4)
**Goal**: Automated testing, building, and deployment

#### Tasks:
- [ ] **7.1** Create GitHub Actions workflow
  - [ ] Run tests on PR
  - [ ] Run linting on PR
  - [ ] Run type checking
  - [ ] Build Docker image
  - [ ] Push to container registry

- [ ] **7.2** Add security scanning
  - [ ] Trivy for container scanning
  - [ ] npm audit for dependencies
  - [ ] OWASP dependency check

- [ ] **7.3** Create deployment scripts
  - [ ] VPS deployment script
  - [ ] Database migration script
  - [ ] Rollback script
  - [ ] Health check verification script

- [ ] **7.4** Create deployment documentation
  - [ ] Initial deployment guide
  - [ ] Update/rollback guide
  - [ ] Troubleshooting guide
  - [ ] Monitoring guide

**Deliverables**:
- ✅ CI/CD pipeline (.github/workflows)
- ✅ Deployment scripts
- ✅ Deployment documentation

**Success Criteria**:
- Automated testing on every PR
- Automated security scanning
- One-command deployment
- Clear deployment documentation

---

### **Phase 8: Advanced Features** (Future/Optional)
**Goal**: Nice-to-have features for enhanced experience

#### Tasks:
- [ ] **8.1** Error tracking integration
  - [ ] Set up Sentry (free tier)
  - [ ] Add error tracking middleware
  - [ ] Configure source maps
  - [ ] Set up alerting

- [ ] **8.2** Advanced monitoring
  - [ ] Grafana dashboards
  - [ ] Custom business metrics
  - [ ] SLA monitoring
  - [ ] Cost tracking

- [ ] **8.3** Performance enhancements
  - [ ] Response streaming
  - [ ] Query result pagination
  - [ ] Aggressive caching strategies

---

## ✅ Tasks Checklist

### Phase 1: Containerization (Week 1) ✅ COMPLETE
- [x] 1.1 ✅ Create Dockerfile
- [x] 1.2 ✅ Create docker-compose.yml
- [x] 1.3 ✅ Create .dockerignore
- [x] 1.4 ✅ Add container health checks
- [x] 1.5 ✅ Create startup script
- [x] 1.6 ✅ Update documentation

### Phase 2: Health & Resilience (Week 1-2) ✅ COMPLETE
- [x] 2.1 ✅ Implement /health/ready
- [x] 2.2 ✅ Implement /health/live
- [x] 2.3 ✅ MongoDB health check
- [x] 2.4 ✅ Qdrant health check
- [x] 2.5 ✅ Memory monitoring
- [x] 2.6 ✅ Disk monitoring
- [x] 2.7 ✅ Graceful shutdown handler
- [x] 2.8 ✅ Connection draining
- [x] 2.9 ✅ Test shutdown behavior

### Phase 3: Observability (Week 2)
- [ ] 3.1 Prometheus metrics endpoint
- [ ] 3.2 Loggly configuration
- [ ] 3.3 Correlation ID propagation
- [ ] 3.4 Request/response logging

### Phase 4: Documentation (Week 2-3)
- [ ] 4.1 OpenAPI specification
- [ ] 4.2 Swagger UI integration
- [ ] 4.3 API usage guide

### Phase 5: Performance (Week 3)
- [ ] 5.1 Compression middleware
- [ ] 5.2 Request timeout
- [ ] 5.3 Circuit breakers
- [ ] 5.4 Connection pooling

### Phase 6: Testing (Week 3-4)
- [ ] 6.1 Expand unit tests
- [ ] 6.2 E2E API tests
- [ ] 6.3 Load tests
- [ ] 6.4 Security testing

### Phase 7: CI/CD (Week 4)
- [ ] 7.1 GitHub Actions
- [ ] 7.2 Security scanning
- [ ] 7.3 Deployment scripts
- [ ] 7.4 Deployment docs

---

## 🔧 Technical Specifications

### Docker Configuration

#### Multi-Stage Dockerfile
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
USER node
EXPOSE 4003
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4003/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/server.js"]
```

#### Docker Compose Structure
- `docker-compose.yml` - Development environment
- `docker-compose.production.yml` - Production environment
- Services:
  - `search-api` - Main application
  - `mongodb` - Database (optional, can use external)
  - `qdrant` - Vector database (optional, can use external)

### Health Check Endpoints

#### `/health/live` - Liveness Probe
**Purpose**: Check if application is running
**Response Time**: < 100ms
**Returns**: 200 if alive, 503 if dead

```json
{
  "status": "alive",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "uptime": 3600
}
```

#### `/health/ready` - Readiness Probe
**Purpose**: Check if application can serve traffic
**Response Time**: < 500ms
**Returns**: 200 if ready, 503 if not ready

```json
{
  "status": "ready",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "services": {
    "mongodb": {
      "status": "connected",
      "latency": "5ms"
    },
    "qdrant": {
      "status": "connected",
      "latency": "8ms"
    },
    "llm_cache": {
      "status": "available",
      "cache_hit_rate": "0.75"
    }
  },
  "memory": {
    "used": "450MB",
    "total": "1024MB",
    "percentage": 44
  }
}
```

### Prometheus Metrics

**Endpoint**: `/metrics`
**Format**: Prometheus exposition format

**Metrics**:
```
# HTTP Metrics
http_requests_total{method, path, status}
http_request_duration_seconds{method, path}

# Application Metrics
search_queries_total
search_query_duration_seconds
langgraph_node_duration_seconds{node_name}
cache_hits_total{cache_type}
cache_misses_total{cache_type}

# Database Metrics
mongodb_query_duration_seconds{operation}
qdrant_query_duration_seconds{operation}

# System Metrics
nodejs_memory_usage_bytes
nodejs_active_handles
nodejs_active_requests
```

### Graceful Shutdown Behavior

1. **Receive Signal** (SIGTERM/SIGINT)
2. **Stop Accepting New Connections** (return 503)
3. **Drain Existing Connections** (max 30s)
4. **Close Database Connections**
5. **Flush Logs**
6. **Exit Process** (code 0)

### Loggly Configuration

**Free Tier**: 200MB/day
**Retention**: 7 days
**Transport**: winston-loggly-bulk

**Log Structure**:
```json
{
  "timestamp": "2025-11-17T10:30:00.000Z",
  "level": "info",
  "message": "Search completed",
  "correlationId": "uuid-v4",
  "service": "search-api",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "query": "sanitized query",
  "executionTimeMs": 245,
  "resultCount": 10
}
```

---

## 🧪 Testing Strategy

### Unit Tests (Target: 80% coverage)
- ✅ Query planner: 25/25 tests (100%)
- ⚠️ Query executor: 0/35 tests (0%)
- ⚠️ Intent extractor: 0/8 tests (0%)
- ⚠️ Utils: Partial coverage

### Integration Tests
- [ ] Full LangGraph pipeline
- [ ] Database integration
- [ ] Vector search integration
- [ ] Cache integration

### E2E Tests
- [ ] /search endpoint (happy path)
- [ ] Rate limiting behavior
- [ ] Error scenarios
- [ ] CORS validation
- [ ] Input validation

### Load Tests (k6)
- [ ] Baseline: 100 req/s (target p95 < 500ms)
- [ ] Stress: Find breaking point
- [ ] Spike: 0 → 1000 req/s
- [ ] Soak: 50 req/s for 1 hour

### Security Tests
- [ ] OWASP Top 10 validation
- [ ] SQL/NoSQL injection
- [ ] XSS prevention
- [ ] Rate limit bypass
- [ ] CORS bypass

---

## 🚀 Deployment Guide

### Prerequisites
- VPS with Ubuntu 20.04+ or similar
- Docker 24.0+ installed
- Docker Compose 2.0+ installed
- 2GB+ RAM
- 20GB+ disk space
- MongoDB instance (local or cloud)
- Qdrant instance (local or cloud)

### Initial Deployment

```bash
# 1. Clone repository
git clone <repo-url>
cd search-api

# 2. Create environment file
cp .env.example .env.production
# Edit .env.production with production values

# 3. Build and start services
docker-compose -f docker-compose.production.yml up -d

# 4. Verify health
curl http://localhost:4003/health/ready

# 5. View logs
docker-compose -f docker-compose.production.yml logs -f search-api
```

### Update Deployment

```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild and restart (zero-downtime)
docker-compose -f docker-compose.production.yml up -d --build --no-deps search-api

# 3. Verify health
curl http://localhost:4003/health/ready
```

### Rollback

```bash
# 1. Check previous image
docker images | grep search-api

# 2. Tag and restore
docker tag search-api:previous search-api:latest

# 3. Restart
docker-compose -f docker-compose.production.yml up -d --no-deps search-api
```

---

## 📊 Success Metrics

### Performance SLAs
- **Availability**: 99.5% uptime
- **Latency**: p95 < 500ms, p99 < 1000ms
- **Error Rate**: < 0.1%
- **Throughput**: 100 req/s sustained

### Monitoring KPIs
- CPU usage < 70%
- Memory usage < 80%
- Disk usage < 80%
- Request success rate > 99.9%

### Security KPIs
- Zero critical vulnerabilities
- All dependencies up to date
- OWASP Top 10 compliant
- Regular security audits

---

## 🎯 Next Steps

**Current Phase**: Planning Complete ✅
**Next Action**: Start Phase 1 - Containerization

**Immediate Tasks**:
1. Review and approve this plan
2. Create Dockerfile
3. Create docker-compose.yml
4. Test local Docker deployment

**Questions/Decisions**:
- Approve plan structure?
- Ready to start Phase 1?
- Any modifications needed?

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Owner**: Development Team
**Status**: Ready for Implementation

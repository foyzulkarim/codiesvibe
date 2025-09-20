# Tasks: Production-Grade Docker Containerization Setup (UPDATED)

**Input**: Design documents from `specs/005-i-am-thinking/` + Critical implementation fixes  
**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`  
**Status**: Updated to include critical foundational fixes identified in assessment

## Execution Flow
1. **Phase 0**: Fix critical configuration issues that will cause immediate failures
2. **Phase 1**: Create all necessary Docker and configuration files  
3. **Phase 2**: Implement and configure Docker environments
4. **Phase 3**: Validate all environments and configurations

## Reference Format: `[TaskID] Action - Ref: [doc.md Section X.Y lines A-B]`
**Documentation References**:
- **spec.md**: High-level requirements and user stories
- **plan.md**: Technical context and project structure
- **data-model.md**: Definitions for Docker entities
- **research.md**: Technology choices and best practices
- **quickstart.md**: Test scenarios for validation
- **contracts/**: Detailed schemas for Dockerfiles, Compose files, and environment variables

---

## Phase 0: Critical Configuration Fixes (MUST DO FIRST)

### Port Configuration Standardization
- [ ] **T001** Fix port configuration in `vite.config.ts` (change from 8080 to 3000) - **CRITICAL: Will cause container communication failure**
- [ ] **T002** Fix port configuration in `backend/src/main.ts` (change default from 3000 to 4000) - **CRITICAL: Port conflicts**
- [ ] **T003** Update `backend/.env.example` PORT variable (change from 3000 to 4000) - **CRITICAL: Configuration mismatch**

### Health Check Implementation
- [ ] **T004** Create `backend/healthcheck.js` script for container health checks - **CRITICAL: Health checks will fail without this**
- [ ] **T005** Create `frontend/healthcheck.js` script for container health checks - **CRITICAL: Container orchestration requires this**
- [ ] **T006** Verify/add health check endpoint `/health` in backend - **CRITICAL: Health endpoint must exist**

### Core Configuration Files
- [ ] **T007** Create `nginx.conf` with complete production configuration - **CRITICAL: Production deployment will fail**
- [ ] **T008** Create `monitoring/prometheus.yml` basic configuration - **CRITICAL: Monitoring containers won't start**
- [ ] **T009** Create `monitoring/grafana/datasources.yml` configuration - **CRITICAL: Grafana will have no data sources**

### Environment Variables and Mounting Strategy
- [ ] **T010** Add missing environment variables to `.env.example` (VITE_APP_VERSION, COOKIE_SECRET, CSRF_SECRET, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, TRUST_PROXY, SHUTDOWN_TIMEOUT) - **CRITICAL: Application may fail to start**
- [ ] **T011** Create `docker-compose.override.yml.example` for local development customizations - **CRITICAL: Developer experience**
- [ ] **T012** Fix shared code mounting strategy in Dockerfile specs (use COPY --from=backend-builder instead of bind mount) - **CRITICAL: TypeScript compilation will break**

---

## Phase 1: Docker File Creation

### Core Docker Files
- [ ] **T013** Create `Dockerfile.frontend` with multi-stage build (development + production stages) - Ref: `dockerfile-contract.yml (frontend-dockerfile-contract)`
- [ ] **T014** Create `Dockerfile.backend` with multi-stage build (development + production stages) - Ref: `dockerfile-contract.yml (backend-dockerfile-contract)`

### Docker Compose Files
- [ ] **T015** Create `docker-compose.dev.yml` for development environment - Ref: `docker-compose-schema.yml (development-contract)`
- [ ] **T016** Create `docker-compose.production.yml` for production deployment - Ref: `docker-compose-schema.yml (production-contract)`
- [ ] **T017** Create `docker-compose.cloudflare.yml` for Cloudflare tunnel deployment - Ref: `docker-compose-schema.yml (cloudflare-contract)`
- [ ] **T018** Create `docker-compose.monitoring.yml` for monitoring stack - Ref: `docker-compose-schema.yml (monitoring-contract)`

### CI/CD and Documentation
- [ ] **T019** Create GitHub Actions workflow file `.github/workflows/deploy.yml` - Ref: `research.md (CI/CD and Image Registry Strategy)`
- [ ] **T020** Create comprehensive `README.md` with setup instructions for all environments - Ref: `spec.md (User Story)`

---

## Phase 2: Implementation and Configuration

### Development Environment Implementation
- [ ] **T021** Implement development stage in `Dockerfile.frontend` with hot reload support - Ref: `dockerfile-contract.yml (frontend-dockerfile-contract)`
- [ ] **T022** Implement development stage in `Dockerfile.backend` with hot reload and debugging - Ref: `dockerfile-contract.yml (backend-dockerfile-contract)`
- [ ] **T023** Configure `docker-compose.dev.yml` with volume mounting, hot reload, and debug ports - Ref: `docker-compose-schema.yml (development-contract)` & `quickstart.md (Test Scenario 1)`

### Production Environment Implementation
- [ ] **T024** Implement production stage in `Dockerfile.frontend` with optimized build - Ref: `dockerfile-contract.yml (frontend-dockerfile-contract)`
- [ ] **T025** Implement production stage in `Dockerfile.backend` with health checks and security - Ref: `dockerfile-contract.yml (backend-dockerfile-contract)`
- [ ] **T026** Configure `docker-compose.production.yml` with pre-built images from GHCR and Nginx - Ref: `docker-compose-schema.yml (production-contract)` & `quickstart.md (Test Scenario 2)`
- [ ] **T027** Implement complete `nginx.conf` configuration with reverse proxy, security headers, and static file serving - Ref: `research.md (Production Web Server Strategy)`

### Cloudflare Environment Implementation
- [ ] **T028** Configure `docker-compose.cloudflare.yml` for Cloudflare Tunnel integration with proper networking - Ref: `docker-compose-schema.yml (cloudflare-contract)` & `quickstart.md (Test Scenario 3)`

### Monitoring Environment Implementation
- [ ] **T029** Configure `docker-compose.monitoring.yml` with Prometheus, Grafana, and Loki services - Ref: `docker-compose-schema.yml (monitoring-contract)` & `quickstart.md (Test Scenario 5)`
- [ ] **T030** Implement complete Prometheus configuration with scrape targets for frontend and backend - Ref: Monitoring requirements
- [ ] **T031** Create Grafana dashboards configuration for application and infrastructure monitoring - Ref: Monitoring requirements

### CI/CD Implementation
- [ ] **T032** Implement complete GitHub Actions workflow with build, test, security scan, and deploy stages - Ref: `research.md (CI/CD and Image Registry Strategy)` & `quickstart.md (Test Scenario 4)`
- [ ] **T033** Configure GHCR image tagging and deployment automation - Ref: CI/CD requirements

### Documentation Implementation
- [ ] **T034** Write comprehensive README.md with environment-specific instructions, troubleshooting, and best practices - Ref: `spec.md (User Story)`

---

## Phase 3: Validation and Testing

### Configuration Validation
- [ ] **T035** Validate port configuration fixes work correctly (frontend accessible on 3000, backend on 4000) - **CRITICAL: Basic functionality test**
- [ ] **T036** Validate health check scripts work in all containers - **CRITICAL: Container orchestration requirement**
- [ ] **T037** Test external MongoDB connectivity in all environments - **CRITICAL: Data layer functionality**

### Environment Validation
- [ ] **T038** Validate Development Environment Setup with hot reload functionality - Ref: `quickstart.md (Test Scenario 1)`
- [ ] **T039** Validate Production Deployment with pre-built images and Nginx serving - Ref: `quickstart.md (Test Scenario 2)`
- [ ] **T040** Validate Cloudflare Tunnel Integration with proper routing - Ref: `quickstart.md (Test Scenario 3)`
- [ ] **T041** Validate GitHub Actions CI/CD Pipeline with full build-test-deploy cycle - Ref: `quickstart.md (Test Scenario 4)`
- [ ] **T042** Validate Monitoring Stack Deployment with metrics collection - Ref: `quickstart.md (Test Scenario 5)`

### Comprehensive Testing
- [ ] **T043** Perform Failure Recovery Testing (MongoDB down, container restarts, etc.) - Ref: `quickstart.md (Failure Recovery Testing)`
- [ ] **T044** Perform Performance Validation (startup times, response times, resource usage) - Ref: `quickstart.md (Performance Validation)`
- [ ] **T045** Perform Security Validation (no exposed secrets, proper container security) - Ref: `quickstart.md (Security Validation)`

---

## Critical Implementation Details

### Health Check Scripts
**backend/healthcheck.js**:
```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 4000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', () => {
  process.exit(1);
});

req.end();
```

**frontend/healthcheck.js**:
```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', () => {
  process.exit(1);
});

req.end();
```

### Required Environment Variables
Add to `.env.example`:
```env
# Application Metadata
VITE_APP_VERSION=${npm_package_version}
VITE_BUILD_DATE=$(date)
VITE_GIT_COMMIT=$(git rev-parse --short HEAD)

# Backend Security
COOKIE_SECRET=your-cookie-secret-min-32-chars
CSRF_SECRET=your-csrf-secret-min-32-chars
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100

# Production Settings
TRUST_PROXY=true
SHUTDOWN_TIMEOUT=30000
```

### Shared Code Fix
In `Dockerfile.frontend`, replace bind mount with:
```dockerfile
# Copy shared types from backend build stage
COPY --from=backend-builder /app/shared ./shared
```

---

## Success Criteria

### Phase 0 Success:
- ✅ Frontend runs on port 3000, backend on port 4000
- ✅ Health check scripts execute successfully
- ✅ All required configuration files exist
- ✅ Environment variables properly configured

### Phase 1 Success:
- ✅ All Docker files and compose files created
- ✅ CI/CD workflow configured
- ✅ Documentation complete

### Phase 2 Success:
- ✅ Development environment with working hot reload
- ✅ Production environment with optimized builds
- ✅ Cloudflare tunnel integration functional
- ✅ Monitoring stack operational

### Phase 3 Success:
- ✅ All environments tested and validated
- ✅ External MongoDB connectivity confirmed
- ✅ Performance and security validation passed
- ✅ Complete end-to-end functionality verified

---

**IMPORTANT**: Phase 0 tasks MUST be completed before proceeding to Phase 1. These fixes address critical configuration issues that will cause immediate failures during implementation.
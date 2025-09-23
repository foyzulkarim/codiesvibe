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
- [x] **T001** Fix port configuration in `vite.config.ts` (change from 8080 to 3000) - **CRITICAL: Will cause container communication failure**
- [x] **T002** Fix port configuration in `backend/src/main.ts` (change default from 3000 to 4000) - **CRITICAL: Port conflicts**
- [x] **T003** Update `backend/.env.example` PORT variable (change from 3000 to 4000) - **CRITICAL: Configuration mismatch**

### Health Check Implementation
- [x] **T004** Create `backend/healthcheck.js` script for container health checks - **CRITICAL: Health checks will fail without this**
- [x] **T005** Create `frontend/healthcheck.js` script for container health checks - **CRITICAL: Container orchestration requires this**
- [x] **T006** Verify/add health check endpoint `/health` in backend - **CRITICAL: Health endpoint must exist**

### Core Configuration Files
- [x] **T007** Create `nginx.conf` with complete production configuration - **CRITICAL: Production deployment will fail**
- [x] **T008** Create `monitoring/prometheus.yml` basic configuration - **CRITICAL: Monitoring containers won't start**
- [x] **T009** Create `monitoring/grafana/datasources.yml` configuration - **CRITICAL: Grafana will have no data sources**

### Environment Variables and Mounting Strategy
- [x] **T010** Add missing environment variables to `.env.example` (VITE_APP_VERSION, COOKIE_SECRET, CSRF_SECRET, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, TRUST_PROXY, SHUTDOWN_TIMEOUT) - **CRITICAL: Application may fail to start**
- [x] **T011** Create `docker-compose.override.yml.example` for local development customizations - **CRITICAL: Developer experience**
- [x] **T012** Fix shared code mounting strategy in Dockerfile specs (use COPY --from=backend-builder instead of bind mount) - **CRITICAL: TypeScript compilation will break**

---

## Phase 0.5: Development Infrastructure Setup

### Comprehensive Infrastructure Stack
- [x] **T046** Create `docker-compose.infra.yml` for comprehensive development infrastructure - **COMPLETED: Single-command startup for MongoDB, Redis, Prometheus, Grafana, Loki, Mongo Express, MailHog**
- [x] **T047** Create `scripts/mongo-init.js` for MongoDB initialization with sample data - **COMPLETED: Database seeding with development data**
- [x] **T048** Create `monitoring/loki-config.yml` for log aggregation configuration - **COMPLETED: Centralized logging setup**
- [x] **T049** Create `monitoring/grafana/dashboards/dashboard.yml` for dashboard provisioning - **COMPLETED: Automated dashboard configuration**
- [x] **T050** Create `README-infra.md` with infrastructure setup and usage instructions - **COMPLETED: Complete documentation for infrastructure stack**

### Foundation Integration (Added for Complete Phase 1 Readiness)
- [x] **T051** Verify and document network naming strategy for Phase 1 integration - **CRITICAL: Ensure consistent networking across all compose files**
- [x] **T052** Update `backend/.env.example` with infrastructure connection strings (MongoDB, Redis, monitoring endpoints) - **CRITICAL: Align connection strings with infrastructure services**  
- [x] **T053** Create port allocation documentation to prevent conflicts - **CRITICAL: Avoid port collisions between infra and application**
- [x] **T054** Update main `CLAUDE.md` with infrastructure setup references - Documentation consistency
- [x] **T055** Add infrastructure integration notes to T015 (dev), T016 (production), T017 (Cloudflare), T018 (monitoring) compose file tasks - **CRITICAL: Clear guidance for infrastructure connectivity in specific Phase 1 tasks**

### Infrastructure Features
✅ **Single Command Startup**: `docker-compose -f docker-compose.infra.yml up -d`  
✅ **Core Services**: MongoDB with initialization, Redis for caching  
✅ **Monitoring Stack**: Prometheus metrics, Grafana dashboards, Loki logging  
✅ **Development Tools**: Mongo Express (DB admin), MailHog (email testing)  
✅ **Health Checks**: All services include health monitoring  
✅ **Data Persistence**: Volumes for MongoDB, Prometheus, Grafana data  
✅ **Network Isolation**: Dedicated `infra-network` for service communication  

**Usage**: This infrastructure stack provides all supporting services needed for development. It complements the main application containers and can be used alongside any of the docker-compose files in Phase 1.

---

## Phase 1: Docker File Creation

### Core Docker Files
- [x] **T013** Create `Dockerfile.frontend` with multi-stage build (development + production stages) - Ref: `dockerfile-contract.yml (frontend-dockerfile-contract)`
- [x] **T014** Create `Dockerfile.backend` with multi-stage build (development + production stages) - Ref: `dockerfile-contract.yml (backend-dockerfile-contract)`

### Docker Compose Files
- [x] **T015** Create `docker-compose.dev.yml` for development environment - Ref: `docker-compose-schema.yml (development-contract)` | **INFRASTRUCTURE INTEGRATION**: Must use external network `codiesvibe-network`, connect to infrastructure services (mongodb:27017, redis:6379), use ports 3000/4000 per allocation docs
- [x] **T016** Create `docker-compose.production.yml` for production deployment - Ref: `docker-compose-schema.yml (production-contract)` | **INFRASTRUCTURE INTEGRATION**: Must use external network `codiesvibe-network`, connect to monitoring stack (prometheus:9090, loki:3100), use nginx on port 80/443 per allocation docs
- [x] **T017** Create `docker-compose.cloudflare.yml` for Cloudflare tunnel deployment - Ref: `docker-compose-schema.yml (cloudflare-contract)` | **INFRASTRUCTURE INTEGRATION**: Must use external network `codiesvibe-network`, connect to monitoring services, no host port exposure (tunnel-only) per allocation docs
- [x] **T018** Create `docker-compose.monitoring.yml` for monitoring stack - Ref: `docker-compose-schema.yml (monitoring-contract)` | **INFRASTRUCTURE INTEGRATION**: Must use external network `codiesvibe-network`, extend existing infrastructure monitoring, use offset ports (3002, 9093, 9100) per allocation docs

### CI/CD and Documentation
- [x] **T019** Create GitHub Actions workflow file `.github/workflows/deploy.yml` - Ref: `research.md (CI/CD and Image Registry Strategy)`
- [x] **T020** Create comprehensive `README.md` with setup instructions for all environments - Ref: `spec.md (User Story)`

### Phase 1 Infrastructure Integration Requirements

**All Phase 1 compose files (T015-T018) must implement the following infrastructure integration patterns:**

#### Network Configuration
```yaml
networks:
  codiesvibe-network:
    external: true
    name: codiesvibe-network
```

#### Service Network Assignment
```yaml
services:
  frontend:
    networks:
      - codiesvibe-network
  backend:
    networks:
      - codiesvibe-network
```

#### Environment Variables (Reference backend/.env.example)
- **MongoDB**: `mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin`
- **Redis**: `redis://:redis123@redis:6379`
- **Monitoring**: `prometheus:9090`, `grafana:3000`, `loki:3100`

#### Port Allocation (Reference docs/PORT-ALLOCATION.md)
- **T015 (Dev)**: Frontend 3000, Backend 4000, Debug 9229
- **T016 (Prod)**: Nginx 80/443, internal services no host exposure
- **T017 (Cloudflare)**: No host ports, tunnel-only access
- **T018 (Monitoring)**: Offset ports 3002, 9093, 9100

#### Documentation References
- **Network Strategy**: `docs/NETWORK-STRATEGY.md`
- **Port Allocation**: `docs/PORT-ALLOCATION.md`
- **Infrastructure Setup**: `README-infra.md`
- **Environment Config**: `backend/.env.example`

---

## Phase 2: Implementation and Configuration

### Development Environment Implementation
- [x] **T021** Implement development stage in `Dockerfile.frontend` with hot reload support - Ref: `dockerfile-contract.yml (frontend-dockerfile-contract)` - **COMPLETED: Multi-stage build with Vite HMR, hot reload, and debugging support**
- [x] **T022** Implement development stage in `Dockerfile.backend` with hot reload and debugging - Ref: `dockerfile-contract.yml (backend-dockerfile-contract)` - **COMPLETED: Hot reload with nodemon, debugging port 9229, development tools**
- [x] **T023** Configure `docker-compose.dev.yml` with volume mounting, hot reload, and debug ports - Ref: `docker-compose-schema.yml (development-contract)` & `quickstart.md (Test Scenario 1)` - **COMPLETED: Volume mounts, HMR, debug ports, infrastructure integration**

### Production Environment Implementation
- [x] **T024** Implement production stage in `Dockerfile.frontend` with optimized build - Ref: `dockerfile-contract.yml (frontend-dockerfile-contract)` - **COMPLETED: Optimized multi-stage build, static file serving, security hardening**
- [x] **T025** Implement production stage in `Dockerfile.backend` with health checks and security - Ref: `dockerfile-contract.yml (backend-dockerfile-contract)` - **COMPLETED: Health checks, security hardening, non-root execution, capability restrictions**
- [x] **T026** Configure `docker-compose.production.yml` with pre-built images from GHCR and Nginx - Ref: `docker-compose-schema.yml (production-contract)` & `quickstart.md (Test Scenario 2)` - **COMPLETED: GHCR integration, Nginx reverse proxy, production security**
- [x] **T027** Implement complete `nginx.conf` configuration with reverse proxy, security headers, and static file serving - Ref: `research.md (Production Web Server Strategy)` - **COMPLETED: Enterprise-grade Nginx with security headers, rate limiting, caching, SPA support**

### Cloudflare Environment Implementation
- [x] **T028** Configure `docker-compose.cloudflare.yml` for Cloudflare Tunnel integration with proper networking - Ref: `docker-compose-schema.yml (cloudflare-contract)` & `quickstart.md (Test Scenario 3)` - **COMPLETED: Zero-port exposure, tunnel authentication, security hardening, GHCR integration**

### Monitoring Environment Implementation
- [x] **T029** Configure `docker-compose.monitoring.yml` with Prometheus, Grafana, and Loki services - Ref: `docker-compose-schema.yml (monitoring-contract)` & `quickstart.md (Test Scenario 5)` - **COMPLETED: Extended monitoring stack with AlertManager, Node Exporter, offset ports**
- [x] **T030** Implement complete Prometheus configuration with scrape targets for frontend and backend - Ref: Monitoring requirements - **COMPLETED: Complete scrape configuration for all services, health monitoring, metrics collection**
- [x] **T031** Create Grafana dashboards configuration for application and infrastructure monitoring - Ref: Monitoring requirements - **COMPLETED: Automated dashboard provisioning, datasource configuration, SLI/SLO dashboards**

### CI/CD Implementation
- [x] **T032** Implement complete GitHub Actions workflow with build, test, security scan, and deploy stages - Ref: `research.md (CI/CD and Image Registry Strategy)` & `quickstart.md (Test Scenario 4)` - **COMPLETED: Separate frontend/backend pipelines, comprehensive testing, security scanning, multi-platform builds**
- [x] **T033** Configure GHCR image tagging and deployment automation - Ref: CI/CD requirements - **COMPLETED: Advanced tagging strategy, automated cleanup, multi-platform support, OCI metadata**

### Documentation Implementation
- [x] **T034** Write comprehensive README.md with environment-specific instructions, troubleshooting, and best practices - Ref: `spec.md (User Story)` - **COMPLETED: Comprehensive documentation with architecture diagrams, multi-environment guides, troubleshooting, quick reference**

---

## Phase 3: Validation and Testing (Human-Led Validation)

**Note**: Phase 3 is primarily human-driven validation work. Execute these tests to verify the Docker implementation works correctly.

### Configuration Validation
- [x] **T035** Validate port configuration fixes work correctly (frontend accessible on 3000, backend on 4000) - **CRITICAL: Basic functionality test**
```bash
# Start development environment
docker-compose -f docker-compose.infra.yml up -d
docker-compose -f docker-compose.dev.yml up -d

# Test accessibility
curl http://localhost:3000      # Frontend
curl http://localhost:4000/health      # Backend
# Expected: Both respond successfully
```

- [x] **T036** Validate health check scripts work in all containers - **CRITICAL: Container orchestration requirement**
```bash
# Check all infrastructure services
docker-compose -f docker-compose.infra.yml ps

# Check development services ```bash
# Check container health status
docker-compose -f docker-compose.infra.yml ps
docker-compose -f docker-compose.dev.yml ps

# Test backend health script directly
docker exec codiesvibe-backend-dev node /app/healthcheck.js
# Expected: Backend shows "healthy" status and script outputs HEALTHY message
```

- [ ] **T037** ~~Test external MongoDB connectivity in all environments~~ - **REMOVED: Backend health endpoint covers database connectivity**

### Environment Validation
- [x] **T038** Validate Development Environment Setup with hot reload functionality - Ref: `quickstart.md (Test Scenario 1)`
```bash
# Start and test hot reload
docker-compose -f docker-compose.dev.yml up -d

# Make a small change to frontend/src/App.tsx
# Expected: Browser auto-refreshes

# Make a change to backend/src/main.ts  
# Expected: Server restarts automatically
```

- [ ] **T039** Validate Production Deployment with pre-built images and Nginx serving - Ref: `quickstart.md (Test Scenario 2)`
```bash
# Start production with infrastructure
docker-compose -f docker-compose.infra.yml up -d
docker-compose -f docker-compose.production.yml up -d

# Test Nginx serving
curl http://localhost/health
curl http://localhost/api/health
# Expected: Nginx serves frontend, proxies backend correctly
```

- [ ] **T040** Validate Cloudflare Tunnel Integration with proper routing - Ref: `quickstart.md (Test Scenario 3)`
```bash
# Prerequisites: Get Cloudflare tunnel token
# Set CLOUDFLARE_TUNNEL_TOKEN in .env.cloudflare

docker-compose -f docker-compose.cloudflare.yml up -d

# Check tunnel logs
docker-compose -f docker-compose.cloudflare.yml logs cloudflared
# Expected: "Registered tunnel connection" messages
```

- [ ] **T041** Validate GitHub Actions CI/CD Pipeline with full build-test-deploy cycle - Ref: `quickstart.md (Test Scenario 4)`
```bash
# Push to branch or create PR
git push origin your-branch

# Check GitHub Actions tab
# Expected: 
# - Frontend pipeline runs for frontend changes
# - Backend pipeline runs for backend changes
# - Images pushed to GHCR successfully
```

- [ ] **T042** Validate Monitoring Stack Deployment with metrics collection - Ref: `quickstart.md (Test Scenario 5)`
```bash
# Start monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
open http://localhost:3002  # Extended Grafana
open http://localhost:9091  # Extended Prometheus
# Expected: Dashboards load with metrics data
```

### Comprehensive Testing
- [ ] **T043** Perform Failure Recovery Testing (MongoDB down, container restarts, etc.) - Ref: `quickstart.md (Failure Recovery Testing)`
```bash
# Test database failure
docker-compose -f docker-compose.infra.yml stop mongodb
# Expected: Backend handles gracefully, reconnects when DB returns

# Test container restart
docker restart codiesvibe-backend-dev
# Expected: Health checks pass after restart
```

- [ ] **T044** Perform Performance Validation (startup times, response times, resource usage) - Ref: `quickstart.md (Performance Validation)`
```bash
# Measure startup times
time docker-compose -f docker-compose.dev.yml up -d

# Test response times
curl -w "%{time_total}" http://localhost:3000/
curl -w "%{time_total}" http://localhost:4000/health
# Expected: Frontend <3s, Backend <1s startup
```

- [ ] **T045** Perform Security Validation (no exposed secrets, proper container security) - Ref: `quickstart.md (Security Validation)`
```bash
# Check for exposed secrets
docker-compose config | grep -i "password\|secret\|token"

# Verify non-root execution
docker exec codiesvibe-backend-dev whoami
# Expected: No secrets in config, containers run as 'nodejs'
```

### Quick Validation Commands
```bash
# Health check all environments
./health-check.sh  # (from README.md)

# Resource usage check
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Network connectivity test
docker network ls | grep codiesvibe
```

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
**Problem**: Bind mounting `./backend/shared` would break TypeScript compilation in containers.

**Solution**: Use multi-stage build with COPY from backend builder stage.

In `Dockerfile.frontend`, use this approach:
```dockerfile
# Copy shared types from backend build stage (not bind mount)
COPY --from=backend-builder /app/shared ./shared
```

**Implementation Notes for Phase 1**:
- Backend Dockerfile must have a named stage: `FROM node:18-alpine AS backend-builder`
- Shared code must be built/compiled in backend stage first
- Frontend stage can then copy the compiled shared code
- This ensures TypeScript compilation works correctly in containers

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

### Phase 2 Success: ✅ **COMPLETED**
- ✅ Development environment with working hot reload (T021-T023)
- ✅ Production environment with optimized builds (T024-T027)
- ✅ Cloudflare tunnel integration functional (T028)
- ✅ Monitoring stack operational (T029-T031)
- ✅ CI/CD pipelines with advanced automation (T032-T033)
- ✅ Comprehensive documentation complete (T034)

### Phase 3 Success:
- ✅ All environments tested and validated
- ✅ External MongoDB connectivity confirmed
- ✅ Performance and security validation passed
- ✅ Complete end-to-end functionality verified

---

**IMPORTANT**: Phase 0 tasks MUST be completed before proceeding to Phase 1. These fixes address critical configuration issues that will cause immediate failures during implementation.

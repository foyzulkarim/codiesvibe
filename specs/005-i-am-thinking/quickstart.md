# Quickstart: Docker Containerization Setup

**Date**: 2025-09-16
**Feature**: Production-Grade Docker Containerization Setup
**Purpose**: Validate implementation through user scenario testing

## Prerequisites Validation

Before starting, verify these requirements are met:

### System Requirements
- [ ] Docker Engine 20.10+ installed
- [ ] Docker Compose 2.0+ installed
- [ ] Node.js 18+ (for local development)
- [ ] Git (for repository access)

### External Dependencies
- [ ] MongoDB instance accessible (external, not containerized)
- [ ] MongoDB connection string available
- [ ] Domain name configured (for production SSL)
- [ ] Cloudflare account setup (for Cloudflare deployment)

### Access Requirements
- [ ] Docker daemon running and accessible
- [ ] Network ports 80, 443, 3000, 3001 available
- [ ] Firewall configured for container communication
- [ ] SSL certificate email address available

## Test Scenario 1: Development Environment Setup

**Objective**: Validate hot reload development environment with external MongoDB

### Steps
1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd codiesvibe
   git checkout 005-i-am-thinking
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with:
   # MONGODB_URI=mongodb://your-mongo-host:27017/codiesvibe_dev
   # JWT_SECRET=your-development-secret-key
   # CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token
   ```

3. **Start Development Environment**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. **Verification Tests**
   - [ ] Frontend accessible at http://localhost:3000 (Vite dev server)
   - [ ] Backend accessible at http://localhost:4000
   - [ ] Debug port accessible at http://localhost:9229
   - [ ] Hot reload works (edit frontend file, see changes)
   - [ ] API calls from frontend to backend work (VITE_API_URL=http://localhost:4000)
   - [ ] MongoDB connection established
   - [ ] Container logs show no errors

5. **Expected Results**
   - Services start within 30 seconds
   - Hot reload triggers on file changes
   - Health checks pass for all services
   - External MongoDB connectivity confirmed

### Troubleshooting Checkpoints
- [ ] MongoDB connection string format correct
- [ ] Ports not conflicting with existing services
- [ ] Docker daemon running and accessible
- [ ] File permissions allow bind mounts

## Test Scenario 2: Production Deployment with Pre-built Images

**Objective**: Validate production deployment using GitHub Container Registry images

### Steps
1. **Production Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with:
   # MONGODB_URI=mongodb://prod-mongo-host:27017/codiesvibe
   # JWT_SECRET=secure-production-secret-64-chars-minimum
   # CLOUDFLARE_TUNNEL_TOKEN=your-production-tunnel-token
   # FRONTEND_IMAGE=ghcr.io/username/repo-frontend:latest
   # BACKEND_IMAGE=ghcr.io/username/repo-backend:latest
   ```

2. **Deploy Production Stack**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

3. **Service Health Verification**
   ```bash
   # Wait for services to start (30-60 seconds)
   docker-compose logs backend | grep -i health
   curl -f http://localhost:4000/health
   curl -f http://localhost:3000/health
   ```

4. **Verification Tests**
   - [ ] Frontend accessible through Cloudflare tunnel
   - [ ] Backend API accessible through tunnel
   - [ ] Health checks pass for both services
   - [ ] Nginx serves static files with compression
   - [ ] Security headers properly configured
   - [ ] MongoDB connection established
   - [ ] Container images pulled from GitHub Container Registry

5. **Expected Results**
   - Services start using pre-built images
   - No local building required
   - Cloudflare tunnel provides external access
   - Health endpoints return 200 OK

### Troubleshooting Checkpoints
- [ ] Domain DNS pointing to server IP
- [ ] Ports 80/443 open and accessible
- [ ] Email address valid for Let's Encrypt
- [ ] Docker networks properly configured

## Test Scenario 3: Cloudflare Tunnel Integration

**Objective**: Validate Cloudflare tunnel deployment without exposed ports

### Steps
1. **Cloudflare Setup**
   ```bash
   # Get tunnel token from Cloudflare dashboard
   export TUNNEL_TOKEN=<your-cloudflare-tunnel-token>
   ```

2. **Configure Cloudflare Environment**
   ```bash
   cp .env.example .env.cloudflare
   # Edit with Cloudflare-specific settings
   ```

3. **Deploy with Cloudflare**
   ```bash
   docker-compose -f docker-compose.cloudflare.yml up -d
   ```

4. **Verification Tests**
   - [ ] Services accessible through Cloudflare tunnel
   - [ ] No direct port exposure required
   - [ ] Cloudflared tunnel connected
   - [ ] SSL handled by Cloudflare
   - [ ] Internal service communication works

5. **Expected Results**
   - Zero port forwarding configuration needed
   - Services accessible via Cloudflare domain
   - Automatic SSL through Cloudflare
   - Enhanced security with hidden origin

### Troubleshooting Checkpoints
- [ ] Tunnel token valid and active
- [ ] Cloudflare DNS configured correctly
- [ ] Internal networking allows service communication
- [ ] Cloudflared container healthy

## Test Scenario 4: GitHub Actions CI/CD Pipeline

**Objective**: Validate automated build and deployment pipeline

### Steps
1. **GitHub Actions Setup**
   ```bash
   # Ensure .github/workflows/deploy.yml exists
   # Configure repository secrets:
   # - VPS_SSH_KEY (private SSH key)
   # - VPS_HOST (server IP/domain)
   # - VPS_USER (SSH username)
   ```

2. **Trigger CI/CD Pipeline**
   ```bash
   # Push to main branch triggers the workflow
   git push origin main
   ```

3. **Monitor Pipeline**
   ```bash
   # Check GitHub Actions tab for:
   # 1. Test stage (frontend/backend tests + linting)
   # 2. Build stage (Docker images + push to ghcr.io)
   # 3. Deploy stage (SSH deployment to VPS)
   ```

4. **Verification Tests**
   - [ ] All tests pass in CI environment
   - [ ] Docker images built and pushed to ghcr.io
   - [ ] SSH deployment to VPS successful
   - [ ] Health checks pass after deployment
   - [ ] Zero-downtime deployment achieved
   - [ ] Old images cleaned up automatically

5. **Expected Results**
   - Complete automation from code push to deployment
   - Automatic image tagging with commit SHA
   - Health verification before deployment completion
   - Rollback capability with previous image tags

## Test Scenario 5: Monitoring Stack Deployment

**Objective**: Validate comprehensive observability setup

### Steps
1. **Deploy Monitoring Stack**
   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. **Configure Dashboards**
   ```bash
   # Wait for services to initialize
   sleep 30

   # Verify Prometheus targets
   curl http://localhost:9090/api/v1/targets

   # Access Grafana
   open http://localhost:3000
   ```

3. **Verification Tests**
   - [ ] Prometheus collecting metrics
   - [ ] Grafana dashboards accessible
   - [ ] Loki aggregating logs
   - [ ] Application metrics visible
   - [ ] Container metrics tracked
   - [ ] Alert rules configured

4. **Expected Results**
   - Complete observability stack running
   - Metrics collection active
   - Log aggregation functional
   - Dashboards showing data

## Failure Recovery Testing

### MongoDB Connection Failure
1. **Simulate MongoDB Unavailable**
   ```bash
   # Stop external MongoDB or use invalid connection string
   ```

2. **Expected Behavior**
   - [ ] Containers fail to start
   - [ ] Clear error messages displayed
   - [ ] No partial startup state
   - [ ] Health checks fail appropriately

### Environment Variable Misconfiguration
1. **Test Invalid Configuration**
   ```bash
   # Use invalid MONGODB_URI format
   # Missing required environment variables
   ```

2. **Expected Behavior**
   - [ ] Validation errors displayed
   - [ ] Containers don't start
   - [ ] Helpful error messages
   - [ ] No security information leaked

### SSL Certificate Issues
1. **Test Certificate Problems**
   ```bash
   # Invalid email for Let's Encrypt
   # DNS misconfiguration
   ```

2. **Expected Behavior**
   - [ ] Certificate acquisition fails gracefully
   - [ ] Error messages indicate DNS/email issues
   - [ ] Services don't start in insecure mode
   - [ ] Retry mechanism attempts renewal

## Performance Validation

### Development Performance
- [ ] Hot reload response time < 2 seconds
- [ ] Initial container startup < 30 seconds
- [ ] File watch system working correctly
- [ ] Debug port accessible

### Production Performance
- [ ] SSL handshake time < 1 second
- [ ] Health check response time < 500ms
- [ ] Container startup time < 20 seconds
- [ ] Memory usage within expected limits

## Security Validation

### Container Security
- [ ] Services run as non-root users
- [ ] No unnecessary capabilities granted
- [ ] Read-only file systems where possible
- [ ] Network isolation properly configured

### SSL/TLS Security
- [ ] SSL Labs A+ rating achieved
- [ ] HSTS headers present
- [ ] Secure cipher suites only
- [ ] Certificate chain valid

### Secrets Management
- [ ] No secrets in environment variables
- [ ] Docker secrets properly configured
- [ ] Secret rotation capability verified
- [ ] Access logging for secrets

## Cleanup Procedures

### Development Cleanup
```bash
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f
```

### Production Cleanup
```bash
docker-compose -f docker-compose.yml down
# Preserve volumes for SSL certificates
```

### Complete Reset
```bash
# Warning: This removes all Docker data
docker system prune -a --volumes
```

## Success Criteria

All test scenarios must pass with the following criteria:

1. **Functionality**: All services start and communicate properly
2. **Security**: SSL certificates valid, secrets protected
3. **Performance**: Startup times meet targets
4. **Reliability**: Health checks pass, restart policies work
5. **Observability**: Monitoring and logging functional
6. **Documentation**: Clear error messages and troubleshooting guides

## Next Steps

After successful quickstart validation:

1. Review monitoring dashboards and alerts
2. Test backup and recovery procedures
3. Validate CI/CD integration
4. Perform load testing
5. Security penetration testing
6. Documentation review and updates
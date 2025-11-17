# Search API - Deployment Guide

**Version**: 1.0
**Last Updated**: November 17, 2025
**Target**: VPS Deployment with Docker Compose

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Deployment](#initial-deployment)
3. [Configuration](#configuration)
4. [Deployment Process](#deployment-process)
5. [Update Deployment](#update-deployment)
6. [Rollback Procedure](#rollback-procedure)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)
10. [Security Considerations](#security-considerations)

---

## Prerequisites

### Server Requirements

- **Operating System**: Ubuntu 20.04+ or CentOS 8+
- **CPU**: 2 cores minimum (4 cores recommended)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 20GB minimum (50GB recommended)
- **Network**: Public IP address with ports 80/443 accessible

### Software Requirements

**Required**:
- Docker 24.0+
- Docker Compose 2.0+
- Git 2.30+
- SSH access with sudo privileges

**Optional**:
- Nginx (if using reverse proxy)
- Certbot (for SSL/TLS certificates)
- Monitoring tools (Prometheus, Grafana)

### External Services

**Required**:
- MongoDB instance (local or cloud)
  - Version: 7.0+
  - Storage: 10GB minimum
  - Recommended: MongoDB Atlas free tier or dedicated instance

- Qdrant instance (local or cloud)
  - Version: 1.5+
  - Storage: 5GB minimum for vector embeddings

**Optional**:
- Loggly account (free tier for centralized logging)
- Container registry (GitHub Container Registry, Docker Hub)

### Network Configuration

**Required Ports**:
- `4003`: Search API (internal)
- `80`: HTTP (if using reverse proxy)
- `443`: HTTPS (if using reverse proxy)

**Firewall Rules**:
```bash
# Allow SSH (port 22)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (if using reverse proxy)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

---

## Initial Deployment

### Step 1: Install Docker

```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify Docker installation
docker --version
docker compose version

# Add your user to docker group (optional, for running without sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Prepare Deployment Directory

```bash
# Create deployment directory
sudo mkdir -p /opt/search-api
sudo chown $USER:$USER /opt/search-api

# Navigate to deployment directory
cd /opt/search-api

# Clone repository
git clone https://github.com/your-org/search-api.git .

# Or for private repositories:
# git clone https://YOUR_GITHUB_TOKEN@github.com/your-org/search-api.git .
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env.production

# Edit environment file
nano .env.production
```

**Environment Variables**:

```env
# ============================================================================
# Application Configuration
# ============================================================================
NODE_ENV=production
PORT=4003

# ============================================================================
# Database Configuration
# ============================================================================

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/toolsearch?retryWrites=true&w=majority
MONGODB_DB_NAME=toolsearch
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2

# Qdrant Configuration
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_COLLECTION_NAME=tools

# ============================================================================
# LLM Configuration
# ============================================================================
LLM_PROVIDER=openai  # or 'ollama', 'together'

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4

# Ollama Configuration (if using Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Together AI Configuration (if using Together)
TOGETHER_API_KEY=your-together-api-key
TOGETHER_MODEL=togethercomputer/llama-2-70b

# ============================================================================
# Security Configuration
# ============================================================================

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW=900000        # 15 minutes in ms
RATE_LIMIT_MAX=100              # Max requests per window
SEARCH_RATE_LIMIT_WINDOW=60000  # 1 minute in ms
SEARCH_RATE_LIMIT_MAX=30        # Max search requests per minute

# ============================================================================
# Logging Configuration
# ============================================================================

# Winston Log Level
LOG_LEVEL=info  # debug, info, warn, error

# Loggly Configuration (optional)
LOGGLY_TOKEN=your-loggly-token
LOGGLY_SUBDOMAIN=your-subdomain
LOGGLY_TAGS=search-api,production
LOGGLY_ENABLED=true

# ============================================================================
# Monitoring Configuration
# ============================================================================

# Prometheus Metrics
METRICS_ENABLED=true

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=5000  # Health check timeout in ms

# ============================================================================
# Performance Configuration
# ============================================================================

# Request Timeouts
GLOBAL_TIMEOUT=30000  # Global timeout in ms
SEARCH_TIMEOUT=60000  # Search timeout in ms

# Circuit Breaker Configuration
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_THRESHOLD=50  # Error threshold percentage

# Compression
COMPRESSION_ENABLED=true
COMPRESSION_LEVEL=6  # 1-9, higher = better compression but slower
```

### Step 4: Initial Build and Start

```bash
# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Build the Docker image
docker compose -f docker-compose.production.yml build

# Start the services
docker compose -f docker-compose.production.yml up -d

# Verify containers are running
docker compose -f docker-compose.production.yml ps

# Check logs
docker compose -f docker-compose.production.yml logs -f search-api
```

### Step 5: Verify Deployment

```bash
# Run health check verification script
chmod +x scripts/verify-health.sh
./scripts/verify-health.sh http://localhost:4003

# Or manually check health endpoints
curl http://localhost:4003/health
curl http://localhost:4003/health/ready
curl http://localhost:4003/metrics
```

**Expected Output**:
```bash
✓ Basic health check passed
✓ Liveness probe passed
✓ Readiness probe passed
✓ Circuit breakers healthy
✓ Metrics endpoint accessible
```

---

## Configuration

### Docker Compose Configuration

**docker-compose.production.yml**:

```yaml
version: '3.8'

services:
  search-api:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    container_name: search-api
    restart: unless-stopped
    ports:
      - "4003:4003"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:4003/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - search-api-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  search-api-network:
    driver: bridge
```

### Reverse Proxy Configuration (Nginx)

**nginx.conf**:

```nginx
upstream search_api {
    server localhost:4003;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Proxy Configuration
    location / {
        proxy_pass http://search_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 65s;
    }

    # Health check endpoint (no authentication)
    location /health {
        proxy_pass http://search_api/health;
        access_log off;
    }

    # Access logs
    access_log /var/log/nginx/search-api-access.log;
    error_log /var/log/nginx/search-api-error.log;
}
```

---

## Deployment Process

### Automated Deployment

**Using the deployment script**:

```bash
# Set deployment configuration
export VPS_HOST=your-server.com
export VPS_USER=deploy
export VPS_PATH=/opt/search-api

# Make script executable
chmod +x scripts/deploy-vps.sh

# Run deployment
./scripts/deploy-vps.sh production
```

**The deployment script will**:
1. Check prerequisites and SSH connectivity
2. Create a backup of the current deployment
3. Sync files to VPS (excluding node_modules, .git, etc.)
4. Build and start Docker containers
5. Verify deployment health
6. Run comprehensive health checks

### Manual Deployment

**If you prefer manual deployment**:

```bash
# 1. SSH into VPS
ssh user@your-server.com

# 2. Navigate to deployment directory
cd /opt/search-api

# 3. Pull latest changes
git pull origin main

# 4. Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# 5. Build new image
docker compose -f docker-compose.production.yml build --no-cache

# 6. Stop old containers
docker compose -f docker-compose.production.yml down

# 7. Start new containers
docker compose -f docker-compose.production.yml up -d

# 8. Verify health
curl http://localhost:4003/health/ready

# 9. View logs
docker compose -f docker-compose.production.yml logs -f
```

---

## Update Deployment

### Zero-Downtime Update

```bash
# Option 1: Using deployment script
export VPS_HOST=your-server.com
./scripts/deploy-vps.sh production

# Option 2: Manual zero-downtime update
ssh user@your-server.com 'cd /opt/search-api && \
  git pull origin main && \
  docker compose -f docker-compose.production.yml up -d --build --no-deps search-api'
```

### Rolling Update Strategy

For high-availability setups with multiple instances:

```bash
# Update instances one at a time
# Instance 1
docker compose -f docker-compose.production.yml up -d --build --no-deps search-api-1

# Wait for health check
sleep 30

# Instance 2
docker compose -f docker-compose.production.yml up -d --build --no-deps search-api-2
```

---

## Rollback Procedure

### Automatic Rollback

**Using the rollback script**:

```bash
# Set VPS configuration
export VPS_HOST=your-server.com
export VPS_USER=deploy
export VPS_PATH=/opt/search-api

# Make script executable
chmod +x scripts/rollback-vps.sh

# Rollback to most recent backup
./scripts/rollback-vps.sh

# Or rollback to specific backup
./scripts/rollback-vps.sh backup_20231117_120000.tar.gz
```

### Manual Rollback

```bash
# 1. SSH into VPS
ssh user@your-server.com

# 2. Navigate to deployment directory
cd /opt/search-api

# 3. List available backups
ls -lth backups/

# 4. Stop current deployment
docker compose -f docker-compose.production.yml down

# 5. Backup current state
tar -czf backups/pre_rollback_$(date +%Y%m%d_%H%M%S).tar.gz current/

# 6. Restore from backup
mv current current.old
tar -xzf backups/backup_TIMESTAMP.tar.gz

# 7. Start containers from backup
cd current
docker compose -f docker-compose.production.yml up -d

# 8. Verify health
curl http://localhost:4003/health/ready
```

---

## Monitoring & Health Checks

### Health Check Endpoints

**Basic Health Check**:
```bash
curl http://localhost:4003/health

# Response:
# {"status":"healthy","timestamp":"2025-11-17T10:00:00.000Z"}
```

**Liveness Probe**:
```bash
curl http://localhost:4003/health/live

# Response:
# {"status":"alive","timestamp":"2025-11-17T10:00:00.000Z","uptime":3600}
```

**Readiness Probe**:
```bash
curl http://localhost:4003/health/ready

# Response:
# {
#   "status":"ready",
#   "timestamp":"2025-11-17T10:00:00.000Z",
#   "checks":{
#     "mongodb":{"status":"connected","latency":"5ms"},
#     "qdrant":{"status":"connected","latency":"8ms"}
#   },
#   "memory":{"used":"450MB","total":"1024MB","percentage":44}
# }
```

**Circuit Breakers**:
```bash
curl http://localhost:4003/health/circuit-breakers

# Response:
# {
#   "status":"healthy",
#   "circuitBreakers":[
#     {"name":"mongodb","state":"closed","stats":{...}},
#     {"name":"qdrant","state":"closed","stats":{...}}
#   ]
# }
```

**Prometheus Metrics**:
```bash
curl http://localhost:4003/metrics

# Response: Prometheus exposition format
# http_request_duration_seconds{...}
# search_query_duration_seconds{...}
# cache_hits_total{...}
```

### Automated Health Monitoring

**Using the health verification script**:

```bash
# Run comprehensive health checks
./scripts/verify-health.sh http://localhost:4003

# Expected output:
# ✓ Basic health check passed
# ✓ Liveness probe passed
# ✓ Readiness probe passed
# ✓ Circuit breakers healthy
# ✓ Metrics endpoint accessible
# ✓ API documentation accessible
# ✓ Search endpoint operational
# ✓ Security headers present
#
# Success Rate: 100% - Excellent!
```

**Scheduled Health Checks** (with cron):

```bash
# Add to crontab
crontab -e

# Run health checks every 5 minutes
*/5 * * * * /opt/search-api/scripts/verify-health.sh http://localhost:4003 >> /var/log/search-api-health.log 2>&1
```

### Container Monitoring

**View container status**:
```bash
docker compose -f docker-compose.production.yml ps
```

**View container logs**:
```bash
# Follow all logs
docker compose -f docker-compose.production.yml logs -f

# Follow specific service
docker compose -f docker-compose.production.yml logs -f search-api

# View last 100 lines
docker compose -f docker-compose.production.yml logs --tail=100 search-api

# View logs since timestamp
docker compose -f docker-compose.production.yml logs --since="2023-11-17T10:00:00" search-api
```

**View resource usage**:
```bash
docker stats search-api
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Container Won't Start

**Symptoms**:
- Container exits immediately
- Health checks failing
- `docker compose ps` shows container as exited

**Diagnosis**:
```bash
# Check container logs
docker compose -f docker-compose.production.yml logs search-api

# Check container exit code
docker inspect search-api --format='{{.State.ExitCode}}'

# Check for port conflicts
sudo netstat -tlnp | grep :4003
```

**Solutions**:
```bash
# Solution 1: Check environment variables
docker compose -f docker-compose.production.yml config

# Solution 2: Rebuild without cache
docker compose -f docker-compose.production.yml build --no-cache

# Solution 3: Check disk space
df -h

# Solution 4: Check logs for specific errors
docker compose -f docker-compose.production.yml logs --tail=50 search-api
```

#### Issue 2: Database Connection Failed

**Symptoms**:
- Readiness probe returns 503
- Logs show "Failed to connect to MongoDB" or "Failed to connect to Qdrant"

**Diagnosis**:
```bash
# Test MongoDB connectivity
docker run --rm mongo:7 mongosh "YOUR_MONGODB_URI" --eval "db.adminCommand('ping')"

# Test Qdrant connectivity
curl -X GET "YOUR_QDRANT_URL/collections"
```

**Solutions**:
```bash
# Solution 1: Verify MongoDB URI
echo $MONGODB_URI

# Solution 2: Check network connectivity
curl -v YOUR_MONGODB_URI

# Solution 3: Verify credentials
# Update .env.production with correct credentials

# Solution 4: Check firewall rules
# Ensure VPS can reach external databases
```

#### Issue 3: High Memory Usage

**Symptoms**:
- Container using > 80% memory
- Application becoming slow
- OOM (Out of Memory) kills

**Diagnosis**:
```bash
# Check memory usage
docker stats search-api

# Check Node.js heap usage
curl http://localhost:4003/health/ready | jq '.memory'
```

**Solutions**:
```bash
# Solution 1: Add memory limits to docker-compose.yml
services:
  search-api:
    mem_limit: 1g
    mem_reservation: 512m

# Solution 2: Increase Node.js heap size
environment:
  - NODE_OPTIONS=--max-old-space-size=4096

# Solution 3: Check for memory leaks
# Review application logs for growing memory usage

# Solution 4: Restart container
docker compose -f docker-compose.production.yml restart search-api
```

#### Issue 4: Slow Response Times

**Symptoms**:
- Search queries taking > 5 seconds
- Timeout errors (408)
- High P95/P99 latencies

**Diagnosis**:
```bash
# Check response times
time curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test","limit":5}'

# Check metrics
curl http://localhost:4003/metrics | grep search_query_duration

# Check circuit breaker status
curl http://localhost:4003/health/circuit-breakers
```

**Solutions**:
```bash
# Solution 1: Check external service latency
# MongoDB, Qdrant, LLM APIs

# Solution 2: Review logs for slow queries
docker compose logs search-api | grep "Search completed" | grep -E "[0-9]{4,}ms"

# Solution 3: Check cache hit rate
curl http://localhost:4003/metrics | grep cache_hits

# Solution 4: Optimize database queries
# Review slow query logs
```

#### Issue 5: Rate Limiting Too Aggressive

**Symptoms**:
- Legitimate requests getting 429 errors
- Users complaining about being blocked

**Diagnosis**:
```bash
# Check current rate limit settings
grep RATE_LIMIT .env.production

# Check metrics for 429 errors
curl http://localhost:4003/metrics | grep http_requests_total | grep 429
```

**Solutions**:
```bash
# Solution 1: Adjust rate limits in .env.production
RATE_LIMIT_MAX=200
SEARCH_RATE_LIMIT_MAX=50

# Solution 2: Implement tiered rate limiting
# (requires code changes)

# Solution 3: Use IP whitelisting
# (requires code changes)

# Restart after changes
docker compose -f docker-compose.production.yml restart search-api
```

### Debug Mode

**Enable debug logging**:

```bash
# Update .env.production
LOG_LEVEL=debug

# Restart container
docker compose -f docker-compose.production.yml restart search-api

# View debug logs
docker compose -f docker-compose.production.yml logs -f search-api
```

### Emergency Procedures

**If application is completely down**:

```bash
# 1. Check container status
docker compose -f docker-compose.production.yml ps

# 2. View recent logs
docker compose -f docker-compose.production.yml logs --tail=100 search-api

# 3. Attempt restart
docker compose -f docker-compose.production.yml restart search-api

# 4. If restart fails, rebuild
docker compose -f docker-compose.production.yml up -d --build --force-recreate

# 5. If still failing, rollback
./scripts/rollback-vps.sh

# 6. Contact team and review logs
```

---

## Maintenance

### Regular Maintenance Tasks

**Weekly**:
- Review application logs for errors
- Check disk space usage
- Verify backup integrity
- Review security audit logs

**Monthly**:
- Update dependencies (`npm audit`, `npm outdated`)
- Review and optimize database indexes
- Clean up old Docker images and containers
- Review and rotate logs

**Quarterly**:
- Security audit and penetration testing
- Performance benchmarking
- Disaster recovery testing
- Documentation updates

### Log Management

**Configure log rotation**:

```yaml
# In docker-compose.production.yml
services:
  search-api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
```

**Manual log cleanup**:

```bash
# Clean up old logs
find /opt/search-api/logs -name "*.log" -mtime +30 -delete

# View log sizes
du -sh /opt/search-api/logs/*
```

### Database Maintenance

**MongoDB Index Optimization**:

```bash
# Run database migration script
./scripts/migrate-database.sh status

# Check index usage
# (requires MongoDB shell access)
```

**Qdrant Collection Optimization**:

```bash
# Check collection status via API
curl -X GET "$QDRANT_URL/collections/tools"

# Optimize collection
curl -X POST "$QDRANT_URL/collections/tools/optimize"
```

### Docker Maintenance

**Clean up unused resources**:

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Remove all unused resources
docker system prune -a --volumes
```

**Update Docker images**:

```bash
# Pull latest base images
docker compose -f docker-compose.production.yml pull

# Rebuild with updated images
docker compose -f docker-compose.production.yml build --pull

# Restart with new images
docker compose -f docker-compose.production.yml up -d
```

---

## Security Considerations

### SSL/TLS Configuration

**Using Let's Encrypt with Certbot**:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal (already configured by Certbot)
sudo certbot renew --dry-run
```

### Secrets Management

**Never commit secrets**:
- Use `.env.production` (add to `.gitignore`)
- Use environment-specific files
- Consider using secret management tools (Vault, AWS Secrets Manager)

**Rotate secrets regularly**:

```bash
# Generate new JWT secret
openssl rand -base64 32

# Update MongoDB password
# (requires coordination with database admin)

# Update API keys
# (requires coordination with third-party services)
```

### Security Scanning

**Scan Docker images**:

```bash
# Using Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image search-api:latest

# Review and address vulnerabilities
```

**Dependency Scanning**:

```bash
# Run npm audit
npm audit

# Fix automatically where possible
npm audit fix

# Review manual fixes
npm audit fix --force
```

### Firewall Configuration

**UFW (Uncomplicated Firewall)**:

```bash
# Check status
sudo ufw status

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct access to application port
sudo ufw deny 4003/tcp

# Enable firewall
sudo ufw enable
```

### Access Control

**SSH Key-Based Authentication**:

```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no

# Restart SSH
sudo systemctl restart sshd
```

**Sudo Access**:

```bash
# Create deployment user with limited sudo
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# Configure sudoers
sudo visudo
# Add: deploy ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose
```

---

## Conclusion

This deployment guide provides comprehensive instructions for deploying, updating, and maintaining the Search API in a production environment. For additional support or questions:

- **Documentation**: See `docs/` directory
- **API Documentation**: `http://your-api/api-docs`
- **Monitoring Guide**: See `docs/MONITORING_GUIDE.md` (if available)
- **Security Guide**: See `docs/SECURITY_TESTING_GUIDE.md`

**Support**:
- Create an issue in the GitHub repository
- Contact the development team
- Review phase implementation summaries in `docs/PHASE_*_SUMMARY.md`

---

**Document Version**: 1.0
**Last Updated**: November 17, 2025
**Next Review Date**: February 17, 2026

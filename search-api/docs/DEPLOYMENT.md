# Deployment Guide

Production deployment guide for the CodiesVibe Search API.

## Table of Contents

- [Docker Deployment](#docker-deployment)
- [PM2 Deployment](#pm2-deployment)
- [Resource Requirements](#resource-requirements)
- [Environment Configuration](#environment-configuration)
- [Scaling](#scaling)
- [Monitoring](#monitoring)

---

## Docker Deployment

### Production Build

```bash
# Build production image
docker build -t search-api:latest -f Dockerfile .

# Run with Docker Compose
docker-compose -f docker-compose.production.yml up -d
```

### Docker Compose Production

**File**: `docker-compose.production.yml`

```yaml
version: '3.8'

services:
  search-api:
    image: search-api:latest
    ports:
      - "4003:4003"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - QDRANT_URL=${QDRANT_URL}
      - TOGETHER_API_KEY=${TOGETHER_API_KEY}
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Health Verification

```bash
# Check service health
curl http://localhost:4003/health/ready

# Expected response
{
  "status": "healthy",
  "services": {
    "mongodb": "connected",
    "qdrant": "connected"
  }
}
```

---

## PM2 Deployment

### Install PM2

```bash
npm install -g pm2
```

### Build Application

```bash
npm run build:prod
```

### Start with PM2

```bash
# Start
npm run start:prod:pm2

# Or manually
pm2 start ecosystem.config.js --env production
```

### PM2 Configuration

**File**: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'search-api',
    script: './dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 4003
    }
  }]
};
```

### PM2 Commands

```bash
# Status
pm2 status

# Logs
pm2 logs search-api

# Monitor
pm2 monit

# Reload (zero-downtime)
pm2 reload search-api

# Restart
pm2 restart search-api

# Stop
pm2 stop search-api

# Delete
pm2 delete search-api
```

---

## Resource Requirements

### Minimum Requirements

| Deployment Type | RAM | CPU | Storage |
|----------------|-----|-----|---------|
| **Development** | 1GB | 1 core | 5GB |
| **Production** | 2GB | 2 cores | 10GB |
| **High Traffic** | 4GB | 4 cores | 20GB |

### Recommended Requirements

| Component | Recommendation |
|-----------|----------------|
| **RAM** | 4GB+ for production |
| **CPU** | 2+ cores for concurrency |
| **Storage** | SSD for better I/O |
| **Network** | Low latency to MongoDB/Qdrant |

---

## Environment Configuration

### Production Environment Variables

```env
# Environment
NODE_ENV=production
PORT=4003
LOG_LEVEL=warn

# Database (use managed services)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/toolsearch
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key

# AI & Auth
TOGETHER_API_KEY=your_together_api_key
CLERK_SECRET_KEY=sk_live_your_clerk_secret_key

# Search Config
ENABLE_CACHE=true
CACHE_TTL=3600
ENABLE_SYNC_WORKER=true

# Security
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Logging
LOGGLY_ENABLED=true
LOGGLY_TOKEN=your_loggly_token
LOGGLY_SUBDOMAIN=your_subdomain
```

### Staging Environment

```env
NODE_ENV=staging
PORT=4003
LOG_LEVEL=info
ENABLE_CACHE=true
LOGGLY_ENABLED=true
ALLOWED_ORIGINS=https://staging.yourdomain.com
```

---

## Scaling

### Horizontal Scaling

```bash
# Docker Compose scaling
docker-compose up --scale search-api=3 -d
```

### Load Balancer Configuration

**nginx** example:

```nginx
upstream search_api {
    server search-api-1:4003;
    server search-api-2:4003;
    server search-api-3:4003;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://search_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database Scaling

**MongoDB Atlas**:
- Enable auto-scaling
- Use replica sets
- Configure read preference

**Qdrant Cloud**:
- Use distributed collections
- Configure replication
- Enable horizontal sharding

---

## Monitoring

### Health Checks

```bash
# Liveness (fast, <100ms)
curl http://localhost:4003/health/live

# Readiness (checks dependencies)
curl http://localhost:4003/health/ready

# Circuit breakers
curl http://localhost:4003/health/circuit-breakers
```

### Prometheus Metrics

```bash
# Metrics endpoint
curl http://localhost:4003/metrics
```

### Logging

Production logs location:
- **Console**: stdout/stderr (captured by Docker/PM2)
- **File**: `logs/search-api.log`
- **Security**: `logs/security.log`
- **Loggly**: Cloud logging (if enabled)

### Grafana Dashboards

**Recommended Metrics**:
- Request rate: `rate(http_requests_total[5m])`
- Search latency (p95): `histogram_quantile(0.95, rate(search_duration_seconds_bucket[5m]))`
- Cache hit rate: `rate(cache_hits_total[5m]) / rate(cache_requests_total[5m])`
- Error rate: `rate(http_requests_total{status=~"5.."}[5m])`

---

## Security Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique API keys
- [ ] Enable rate limiting
- [ ] Configure CORS with specific origins
- [ ] Use HTTPS (via reverse proxy)
- [ ] Enable security headers
- [ ] Configure Loggly or log aggregation
- [ ] Set up monitoring and alerting
- [ ] Configure firewall rules
- [ ] Use managed database services
- [ ] Enable backup and disaster recovery

---

## Backup & Disaster Recovery

### MongoDB Backup

```bash
# Manual backup
mongodump --uri="$MONGODB_URI" --out=/backup/$(date +%Y%m%d)

# Automated backup (cron)
0 2 * * * mongodump --uri="$MONGODB_URI" --out=/backup/$(date +%Y%m%d)
```

### Qdrant Backup

Use Qdrant Cloud backups or manual snapshot:

```bash
# Create snapshot
curl -X POST http://localhost:6333/collections/tools/snapshots

# Download snapshot
curl http://localhost:6333/collections/tools/snapshots/snapshot-name \
  -o tools-snapshot.dat
```

---

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build Docker image
        run: docker build -t search-api:latest .

      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.production.yml up -d
```

---

[← Back to README](../README.md)

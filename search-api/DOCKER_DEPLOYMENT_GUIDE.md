# Docker Deployment Guide

Complete guide for deploying Search API using Docker and Docker Compose.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Deployment](#development-deployment)
3. [Production Deployment](#production-deployment)
4. [Testing the Deployment](#testing-the-deployment)
5. [Monitoring & Logs](#monitoring--logs)
6. [Troubleshooting](#troubleshooting)
7. [Updating the Application](#updating-the-application)

---

## 🔧 Prerequisites

### Required Software

```bash
# Check Docker version (requires 20.10+)
docker --version

# Check Docker Compose version (requires 2.0+)
docker compose version
```

### System Requirements

**Minimum**:
- 2 CPU cores
- 2GB RAM
- 10GB disk space

**Recommended**:
- 4 CPU cores
- 4GB RAM
- 20GB disk space

---

## 🚀 Development Deployment

Development setup includes MongoDB and Qdrant containers for easy local testing.

### Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd search-api
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your LLM API keys
nano .env
```

**Required Variables**:
```env
TOGETHER_AI_API_KEY=your-api-key
TOGETHER_API_KEY=your-api-key
```

### Step 3: Start Services

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f
```

This starts:
- **MongoDB** on `localhost:27017`
- **Qdrant** on `localhost:6333`
- **Search API** on `localhost:4003`

### Step 4: Verify Deployment

```bash
# Check health
curl http://localhost:4003/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-11-17T...",
  "uptime": 10.5,
  "services": {
    "server": "running",
    "search": "available"
  }
}
```

### Step 5: Test Search API

```bash
# Test search endpoint
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI code generation tools",
    "limit": 5
  }'
```

### Step 6: Access Qdrant Dashboard

Open browser: `http://localhost:6333/dashboard`

---

## 🏭 Production Deployment

Production setup uses external MongoDB and Qdrant services.

### Step 1: Prepare VPS

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Create application directory
mkdir -p /opt/search-api
cd /opt/search-api
```

### Step 2: Upload Files

```bash
# From your local machine, upload files
scp -r ./* user@your-vps-ip:/opt/search-api/

# OR clone from repository
git clone <your-repo-url> /opt/search-api
cd /opt/search-api
```

### Step 3: Configure Production Environment

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your production values
nano .env.production
```

**Critical Variables**:

```env
# MongoDB (use your MongoDB Atlas or external MongoDB)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/toolsearch

# Qdrant (use Qdrant Cloud or your Qdrant server)
QDRANT_URL=https://your-qdrant-cluster.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key

# LLM API
TOGETHER_AI_API_KEY=your-api-key

# CORS (your production domains)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security
ENABLE_RATE_LIMITING=true
ENABLE_SECURITY_HEADERS=true
```

### Step 4: Build and Deploy

```bash
# Build the Docker image
docker compose -f docker-compose.production.yml build

# Start the service
docker compose -f docker-compose.production.yml up -d

# Verify it's running
docker compose -f docker-compose.production.yml ps
```

### Step 5: Verify Production Health

```bash
# Check health endpoint
curl http://localhost:4003/health

# Check from external IP
curl http://your-vps-ip:4003/health
```

### Step 6: Configure Reverse Proxy (Recommended)

**Option A: Nginx**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Option B: Caddy**

```caddy
api.yourdomain.com {
    reverse_proxy localhost:4003
}
```

### Step 7: Enable SSL (with Certbot)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

---

## ✅ Testing the Deployment

### Health Check

```bash
# Basic health check
curl http://localhost:4003/health

# Detailed check (if implemented)
curl http://localhost:4003/health/ready
```

### Search Functionality

```bash
# Test search
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "free CLI tools for developers",
    "limit": 10
  }'
```

### Performance Test

```bash
# Simple load test with Apache Bench
ab -n 100 -c 10 -p query.json -T 'application/json' http://localhost:4003/search

# query.json content:
{
  "query": "AI tools",
  "limit": 5
}
```

---

## 📊 Monitoring & Logs

### View Logs

```bash
# Development
docker compose logs -f search-api

# Production
docker compose -f docker-compose.production.yml logs -f search-api

# Last 100 lines
docker compose -f docker-compose.production.yml logs --tail=100 search-api
```

### Check Container Status

```bash
# View running containers
docker compose ps

# View resource usage
docker stats search-api
```

### Access Application Logs

```bash
# Logs are mounted to ./logs directory
tail -f logs/combined.log
tail -f logs/error.log
```

### Container Health

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' search-api-prod

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' search-api-prod
```

---

## 🔧 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs search-api

# Check build errors
docker compose build --no-cache search-api

# Verify environment variables
docker compose config
```

### Health Check Failing

```bash
# Test health endpoint manually
docker exec search-api-prod node -e "require('http').get('http://localhost:4003/health', (r) => console.log(r.statusCode))"

# Check if MongoDB/Qdrant are accessible
docker exec search-api-prod ping mongodb
docker exec search-api-prod ping qdrant
```

### MongoDB Connection Issues

```bash
# Verify MongoDB URI
echo $MONGODB_URI

# Test connection
docker exec search-api-prod node -e "require('mongodb').MongoClient.connect('$MONGODB_URI').then(() => console.log('Connected')).catch(e => console.error(e))"
```

### Port Already in Use

```bash
# Find what's using port 4003
sudo lsof -i :4003

# Kill the process
sudo kill -9 <PID>

# OR use different port
docker compose -f docker-compose.production.yml up -d --force-recreate
```

### Out of Disk Space

```bash
# Clean up Docker resources
docker system prune -a --volumes

# Check disk usage
df -h

# Remove old images
docker image prune -a
```

### Memory Issues

```bash
# Check container memory usage
docker stats search-api-prod

# Adjust memory limits in docker-compose.production.yml
deploy:
  resources:
    limits:
      memory: 2G  # Increase if needed
```

---

## 🔄 Updating the Application

### Development Update

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build

# Verify
docker compose ps
```

### Production Update (Zero-Downtime)

```bash
# Pull latest code
git pull origin main

# Build new image
docker compose -f docker-compose.production.yml build

# Gracefully restart (minimal downtime)
docker compose -f docker-compose.production.yml up -d --no-deps --build search-api

# Verify health
curl http://localhost:4003/health
```

### Rollback

```bash
# List images
docker images | grep search-api

# Tag previous version
docker tag search-api:previous search-api:latest

# Restart with previous version
docker compose -f docker-compose.production.yml up -d --no-deps search-api
```

---

## 🛑 Stopping the Application

### Development

```bash
# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Production

```bash
# Stop service (preserves data)
docker compose -f docker-compose.production.yml stop

# Stop and remove containers (preserves volumes)
docker compose -f docker-compose.production.yml down

# Complete cleanup (removes everything)
docker compose -f docker-compose.production.yml down -v
```

---

## 📈 Performance Tuning

### Container Resources

Edit `docker-compose.production.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '4.0'      # Increase CPU limit
      memory: 4G       # Increase memory limit
    reservations:
      cpus: '1.0'
      memory: 1G
```

### Node.js Optimization

Add to environment variables:

```env
NODE_OPTIONS=--max-old-space-size=2048  # Increase heap size
```

---

## 🔐 Security Best Practices

### 1. Use Secrets

```bash
# Create Docker secrets
echo "your-mongodb-uri" | docker secret create mongodb_uri -
echo "your-api-key" | docker secret create llm_api_key -
```

### 2. Limit Network Access

```yaml
# In docker-compose.production.yml
networks:
  search-api-prod-network:
    driver: bridge
    internal: true  # No external access
```

### 3. Run Security Scan

```bash
# Scan image for vulnerabilities
docker scan search-api:latest

# OR use Trivy
trivy image search-api:latest
```

### 4. Keep Images Updated

```bash
# Update base images
docker compose pull

# Rebuild with latest
docker compose build --no-cache
```

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Production Readiness Plan](./PRODUCTION_READINESS_PLAN.md)
- [API Documentation](./API_DOCUMENTATION.md) (when created)

---

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `docker compose logs -f search-api`
2. Verify environment: `docker compose config`
3. Test health: `curl http://localhost:4003/health`
4. Review this guide's troubleshooting section
5. Check GitHub issues or create a new one

---

**Last Updated**: 2025-11-17
**Version**: 1.0

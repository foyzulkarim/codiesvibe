# Installation Guide

Complete installation instructions for CodiesVibe in various environments.

## 📋 Prerequisites

### Required Software
```bash
# Docker (v20.10+) & Docker Compose (v2.0+)
docker --version
docker-compose --version

# Git
git --version
```

### External Services
- **MongoDB**: External instance required for production (MongoDB Atlas recommended)
- **vLLM**: Host-based AI model server for intelligent search (optional)

## 🚀 Quick Start (2 Minutes)

### 1. Clone Repository
```bash
git clone https://github.com/foyzulkarim/codiesvibe.git
cd codiesvibe
```

### 2. Start Infrastructure
```bash
# Start MongoDB, Qdrant, Redis, and monitoring
docker-compose -f docker-compose.infra.yml up -d

# Verify services are healthy
docker-compose -f docker-compose.infra.yml ps
```

### 3. Start Application
```bash
# Production deployment with all services
docker-compose -f docker-compose.production.yml up --build

# Access the application
open http://localhost    # Web application
open http://localhost:4003/health  # Search API health
```

## 🏗️ Environment Setup

### Development Environment
For local development with hot reload and debugging.

#### Setup Infrastructure
```bash
# Start supporting services
docker-compose -f docker-compose.infra.yml up -d

# Check infrastructure health
docker-compose -f docker-compose.infra.yml ps
```

#### Configure Environment
```bash
# Frontend environment
cp .env.example .env.local

# Backend environment
cp backend/.env.example backend/.env

# Edit files with your settings
nano .env.local
nano backend/.env
```

#### Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install
```

#### Start Development Servers
```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start backend
cd backend && npm run dev

# Terminal 3: Start search API (optional)
docker-compose -f docker-compose.search-api.dev.yml up --build
```

### Production Environment
For production deployment with external MongoDB.

#### Configure Production Environment
```bash
# Create production environment file
cp backend/.env.example backend/.env.production

# Edit with production settings
nano backend/.env.production
```

#### Required Production Variables
```env
# backend/.env.production
NODE_ENV=production
PORT=4000

# REQUIRED: External MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codiesvibe?retryWrites=true&w=majority

# REQUIRED: Security secrets (32+ characters each)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters-long
COOKIE_SECRET=your-super-secure-cookie-secret-minimum-32-characters
CSRF_SECRET=your-super-secure-csrf-secret-minimum-32-characters

# REQUIRED: Production domain
CORS_ORIGIN=https://your-domain.com
TRUST_PROXY=true

# vLLM Configuration
VLLM_BASE_URL=http://host.docker.internal:8000
VLLM_MODEL=your-model-name
```

#### Deploy Production
```bash
# Start infrastructure
docker-compose -f docker-compose.infra.yml up -d

# Deploy production environment
docker-compose -f docker-compose.production.yml up -d

# Verify deployment
curl -f http://localhost/health
curl -f http://localhost/api/health
```

## 🔧 Environment Variables

### Frontend Variables
```env
# .env.local (Development)
VITE_API_URL=http://localhost:4000/api
VITE_DEBUG=true
VITE_DEV_TOOLS=true
VITE_APP_NAME=CodiesVibe
VITE_ENVIRONMENT=development

# .env.production.local (Production)
VITE_API_URL=https://your-domain.com/api
VITE_DEBUG=false
VITE_APP_NAME=CodiesVibe
VITE_ENVIRONMENT=production
```

### Backend Variables
```env
# Development (backend/.env)
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin
REDIS_URL=redis://:redis123@redis:6379
JWT_SECRET=dev-jwt-secret-change-in-production
CORS_ORIGIN=http://localhost:3000

# Production (backend/.env.production)
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codiesvibe?retryWrites=true&w=majority
JWT_SECRET=production-secret-32-chars
COOKIE_SECRET=production-secret-32-chars
CSRF_SECRET=production-secret-32-chars
CORS_ORIGIN=https://your-domain.com
```

### Search API Variables
```env
# vLLM Configuration
VLLM_BASE_URL=http://host.docker.internal:8000
VLLM_MODEL=Qwen/Qwen3-0.6B

# Database Configuration
MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin
QDRANT_HOST=qdrant
QDRANT_PORT=6333
QDRANT_COLLECTION_NAME=tools

# Search Configuration
LOG_LEVEL=info
ENABLE_CACHE=true
CACHE_TTL=3600
ENABLE_VECTOR_VALIDATION=true
```

## 🗄️ Database Setup

### MongoDB Connection Examples

#### Development (Docker)
```env
MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin
```

#### MongoDB Atlas (Production)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codiesvibe?retryWrites=true&w=majority
```

#### Self-hosted MongoDB
```env
MONGODB_URI=mongodb://username:password@mongodb.yourhost.com:27017/codiesvibe?authSource=admin
```

### Test Database Connection
```bash
# Test MongoDB connectivity
docker run --rm mongo:7 mongosh "your-mongodb-uri" --eval "db.adminCommand('ping')"

# From application container
docker exec -it codiesvibe-backend npm run db:ping
```

## 🔍 Search API Setup

### vLLM Configuration

If you have vLLM running on your host:

```bash
# Test vLLM connection
curl http://localhost:8000/v1/models

# Test API call
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-0.6B",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

### Vector Database Setup

```bash
# Enter search-api container
docker exec -it codiesvibe-search-api bash

# Create Qdrant collections
npm run create-collections

# Seed vectors from MongoDB data
npm run seed-vectors

# Force re-seed (clears existing data)
npm run seed-vectors -- --force
```

## 🔧 Troubleshooting

### Common Issues

#### MongoDB Connection Issues
```bash
# Test connection from container
docker exec -it codiesvibe-backend curl -f http://mongodb:27017

# Check environment variables
docker exec -it codiesvibe-backend env | grep MONGODB

# Common fixes:
# - Ensure MongoDB URI includes authentication database
# - Check firewall rules for external MongoDB
# - Verify MongoDB user permissions
```

#### Port Conflicts
```bash
# Find conflicting processes
sudo lsof -i :3000  # Frontend
sudo lsof -i :4000  # Backend
sudo lsof -i :27017 # MongoDB

# Use alternative ports with docker-compose.override.yml
```

#### Container Health Issues
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f search-api

# Test health endpoints
curl http://localhost:4000/health
curl http://localhost:4003/health
```

### Health Check Script
```bash
# Create comprehensive health check
cat > health-check.sh << 'EOF'
#!/bin/bash
echo "=== CodiesVibe Health Check ==="

# Infrastructure services
echo "Checking infrastructure..."
docker-compose -f docker-compose.infra.yml ps

# Application services
echo "Checking application..."
docker-compose ps

# Health endpoints
echo "Testing health endpoints..."
curl -f http://localhost:4000/health && echo "✅ Backend OK" || echo "❌ Backend Failed"
curl -f http://localhost:4003/health && echo "✅ Search API OK" || echo "❌ Search API Failed"

echo "=== Health Check Complete ==="
EOF

chmod +x health-check.sh
./health-check.sh
```

## 🚀 Verification

### Verify Installation
```bash
# Check all services are running
docker-compose ps

# Test main application
curl http://localhost/health

# Test API endpoints
curl http://localhost:4000/api/health
curl http://localhost:4003/health

# Check monitoring (if enabled)
open http://localhost:3001  # Grafana
open http://localhost:9090  # Prometheus
```

### Expected Results
- **Frontend**: Accessible at http://localhost with modern UI
- **Backend API**: Health endpoint returns 200 OK
- **Search API**: Health endpoint returns MongoDB, Qdrant, vLLM connections
- **Monitoring**: Grafana dashboards show system metrics

## 📚 Next Steps

After successful installation:

1. **Read the [Development Guide](./development.md)** for local development
2. **Check the [API Reference](./api.md)** for available endpoints
3. **Review [AI Search Architecture](./ai-search.md)** to understand search features
4. **See [Deployment Guide](./deployment.md)** for production configurations

---

**🔧 Need help?** Check our [troubleshooting section](#troubleshooting) or [open an issue](https://github.com/foyzulkarim/codiesvibe/issues).
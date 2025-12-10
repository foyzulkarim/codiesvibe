# Installation Guide

Complete installation guide for the CodiesVibe Search API.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Using Docker (Recommended)](#using-docker-recommended)
- [Local Development Setup](#local-development-setup)
- [Environment Configuration](#environment-configuration)
- [Vector Database Initialization](#vector-database-initialization)
- [Verification](#verification)

---

## Prerequisites

Before you begin, ensure you have the following installed and configured:

### Required Software

- **Node.js** >= 24.x ([Download](https://nodejs.org/))
- **Docker** >= 20.x ([Download](https://www.docker.com/))
- **Docker Compose** >= 2.x (included with Docker Desktop)

### Required API Keys

- **Together AI API Key**: [Sign up](https://api.together.xyz/) and get your API key
- **Clerk Secret Key**: [Create account](https://clerk.com/) and get your secret key

### Optional (For Production)

- **MongoDB Atlas** account ([Sign up](https://www.mongodb.com/cloud/atlas))
- **Qdrant Cloud** account ([Sign up](https://qdrant.tech/))

---

## Using Docker (Recommended)

The easiest way to get started is using Docker Compose.

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/codiesvibe.git
cd codiesvibe/search-api
```

### Step 2: Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor
```

**Required variables in `.env`:**
```env
MONGODB_URI=mongodb://admin:password123@mongodb:27017/toolsearch?authSource=admin
QDRANT_HOST=qdrant
QDRANT_PORT=6333
TOGETHER_API_KEY=your_together_api_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
```

### Step 3: Start All Services

```bash
# Build and start MongoDB, Qdrant, and Search API
docker-compose up -d --build

# Check services are running and healthy
docker-compose ps
```

**Expected Output:**
```
NAME         COMMAND                SERVICE     STATUS        PORTS
mongodb      "docker-entrypoint…"   mongodb     Up (healthy)  0.0.0.0:27017->27017/tcp
qdrant       "/qdrant/qdrant"       qdrant      Up (healthy)  0.0.0.0:6333->6333/tcp
search-api   "dumb-init node..."    search-api  Up (healthy)  0.0.0.0:4003->4003/tcp
```

### Step 4: Initialize Vector Database

```bash
# Create Qdrant collections
docker exec -it search-api npm run create-collections

# Seed vectors from MongoDB
docker exec -it search-api npm run seed-vectors
```

**Tip**: Set `ENSURE_QDRANT_COLLECTIONS=true` in `.env` to automatically create collections on server startup.

---

## Local Development Setup

For active development without Docker containers.

### Step 1: Install Dependencies

```bash
cd search-api
npm install
```

### Step 2: Start Infrastructure Services

Start MongoDB and Qdrant using Docker Compose (infrastructure only):

```bash
docker-compose -f docker-compose.infra.yml up -d
```

This starts:
- MongoDB on port `27017`
- Qdrant on port `6333`

### Step 3: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit for local development
nano .env
```

**Local development `.env`:**
```env
# Database (local Docker services)
MONGODB_URI=mongodb://admin:password123@localhost:27017/toolsearch?authSource=admin
QDRANT_HOST=localhost
QDRANT_PORT=6333

# API Keys
TOGETHER_API_KEY=your_together_api_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key

# Development settings
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CACHE=false
```

### Step 4: Start Development Server

```bash
# Start with hot reload
npm run dev
```

The server will start on `http://localhost:4003` with automatic reload on file changes.

### Step 5: Initialize Data

In another terminal:

```bash
# Create collections
npm run create-collections

# Seed vectors
npm run seed-vectors
```

---

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://admin:password@mongodb:27017/toolsearch?authSource=admin` |
| `MONGODB_DB_NAME` | Database name | `toolsearch` |
| `QDRANT_HOST` | Qdrant host | `qdrant` (Docker) or `localhost` |
| `QDRANT_PORT` | Qdrant port | `6333` |
| `TOGETHER_API_KEY` | Together AI API key | `your_api_key` |
| `CLERK_SECRET_KEY` | Clerk secret key (required) | `sk_test_...` or `sk_live_...` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `4003` | Server port |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `ENABLE_CACHE` | `true` | Enable search caching |
| `ENABLE_RATE_LIMITING` | `true` | Enable rate limiting |
| `ENABLE_SECURITY_HEADERS` | `true` | Enable security headers |

See [Configuration Guide](CONFIGURATION.md) for complete environment variable reference.

---

## Vector Database Initialization

### Creating Collections

The search API uses 4 Qdrant collections:

1. **tools** - Core tool identity (name, description)
2. **functionality** - Capabilities and features
3. **interface** - Technical implementation details
4. **usecases** - Industry and user type targeting

**Create collections:**
```bash
# Docker
docker exec -it search-api npm run create-collections

# Local
npm run create-collections
```

### Seeding Vectors

**Seed from MongoDB data:**
```bash
# Docker
docker exec -it search-api npm run seed-vectors

# Local
npm run seed-vectors
```

**Force re-seed (clears existing data):**
```bash
# Docker
docker exec -it search-api npm run seed-vectors -- --force

# Local
npm run seed-vectors -- --force
```

### Auto-Creation (Optional)

Set this in `.env` to auto-create collections on server startup:
```env
ENSURE_QDRANT_COLLECTIONS=true
```

---

## Verification

### 1. Check Service Health

```bash
# All services
docker-compose ps

# API health
curl http://localhost:4003/health

# Readiness probe (checks MongoDB + Qdrant)
curl http://localhost:4003/health/ready
```

**Healthy Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "uptime": 123.45,
  "services": {
    "mongodb": "connected",
    "qdrant": "connected"
  }
}
```

### 2. Test Search Endpoint

```bash
curl -X POST http://localhost:4003/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI code completion tools",
    "limit": 5
  }'
```

### 3. Check API Documentation

Visit [http://localhost:4003/api-docs](http://localhost:4003/api-docs) for interactive Swagger UI.

### 4. Verify Vector Collections

```bash
# Check Qdrant collections
curl http://localhost:6333/collections

# Check specific collection
curl http://localhost:6333/collections/tools
```

### 5. Check MongoDB Data

```bash
# Connect to MongoDB
docker exec -it mongodb mongosh toolsearch --username admin --password password123

# Count documents
db.tools.countDocuments()
```

---

## Common Installation Issues

### Issue: MongoDB Connection Refused

**Cause**: MongoDB container not running or wrong credentials.

**Solution:**
```bash
# Check MongoDB status
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Verify connection string
echo $MONGODB_URI
```

### Issue: Qdrant Service Unavailable

**Cause**: Qdrant container not running or port conflicts.

**Solution:**
```bash
# Check Qdrant status
docker-compose ps qdrant

# Test Qdrant directly
curl http://localhost:6333/health

# Check for port conflicts
lsof -i :6333
```

### Issue: Together AI API Errors

**Cause**: Invalid API key or rate limits.

**Solution:**
```bash
# Verify API key is set
echo $TOGETHER_API_KEY

# Test Together AI
curl -H "Authorization: Bearer $TOGETHER_API_KEY" \
  https://api.together.xyz/models
```

### Issue: Permission Errors (macOS/Linux)

**Cause**: Docker volume permissions.

**Solution:**
```bash
# Fix permissions
sudo chown -R $USER:$USER .
```

For more troubleshooting, see [Troubleshooting Guide](TROUBLESHOOTING.md).

---

## Next Steps

- **Configure**: See [Configuration Guide](CONFIGURATION.md) for advanced settings
- **Develop**: Read [Development Guide](DEVELOPMENT.md) for local development workflow
- **Deploy**: Check [Deployment Guide](DEPLOYMENT.md) for production deployment
- **Test**: Review [Testing Guide](TESTING.md) for running tests

---

[← Back to README](../README.md)

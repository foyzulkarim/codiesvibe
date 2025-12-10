# Configuration Guide

Complete environment variable and configuration reference for the CodiesVibe Search API.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Vector Types Configuration](#vector-types-configuration)
- [Search Configuration](#search-configuration)
- [Security Configuration](#security-configuration)
- [Logging Configuration](#logging-configuration)
- [Feature Flags](#feature-flags)

---

## Environment Variables

### Required Variables

These variables **must** be set for the API to start:

```env
# Database
MONGODB_URI=mongodb://admin:password123@mongodb:27017/toolsearch?authSource=admin
MONGODB_DB_NAME=toolsearch

# Vector Database
QDRANT_HOST=qdrant
QDRANT_PORT=6333

# AI Service
TOGETHER_API_KEY=your_together_api_key_here

# Authentication
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
```

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://user:pass@host:port/db?authSource=admin` |
| `MONGODB_DB_NAME` | Database name | `toolsearch` |
| `QDRANT_HOST` | Qdrant server host | `qdrant` (Docker) or `localhost` |
| `QDRANT_PORT` | Qdrant server port | `6333` |
| `TOGETHER_API_KEY` | Together AI API key | `your_api_key` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_test_...` or `sk_live_...` |

---

### Optional Variables

#### Server Configuration

```env
NODE_ENV=development
PORT=4003
LOG_LEVEL=info
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode (`development`, `staging`, `production`) |
| `PORT` | `4003` | HTTP server port |
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) |

---

#### Qdrant Cloud (Optional)

Use these for Qdrant Cloud instead of self-hosted:

```env
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=tools
QDRANT_USE_ENHANCED_COLLECTION=false
```

---

#### Search Configuration

```env
SEARCH_USE_MULTIVECTOR=true
MULTIVECTOR_MAX_RESULTS=20
VECTOR_TYPES=semantic,entities.categories,entities.functionality
SEARCH_RRF_K=60
SEARCH_SOURCE_WEIGHTS={"mongodb": 0.3, "qdrant": 0.7}
DEDUPE_THRESHOLD=0.8
```

| Variable | Default | Description |
|----------|---------|-------------|
| `SEARCH_USE_MULTIVECTOR` | `true` | Enable multi-vector search |
| `MULTIVECTOR_MAX_RESULTS` | `20` | Max results per vector query |
| `VECTOR_TYPES` | (see below) | Comma-separated vector types to query |
| `SEARCH_RRF_K` | `60` | RRF fusion parameter |
| `SEARCH_SOURCE_WEIGHTS` | (see below) | Source weighting for result merging |
| `DEDUPE_THRESHOLD` | `0.8` | Similarity threshold for deduplication |

---

#### Caching Configuration

```env
ENABLE_CACHE=true
CACHE_TTL=3600
SEARCH_SCORE_THRESHOLD=0.5
```

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_CACHE` | `true` | Enable search result caching |
| `CACHE_TTL` | `3600` | Cache time-to-live (seconds) |
| `SEARCH_SCORE_THRESHOLD` | `0.5` | Minimum similarity score for cache hits |

---

#### Security Configuration

```env
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_SECURITY_HEADERS` | `true` | Enable Helmet security headers |
| `ENABLE_RATE_LIMITING` | `true` | Enable rate limiting |
| `ALLOWED_ORIGINS` | - | Allowed CORS origins (production) |
| `CORS_ORIGINS` | - | Allowed CORS origins (development) |

---

#### Feature Flags

```env
ENSURE_QDRANT_COLLECTIONS=false
ENABLE_VECTOR_VALIDATION=true
ENABLE_SYNC_WORKER=false
```

| Variable | Default | Description |
|----------|---------|-------------|
| `ENSURE_QDRANT_COLLECTIONS` | `false` | Auto-create Qdrant collections on startup |
| `ENABLE_VECTOR_VALIDATION` | `true` | Validate vector index on startup |
| `ENABLE_SYNC_WORKER` | `false` | Enable background MongoDB-Qdrant sync |

---

#### Logging Configuration

```env
LOGGLY_ENABLED=false
LOGGLY_TOKEN=your_loggly_token
LOGGLY_SUBDOMAIN=your_subdomain
```

| Variable | Default | Description |
|----------|---------|-------------|
| `LOGGLY_ENABLED` | `false` | Enable Loggly cloud logging |
| `LOGGLY_TOKEN` | - | Loggly customer token |
| `LOGGLY_SUBDOMAIN` | `self18` | Loggly subdomain |

---

## Vector Types Configuration

### Available Vector Types

Configure which vector types to query via `VECTOR_TYPES`:

```env
VECTOR_TYPES=semantic,entities.categories,entities.functionality,entities.interface
```

| Vector Type | Description | Collection |
|------------|-------------|------------|
| `semantic` | Core tool description embeddings | tools |
| `entities.categories` | Category-based vectors | tools |
| `entities.functionality` | Functionality/features vectors | functionality |
| `entities.interface` | Interface type vectors (API, CLI, GUI) | interface |
| `entities.industries` | Industry/vertical vectors | usecases |
| `entities.userTypes` | Target user persona vectors | usecases |
| `entities.aliases` | Alternative names/keywords | tools |
| `composites.toolType` | Composite tool type vectors | tools |

### Presets

**Minimal** (fastest, less accurate):
```env
VECTOR_TYPES=semantic
```

**Balanced** (recommended):
```env
VECTOR_TYPES=semantic,entities.categories,entities.functionality
```

**Comprehensive** (slowest, most accurate):
```env
VECTOR_TYPES=semantic,entities.categories,entities.functionality,entities.interface,entities.industries,entities.userTypes
```

---

## Search Configuration

### Reciprocal Rank Fusion (RRF)

Controls how results from multiple vector queries are merged:

```env
SEARCH_RRF_K=60
```

- **Lower K** (30-50): More weight on top results
- **Higher K** (60-100): More balanced merging
- **Recommended**: 60

### Source Weighting

Weight MongoDB vs Qdrant results:

```env
SEARCH_SOURCE_WEIGHTS={"mongodb": 0.3, "qdrant": 0.7}
```

- **More MongoDB weight** (0.5/0.5): Equal structured + semantic
- **More Qdrant weight** (0.3/0.7): Prefer semantic similarity
- **Recommended**: 0.3/0.7

### Deduplication Threshold

Similarity threshold for considering results as duplicates:

```env
DEDUPE_THRESHOLD=0.8
```

- **Lower** (0.6-0.7): More aggressive dedup
- **Higher** (0.8-0.9): Less aggressive dedup
- **Recommended**: 0.8

---

## Security Configuration

### Rate Limiting

Configured in `src/middleware/rate-limiters.ts`:

| Endpoint | Limit | Window | ENV Override |
|----------|-------|--------|--------------|
| Global | 100 req | 15 min | - |
| `/api/search` | 30 req | 1 min | - |
| Tools CRUD | 10 req | 5 min | - |

### CORS

**Development**:
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Production**:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Logging Configuration

### Log Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `debug` | Detailed debugging info | Development |
| `info` | General information | Production (default) |
| `warn` | Warning messages | Production |
| `error` | Error messages only | Production (minimal) |

### Log Files

- **Console**: Colorized output (development)
- **File**: `logs/search-api.log` (all logs)
- **Security**: `logs/security.log` (security events only)
- **Loggly**: Cloud logging (if enabled)

---

## Feature Flags

### ENSURE_QDRANT_COLLECTIONS

Auto-create Qdrant collections on server startup:

```env
ENSURE_QDRANT_COLLECTIONS=true
```

**Use when**:
- First-time setup
- Fresh deployments
- Testing environments

**Don't use when**:
- Collections already exist
- Production (create manually for control)

### ENABLE_SYNC_WORKER

Background MongoDB-Qdrant synchronization:

```env
ENABLE_SYNC_WORKER=true
```

**Use when**:
- Tools are updated frequently
- Need automatic sync
- Production environments

**Don't use when**:
- Manual sync is preferred
- Development (manual control better)

---

## Environment-Specific Configurations

### Development

```env
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CACHE=false
ENABLE_RATE_LIMITING=false
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Staging

```env
NODE_ENV=staging
LOG_LEVEL=info
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true
LOGGLY_ENABLED=true
ALLOWED_ORIGINS=https://staging.yourdomain.com
```

### Production

```env
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true
ENABLE_SYNC_WORKER=true
LOGGLY_ENABLED=true
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

[← Back to README](../README.md)

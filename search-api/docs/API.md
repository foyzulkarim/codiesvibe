# API Reference

Complete API endpoint reference for the CodiesVibe Search API.

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Core Endpoints](#core-endpoints)
- [Health & Monitoring](#health--monitoring)
- [Error Responses](#error-responses)
- [Rate Limiting](#rate-limiting)

---

## Base URL

**Development**: `http://localhost:4003`
**Production**: `https://api.codiesvibe.com` (replace with your domain)

**Interactive Documentation**: `/api-docs` (Swagger UI)

---

## Authentication

Protected endpoints require Clerk authentication.

**Header Format**:
```
Authorization: Bearer <clerk_session_token>
```

**Public Endpoints** (no auth required):
- `POST /api/search`
- `GET /api/tools`
- `GET /api/tools/:id`
- `GET /health/*`
- `GET /metrics`

**Protected Endpoints** (auth required):
- `POST /api/tools`
- `PATCH /api/tools/:id`
- `DELETE /api/tools/:id`
- `POST /api/sync/*` (admin only)

---

## Core Endpoints

### POST /api/search

AI-powered semantic search for tools.

**Request**:
```http
POST /api/search HTTP/1.1
Content-Type: application/json

{
  "query": "AI code completion tools",
  "limit": 10,
  "debug": false
}
```

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query (1-1000 characters) |
| `limit` | number | No | 10 | Max results (1-100) |
| `debug` | boolean | No | false | Enable debug mode |

**Response** (200 OK):
```json
{
  "query": "AI code completion tools",
  "intentState": {
    "primaryIntent": "code_completion",
    "confidence": 0.95,
    "entities": {
      "categories": ["AI", "Developer Tools"],
      "functionality": ["code completion", "autocomplete"]
    }
  },
  "executionPlan": {
    "strategy": "semantic_hybrid",
    "vectorTypes": ["semantic", "entities.categories"],
    "explanation": "Using semantic search with categorical filtering"
  },
  "candidates": [...],
  "results": [...],
  "executionStats": {
    "totalTimeMs": 245,
    "cacheHit": false,
    "vectorQueriesExecuted": 3
  },
  "executionTime": "245ms"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:4003/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI code completion tools", "limit": 10}'
```

---

### GET /api/tools

List all tools with optional filtering.

**Request**:
```http
GET /api/tools?category=AI&limit=20&skip=0 HTTP/1.1
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `limit` | number | Max results (default: 50, max: 100) |
| `skip` | number | Pagination offset (default: 0) |

**Response** (200 OK):
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "GitHub Copilot",
      "description": "AI pair programmer",
      "categories": ["AI", "Developer Tools"],
      "url": "https://github.com/features/copilot"
    }
  ],
  "total": 100,
  "limit": 20,
  "skip": 0
}
```

---

### GET /api/tools/:id

Get a single tool by ID.

**Request**:
```http
GET /api/tools/507f1f77bcf86cd799439011 HTTP/1.1
```

**Response** (200 OK):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "GitHub Copilot",
  "description": "AI-powered code completion",
  "categories": ["AI", "Developer Tools"],
  "functionality": ["code completion", "autocomplete"],
  "url": "https://github.com/features/copilot",
  "pricing": {
    "model": "subscription",
    "plans": [...]
  }
}
```

**Response** (404 Not Found):
```json
{
  "error": "Tool not found",
  "code": "NOT_FOUND"
}
```

---

### POST /api/tools

Create a new tool (authenticated).

**Request**:
```http
POST /api/tools HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Tool",
  "description": "Tool description",
  "categories": ["AI"],
  "url": "https://example.com"
}
```

**Response** (201 Created):
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "New Tool",
  "description": "Tool description",
  "categories": ["AI"],
  "url": "https://example.com",
  "createdAt": "2025-01-10T12:00:00.000Z"
}
```

---

### PATCH /api/tools/:id

Update an existing tool (authenticated).

**Request**:
```http
PATCH /api/tools/507f1f77bcf86cd799439011 HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Updated description"
}
```

**Response** (200 OK):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "GitHub Copilot",
  "description": "Updated description",
  "updatedAt": "2025-01-10T12:00:00.000Z"
}
```

---

### DELETE /api/tools/:id

Delete a tool (authenticated).

**Request**:
```http
DELETE /api/tools/507f1f77bcf86cd799439011 HTTP/1.1
Authorization: Bearer <token>
```

**Response** (204 No Content)

---

## Health & Monitoring

### GET /health

Basic health check.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "uptime": 123.45,
  "services": {
    "server": "running",
    "search": "available"
  }
}
```

---

### GET /health/live

Liveness probe (fast check, <100ms).

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "uptime": 123.45
}
```

---

### GET /health/ready

Readiness probe (checks MongoDB + Qdrant).

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "services": {
    "mongodb": "connected",
    "qdrant": "connected"
  }
}
```

**Response** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "services": {
    "mongodb": "disconnected",
    "qdrant": "connected"
  },
  "error": "MongoDB connection failed"
}
```

---

### GET /health/circuit-breakers

Circuit breaker status.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "circuitBreakers": [
    {
      "name": "together-ai",
      "state": "closed",
      "successRate": 0.98,
      "failures": 2,
      "successes": 98
    }
  ]
}
```

---

### GET /metrics

Prometheus metrics endpoint.

**Response** (200 OK):
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",route="/api/search",status="200"} 1234

# HELP search_duration_seconds Search query duration
# TYPE search_duration_seconds histogram
search_duration_seconds_bucket{le="0.1"} 100
search_duration_seconds_bucket{le="0.5"} 500
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [...],
  "timestamp": "2025-01-10T12:00:00.000Z"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `MISSING_QUERY` | 400 | Query parameter required |
| `INVALID_QUERY` | 400 | Query contains invalid characters |
| `INVALID_LIMIT` | 400 | Limit parameter out of range |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SEARCH_RATE_LIMIT_EXCEEDED` | 429 | Too many search requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Validation Error Example

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "query",
      "message": "Query contains invalid characters",
      "value": "<script>alert('xss')</script>"
    }
  ]
}
```

---

## Rate Limiting

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Global | 100 requests | 15 minutes |
| `/api/search` | 30 requests | 1 minute |
| Tools CRUD | 10 requests | 5 minutes |

### Rate Limit Headers

```
RateLimit-Limit: 30
RateLimit-Remaining: 25
RateLimit-Reset: 1640995200
```

### Rate Limit Error

**Response** (429 Too Many Requests):
```json
{
  "error": "Too many search requests",
  "code": "SEARCH_RATE_LIMIT_EXCEEDED",
  "retryAfter": "1 minute"
}
```

---

## OpenAPI Specification

- **Swagger UI**: `http://localhost:4003/api-docs`
- **JSON**: `http://localhost:4003/api-docs/openapi.json`
- **YAML**: `http://localhost:4003/api-docs/openapi.yaml`

---

[← Back to README](../README.md)

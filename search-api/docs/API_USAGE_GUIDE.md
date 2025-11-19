# Search API - Usage Guide

**Version**: 1.0.0
**Base URL**: `http://localhost:4003` (development) | `https://api.yourdomain.com` (production)

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Correlation IDs](#correlation-ids)
5. [Search Endpoint](#search-endpoint)
6. [Health Checks](#health-checks)
7. [Monitoring](#monitoring)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)
10. [Code Examples](#code-examples)

---

## 🚀 Quick Start

### Basic Search Request

```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI tools for coding", "limit": 10}'
```

### Response

```json
{
  "query": "AI tools for coding",
  "originalQuery": "AI tools for coding",
  "executionTime": "1234ms",
  "phase": "3-Node LLM-First Pipeline",
  "intent": {
    "primaryIntent": "find coding tools",
    "entities": ["AI", "coding"]
  },
  "candidates": [
    {
      "id": "github-copilot",
      "name": "GitHub Copilot",
      "description": "AI pair programmer",
      "score": 0.95,
      "categories": ["AI", "Code Generation"],
      "pricing": {
        "model": "freemium",
        "lowestPrice": 0,
        "highestPrice": 10
      }
    }
  ]
}
```

---

## 🔐 Authentication

**Current Status**: No authentication required

The API is currently open and does not require authentication. API key authentication is planned for future releases.

**Reserved Headers** (for future use):
- `X-API-Key`: API key authentication (not currently enforced)

---

## ⏱️ Rate Limiting

The API implements multi-tier rate limiting to ensure fair usage:

### Global Rate Limit
- **Limit**: 100 requests per 15 minutes per IP
- **Headers**:
  - `RateLimit-Limit`: Maximum requests allowed
  - `RateLimit-Remaining`: Remaining requests
  - `RateLimit-Reset`: Time when limit resets

### Search Endpoint Rate Limit
- **Limit**: 30 requests per minute per IP
- **Applies to**: `POST /search` only

### Rate Limit Response

When rate limit is exceeded, you'll receive a `429 Too Many Requests` response:

```json
{
  "error": "Too many search requests",
  "code": "SEARCH_RATE_LIMIT_EXCEEDED",
  "retryAfter": "1 minute"
}
```

### Best Practices
- Implement exponential backoff for retries
- Cache responses on the client side
- Monitor rate limit headers to avoid hitting limits

---

## 🔗 Correlation IDs

Correlation IDs enable end-to-end request tracing for debugging and monitoring.

### How It Works

1. **Client provides ID** (recommended):
   ```bash
   curl -X POST http://localhost:4003/search \
     -H "X-Correlation-ID: abc-123-xyz" \
     -H "Content-Type: application/json" \
     -d '{"query": "AI tools"}'
   ```

2. **Server generates ID** (if not provided):
   - Automatically generates a UUID v4
   - Returns it in response headers

3. **Response headers**:
   ```
   X-Correlation-ID: abc-123-xyz
   X-Request-ID: abc-123-xyz
   ```

### Supported Headers

Both headers are supported (they're aliases):
- `X-Correlation-ID`
- `X-Request-ID`

### Use Cases

- **Debugging**: Track a specific request through logs
- **Distributed Tracing**: Correlate requests across multiple services
- **Error Investigation**: Find all logs related to a failed request
- **Performance Analysis**: Measure end-to-end latency

### Example: Finding Logs by Correlation ID

```bash
# In Loggly
correlationId:"abc-123-xyz"

# In local logs
grep "abc-123-xyz" logs/search-api.log
```

---

## 🔍 Search Endpoint

### `POST /search`

Perform an AI-powered semantic search for tools.

#### Request

**Headers**:
```
Content-Type: application/json
X-Correlation-ID: <optional-correlation-id>
```

**Body**:
```json
{
  "query": "string (required, 1-1000 characters)",
  "limit": "integer (optional, 1-100, default: 10)",
  "debug": "boolean (optional, default: false)"
}
```

#### Field Constraints

| Field | Type | Required | Min | Max | Default | Pattern |
|-------|------|----------|-----|-----|---------|---------|
| query | string | Yes | 1 | 1000 | - | No HTML tags or injection characters |
| limit | integer | No | 1 | 100 | 10 | - |
| debug | boolean | No | - | - | false | - |

#### Examples

##### Simple Search
```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI tools for coding"
  }'
```

##### Search with Limit
```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning platforms with GPU support",
    "limit": 20
  }'
```

##### Search with Debug Mode
```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "chatgpt alternatives",
    "limit": 10,
    "debug": true
  }'
```

##### Search with Correlation ID
```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: my-request-123" \
  -d '{
    "query": "AI tools for data analysis"
  }'
```

#### Response Structure

```json
{
  "query": "sanitized query string",
  "originalQuery": "original query as submitted",
  "executionTime": "duration in milliseconds",
  "phase": "pipeline identifier",
  "intent": {
    "primaryIntent": "extracted user intent",
    "entities": ["entity1", "entity2"]
  },
  "candidates": [
    {
      "id": "unique-tool-id",
      "name": "Tool Name",
      "description": "Tool description",
      "score": 0.95,
      "categories": ["category1", "category2"],
      "pricing": {
        "model": "free|freemium|paid",
        "lowestPrice": 0,
        "highestPrice": 100
      }
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| query | string | Sanitized query (safe for processing) |
| originalQuery | string | Original query as submitted |
| executionTime | string | Total processing time (e.g., "1234ms") |
| phase | string | Pipeline identifier |
| intent.primaryIntent | string | Extracted user intent |
| intent.entities | array | Extracted entities from query |
| candidates | array | Ranked search results |
| candidates[].id | string | Unique tool identifier |
| candidates[].name | string | Tool name |
| candidates[].description | string | Tool description |
| candidates[].score | number | Relevance score (0-1) |
| candidates[].categories | array | Tool categories |
| candidates[].pricing | object | Pricing information |

---

## 🏥 Health Checks

The API provides three health check endpoints for different use cases.

### `GET /health`

Basic health check for simple monitoring.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "uptime": 3600.5,
  "services": {
    "server": "running",
    "search": "available"
  }
}
```

**Use Cases**:
- Simple uptime monitoring
- Load balancer health checks (when deep checks not needed)

---

### `GET /health/live`

Liveness probe for container orchestrators.

**Characteristics**:
- ⚡ **Fast**: <100ms response time
- 🪶 **Lightweight**: No external dependency checks
- 🎯 **Purpose**: Is the application process alive?

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "uptime": 3600.5
}
```

**Response** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "uptime": 3600.5,
  "error": "Application is not responding"
}
```

**Use Cases**:
- Kubernetes liveness probe
- Container restart decisions
- Process monitoring

**Kubernetes Example**:
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 4003
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3
```

---

### `GET /health/ready`

Readiness probe for container orchestrators.

**Characteristics**:
- 🔍 **Comprehensive**: Checks all dependencies
- ⏱️ **Slower**: 1-3 seconds response time
- 🎯 **Purpose**: Is the application ready to serve traffic?

**Checks Performed**:
- MongoDB connectivity and latency
- Qdrant connectivity and latency
- Memory usage
- Disk usage (Linux/Unix only)
- CPU load

**Status Levels**:
- `healthy`: All checks passed ✅
- `degraded`: Some non-critical issues ⚠️
- `unhealthy`: Critical issues, not ready for traffic ❌

**Response** (200 OK - Healthy):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "uptime": 3600.5,
  "checks": {
    "mongodb": {
      "status": "pass",
      "latency": "12ms"
    },
    "qdrant": {
      "status": "pass",
      "latency": "8ms"
    }
  },
  "system": {
    "memory": {
      "used": "256.5 MB",
      "total": "2.0 GB",
      "percentage": 12.5
    },
    "disk": {
      "used": "45.2 GB",
      "total": "100.0 GB",
      "percentage": 45.2
    },
    "cpu": {
      "loadAverage": [1.2, 1.5, 1.3],
      "cores": 4
    }
  }
}
```

**Response** (200 OK - Degraded):
```json
{
  "status": "degraded",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "uptime": 3600.5,
  "checks": {
    "mongodb": {
      "status": "pass",
      "latency": "150ms",
      "message": "High latency detected"
    },
    "qdrant": {
      "status": "pass",
      "latency": "8ms"
    }
  },
  "system": {
    "memory": {
      "used": "1.8 GB",
      "total": "2.0 GB",
      "percentage": 90.0
    }
  }
}
```

**Response** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "uptime": 3600.5,
  "checks": {
    "mongodb": {
      "status": "fail",
      "message": "Connection refused"
    },
    "qdrant": {
      "status": "fail",
      "message": "Timeout"
    }
  }
}
```

**Use Cases**:
- Kubernetes readiness probe
- Load balancer backend health checks
- Deployment readiness verification

**Kubernetes Example**:
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 4003
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 3
```

---

## 📊 Monitoring

### `GET /metrics`

Prometheus-formatted metrics for monitoring and alerting.

**Response** (200 OK):
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",route="/search",status_code="200"} 1234

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",route="/search",status_code="200",le="0.005"} 100
http_request_duration_seconds_sum{method="POST",route="/search",status_code="200"} 45.67
http_request_duration_seconds_count{method="POST",route="/search",status_code="200"} 1234

# HELP search_queries_total Total number of search queries
# TYPE search_queries_total counter
search_queries_total{status="success"} 1180
search_queries_total{status="error"} 54
```

**Metrics Categories**:

1. **HTTP Metrics**:
   - `http_request_duration_seconds` - Request duration
   - `http_requests_total` - Total requests
   - `http_requests_in_flight` - Current active requests
   - `http_response_size_bytes` - Response size

2. **Search Metrics**:
   - `search_queries_total` - Total search queries
   - `search_query_duration_seconds` - Search duration

3. **Cache Metrics**:
   - `llm_cache_hits_total` - Cache hits
   - `llm_cache_misses_total` - Cache misses
   - `llm_cache_savings_total` - Cost savings (cents)

4. **Database Metrics**:
   - `db_operation_duration_seconds` - DB operation duration
   - `db_operations_total` - Total DB operations
   - `db_connection_pool_size` - Connection pool size
   - `vector_search_duration_seconds` - Vector search duration
   - `vector_searches_total` - Total vector searches

5. **System Metrics**:
   - `memory_usage_bytes` - Memory usage
   - `cpu_usage_percent` - CPU usage
   - `active_connections` - Active connections
   - `errors_total` - Total errors

**Prometheus Configuration**:

```yaml
scrape_configs:
  - job_name: 'search-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:4003']
    metrics_path: '/metrics'
```

**Useful Queries**:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Search query P95 latency
histogram_quantile(0.95, rate(search_query_duration_seconds_bucket[5m]))

# Cache hit rate
rate(llm_cache_hits_total[5m]) / (rate(llm_cache_hits_total[5m]) + rate(llm_cache_misses_total[5m]))
```

---

## ❌ Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": []  // Optional additional details
}
```

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters | Check request body against schema |
| `SEARCH_RATE_LIMIT_EXCEEDED` | 429 | Too many search requests | Wait before retrying |
| `RATE_LIMIT_EXCEEDED` | 429 | Global rate limit exceeded | Wait before retrying |
| `SEARCH_ERROR` | 500 | Search processing failed | Check server logs, retry with backoff |
| `METRICS_ERROR` | 500 | Metrics generation failed | Check server health |

### Validation Errors

**Example Request**:
```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{"query": ""}'
```

**Response** (400 Bad Request):
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "query",
      "message": "Query cannot be empty",
      "value": ""
    }
  ]
}
```

### Rate Limit Errors

**Response** (429 Too Many Requests):
```json
{
  "error": "Too many search requests",
  "code": "SEARCH_RATE_LIMIT_EXCEEDED",
  "retryAfter": "1 minute"
}
```

### Server Errors

**Response** (500 Internal Server Error):
```json
{
  "error": "An error occurred during search processing",
  "code": "SEARCH_ERROR",
  "phase": "Error during search execution",
  "executionTime": "523ms"
}
```

**Note**: In production, error details are sanitized to prevent information leakage.

---

## 💡 Best Practices

### 1. Use Correlation IDs

Always provide correlation IDs for easier debugging:

```javascript
const correlationId = crypto.randomUUID();

fetch('http://localhost:4003/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Correlation-ID': correlationId
  },
  body: JSON.stringify({ query: 'AI tools' })
});
```

### 2. Implement Retry Logic

Use exponential backoff for retries:

```javascript
async function searchWithRetry(query, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:4003/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (response.status === 429) {
        // Rate limit - wait before retry
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (response.ok) {
        return await response.json();
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### 3. Cache Responses

Cache search responses on the client side:

```javascript
const cache = new Map();

async function cachedSearch(query, limit = 10) {
  const cacheKey = `${query}:${limit}`;

  // Check cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 3600000) { // 1 hour
      return cached.data;
    }
  }

  // Fetch from API
  const response = await fetch('http://localhost:4003/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit })
  });

  const data = await response.json();

  // Cache result
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  return data;
}
```

### 4. Monitor Rate Limit Headers

Track rate limit headers to avoid hitting limits:

```javascript
async function search(query) {
  const response = await fetch('http://localhost:4003/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  // Check rate limit headers
  const remaining = response.headers.get('RateLimit-Remaining');
  const reset = response.headers.get('RateLimit-Reset');

  console.log(`Rate limit: ${remaining} requests remaining`);
  console.log(`Resets at: ${new Date(reset * 1000)}`);

  return await response.json();
}
```

### 5. Validate Input

Validate input before sending requests:

```javascript
function validateQuery(query) {
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  if (query.length > 1000) {
    throw new Error('Query too long (max 1000 characters)');
  }

  // Check for invalid characters
  if (/<|>|{|}|\[|\]|\\/.test(query)) {
    throw new Error('Query contains invalid characters');
  }

  return query.trim();
}

async function search(rawQuery) {
  const query = validateQuery(rawQuery);

  const response = await fetch('http://localhost:4003/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  return await response.json();
}
```

### 6. Handle Errors Gracefully

```javascript
async function search(query) {
  try {
    const response = await fetch('http://localhost:4003/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const error = await response.json();

      switch (error.code) {
        case 'VALIDATION_ERROR':
          console.error('Invalid request:', error.details);
          break;
        case 'SEARCH_RATE_LIMIT_EXCEEDED':
          console.error('Rate limit exceeded, retry after:', error.retryAfter);
          break;
        case 'SEARCH_ERROR':
          console.error('Search failed:', error.error);
          break;
        default:
          console.error('Unknown error:', error);
      }

      throw new Error(error.error);
    }

    return await response.json();
  } catch (error) {
    console.error('Request failed:', error.message);
    throw error;
  }
}
```

---

## 💻 Code Examples

### JavaScript/Node.js

```javascript
const fetch = require('node-fetch');

async function searchTools(query, limit = 10) {
  const correlationId = crypto.randomUUID();

  const response = await fetch('http://localhost:4003/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId
    },
    body: JSON.stringify({
      query,
      limit
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Search failed: ${error.error}`);
  }

  const data = await response.json();

  console.log(`Found ${data.candidates.length} results in ${data.executionTime}`);
  console.log(`Correlation ID: ${response.headers.get('X-Correlation-ID')}`);

  return data.candidates;
}

// Usage
searchTools('AI tools for coding', 20)
  .then(results => {
    results.forEach(tool => {
      console.log(`${tool.name} (score: ${tool.score})`);
      console.log(`  ${tool.description}`);
    });
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

### Python

```python
import requests
import uuid

def search_tools(query, limit=10):
    correlation_id = str(uuid.uuid4())

    response = requests.post(
        'http://localhost:4003/search',
        headers={
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlation_id
        },
        json={
            'query': query,
            'limit': limit
        }
    )

    response.raise_for_status()

    data = response.json()

    print(f"Found {len(data['candidates'])} results in {data['executionTime']}")
    print(f"Correlation ID: {response.headers.get('X-Correlation-ID')}")

    return data['candidates']

# Usage
try:
    results = search_tools('AI tools for coding', 20)

    for tool in results:
        print(f"{tool['name']} (score: {tool['score']})")
        print(f"  {tool['description']}")
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")
```

### cURL

```bash
#!/bin/bash

# Basic search
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI tools for coding",
    "limit": 10
  }'

# Search with correlation ID
CORRELATION_ID=$(uuidgen)
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: $CORRELATION_ID" \
  -d '{
    "query": "machine learning platforms",
    "limit": 20
  }' \
  -i  # Include headers in output
```

### TypeScript

```typescript
interface SearchRequest {
  query: string;
  limit?: number;
  debug?: boolean;
}

interface SearchResponse {
  query: string;
  originalQuery: string;
  executionTime: string;
  phase: string;
  intent: {
    primaryIntent: string;
    entities: string[];
  };
  candidates: ToolCandidate[];
}

interface ToolCandidate {
  id: string;
  name: string;
  description: string;
  score: number;
  categories: string[];
  pricing?: {
    model: string;
    lowestPrice: number;
    highestPrice: number;
  };
}

async function searchTools(
  query: string,
  limit: number = 10
): Promise<ToolCandidate[]> {
  const correlationId = crypto.randomUUID();

  const response = await fetch('http://localhost:4003/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId
    },
    body: JSON.stringify({
      query,
      limit
    } as SearchRequest)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Search failed: ${error.error}`);
  }

  const data: SearchResponse = await response.json();

  console.log(`Found ${data.candidates.length} results in ${data.executionTime}`);
  console.log(`Correlation ID: ${response.headers.get('X-Correlation-ID')}`);

  return data.candidates;
}

// Usage
searchTools('AI tools for coding', 20)
  .then(results => {
    results.forEach(tool => {
      console.log(`${tool.name} (score: ${tool.score})`);
      console.log(`  ${tool.description}`);
    });
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

---

## 📚 Additional Resources

- **Interactive API Documentation**: http://localhost:4003/api-docs
- **OpenAPI Specification (JSON)**: http://localhost:4003/api-docs/openapi.json
- **OpenAPI Specification (YAML)**: http://localhost:4003/api-docs/openapi.yaml
- **Prometheus Metrics**: http://localhost:4003/metrics
- **Health Checks**:
  - Basic: http://localhost:4003/health
  - Liveness: http://localhost:4003/health/live
  - Readiness: http://localhost:4003/health/ready

---

## 🆘 Support

For issues, questions, or feature requests:
- **GitHub Issues**: https://github.com/your-org/search-api/issues
- **Documentation**: See `/docs` folder
- **Logs**: Check correlation ID in logs for debugging

---

**Last Updated**: 2025-11-17
**API Version**: 1.0.0

# API Reference

Complete REST API documentation for CodiesVibe backend services.

## 🌐 Base URLs

- **Development**: `http://localhost:4000/api`
- **Production**: `https://your-domain.com/api`
- **Search API**: `http://localhost:4003` (development) / `https://your-domain.com` (production)

## 📚 API Overview

### Core Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/health` | Application health check | ❌ |
| `GET` | `/tools` | List tools with filtering | ❌ |
| `GET` | `/tools/:id` | Get specific tool details | ❌ |
| `POST` | `/tools` | Create new tool | ✅ |
| `PATCH` | `/tools/:id` | Update tool | ✅ |
| `DELETE` | `/tools/:id` | Delete tool | ✅ |
| `GET` | `/tools/search` | Traditional search | ❌ |
| `POST` | `/metrics` | Prometheus metrics | ❌ |

### Search API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/health` | Search service health | ❌ |
| `POST` | `/search` | AI-powered search | ❌ |

## 🔐 Authentication

### JWT Authentication
Protected endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Get JWT Token
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Response
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

## 📋 Tool Management API

### Get Tools List

```http
GET /tools
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | - | Text search across name, description |
| `functionality` | string | - | Filter by functionality |
| `deployment` | string | - | Filter by deployment type |
| `pricing` | string | - | Filter by pricing model |
| `interface` | string | - | Filter by interface type |
| `primaryCategory` | string | - | Filter by primary category |
| `secondaryCategory` | string | - | Filter by secondary category |
| `industry` | string | - | Filter by industry |
| `userType` | string | - | Filter by target user type |
| `hasFreeTier` | boolean | - | Filter by free tier availability |
| `hasCustomPricing` | boolean | - | Filter by custom pricing |
| `minPrice` | number | - | Minimum price filter |
| `maxPrice` | number | - | Maximum price filter |
| `codeGeneration` | boolean | - | Filter by code generation capability |
| `imageGeneration` | boolean | - | Filter by image generation capability |
| `dataAnalysis` | boolean | - | Filter by data analysis capability |
| `apiAccess` | boolean | - | Filter by API access |
| `offlineMode` | boolean | - | Filter by offline capability |
| `sortBy` | string | `popularity` | Sort field |
| `sortOrder` | string | `desc` | Sort order (asc/desc) |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Results per page |

#### Example Request
```http
GET /tools?functionality=code_completion&hasFreeTier=true&sortBy=rating&sortOrder=desc&page=1&limit=10
```

#### Response
```json
{
  "data": [
    {
      "id": "github-copilot",
      "name": "GitHub Copilot",
      "description": "AI pair programmer that suggests code completions",
      "longDescription": "GitHub Copilot is an AI coding assistant...",
      "tagline": "Your AI pair programmer",
      "categories": {
        "primary": ["code-completion", "ai-assistant"],
        "secondary": ["productivity", "integration"],
        "industries": ["software-development", "technology"],
        "userTypes": ["developer", "team"]
      },
      "pricingSummary": {
        "lowestMonthlyPrice": 10,
        "highestMonthlyPrice": 19,
        "currency": "USD",
        "hasFreeTier": true,
        "hasCustomPricing": false,
        "billingPeriods": ["monthly", "yearly"],
        "pricingModel": ["freemium", "paid"]
      },
      "capabilities": {
        "core": ["code-completion", "multi-language"],
        "aiFeatures": {
          "codeGeneration": true,
          "imageGeneration": false,
          "dataAnalysis": false,
          "voiceInteraction": false,
          "multimodal": false,
          "thinkingMode": false
        },
        "technical": {
          "apiAccess": false,
          "webHooks": false,
          "sdkAvailable": false,
          "offlineMode": false
        },
        "integrations": {
          "platforms": ["VS Code", "JetBrains", "Visual Studio"],
          "thirdParty": ["GitHub"],
          "protocols": ["https"]
        }
      },
      "useCases": [
        {
          "title": "Code Completion",
          "description": "AI-powered code suggestions as you type",
          "complexity": "basic"
        }
      ],
      "searchKeywords": ["ai", "copilot", "code", "completion", "github"],
      "semanticTags": ["programming-assistant", "code-suggestion"],
      "aliases": ["Copilot", "GitHub AI"],
      "interface": ["ide-plugin", "editor-extension"],
      "functionality": ["code-completion", "code-suggestion"],
      "deployment": ["cloud", "local"],
      "popularity": 950000,
      "rating": 4.5,
      "reviewCount": 25000,
      "logoUrl": "https://example.com/logo.png",
      "website": "https://github.com/features/copilot",
      "documentation": "https://docs.github.com/copilot",
      "status": "active",
      "contributor": "github",
      "dateAdded": "2023-06-01T00:00:00.000Z",
      "lastUpdated": "2024-01-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "totalPages": 16,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "applied": {
      "functionality": "code_completion",
      "hasFreeTier": true
    },
    "available": {
      "functionality": ["code-completion", "debugging", "testing"],
      "deployment": ["cloud", "local", "hybrid"],
      "pricing": ["free", "freemium", "paid"]
    }
  }
}
```

### Get Tool by ID

```http
GET /tools/:id
```

#### Path Parameters
- `id` (string): Tool ID or slug

#### Example Request
```http
GET /tools/github-copilot
```

#### Response
```json
{
  "data": {
    "id": "github-copilot",
    "name": "GitHub Copilot",
    // ... full tool object as shown above
  }
}
```

### Create Tool

```http
POST /tools
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "New AI Tool",
  "description": "A comprehensive AI development tool",
  "longDescription": "Detailed description of the tool...",
  "tagline": "The best AI tool for developers",
  "categories": {
    "primary": ["code-completion", "ai-assistant"],
    "secondary": ["productivity"],
    "industries": ["software-development"],
    "userTypes": ["developer", "team"]
  },
  "pricingSummary": {
    "lowestMonthlyPrice": 0,
    "highestMonthlyPrice": 29,
    "currency": "USD",
    "hasFreeTier": true,
    "hasCustomPricing": true,
    "billingPeriods": ["monthly", "yearly"],
    "pricingModel": ["freemium", "paid"]
  },
  "pricingDetails": [
    {
      "tier": "Free",
      "price": 0,
      "billingPeriod": "monthly",
      "features": ["Basic code completion", "Limited suggestions"]
    },
    {
      "tier": "Pro",
      "price": 29,
      "billingPeriod": "monthly",
      "features": ["Advanced completion", "Priority support"]
    }
  ],
  "capabilities": {
    "core": ["code-completion", "multi-language"],
    "aiFeatures": {
      "codeGeneration": true,
      "imageGeneration": false,
      "dataAnalysis": false,
      "voiceInteraction": false,
      "multimodal": false,
      "thinkingMode": false
    },
    "technical": {
      "apiAccess": true,
      "webHooks": false,
      "sdkAvailable": true,
      "offlineMode": false
    },
    "integrations": {
      "platforms": ["VS Code", "JetBrains"],
      "thirdParty": ["GitHub", "GitLab"],
      "protocols": ["https", "websocket"]
    }
  },
  "useCases": [
    {
      "title": "Code Completion",
      "description": "AI-powered code suggestions",
      "complexity": "basic"
    }
  ],
  "searchKeywords": ["ai", "code", "completion", "tool"],
  "semanticTags": ["programming-assistant", "code-suggestion"],
  "aliases": ["AI Tool", "Code Helper"],
  "interface": ["ide-plugin", "standalone"],
  "functionality": ["code-completion", "code-suggestion"],
  "deployment": ["cloud", "local"],
  "logoUrl": "https://example.com/logo.png",
  "website": "https://example.com",
  "documentation": "https://docs.example.com"
}
```

#### Response
```json
{
  "data": {
    "id": "new-ai-tool",
    "name": "New AI Tool",
    // ... created tool object
  },
  "message": "Tool created successfully"
}
```

### Update Tool

```http
PATCH /tools/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body
Partial tool object with fields to update:
```json
{
  "description": "Updated description",
  "pricingSummary": {
    "lowestMonthlyPrice": 5,
    "highestMonthlyPrice": 49
  }
}
```

#### Response
```json
{
  "data": {
    "id": "tool-id",
    // ... updated tool object
  },
  "message": "Tool updated successfully"
}
```

### Delete Tool

```http
DELETE /tools/:id
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "message": "Tool deleted successfully"
}
```

## 🔍 Traditional Search API

### Search Tools

```http
GET /tools/search
```

#### Query Parameters
- `q` (string, required): Search query
- `limit` (number): Maximum results (default: 10)

#### Example Request
```http
GET /tools/search?q=AI%20code%20completion&limit=5
```

#### Response
```json
{
  "data": [
    {
      "id": "github-copilot",
      "name": "GitHub Copilot",
      "description": "AI pair programmer",
      "relevanceScore": 0.95,
      "matchFields": ["name", "description", "searchKeywords"]
    }
  ],
  "query": "AI code completion",
  "total": 5,
  "executionTime": "23ms"
}
```

## 🤖 AI Search API

### Intelligent Search

```http
POST /search
Content-Type: application/json
```

#### Request Body
```json
{
  "query": "AI tools for React developers with free tier",
  "limit": 10,
  "debug": false
}
```

#### Response
```json
{
  "query": "AI tools for React developers with free tier",
  "intentState": {
    "primaryIntent": "code_completion",
    "confidence": 0.95,
    "entities": {
      "platform": ["React"],
      "pricing": ["free", "freemium"],
      "functionality": ["code_completion", "suggestions"]
    }
  },
  "executionPlan": {
    "strategy": "semantic_hybrid",
    "explanation": "Using semantic search with React and free tier filtering",
    "vectorTypes": ["semantic", "entities.categories", "composites.toolType"],
    "filters": {
      "pricingModels": ["free", "freemium"],
      "platforms": ["React"]
    }
  },
  "candidates": [
    {
      "id": "github-copilot",
      "score": 0.92,
      "source": "semantic",
      "metadata": {
        "name": "GitHub Copilot",
        "description": "AI pair programmer",
        "pricing": "freemium",
        "platforms": ["VS Code", "JetBrains"]
      }
    }
  ],
  "executionStats": {
    "totalTimeMs": 245,
    "nodeTimings": {
      "intentExtraction": 89,
      "queryPlanning": 45,
      "queryExecution": 111
    },
    "vectorQueriesExecuted": 4,
    "structuredQueriesExecuted": 2
  },
  "executionTime": "245ms",
  "phase": "3-Node LLM-First Pipeline",
  "strategy": "semantic_hybrid",
  "explanation": "Search completed using 3-node LLM-first agentic pipeline",
  "results": [
    {
      "id": "github-copilot",
      "name": "GitHub Copilot",
      "description": "AI pair programmer",
      "category": "code-completion",
      "score": 0.92,
      "source": "semantic",
      "metadata": {}
    }
  ]
}
```

## 🏥 Health & Monitoring

### Application Health

```http
GET /health
```

#### Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "vectorDb": "connected"
  },
  "metrics": {
    "memoryUsage": "256MB",
    "cpuUsage": "15%",
    "activeConnections": 12
  }
}
```

### Search API Health

```http
GET /health
```

#### Response
```json
{
  "status": "healthy",
  "services": {
    "mongodb": "connected",
    "qdrant": "connected",
    "vllm": "connected"
  },
  "vectorIndex": {
    "collectionHealthy": true,
    "sampleValidationPassed": true,
    "missingVectors": 0,
    "orphanedVectors": 0
  }
}
```

### Prometheus Metrics

```http
GET /metrics
```

Returns Prometheus-formatted metrics for monitoring.

## ❌ Error Handling

### Error Response Format

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/api/tools"
  },
  "statusCode": 400
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (duplicate) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: 1000 requests per 15 minutes per user
- **Headers**: Rate limit info included in response headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## 🔄 Pagination

### Pagination Parameters
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

### Pagination Response
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🔧 Filtering & Sorting

### Filter Operators
- **Equality**: `field=value`
- **Boolean**: `field=true` or `field=false`
- **Range**: `minPrice=10&maxPrice=100`
- **Array**: `category=ai&category=productivity`

### Sort Fields
- `popularity`: Tool popularity score
- `rating`: Average rating
- `reviewCount`: Number of reviews
- `dateAdded`: Date added to database
- `name`: Alphabetical by name
- `relevance`: Search relevance (search endpoints only)

### Sort Order
- `asc`: Ascending order
- `desc`: Descending order (default)

## 📝 Response Formats

### Success Response
```json
{
  "data": {}, // or []
  "message": "Success message (optional)",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

### List Response with Pagination
```json
{
  "data": [],
  "pagination": {},
  "filters": {}
}
```

## 🔐 Security

### Authentication Headers
```http
Authorization: Bearer <jwt_token>
X-API-Key: <api_key> // Alternative auth method
```

### CORS Headers
```http
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

**📚 Related Documentation**:
- [Development Guide](./development.md) - Local development setup
- [AI Search Architecture](./ai-search.md) - Search system details
- [Installation Guide](./installation.md) - Complete setup instructions
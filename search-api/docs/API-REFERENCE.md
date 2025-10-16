# LangGraph Search API - API Reference

## Overview

The LangGraph Search API provides RESTful endpoints for intelligent tool discovery and search. The API supports both synchronous and asynchronous search operations, with comprehensive state management, checkpointing, error recovery, and vector index validation capabilities.

## Base URL

```
http://localhost:4003
```

## Authentication

Currently, the API does not require authentication. This is planned for future releases.

## Content Type

All requests should use the `application/json` content type.

## Response Format

All responses follow a consistent JSON format with appropriate HTTP status codes.

## Features

- **Intelligent Search**: LangGraph-powered orchestration with intent extraction and query planning
- **Enhanced Search**: Advanced multi-source search with result merging and duplicate detection
- **Async Operations**: Non-blocking search with thread management and checkpointing
- **Error Recovery**: Automatic rollback and recovery from checkpoints
- **State Validation**: Comprehensive state validation at each pipeline stage
- **Vector Index**: Automatic validation and synchronization of vector indexes
- **Debug Mode**: Detailed execution tracing and performance metrics

## Endpoints

### 1. Health Check

#### GET /health

Checks the health of all connected services (MongoDB, Qdrant, Ollama).

**Request:**
```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "services": {
    "mongodb": "connected",
    "qdrant": "connected",
    "ollama": "connected"
  }
}
```

**Response (500 Internal Server Error):**
```json
{
  "status": "unhealthy",
  "error": "Connection timeout to MongoDB"
}
```

---

### 2. Synchronous Search

#### POST /search

Performs a synchronous search operation using the LangGraph orchestration system.

**Request:**
```http
POST /search
Content-Type: application/json

{
  "query": "React testing tools",
  "limit": 10,
  "debug": false
}
```

**Request Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query | string | Yes | - | Natural language search query |
| limit | number | No | 10 | Maximum number of results to return |
| debug | boolean | No | false | Enable debug information in response |

**Response (200 OK):**
```json
{
  "query": "React testing tools",
  "intent": {
    "toolNames": [],
    "categories": ["development"],
    "functionality": ["testing"],
    "userTypes": ["developer"],
    "interface": ["web"],
    "deployment": ["cloud"],
    "isComparative": false,
    "referenceTool": null,
    "semanticQuery": "React testing tools",
    "keywords": ["react", "testing", "tools"],
    "excludeTools": []
  },
  "confidence": {
    "overall": 0.85,
    "breakdown": {
      "category": 0.9,
      "functionality": 0.8,
      "userType": 0.85
    }
  },
  "results": [
    {
      "name": "Jest",
      "description": "Testing framework for JavaScript",
      "category": "development",
      "functionality": ["testing"],
      "userTypes": ["developer"],
      "interface": ["cli"],
      "deployment": ["local"],
      "pricingModel": "free",
      "relevanceScore": 0.95
    }
  ],
  "executionTime": "245ms",
  "phase": "LangGraph Integration",
  "strategy": "intelligent-search",
  "explanation": "Search completed using LangGraph orchestration",
  "debug": {
    "metadata": {
      "executionTime": "245ms",
      "resultsCount": 1,
      "confidence": 0.85,
      "threadId": "123e4567-e89b-12d3-a456-426614174000"
    },
    "executionPath": [
      "intelligent-search",
      "intent-extraction",
      "query-planning",
      "execution",
      "final-completion"
    ],
    "nodeExecutionTimes": {
      "intent-extraction": 120,
      "query-planning": 45,
      "execution": 60,
      "final-completion": 20
    }
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Query is required",
  "phase": "Error during search execution"
}
```

**Response (500 Internal Server Error):**
```json
{
  "error": "Service unavailable: Ollama connection timeout",
  "phase": "Error during search execution"
}
```

---

### 3. Asynchronous Search

#### POST /search/async

Initiates an asynchronous search operation and returns a thread ID for tracking.

**Request:**
```http
POST /search/async
Content-Type: application/json

{
  "query": "Vue.js state management",
  "debug": false,
  "checkpointConfig": {
    "enableCheckpoints": true,
    "checkpointInterval": 1,
    "maxCheckpointsPerThread": 10
  }
}
```

**Request Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query | string | Yes | - | Natural language search query |
| debug | boolean | No | false | Enable debug information |
| checkpointConfig | object | No | null | Checkpointing configuration |

**CheckpointConfig Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| enableCheckpoints | boolean | No | true | Enable checkpointing |
| checkpointInterval | number | No | 1 | Save after N nodes |
| maxCheckpointsPerThread | number | No | 10 | Max checkpoints per thread |
| enableCompression | boolean | No | false | Enable checkpoint compression |

**Response (200 OK):**
```json
{
  "threadId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "started",
  "message": "Search has been started asynchronously"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Query is required",
  "status": "error"
}
```

---

### 4. Async Search Status

#### GET /search/status/:threadId

Checks the status of an asynchronous search operation.

**Request:**
```http
GET /search/status/123e4567-e89b-12d3-a456-426614174000
```

**Response (200 OK):**
```json
{
  "threadId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "running",
  "progress": 75,
  "currentNode": "execution",
  "results": [],
  "startTime": "2025-10-09T11:30:00.000Z",
  "lastAccessed": "2025-10-09T11:30:45.000Z",
  "checkpointStats": {
    "checkpointCount": 3,
    "totalSize": 2048
  },
  "metadata": {
    "executionTime": "in_progress",
    "resultsCount": 0,
    "error": null,
    "executionPath": ["intent-extraction", "query-planning", "execution"],
    "nodeExecutionTimes": {
      "intent-extraction": 120,
      "query-planning": 45,
      "execution": 60
    }
  }
}
```

**Status Values:**
- `started`: Search has been initiated
- `running`: Search is currently executing
- `completed`: Search finished successfully
- `error`: Search failed with an error
- `cancelled`: Search was cancelled

**Progress Values:**
- 0-100: Percentage of completion
- Calculated based on execution path progress

**Response (404 Not Found):**
```json
{
  "error": "Invalid thread ID: Thread not found or expired",
  "status": "not_found"
}
```

---

### 5. Resume Async Search

#### POST /search/resume/:threadId

Resumes a paused or failed asynchronous search from the last checkpoint.

**Request:**
```http
POST /search/resume/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "query": "Updated Vue.js state management query",
  "debug": true
}
```

**Request Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query | string | No | - | Updated search query |
| debug | boolean | No | false | Enable debug information |

**Response (200 OK):**
```json
{
  "threadId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "resumed",
  "message": "Search has been resumed from checkpoint",
  "query": "Updated Vue.js state management query"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Invalid thread ID: Thread not found or expired",
  "status": "not_found"
}
```

**Response (409 Conflict):**
```json
{
  "error": "Search is already running",
  "status": "running"
}
```

---

### 6. Cancel Async Search

#### DELETE /search/cancel/:threadId

Cancels a running asynchronous search and cleans up resources.

**Request:**
```http
DELETE /search/cancel/123e4567-e89b-12d3-a456-426614174000
```

**Response (200 OK):**
```json
{
  "threadId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "cancelled",
  "message": "Search has been cancelled and resources cleaned up",
  "clearedCheckpoints": 3
}
```

**Response (404 Not Found):**
```json
{
  "error": "Invalid thread ID: Thread not found or expired",
  "status": "not_found"
}
```

---

### 7. Enhanced Search

#### POST /api/search/enhanced

Performs an enhanced search operation across multiple sources with result merging and duplicate detection.

**Request:**
```http
POST /api/search/enhanced
Content-Type: application/json

{
  "query": "React testing tools",
  "options": {
    "sources": {
      "vector": true,
      "traditional": true,
      "hybrid": true
    },
    "mergeOptions": {
      "strategy": "reciprocal_rank_fusion",
      "rrfKValue": 60,
      "maxResults": 50
    },
    "duplicateDetectionOptions": {
      "enabled": true,
      "threshold": 0.8,
      "strategies": ["EXACT_ID", "CONTENT_SIMILARITY", "VERSION_AWARE"]
    },
    "pagination": {
      "page": 1,
      "limit": 20
    }
  }
}
```

**Response (200 OK):**
```json
{
  "query": "React testing tools",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2025-10-15T20:30:00.000Z",
  "summary": {
    "totalResults": 45,
    "returnedResults": 20,
    "processingTime": 245,
    "sourcesSearched": ["vector", "traditional", "hybrid"],
    "duplicatesRemoved": 8,
    "searchStrategy": "reciprocal_rank_fusion"
  },
  "results": [
    {
      "id": "tool-123",
      "score": 0.95,
      "payload": {
        "name": "Jest",
        "description": "Testing framework for JavaScript"
      },
      "rrfScore": 0.92,
      "originalRankings": {
        "vector": { "rank": 1, "score": 0.95 },
        "traditional": { "rank": 2, "score": 0.88 }
      },
      "sourceCount": 2,
      "finalRank": 1
    }
  ],
  "sourceAttribution": [
    {
      "source": "vector",
      "resultCount": 25,
      "searchTime": 120,
      "avgScore": 0.85,
      "weight": 1.0
    }
  ],
  "duplicateDetection": {
    "enabled": true,
    "duplicatesRemoved": 8,
    "duplicateGroups": 4,
    "strategies": ["EXACT_ID", "CONTENT_SIMILARITY", "VERSION_AWARE"],
    "processingTime": 15
  },
  "metrics": {
    "totalProcessingTime": 245,
    "searchTime": 180,
    "mergeTime": 35,
    "deduplicationTime": 15,
    "cacheHitRate": 0.2
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**For detailed documentation of the enhanced search API, see [Enhanced Search API Documentation](enhanced-search-api.md)**

---

### 8. Enhanced Search Management

#### GET /api/search/enhanced/health

Health check endpoint for the enhanced search service.

**Request:**
```http
GET /api/search/enhanced/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-15T20:30:00.000Z",
  "service": "enhanced-search",
  "version": "1.0.0",
  "cache": {
    "size": 15,
    "enabled": true,
    "ttl": 300000
  },
  "configuration": {
    "defaultSources": ["vector", "traditional", "hybrid"],
    "defaultMergeStrategy": "reciprocal_rank_fusion",
    "duplicateDetectionEnabled": true,
    "maxConcurrentSearches": 5,
    "defaultTimeout": 5000
  }
}
```

#### POST /api/search/enhanced/cache/clear

Clear the enhanced search cache.

**Request:**
```http
POST /api/search/enhanced/cache/clear
```

**Response (200 OK):**
```json
{
  "message": "Cache cleared successfully",
  "timestamp": "2025-10-15T20:30:00.000Z",
  "before": {
    "size": 15,
    "keys": ["enhanced_search_abc123", "enhanced_search_def456"]
  },
  "after": {
    "size": 0,
    "keys": []
  }
}
```

#### GET /api/search/enhanced/config

Get current enhanced search configuration.

**Request:**
```http
GET /api/search/enhanced/config
```

**Response (200 OK):**
```json
{
  "config": {
    "defaultSources": {
      "vector": {
        "enabled": true,
        "weight": 1.0,
        "timeout": 3000
      },
      "traditional": {
        "enabled": true,
        "weight": 0.9,
        "timeout": 2000
      }
    },
    "defaultMergeStrategy": "reciprocal_rank_fusion",
    "defaultDuplicateDetection": true,
    "maxConcurrentSearches": 5,
    "defaultTimeout": 5000,
    "enableCache": true,
    "cacheTTL": 300000
  },
  "timestamp": "2025-10-15T20:30:00.000Z"
}
```

#### PUT /api/search/enhanced/config

Update enhanced search configuration.

**Request:**
```http
PUT /api/search/enhanced/config
Content-Type: application/json

{
  "config": {
    "defaultMergeStrategy": "hybrid",
    "enableCache": false,
    "cacheTTL": 600000,
    "maxConcurrentSearches": 3
  }
}
```

**Response (200 OK):**
```json
{
  "message": "Configuration updated successfully",
  "timestamp": "2025-10-15T20:30:00.000Z",
  "before": {
    "defaultSources": ["vector", "traditional", "hybrid"],
    "defaultMergeStrategy": "reciprocal_rank_fusion",
    "enableCache": true
  },
  "after": {
    "defaultSources": ["vector", "traditional", "hybrid"],
    "defaultMergeStrategy": "hybrid",
    "enableCache": false
  }
}
```

#### GET /api/search/enhanced/stats

Get enhanced search statistics and performance metrics.

**Request:**
```http
GET /api/search/enhanced/stats
```

**Response (200 OK):**
```json
{
  "timestamp": "2025-10-15T20:30:00.000Z",
  "service": "enhanced-search",
  "cache": {
    "size": 15,
    "enabled": true,
    "ttl": 300000
  },
  "configuration": {
    "availableSources": ["vector", "traditional", "hybrid"],
    "defaultMergeStrategy": "reciprocal_rank_fusion",
    "duplicateDetectionEnabled": true
  },
  "performance": {
    "totalSearches": 1250,
    "averageResponseTime": 280,
    "cacheHitRate": 0.35,
    "errorRate": 0.02
  }
}
```

---

## Data Schemas

### Intent Schema

```typescript
interface Intent {
  toolNames: string[];
  categories: CategoryEnum[];
  functionality: FunctionalityEnum[];
  userTypes: UserTypeEnum[];
  interface: InterfaceEnum[];
  deployment: DeploymentEnum[];
  isComparative: boolean;
  referenceTool?: string;
  semanticQuery?: string;
  keywords: string[];
  excludeTools: string[];
  priceConstraints?: {
    hasFreeTier?: boolean;
    maxPrice?: number;
    minPrice?: number;
    pricingModel?: PricingModelEnum;
  };
}
```

### Result Schema

```typescript
interface SearchResult {
  name: string;
  description: string;
  category: CategoryEnum;
  functionality: FunctionalityEnum[];
  userTypes: UserTypeEnum[];
  interface: InterfaceEnum[];
  deployment: DeploymentEnum[];
  pricingModel: PricingModelEnum;
  relevanceScore: number;
  features?: string[];
  website?: string;
  documentation?: string;
}
```

### Confidence Schema

```typescript
interface Confidence {
  overall: number;
  breakdown: Record<string, number>;
}
```

### Debug Metadata Schema

```typescript
interface DebugMetadata {
  executionTime: string;
  resultsCount: number;
  confidence?: number;
  threadId?: string;
  executionPath: string[];
  nodeExecutionTimes: Record<string, number>;
  startTime: Date;
  endTime?: Date;
  recoveryTime?: Date;
  rollbackTime?: Date;
  originalQuery?: string;
  error?: string;
}
```

## Enums

### CategoryEnum
```typescript
"development" | "design" | "productivity" | "communication" |
"marketing" | "analytics" | "security" | "infrastructure" | "other"
```

### FunctionalityEnum
```typescript
"code-editing" | "version-control" | "testing" | "deployment" |
"ui-design" | "wireframing" | "collaboration" | "automation" |
"monitoring" | "documentation" | "other"
```

### UserTypeEnum
```typescript
"developer" | "designer" | "product-manager" | "marketer" |
"analyst" | "administrator" | "other"
```

### InterfaceEnum
```typescript
"Web" | "Desktop" | "Mobile" | "CLI" | "API" | "IDE" | "IDE Extension" | "other"
```

### DeploymentEnum
```typescript
"Cloud" | "Self-Hosted" | "Local" | "Hybrid" | "other"
```

### PricingModelEnum
```typescript
"free" | "freemium" | "subscription" | "one-time" | "other"
```

## Advanced Features

### Checkpointing and Recovery

The API implements advanced checkpointing with automatic error recovery:

- **Automatic Checkpoints**: State is saved after each node execution
- **Error Recovery**: Automatic rollback to last valid checkpoint on failure
- **State Validation**: Comprehensive validation before and after each node
- **Compression**: Optional checkpoint compression for storage optimization

### Vector Index Validation

On startup, the API automatically validates the vector index:

- **Collection Health**: Validates Qdrant collection configuration
- **Sample Validation**: Tests embedding generation and similarity search
- **Synchronization**: Checks MongoDB-Qdrant synchronization
- **Recommendations**: Provides actionable recommendations for issues

### Thread Management

Advanced thread management features:

- **Thread Lifecycle**: Create, monitor, resume, and cancel search threads
- **Metadata Tracking**: Comprehensive metadata for each thread
- **Resource Cleanup**: Automatic cleanup of expired threads and checkpoints
- **Concurrency Control**: Prevents concurrent execution on the same thread

## Error Handling

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Request successful |
| 400 | Bad request - Invalid parameters |
| 404 | Not found - Resource doesn't exist |
| 409 | Conflict - Resource state conflict |
| 500 | Internal server error |
| 503 | Service unavailable - External service issues |

### Error Response Format

```json
{
  "error": "Error description",
  "status": "error",
  "threadId": "optional-thread-id",
  "timestamp": "2025-10-09T11:30:00.000Z"
}
```

### Common Error Types

1. **Validation Errors**
   - Missing required parameters
   - Invalid parameter values
   - Malformed JSON

2. **Thread Errors**
   - Invalid or expired thread ID
   - Thread not found
   - Thread already running

3. **Service Errors**
   - Database connection failures
   - External service timeouts
   - Resource unavailability

## Rate Limiting

Currently, no rate limiting is implemented. This is planned for future releases.

## Usage Examples

### Basic Synchronous Search

```bash
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React hooks testing libraries",
    "limit": 5
  }'
```

### Asynchronous Search with Status Checking

```bash
# Start async search
curl -X POST http://localhost:4003/search/async \
  -H "Content-Type: application/json" \
  -d '{
    "query": "TypeScript form validation",
    "debug": true
  }'

# Check status (replace with actual thread ID)
curl -X GET http://localhost:4003/search/status/123e4567-e89b-12d3-a456-426614174000
```

### Resume Failed Search

```bash
curl -X POST http://localhost:4003/search/resume/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Updated TypeScript form validation query",
    "debug": true
  }'
```

### Cancel Running Search

```bash
curl -X DELETE http://localhost:4003/search/cancel/123e4567-e89b-12d3-a456-426614174000
```

## SDK Examples

### JavaScript/TypeScript

```typescript
// Basic search
const searchResponse = await fetch('http://localhost:4003/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'React testing tools',
    limit: 10
  })
});

const searchResults = await searchResponse.json();

// Async search
const asyncResponse = await fetch('http://localhost:4003/search/async', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'Node.js performance monitoring',
    debug: true
  })
});

const { threadId } = await asyncResponse.json();

// Check status
const statusResponse = await fetch(`http://localhost:4003/search/status/${threadId}`);
const status = await statusResponse.json();

if (status.status === 'completed') {
  console.log('Search results:', status.results);
}
```

### Python

```python
import requests
import json

# Basic search
search_response = requests.post('http://localhost:4003/search', json={
    'query': 'Python async libraries',
    'limit': 5
})

search_results = search_response.json()
print(f"Found {len(search_results['results'])} results")

# Async search
async_response = requests.post('http://localhost:4003/search/async', json={
    'query': 'Machine learning model deployment',
    'debug': True
})

thread_data = async_response.json()
thread_id = thread_data['threadId']

# Check status
status_response = requests.get(f'http://localhost:4003/search/status/{thread_id}')
status = status_response.json()

if status['status'] == 'completed':
    print(f"Search completed with {status['metadata']['resultsCount']} results")
```

## Best Practices

1. **Use Async Operations**: For complex queries or high-volume usage, prefer async operations
2. **Check Thread Status**: Always check thread status before attempting to resume
3. **Clean Up Resources**: Cancel searches that are no longer needed to free up resources
4. **Handle Errors Gracefully**: Implement proper error handling for all API calls
5. **Cache Results**: Cache frequently used results to improve performance
6. **Monitor Performance**: Use debug mode to monitor performance during development

## Version Information

**Current API Version**: 1.0.0

**Versioning Strategy**: The API uses semantic versioning. Backward-compatible changes increment the patch version, breaking changes increment the major version.

## Migration Guide

### From Legacy API

1. **Endpoint Changes**: Legacy endpoints are maintained for backward compatibility
2. **Response Format**: New response format includes additional fields for debugging and metadata
3. **Async Operations**: New async endpoints provide better performance for complex queries
4. **Error Handling**: Improved error messages and status codes
5. **Checkpointing**: New checkpointing system for async operations

### Future Compatibility

- New fields may be added to response objects
- New endpoints may be added
- Existing endpoints will maintain backward compatibility when possible
- Checkpointing features may be enhanced

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4003 | Server port |
| MONGODB_URI | Yes | - | MongoDB connection string |
| QDRANT_HOST | Yes | - | Qdrant host address |
| QDRANT_PORT | Yes | - | Qdrant port |
| ENABLE_VECTOR_VALIDATION | No | true | Enable vector index validation on startup |

### Vector Index Health

The API provides automatic vector index validation on startup. To disable this feature:

```bash
ENABLE_VECTOR_VALIDATION=false npm run dev
```

To manually validate or fix vector index issues:

```bash
npm run seed-vectors  # Re-index all tools to Qdrant
npm run seed-vectors -- --force  # Force re-index (clears existing data)
```

## Support

For API support and questions:
- Check the troubleshooting documentation
- Review the implementation guide
- Examine the comprehensive test reports
- Check system health via `/health` endpoint
- Monitor vector index health through startup logs

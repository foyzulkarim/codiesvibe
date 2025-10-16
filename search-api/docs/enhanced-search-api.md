# Enhanced Search API Documentation

## Overview

The Enhanced Search API provides advanced search capabilities that combine results from multiple search sources, apply sophisticated result merging algorithms using reciprocal rank fusion, and perform intelligent duplicate detection. This API builds upon the existing LangGraph search infrastructure to provide unified, ranked search results with comprehensive source attribution and performance metrics.

## Base URL

```
http://localhost:4003/api/search/enhanced
```

## Authentication

Currently, the API does not require authentication. This is planned for future releases.

## Content Type

All requests should use the `application/json` content type.

## Response Format

All responses follow a consistent JSON format with appropriate HTTP status codes and comprehensive error handling.

## Features

- **Multi-Source Search**: Combines results from vector, traditional, and hybrid search sources
- **Reciprocal Rank Fusion**: Advanced result merging using RRF algorithms for optimal ranking
- **Duplicate Detection**: Intelligent duplicate detection with multiple strategies
- **Performance Optimization**: Parallel execution with configurable timeouts and caching
- **Source Attribution**: Detailed attribution of results to their original sources
- **Comprehensive Metrics**: Performance metrics and execution timing for optimization
- **Flexible Configuration**: Runtime configuration updates for search behavior

## Endpoints

### 1. Enhanced Search

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
    "vectorOptions": {
      "vectorTypes": ["semantic", "categories", "functionality"],
      "limit": 20,
      "filter": {
        "category": "development"
      }
    },
    "mergeOptions": {
      "strategy": "reciprocal_rank_fusion",
      "rrfKValue": 60,
      "maxResults": 50,
      "sourceWeights": {
        "semantic": 1.0,
        "traditional": 0.9,
        "hybrid": 0.95
      }
    },
    "duplicateDetectionOptions": {
      "enabled": true,
      "useEnhancedDetection": true,
      "threshold": 0.8,
      "strategies": ["EXACT_ID", "CONTENT_SIMILARITY", "VERSION_AWARE"]
    },
    "pagination": {
      "page": 1,
      "limit": 20
    },
    "sort": {
      "field": "relevance",
      "order": "desc"
    },
    "filters": {
      "categories": ["development"],
      "userTypes": ["developer"],
      "interfaces": ["web", "cli"]
    },
    "performance": {
      "timeout": 5000,
      "enableCache": true,
      "enableParallel": true
    },
    "debug": false,
    "includeMetadata": true,
    "includeSourceAttribution": true
  }
}
```

**Request Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query | string | Yes | - | Natural language search query (1-500 characters) |
| options | object | No | {} | Configuration options for the search request |

#### Options Parameters

**sources** (object)
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| vector | boolean | No | true | Enable vector search |
| traditional | boolean | No | true | Enable traditional search |
| hybrid | boolean | No | true | Enable hybrid search |

**vectorOptions** (object)
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| vectorTypes | array | No | ["semantic", "categories", "functionality"] | Vector types to search |
| limit | number | No | 20 | Maximum results per vector type (1-100) |
| filter | object | No | - | Additional vector search filters |

**mergeOptions** (object)
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| strategy | enum | No | "reciprocal_rank_fusion" | Merge strategy: "reciprocal_rank_fusion", "weighted_average", "hybrid" |
| rrfKValue | number | No | 60 | RRF K value (1-200) |
| maxResults | number | No | 50 | Maximum results after merging (1-200) |
| sourceWeights | object | No | {"semantic": 1.0, "traditional": 0.9, "hybrid": 0.95} | Weight for each source |

**duplicateDetectionOptions** (object)
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| enabled | boolean | No | true | Enable duplicate detection |
| useEnhancedDetection | boolean | No | true | Use enhanced detection algorithms |
| threshold | number | No | 0.8 | Similarity threshold (0-1) |
| strategies | array | No | ["EXACT_ID", "CONTENT_SIMILARITY", "VERSION_AWARE"] | Detection strategies |

**pagination** (object)
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number (min: 1) |
| limit | number | No | 20 | Results per page (1-100) |

**sort** (object)
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| field | enum | No | "relevance" | Sort field: "relevance", "name", "category", "score" |
| order | enum | No | "desc" | Sort order: "asc", "desc" |

**filters** (object)
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| categories | array | No | - | Filter by categories |
| userTypes | array | No | - | Filter by user types |
| interfaces | array | No | - | Filter by interface types |
| deployment | array | No | - | Filter by deployment types |
| priceRange | object | No | - | Filter by price range |

**performance** (object)
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| timeout | number | No | 5000 | Request timeout in milliseconds (100-30000) |
| enableCache | boolean | No | true | Enable result caching |
| enableParallel | boolean | No | true | Enable parallel search execution |

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
        "description": "Testing framework for JavaScript",
        "category": "development",
        "functionality": ["testing"],
        "userTypes": ["developer"],
        "interface": ["cli"],
        "deployment": ["local"],
        "pricingModel": "free"
      },
      "rrfScore": 0.92,
      "originalRankings": {
        "vector": { "rank": 1, "score": 0.95 },
        "traditional": { "rank": 2, "score": 0.88 }
      },
      "sourceCount": 2,
      "finalRank": 1,
      "sources": [
        {
          "source": "vector",
          "score": 0.95,
          "rank": 1
        },
        {
          "source": "traditional",
          "score": 0.88,
          "rank": 2
        }
      ],
      "metadata": {
        "vectorType": "semantic",
        "originalScore": 0.95
      }
    }
  ],
  "sourceAttribution": [
    {
      "source": "vector",
      "resultCount": 25,
      "searchTime": 120,
      "avgScore": 0.85,
      "weight": 1.0
    },
    {
      "source": "traditional",
      "resultCount": 18,
      "searchTime": 80,
      "avgScore": 0.78,
      "weight": 0.9
    },
    {
      "source": "hybrid",
      "resultCount": 22,
      "searchTime": 150,
      "avgScore": 0.82,
      "weight": 0.95
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

**Response with Debug Information (when debug: true):**
```json
{
  // ... other fields ...
  "debug": {
    "executionPath": ["enhanced-search", "parallel-search", "merge-results", "duplicate-detection"],
    "sourceMetrics": {
      "vector": {
        "resultCount": 25,
        "searchTime": 120,
        "avgScore": 0.85,
        "weight": 1.0
      },
      "traditional": {
        "resultCount": 18,
        "searchTime": 80,
        "avgScore": 0.78,
        "weight": 0.9
      }
    },
    "mergeConfig": {
      "strategy": "reciprocal_rank_fusion",
      "rrfKValue": 60,
      "maxResults": 50
    },
    "duplicateDetectionConfig": {
      "enabled": true,
      "threshold": 0.8,
      "strategies": ["EXACT_ID", "CONTENT_SIMILARITY", "VERSION_AWARE"]
    }
  }
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "error": "Validation Error",
  "message": "Invalid request body",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-10-15T20:30:00.000Z",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "message": "Query is required",
      "path": ["query"]
    }
  ]
}
```

**408 Request Timeout:**
```json
{
  "error": "Timeout Error",
  "message": "Search request timed out after 5000ms",
  "code": "TIMEOUT_ERROR",
  "timestamp": "2025-10-15T20:30:00.000Z",
  "details": {
    "processingTime": 5000
  }
}
```

**503 Service Unavailable:**
```json
{
  "error": "Service Unavailable",
  "message": "Service connection failed",
  "code": "SERVICE_UNAVAILABLE",
  "timestamp": "2025-10-15T20:30:00.000Z"
}
```

---

### 2. Health Check

#### GET /api/search/enhanced/health

Checks the health of the enhanced search service and provides configuration information.

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

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-10-15T20:30:00.000Z",
  "service": "enhanced-search",
  "error": "Service connection failed"
}
```

---

### 3. Clear Cache

#### POST /api/search/enhanced/cache/clear

Clears the enhanced search cache and provides statistics about the cleared entries.

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

**Error Response (500 Internal Server Error):**
```json
{
  "error": "Cache Clear Error",
  "message": "Failed to clear cache",
  "code": "CACHE_CLEAR_ERROR",
  "timestamp": "2025-10-15T20:30:00.000Z"
}
```

---

### 4. Get Configuration

#### GET /api/search/enhanced/config

Retrieves the current enhanced search configuration (sanitized for security).

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
      },
      "hybrid": {
        "enabled": true,
        "weight": 0.95,
        "timeout": 4000
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

---

### 5. Update Configuration

#### PUT /api/search/enhanced/config

Updates the enhanced search configuration at runtime.

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

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| config | object | Yes | Configuration object with updated values |

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

**Error Response (400 Bad Request):**
```json
{
  "error": "Validation Error",
  "message": "Config object is required",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-10-15T20:30:00.000Z"
}
```

---

### 6. Get Statistics

#### GET /api/search/enhanced/stats

Retrieves performance statistics and metrics for the enhanced search service.

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

**Error Response (500 Internal Server Error):**
```json
{
  "error": "Stats Error",
  "message": "Failed to retrieve statistics",
  "code": "STATS_ERROR",
  "timestamp": "2025-10-15T20:30:00.000Z"
}
```

## Data Schemas

### Enhanced Search Request Schema

```typescript
interface EnhancedSearchRequest {
  query: string;                                    // Required: Search query (1-500 chars)
  options: {
    sources: {
      vector: boolean;                              // Enable vector search
      traditional: boolean;                         // Enable traditional search
      hybrid: boolean;                              // Enable hybrid search
    };
    vectorOptions: {
      vectorTypes: string[];                        // Vector types to search
      limit: number;                                // Max results per vector type
      filter?: Record<string, any>;                 // Additional filters
    };
    mergeOptions: {
      strategy: 'reciprocal_rank_fusion' | 'weighted_average' | 'hybrid';
      rrfKValue: number;                            // RRF K value
      maxResults: number;                           // Max results after merging
      sourceWeights: Record<string, number>;        // Source weights
    };
    duplicateDetectionOptions: {
      enabled: boolean;                             // Enable duplicate detection
      useEnhancedDetection: boolean;                // Use enhanced algorithms
      threshold: number;                            // Similarity threshold
      strategies: Array<                           // Detection strategies
        'EXACT_ID' | 'EXACT_URL' | 'CONTENT_SIMILARITY' | 
        'VERSION_AWARE' | 'FUZZY_MATCH' | 'COMBINED'
      >;
    };
    pagination: {
      page: number;                                 // Page number
      limit: number;                                // Results per page
    };
    sort: {
      field: 'relevance' | 'name' | 'category' | 'score';
      order: 'asc' | 'desc';                       // Sort order
    };
    filters: {
      categories?: string[];                        // Category filters
      userTypes?: string[];                         // User type filters
      interfaces?: string[];                        // Interface filters
      deployment?: string[];                        // Deployment filters
      priceRange?: {
        min?: number;                               // Min price
        max?: number;                               // Max price
      };
    };
    performance: {
      timeout: number;                              // Request timeout
      enableCache: boolean;                         // Enable caching
      enableParallel: boolean;                      // Enable parallel execution
    };
    debug: boolean;                                 // Enable debug info
    includeMetadata: boolean;                       // Include metadata
    includeSourceAttribution: boolean;              // Include source attribution
  };
}
```

### Enhanced Search Response Schema

```typescript
interface EnhancedSearchResponse {
  query: string;                                    // Original query
  requestId: string;                                // Unique request ID
  timestamp: string;                                // Response timestamp
  
  // Results summary
  summary: {
    totalResults: number;                           // Total results found
    returnedResults: number;                        // Results returned
    processingTime: number;                         // Total processing time (ms)
    sourcesSearched: string[];                      // Sources that were searched
    duplicatesRemoved: number;                      // Number of duplicates removed
    searchStrategy: string;                         // Search strategy used
  };
  
  // Results array
  results: Array<{
    id: string;                                     // Result ID
    score: number;                                  // Original confidence score
    payload: any;                                   // Result data
    rrfScore: number;                               // Reciprocal rank fusion score
    originalRankings: Record<string, {              // Original rankings by source
      rank: number;
      score: number;
    }>;
    sourceCount: number;                            // Number of sources contributing
    finalRank: number;                              // Final rank after merging
    sources?: Array<{                               // Source attribution
      source: string;
      score: number;
      rank: number;
    }>;
    metadata?: any;                                 // Additional metadata
  }>;
  
  // Source attribution
  sourceAttribution?: Array<{
    source: string;                                 // Source name
    resultCount: number;                            // Results from this source
    searchTime: number;                             // Search time for this source
    avgScore: number;                               // Average score from this source
    weight: number;                                 // Source weight
  }>;
  
  // Duplicate detection info
  duplicateDetection?: {
    enabled: boolean;                               // Whether detection was enabled
    duplicatesRemoved: number;                      // Number of duplicates removed
    duplicateGroups: number;                        // Number of duplicate groups
    strategies: string[];                           // Strategies used
    processingTime: number;                         // Processing time (ms)
  };
  
  // Performance metrics
  metrics: {
    totalProcessingTime: number;                    // Total processing time
    searchTime: number;                             // Time spent searching
    mergeTime: number;                              // Time spent merging
    deduplicationTime: number;                      // Time spent deduplicating
    cacheHitRate: number;                           // Cache hit rate
  };
  
  // Debug information (when debug: true)
  debug?: {
    executionPath: string[];                        // Execution path
    sourceMetrics: Record<string, any>;             // Source-specific metrics
    mergeConfig: any;                               // Merge configuration
    duplicateDetectionConfig: any;                  // Duplicate detection config
  };
  
  // Pagination info
  pagination: {
    page: number;                                   // Current page
    limit: number;                                  // Results per page
    totalPages: number;                             // Total pages
    hasNext: boolean;                               // Has next page
    hasPrev: boolean;                               // Has previous page
  };
}
```

## Advanced Features

### Reciprocal Rank Fusion (RRF)

The Enhanced Search API uses Reciprocal Rank Fusion to combine results from multiple search sources:

- **RRF Formula**: `RRF_score = Σ(1 / (k + rank_i))` where `k` is the RRF K value and `rank_i` is the rank in source i
- **Default K Value**: 60 (configurable via `mergeOptions.rrfKValue`)
- **Benefits**: Handles different score scales, emphasizes top-ranked results, and reduces bias from any single source

### Duplicate Detection Strategies

The API supports multiple duplicate detection strategies:

1. **EXACT_ID**: Matches exact IDs
2. **EXACT_URL**: Matches exact URLs
3. **CONTENT_SIMILARITY**: Uses content similarity algorithms
4. **VERSION_AWARE**: Considers version differences
5. **FUZZY_MATCH**: Uses fuzzy string matching
6. **COMBINED**: Combines multiple strategies

### Caching Strategy

- **Cache Key**: Generated from query and relevant options
- **TTL**: 5 minutes default (configurable)
- **Cache Size Management**: Automatic cleanup when size exceeds 100 entries
- **Cache Hit Rate**: Tracked in metrics

### Parallel Execution

- **Concurrent Searches**: Executes searches across multiple sources in parallel
- **Timeout Handling**: Individual source timeouts to prevent blocking
- **Error Isolation**: Failed sources don't prevent other sources from completing

## Performance Optimization

### Recommended Configurations

**For High Performance:**
```json
{
  "options": {
    "performance": {
      "enableCache": true,
      "enableParallel": true,
      "timeout": 3000
    },
    "sources": {
      "vector": true,
      "traditional": false,
      "hybrid": false
    }
  }
}
```

**For High Quality:**
```json
{
  "options": {
    "sources": {
      "vector": true,
      "traditional": true,
      "hybrid": true
    },
    "duplicateDetectionOptions": {
      "enabled": true,
      "useEnhancedDetection": true,
      "threshold": 0.9
    },
    "mergeOptions": {
      "strategy": "reciprocal_rank_fusion",
      "maxResults": 100
    }
  }
}
```

**For Balanced Performance:**
```json
{
  "options": {
    "sources": {
      "vector": true,
      "traditional": true,
      "hybrid": false
    },
    "duplicateDetectionOptions": {
      "enabled": true,
      "threshold": 0.8
    },
    "performance": {
      "timeout": 5000,
      "enableCache": true
    }
  }
}
```

## Error Handling

### HTTP Status Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Validation errors, missing parameters |
| 408 | Request Timeout | Search timeout exceeded |
| 500 | Internal Server Error | Service errors, unexpected failures |
| 503 | Service Unavailable | External service failures |

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-10-15T20:30:00.000Z",
  "requestId": "optional-request-id",
  "details": {
    // Additional error details (development mode only)
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `TIMEOUT_ERROR`: Search request timed out
- `SERVICE_UNAVAILABLE`: External service unavailable
- `CACHE_CLEAR_ERROR`: Failed to clear cache
- `CONFIG_ERROR`: Configuration error
- `STATS_ERROR`: Statistics retrieval error

## Rate Limiting

Currently, no rate limiting is implemented. This is planned for future releases.

## Usage Examples

### Basic Search

```bash
curl -X POST http://localhost:4003/api/search/enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React testing tools",
    "options": {
      "pagination": {
        "limit": 10
      }
    }
  }'
```

### Advanced Search with All Features

```bash
curl -X POST http://localhost:4003/api/search/enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React testing libraries",
    "options": {
      "sources": {
        "vector": true,
        "traditional": true,
        "hybrid": true
      },
      "vectorOptions": {
        "vectorTypes": ["semantic", "categories"],
        "limit": 30
      },
      "mergeOptions": {
        "strategy": "reciprocal_rank_fusion",
        "rrfKValue": 60,
        "maxResults": 50,
        "sourceWeights": {
          "semantic": 1.2,
          "traditional": 0.8
        }
      },
      "duplicateDetectionOptions": {
        "enabled": true,
        "threshold": 0.85,
        "strategies": ["EXACT_ID", "CONTENT_SIMILARITY", "VERSION_AWARE"]
      },
      "filters": {
        "categories": ["development"],
        "userTypes": ["developer"]
      },
      "sort": {
        "field": "relevance",
        "order": "desc"
      },
      "performance": {
        "timeout": 8000,
        "enableCache": true
      },
      "debug": true
    }
  }'
```

### Health Check

```bash
curl -X GET http://localhost:4003/api/search/enhanced/health
```

### Clear Cache

```bash
curl -X POST http://localhost:4003/api/search/enhanced/cache/clear
```

### Get Configuration

```bash
curl -X GET http://localhost:4003/api/search/enhanced/config
```

### Update Configuration

```bash
curl -X PUT http://localhost:4003/api/search/enhanced/config \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "defaultMergeStrategy": "hybrid",
      "enableCache": false,
      "maxConcurrentSearches": 3
    }
  }'
```

### Get Statistics

```bash
curl -X GET http://localhost:4003/api/search/enhanced/stats
```

## SDK Examples

### JavaScript/TypeScript

```typescript
// Basic enhanced search
const searchResponse = await fetch('http://localhost:4003/api/search/enhanced', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'React testing tools',
    options: {
      pagination: { limit: 20 },
      sources: { vector: true, traditional: true }
    }
  })
});

const searchResults = await searchResponse.json();
console.log(`Found ${searchResults.summary.returnedResults} results`);

// Advanced search with duplicate detection
const advancedResponse = await fetch('http://localhost:4003/api/search/enhanced', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'TypeScript form validation',
    options: {
      sources: { vector: true, traditional: true, hybrid: true },
      duplicateDetectionOptions: {
        enabled: true,
        threshold: 0.9,
        strategies: ['CONTENT_SIMILARITY', 'VERSION_AWARE']
      },
      mergeOptions: {
        strategy: 'reciprocal_rank_fusion',
        rrfKValue: 80
      },
      debug: true
    }
  })
});

const advancedResults = await advancedResponse.json();
console.log('Performance metrics:', advancedResults.metrics);

// Update configuration
const configResponse = await fetch('http://localhost:4003/api/search/enhanced/config', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    config: {
      enableCache: false,
      defaultMergeStrategy: 'hybrid'
    }
  })
});

const configResult = await configResponse.json();
console.log('Configuration updated:', configResult.message);
```

### Python

```python
import requests
import json

# Basic enhanced search
search_response = requests.post('http://localhost:4003/api/search/enhanced', json={
    'query': 'React testing tools',
    'options': {
        'pagination': {'limit': 20},
        'sources': {'vector': True, 'traditional': True}
    }
})

search_results = search_response.json()
print(f"Found {search_results['summary']['returnedResults']} results")
print(f"Processing time: {search_results['summary']['processingTime']}ms")

# Advanced search
advanced_response = requests.post('http://localhost:4003/api/search/enhanced', json={
    'query': 'Machine learning frameworks',
    'options': {
        'sources': {'vector': True, 'traditional': True, 'hybrid': True},
        'duplicateDetectionOptions': {
            'enabled': True,
            'threshold': 0.85,
            'strategies': ['EXACT_ID', 'CONTENT_SIMILARITY']
        },
        'filters': {
            'categories': ['development'],
            'userTypes': ['developer']
        },
        'sort': {'field': 'relevance', 'order': 'desc'}
    }
})

advanced_results = advanced_response.json()
print(f"Sources searched: {advanced_results['summary']['sourcesSearched']}")
print(f"Duplicates removed: {advanced_results['summary']['duplicatesRemoved']}")

# Get statistics
stats_response = requests.get('http://localhost:4003/api/search/enhanced/stats')
stats = stats_response.json()
print(f"Cache hit rate: {stats['performance']['cacheHitRate']:.2%}")
```

### Node.js with Axios

```javascript
const axios = require('axios');

class EnhancedSearchClient {
  constructor(baseURL = 'http://localhost:4003/api/search/enhanced') {
    this.baseURL = baseURL;
  }

  async search(query, options = {}) {
    try {
      const response = await axios.post(`${this.baseURL}`, {
        query,
        options
      });
      return response.data;
    } catch (error) {
      throw new Error(`Search failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getConfig() {
    try {
      const response = await axios.get(`${this.baseURL}/config`);
      return response.data;
    } catch (error) {
      throw new Error(`Get config failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async updateConfig(config) {
    try {
      const response = await axios.put(`${this.baseURL}/config`, { config });
      return response.data;
    } catch (error) {
      throw new Error(`Update config failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async clearCache() {
    try {
      const response = await axios.post(`${this.baseURL}/cache/clear`);
      return response.data;
    } catch (error) {
      throw new Error(`Clear cache failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getStats() {
    try {
      const response = await axios.get(`${this.baseURL}/stats`);
      return response.data;
    } catch (error) {
      throw new Error(`Get stats failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Usage example
const client = new EnhancedSearchClient();

// Perform search
const results = await client.search('React testing libraries', {
  sources: { vector: true, traditional: true },
  duplicateDetectionOptions: { enabled: true, threshold: 0.8 },
  pagination: { limit: 10 }
});

console.log(`Found ${results.summary.returnedResults} results in ${results.summary.processingTime}ms`);

// Check health
const health = await client.healthCheck();
console.log('Service status:', health.status);

// Get statistics
const stats = await client.getStats();
console.log('Cache hit rate:', stats.performance.cacheHitRate);
```

## Best Practices

1. **Choose Appropriate Sources**: Enable only the sources you need for better performance
2. **Configure Timeouts**: Set appropriate timeouts based on your use case
3. **Use Caching**: Enable caching for frequently repeated queries
4. **Optimize Duplicate Detection**: Adjust thresholds based on your data characteristics
5. **Monitor Performance**: Use debug mode during development to optimize performance
6. **Handle Errors Gracefully**: Implement proper error handling for all API calls
7. **Use Pagination**: For large result sets, use pagination to improve response times
8. **Configure Source Weights**: Adjust source weights based on your data quality
9. **Monitor Cache Hit Rate**: Track cache performance to optimize TTL settings
10. **Use Health Checks**: Implement health checks in your application for monitoring

## Version Information

**Current API Version**: 1.0.0

**Versioning Strategy**: The API uses semantic versioning. Backward-compatible changes increment the patch version, breaking changes increment the major version.

## Migration Guide

### From Basic Search API

1. **Endpoint Changes**: Use `/api/search/enhanced` instead of `/search`
2. **Request Format**: Enhanced search uses a more structured request format
3. **Response Format**: Enhanced responses include additional metadata and metrics
4. **Configuration**: Enhanced search provides runtime configuration options
5. **Performance**: Enhanced search includes caching and parallel execution

### Future Compatibility

- New fields may be added to response objects
- New endpoints may be added
- Existing endpoints will maintain backward compatibility when possible
- Configuration options may be enhanced

## Support

For API support and questions:
- Check the health endpoint for service status
- Review the debug information for troubleshooting
- Monitor performance metrics for optimization
- Check the main API documentation for additional context

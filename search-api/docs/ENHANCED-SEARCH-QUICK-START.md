# Enhanced Search API - Quick Start Guide

## Overview

The Enhanced Search API provides advanced search capabilities that combine results from multiple search sources, apply sophisticated result merging algorithms using reciprocal rank fusion, and perform intelligent duplicate detection. This API is designed to replace the basic search endpoint with enhanced functionality.

## 🚀 Quick Start

### Base URL
```
http://localhost:4004/api/search/enhanced
```

### Health Check
```bash
curl -X GET http://localhost:4004/api/search/enhanced/health
```

### Basic Search
```bash
curl -X POST http://localhost:4004/api/search/enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React testing tools",
    "options": {
      "pagination": {
        "page": 1,
        "limit": 10
      }
    }
  }'
```

## 📋 Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search/enhanced` | Main enhanced search endpoint |
| GET | `/api/search/enhanced/health` | Health check and service status |
| GET | `/api/search/enhanced/config` | Get current configuration |
| PUT | `/api/search/enhanced/config` | Update configuration |
| POST | `/api/search/enhanced/cache/clear` | Clear search cache |
| GET | `/api/search/enhanced/stats` | Get performance statistics |

## 🔧 Search Configuration

### Request Structure
```json
{
  "query": "your search query",
  "options": {
    "sources": {
      "vector": true,
      "traditional": true,
      "hybrid": false
    },
    "vectorOptions": {
      "vectorTypes": ["semantic", "categories", "functionality"],
      "limit": 20,
      "filter": {}
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
      "interfaces": ["web"]
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

### Response Structure
```json
{
  "query": "React testing tools",
  "requestId": "508ff705-9e58-44e6-af84-223428d25d67",
  "timestamp": "2025-10-16T08:55:32.953Z",
  "summary": {
    "totalResults": 15,
    "returnedResults": 10,
    "processingTime": 478,
    "sourcesSearched": ["vector", "traditional"],
    "duplicatesRemoved": 7,
    "searchStrategy": "reciprocal_rank_fusion"
  },
  "results": [
    {
      "id": "tool-1",
      "score": 0.95,
      "payload": {
        "name": "React Testing Library",
        "description": "Testing utilities for React",
        "categories": ["development", "testing"]
      },
      "rrfScore": 0.89,
      "originalRankings": {
        "vector": { "rank": 1, "score": 0.95 },
        "traditional": { "rank": 2, "score": 0.87 }
      },
      "sourceCount": 2,
      "finalRank": 1
    }
  ],
  "sourceAttribution": [
    {
      "source": "vector",
      "resultCount": 12,
      "searchTime": 475,
      "avgScore": 0.82,
      "weight": 1.0
    },
    {
      "source": "traditional",
      "resultCount": 10,
      "searchTime": 445,
      "avgScore": 0.79,
      "weight": 0.9
    }
  ],
  "duplicateDetection": {
    "enabled": true,
    "duplicatesRemoved": 7,
    "duplicateGroups": 3,
    "strategies": ["EXACT_ID", "CONTENT_SIMILARITY", "VERSION_AWARE"],
    "processingTime": 2
  },
  "metrics": {
    "totalProcessingTime": 478,
    "searchTime": 476,
    "mergeTime": 0,
    "deduplicationTime": 2,
    "cacheHitRate": 0
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🎯 Use Cases

### 1. Basic Search
```javascript
const response = await fetch('http://localhost:4004/api/search/enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'React testing tools',
    options: {
      pagination: { limit: 20 }
    }
  })
});
```

### 2. Search with Filters
```javascript
const response = await fetch('http://localhost:4004/api/search/enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'web development',
    options: {
      filters: {
        categories: ['development'],
        interfaces: ['web']
      }
    }
  })
});
```

### 3. High Precision Search
```javascript
const response = await fetch('http://localhost:4004/api/search/enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'API testing',
    options: {
      sources: {
        vector: true,
        traditional: true,
        hybrid: false
      },
      duplicateDetectionOptions: {
        enabled: true,
        threshold: 0.9,
        strategies: ['CONTENT_SIMILARITY', 'VERSION_AWARE']
      },
      mergeOptions: {
        strategy: 'reciprocal_rank_fusion',
        rrfKValue: 80
      }
    }
  })
});
```

### 4. Debug Mode
```javascript
const response = await fetch('http://localhost:4004/api/search/enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'debug search',
    options: {
      debug: true,
      includeMetadata: true,
      includeSourceAttribution: true
    }
  })
});
```

## 🧪 Testing

### Automated Test Script
Run the comprehensive test script included in the project:

```bash
cd search-api
node test-enhanced-search-endpoint.js
```

This script includes 6 different test scenarios:
1. Basic Search
2. Vector Only Search
3. Traditional Only Search
4. Hybrid Search with Duplicate Detection
5. Search with Filters
6. Debug Mode Search

### Manual Testing with curl
```bash
# Test health endpoint
curl -X GET http://localhost:4004/api/search/enhanced/health

# Test basic search
curl -X POST http://localhost:4004/api/search/enhanced \
  -H "Content-Type: application/json" \
  -d '{"query":"testing","options":{"pagination":{"limit":5}}}'

# Test with debug mode
curl -X POST http://localhost:4004/api/search/enhanced \
  -H "Content-Type: application/json" \
  -d '{"query":"React","options":{"debug":true}}'
```

## ⚙️ Configuration

### Get Current Configuration
```bash
curl -X GET http://localhost:4004/api/search/enhanced/config
```

### Update Configuration
```bash
curl -X PUT http://localhost:4004/api/search/enhanced/config \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "defaultMergeStrategy": "hybrid",
      "enableCache": false,
      "maxConcurrentSearches": 3
    }
  }'
```

## 📊 Monitoring

### Get Statistics
```bash
curl -X GET http://localhost:4004/api/search/enhanced/stats
```

### Clear Cache
```bash
curl -X POST http://localhost:4004/api/search/enhanced/cache/clear
```

## 🔍 Advanced Features

### Duplicate Detection Strategies
- `EXACT_ID`: Match by exact ID
- `EXACT_URL`: Match by exact URL
- `CONTENT_SIMILARITY`: Content-based similarity
- `VERSION_AWARE`: Version-aware matching
- `FUZZY_MATCH`: Fuzzy string matching
- `COMBINED`: Combined strategy approach

### Merge Strategies
- `reciprocal_rank_fusion`: RRF algorithm for result merging
- `weighted_average`: Weighted average scoring
- `hybrid`: Hybrid approach combining multiple strategies

### Source Types
- `vector`: Semantic vector search
- `traditional`: Traditional text search
- `hybrid`: Hybrid vector + text search

## 🚨 Error Handling

The API returns detailed error responses:

```json
{
  "error": "Validation Error",
  "message": "Query is required",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-10-16T08:55:32.953Z",
  "details": {
    "field": "query",
    "issue": "missing_required"
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Invalid request parameters
- `TIMEOUT_ERROR`: Search timeout
- `SERVICE_UNAVAILABLE`: Service issues
- `SEARCH_ERROR`: General search failures

## 📈 Performance Tips

1. **Enable Caching**: Set `enableCache: true` for repeated queries
2. **Use Filters**: Apply category/interface filters to reduce result sets
3. **Optimize Sources**: Disable unnecessary search sources
4. **Adjust Timeout**: Set appropriate timeouts for your use case
5. **Batch Requests**: Use pagination for large result sets

## 🔄 Migration from Basic Search

To migrate from the basic `/search` endpoint:

1. **Update Endpoint**: Change from `/search` to `/api/search/enhanced`
2. **Update Request Format**: Use the new structured request format
3. **Handle Enhanced Responses**: Process the additional metadata and metrics
4. **Update Error Handling**: Use the enhanced error response format
5. **Testing**: Use the provided test script to verify functionality

## 📚 Additional Resources

- [Enhanced Search API Documentation](./enhanced-search-api.md)
- [Integration Guide](./integration-guide.md)
- [API Reference](./API-REFERENCE.md)
- [Test Script](../test-enhanced-search-endpoint.js)

---

## 🎉 Summary

The Enhanced Search API is now fully operational and ready for manual testing. The endpoint provides:

✅ **No Authentication Required** - Open for testing
✅ **Simple Configuration** - Easy to use with sensible defaults
✅ **Complete Replacement** - Replaces the basic search endpoint
✅ **Advanced Features** - Multi-source search, result merging, duplicate detection
✅ **Comprehensive Testing** - Automated test script included
✅ **Detailed Documentation** - Complete API reference and examples

The system has been successfully tested and is ready for integration and further development.

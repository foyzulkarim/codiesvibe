# Enhanced Search API Integration Guide

## Overview

This guide provides step-by-step instructions for integrating the Enhanced Search API into your applications. The Enhanced Search API offers advanced search capabilities with result merging, duplicate detection, and comprehensive performance metrics.

## Prerequisites

- Node.js 16+ or alternative runtime environment
- HTTP client library (axios, fetch, etc.)
- Basic understanding of REST APIs and JSON
- Access to the Enhanced Search API endpoint

## Quick Start

### 1. Basic Search Integration

#### JavaScript/TypeScript

```javascript
// Install axios if needed: npm install axios
const axios = require('axios');

async performBasicSearch(query) {
  try {
    const response = await axios.post('http://localhost:4003/api/search/enhanced', {
      query: query,
      options: {
        pagination: {
          limit: 20
        }
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Search failed:', error.response?.data || error.message);
    throw error;
  }
}

// Usage example
const results = await performBasicSearch('React testing tools');
console.log(`Found ${results.summary.returnedResults} results`);
```

#### Python

```python
import requests
import json

def perform_basic_search(query):
    try:
        response = requests.post(
            'http://localhost:4003/api/search/enhanced',
            json={
                'query': query,
                'options': {
                    'pagination': {'limit': 20}
                }
            }
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as error:
        print(f'Search failed: {error.response.json() if error.response else error}')
        raise

# Usage example
results = perform_basic_search('React testing tools')
print(f"Found {results['summary']['returnedResults']} results")
```

#### cURL

```bash
#!/bin/bash

perform_basic_search() {
  local query="$1"
  
  curl -X POST "http://localhost:4003/api/search/enhanced" \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"$query\",
      \"options\": {
        \"pagination\": {
          \"limit\": 20
        }
      }
    }"
}

# Usage example
results=$(perform_basic_search "React testing tools")
echo "$results"
```

### 2. Advanced Search Integration

#### JavaScript/TypeScript with Full Configuration

```javascript
class EnhancedSearchClient {
  constructor(baseURL = 'http://localhost:4003/api/search/enhanced') {
    this.baseURL = baseURL;
    this.defaultOptions = {
      sources: {
        vector: true,
        traditional: true,
        hybrid: false
      },
      duplicateDetectionOptions: {
        enabled: true,
        threshold: 0.8,
        strategies: ['EXACT_ID', 'CONTENT_SIMILARITY', 'VERSION_AWARE']
      },
      mergeOptions: {
        strategy: 'reciprocal_rank_fusion',
        rrfKValue: 60,
        maxResults: 50
      },
      performance: {
        timeout: 5000,
        enableCache: true,
        enableParallel: true
      }
    };
  }

  async search(query, options = {}) {
    try {
      const searchOptions = this.mergeOptions(this.defaultOptions, options);
      
      const response = await axios.post(`${this.baseURL}`, {
        query,
        options: searchOptions
      });
      
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async searchWithFilters(query, filters = {}) {
    return this.search(query, {
      filters,
      debug: true
    });
  }

  async paginatedSearch(query, page = 1, limit = 20) {
    return this.search(query, {
      pagination: { page, limit },
      sort: { field: 'relevance', order: 'desc' }
    });
  }

  mergeOptions(defaults, overrides) {
    return {
      ...defaults,
      ...overrides,
      sources: { ...defaults.sources, ...overrides.sources },
      duplicateDetectionOptions: { 
        ...defaults.duplicateDetectionOptions, 
        ...overrides.duplicateDetectionOptions 
      },
      mergeOptions: { ...defaults.mergeOptions, ...overrides.mergeOptions },
      performance: { ...defaults.performance, ...overrides.performance }
    };
  }

  handleError(error) {
    const errorData = error.response?.data;
    
    switch (errorData?.code) {
      case 'VALIDATION_ERROR':
        throw new Error(`Validation failed: ${errorData.message}`);
      case 'TIMEOUT_ERROR':
        throw new Error(`Search timeout: ${errorData.message}`);
      case 'SERVICE_UNAVAILABLE':
        throw new Error(`Service unavailable: ${errorData.message}`);
      default:
        throw new Error(`Search failed: ${errorData?.message || error.message}`);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Configuration management
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

  // Cache management
  async clearCache() {
    try {
      const response = await axios.post(`${this.baseURL}/cache/clear`);
      return response.data;
    } catch (error) {
      throw new Error(`Clear cache failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Statistics
  async getStats() {
    try {
      const response = await axios.get(`${this.baseURL}/stats`);
      return response.data;
    } catch (error) {
      throw new Error(`Get stats failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Usage examples
const client = new EnhancedSearchClient();

// Basic search
const basicResults = await client.search('React testing tools');

// Advanced search with filters
const filteredResults = await client.searchWithFilters('React testing libraries', {
  categories: ['development'],
  userTypes: ['developer'],
  interfaces: ['web', 'cli']
});

// Paginated search
const page1 = await client.paginatedSearch('React testing', 1, 10);
const page2 = await client.paginatedSearch('React testing', 2, 10);

// Health check
const health = await client.healthCheck();
console.log('Service status:', health.status);
```

#### Python Advanced Integration

```python
import requests
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum

class MergeStrategy(Enum):
    RECIPROCAL_RANK_FUSION = "reciprocal_rank_fusion"
    WEIGHTED_AVERAGE = "weighted_average"
    HYBRID = "hybrid"

class SortField(Enum):
    RELEVANCE = "relevance"
    NAME = "name"
    CATEGORY = "category"
    SCORE = "score"

class SortOrder(Enum):
    ASC = "asc"
    DESC = "desc"

@dataclass
class SearchOptions:
    sources: Dict[str, bool] = None
    vector_options: Dict[str, Any] = None
    merge_options: Dict[str, Any] = None
    duplicate_detection_options: Dict[str, Any] = None
    pagination: Dict[str, int] = None
    sort: Dict[str, str] = None
    filters: Dict[str, Any] = None
    performance: Dict[str, Any] = None
    debug: bool = False
    include_metadata: bool = True
    include_source_attribution: bool = True

    def __post_init__(self):
        if self.sources is None:
            self.sources = {"vector": True, "traditional": True, "hybrid": False}
        if self.merge_options is None:
            self.merge_options = {
                "strategy": MergeStrategy.RECIPROCAL_RANK_FUSION.value,
                "rrfKValue": 60,
                "maxResults": 50
            }
        if self.duplicate_detection_options is None:
            self.duplicate_detection_options = {
                "enabled": True,
                "threshold": 0.8,
                "strategies": ["EXACT_ID", "CONTENT_SIMILARITY", "VERSION_AWARE"]
            }
        if self.pagination is None:
            self.pagination = {"page": 1, "limit": 20}
        if self.sort is None:
            self.sort = {"field": SortField.RELEVANCE.value, "order": SortOrder.DESC.value}
        if self.performance is None:
            self.performance = {"timeout": 5000, "enableCache": True, "enableParallel": True}

class EnhancedSearchClient:
    def __init__(self, base_url: str = "http://localhost:4003/api/search/enhanced"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def search(self, query: str, options: Optional[SearchOptions] = None) -> Dict[str, Any]:
        """Perform enhanced search with given query and options."""
        if options is None:
            options = SearchOptions()
        
        try:
            response = self.session.post(
                f"{self.base_url}",
                json={
                    "query": query,
                    "options": asdict(options)
                }
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as error:
            self._handle_error(error)

    def search_with_filters(
        self, 
        query: str, 
        categories: Optional[List[str]] = None,
        user_types: Optional[List[str]] = None,
        interfaces: Optional[List[str]] = None,
        deployment: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Search with specific filters."""
        filters = {}
        if categories:
            filters["categories"] = categories
        if user_types:
            filters["userTypes"] = user_types
        if interfaces:
            filters["interfaces"] = interfaces
        if deployment:
            filters["deployment"] = deployment

        options = SearchOptions(filters=filters, debug=True)
        return self.search(query, options)

    def search_by_category(self, query: str, category: str, limit: int = 20) -> Dict[str, Any]:
        """Search within a specific category."""
        return self.search_with_filters(query, categories=[category])

    def paginated_search(self, query: str, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        """Perform paginated search."""
        options = SearchOptions(pagination={"page": page, "limit": limit})
        return self.search(query, options)

    def vector_search(self, query: str, vector_types: List[str] = None) -> Dict[str, Any]:
        """Perform vector-only search."""
        options = SearchOptions(
            sources={"vector": True, "traditional": False, "hybrid": False},
            vector_options={"vectorTypes": vector_types or ["semantic"]}
        )
        return self.search(query, options)

    def hybrid_search(self, query: str, rrf_k_value: int = 60) -> Dict[str, Any]:
        """Perform hybrid search with custom RRF configuration."""
        options = SearchOptions(
            sources={"vector": True, "traditional": True, "hybrid": True},
            merge_options={"strategy": MergeStrategy.HYBRID.value, "rrfKValue": rrf_k_value}
        )
        return self.search(query, options)

    def _handle_error(self, error: requests.exceptions.RequestException):
        """Handle API errors appropriately."""
        if error.response:
            error_data = error.response.json()
            error_code = error_data.get("code", "UNKNOWN_ERROR")
            error_message = error_data.get("message", "Unknown error")
            
            if error_code == "VALIDATION_ERROR":
                raise ValueError(f"Validation failed: {error_message}")
            elif error_code == "TIMEOUT_ERROR":
                raise TimeoutError(f"Search timeout: {error_message}")
            elif error_code == "SERVICE_UNAVAILABLE":
                raise ConnectionError(f"Service unavailable: {error_message}")
            else:
                raise Exception(f"Search failed ({error_code}): {error_message}")
        else:
            raise Exception(f"Network error: {error}")

    def health_check(self) -> Dict[str, Any]:
        """Check service health."""
        try:
            response = self.session.get(f"{self.base_url}/health")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as error:
            raise Exception(f"Health check failed: {error}")

    def get_config(self) -> Dict[str, Any]:
        """Get current configuration."""
        try:
            response = self.session.get(f"{self.base_url}/config")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as error:
            raise Exception(f"Get config failed: {error}")

    def update_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Update configuration."""
        try:
            response = self.session.put(f"{self.base_url}/config", json={"config": config})
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as error:
            raise Exception(f"Update config failed: {error}")

    def clear_cache(self) -> Dict[str, Any]:
        """Clear search cache."""
        try:
            response = self.session.post(f"{self.base_url}/cache/clear")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as error:
            raise Exception(f"Clear cache failed: {error}")

    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics."""
        try:
            response = self.session.get(f"{self.base_url}/stats")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as error:
            raise Exception(f"Get stats failed: {error}")

# Usage examples
client = EnhancedSearchClient()

# Basic search
results = client.search("React testing tools")
print(f"Found {results['summary']['returnedResults']} results")

# Search with filters
filtered_results = client.search_with_filters(
    "React testing libraries",
    categories=["development"],
    user_types=["developer"]
)

# Paginated search
page_1 = client.paginated_search("React testing", 1, 10)
page_2 = client.paginated_search("React testing", 2, 10)

# Vector-only search
vector_results = client.vector_search("React testing", ["semantic", "categories"])

# Health check
health = client.health_check()
print(f"Service status: {health['status']}")
```

## Integration Patterns

### 1. React Component Integration

```jsx
// ReactSearchComponent.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SearchComponent = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const searchClient = new EnhancedSearchClient();

  const performSearch = async (searchQuery, page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await searchClient.paginatedSearch(searchQuery, page, 10);
      setResults(response.results);
      setPagination({
        page: response.pagination.page,
        totalPages: response.pagination.totalPages
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query);
    }
  };

  const handlePageChange = (newPage) => {
    performSearch(query, newPage);
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for tools..."
          className="search-input"
        />
        <button type="submit" disabled={loading} className="search-button">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {results.length > 0 && (
        <div className="results-container">
          <h3>Results ({results.length})</h3>
          {results.map((result, index) => (
            <div key={result.id} className="result-item">
              <h4>{result.payload.name}</h4>
              <p>{result.payload.description}</p>
              <div className="result-meta">
                <span>Score: {result.score.toFixed(2)}</span>
                <span>RRF Score: {result.rrfScore.toFixed(2)}</span>
                <span>Sources: {result.sourceCount}</span>
              </div>
            </div>
          ))}
          
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
```

### 2. Vue.js Integration

```vue
<!-- EnhancedSearch.vue -->
<template>
  <div class="enhanced-search">
    <form @submit.prevent="performSearch" class="search-form">
      <input
        v-model="query"
        type="text"
        placeholder="Search for tools..."
        class="search-input"
      />
      <button type="submit" :disabled="loading" class="search-button">
        {{ loading ? 'Searching...' : 'Search' }}
      </button>
    </form>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="results.length > 0" class="results-container">
      <h3>Results ({{ results.length }})</h3>
      <div v-for="result in results" :key="result.id" class="result-item">
        <h4>{{ result.payload.name }}</h4>
        <p>{{ result.payload.description }}</p>
        <div class="result-meta">
          <span>Score: {{ result.score.toFixed(2) }}</span>
          <span>RRF Score: {{ result.rrfScore.toFixed(2) }}</span>
          <span>Sources: {{ result.sourceCount }}</span>
        </div>
      </div>
      
      <div v-if="pagination.totalPages > 1" class="pagination">
        <button
          @click="changePage(pagination.page - 1)"
          :disabled="pagination.page === 1"
        >
          Previous
        </button>
        <span>
          Page {{ pagination.page }} of {{ pagination.totalPages }}
        </span>
        <button
          @click="changePage(pagination.page + 1)"
          :disabled="pagination.page === pagination.totalPages"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'EnhancedSearch',
  data() {
    return {
      query: '',
      results: [],
      loading: false,
      error: null,
      pagination: {
        page: 1,
        totalPages: 1
      }
    };
  },
  methods: {
    async performSearch() {
      if (!this.query.trim()) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.post('http://localhost:4003/api/search/enhanced', {
          query: this.query,
          options: {
            pagination: {
              page: this.pagination.page,
              limit: 10
            }
          }
        });
        
        this.results = response.data.results;
        this.pagination = response.data.pagination;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
      } finally {
        this.loading = false;
      }
    },
    
    async changePage(newPage) {
      this.pagination.page = newPage;
      await this.performSearch();
    }
  }
};
</script>
```

### 3. Node.js Express Integration

```javascript
// Enhanced Search middleware for Express
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Enhanced search client
const searchClient = {
  baseURL: 'http://localhost:4003/api/search/enhanced',
  
  async search(query, options = {}) {
    const response = await axios.post(`${this.baseURL}`, {
      query,
      options
    });
    return response.data;
  },
  
  async healthCheck() {
    const response = await axios.get(`${this.baseURL}/health`);
    return response.data;
  }
};

// Middleware to check enhanced search health
router.use(async (req, res, next) => {
  try {
    const health = await searchClient.healthCheck();
    if (health.status !== 'healthy') {
      return res.status(503).json({
        error: 'Enhanced search service unavailable',
        status: health.status
      });
    }
    next();
  } catch (error) {
    res.status(503).json({
      error: 'Enhanced search service check failed',
      message: error.message
    });
  }
});

// Search endpoint with caching
const searchCache = new Map();

router.post('/search', async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query is required'
      });
    }
    
    // Generate cache key
    const cacheKey = `${query}:${JSON.stringify(options)}`;
    
    // Check cache
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes
        return res.json(cached.data);
      }
    }
    
    // Perform search
    const results = await searchClient.search(query, {
      ...options,
      performance: {
        ...options.performance,
        enableCache: false // Disable server-side cache for this proxy
      }
    });
    
    // Cache results
    searchCache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (searchCache.size > 100) {
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }
    
    res.json(results);
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || {
      error: 'Internal server error',
      message: error.message
    };
    
    res.status(statusCode).json(errorData);
  }
});

// Search by category
router.post('/search/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { query, options = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query is required'
      });
    }
    
    const results = await searchClient.search(query, {
      ...options,
      filters: {
        ...options.filters,
        categories: [category]
      }
    });
    
    res.json(results);
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || {
      error: 'Internal server error',
      message: error.message
    };
    
    res.status(statusCode).json(errorData);
  }
});

module.exports = router;
```

### 4. Go Integration

```go
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Go client for Enhanced Search API
type EnhancedSearchClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

type SearchRequest struct {
	Query   string      `json:"query"`
	Options SearchOptions `json:"options"`
}

type SearchOptions struct {
	Sources                    map[string]interface{} `json:"sources,omitempty"`
	VectorOptions             map[string]interface{} `json:"vectorOptions,omitempty"`
	MergeOptions              map[string]interface{} `json:"mergeOptions,omitempty"`
	DuplicateDetectionOptions map[string]interface{} `json:"duplicateDetectionOptions,omitempty"`
	Pagination                map[string]int         `json:"pagination,omitempty"`
	Sort                      map[string]string      `json:"sort,omitempty"`
	Filters                   map[string]interface{} `json:"filters,omitempty"`
	Performance               map[string]interface{} `json:"performance,omitempty"`
	Debug                     bool                   `json:"debug,omitempty"`
}

type SearchResponse struct {
	Query       string                 `json:"query"`
	RequestID   string                 `json:"requestId"`
	Timestamp   string                 `json:"timestamp"`
	Summary     map[string]interface{} `json:"summary"`
	Results     []SearchResult         `json:"results"`
	Metrics     map[string]interface{} `json:"metrics"`
	Pagination  map[string]interface{} `json:"pagination"`
}

type SearchResult struct {
	ID              string                 `json:"id"`
	Score           float64                `json:"score"`
	Payload         map[string]interface{} `json:"payload"`
	RRFScore        float64                `json:"rrfScore"`
	OriginalRankings map[string]interface{} `json:"originalRankings"`
	SourceCount     int                    `json:"sourceCount"`
	FinalRank       int                    `json:"finalRank"`
}

func NewEnhancedSearchClient(baseURL string) *EnhancedSearchClient {
	return &EnhancedSearchClient{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *EnhancedSearchClient) Search(ctx context.Context, query string, options SearchOptions) (*SearchResponse, error) {
	request := SearchRequest{
		Query:   query,
		Options: options,
	}
	
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}
	
	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to perform request: %w", err)
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	if resp.StatusCode != http.StatusOK {
		var errorResp map[string]interface{}
		if err := json.Unmarshal(body, &errorResp); err == nil {
			return nil, fmt.Errorf("search failed: %v", errorResp)
		}
		return nil, fmt.Errorf("search failed with status %d: %s", resp.StatusCode, string(body))
	}
	
	var searchResp SearchResponse
	if err := json.Unmarshal(body, &searchResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}
	
	return &searchResp, nil
}

func (c *EnhancedSearchClient) HealthCheck(ctx context.Context) (map[string]interface{}, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/health", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to perform request: %w", err)
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	var health map[string]interface{}
	if err := json.Unmarshal(body, &health); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}
	
	return health, nil
}

func main() {
	client := NewEnhancedSearchClient("http://localhost:4003/api/search/enhanced")
	
	// Basic search
	options := SearchOptions{
		Pagination: map[string]int{
			"page":  1,
			"limit": 20,
		},
	}
	
	response, err := client.Search(context.Background(), "React testing tools", options)
	if err != nil {
		fmt.Printf("Search failed: %v\n", err)
		return
	}
	
	fmt.Printf("Found %d results\n", len(response.Results))
	fmt.Printf("Total results: %v\n", response.Summary["totalResults"])
	fmt.Printf("Processing time: %v ms\n", response.Summary["processingTime"])
	
	// Health check
	health, err := client.HealthCheck(context.Background())
	if err != nil {
		fmt.Printf("Health check failed: %v\n", err)
		return
	}
	
	fmt.Printf("Service status: %v\n", health["status"])
}
```

## Configuration Management

### 1. Environment Configuration

```javascript
// config.js
class EnhancedSearchConfig {
  constructor() {
    this.baseURL = process.env.ENHANCED_SEARCH_URL || 'http://localhost:4003/api/search/enhanced';
    this.timeout = parseInt(process.env.ENHANCED_SEARCH_TIMEOUT) || 30000;
    this.retryAttempts = parseInt(process.env.ENHANCED_SEARCH_RETRY_ATTEMPTS) || 3;
    this.cacheEnabled = process.env.ENHANCED_SEARCH_CACHE_ENABLED !== 'false';
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  createClient() {
    return new EnhancedSearchClient({
      baseURL: this.baseURL,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      cacheEnabled: this.cacheEnabled,
      debugMode: this.debugMode
    });
  }
}

module.exports = new EnhancedSearchConfig();
```

### 2. Runtime Configuration Updates

```javascript
// configurationManager.js
class ConfigurationManager {
  constructor(client) {
    this.client = client;
    this.config = {};
  }

  async loadConfiguration() {
    try {
      const response = await this.client.getConfig();
      this.config = response.config;
      return this.config;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  }

  async updateConfiguration(updates) {
    try {
      const response = await this.client.updateConfig(updates);
      this.config = { ...this.config, ...updates };
      return response;
    } catch (error) {
      console.error('Failed to update configuration:', error);
      throw error;
    }
  }

  async optimizeForPerformance() {
    return this.updateConfiguration({
      enableCache: true,
      maxConcurrentSearches: 3,
      defaultTimeout: 3000
    });
  }

  async optimizeForQuality() {
    return this.updateConfiguration({
      enableCache: false,
      maxConcurrentSearches: 5,
      defaultTimeout: 10000,
      defaultDuplicateDetection: true
    });
  }

  async enableDebugMode() {
    return this.updateConfiguration({
      debug: true
    });
  }

  getCurrentConfig() {
    return this.config;
  }
}

// Usage
const configManager = new ConfigurationManager(searchClient);
await configManager.loadConfiguration();
await configManager.optimizeForQuality();
```

## Error Handling Best Practices

### 1. Comprehensive Error Handling

```javascript
class EnhancedSearchErrorHandler {
  static handle(error, context = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      error: error.response?.data || error.message,
      status: error.response?.status
    };

    // Log error for monitoring
    console.error('Enhanced Search Error:', errorInfo);

    // Return user-friendly error message
    if (error.response) {
      switch (error.response.data?.code) {
        case 'VALIDATION_ERROR':
          return new Error('Invalid search parameters. Please check your input.');
        case 'TIMEOUT_ERROR':
          return new Error('Search request timed out. Please try again with a simpler query.');
        case 'SERVICE_UNAVAILABLE':
          return new Error('Search service is temporarily unavailable. Please try again later.');
        default:
          return new Error('Search failed. Please try again later.');
      }
    } else if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout. Please check your connection and try again.');
    } else {
      return new Error('An unexpected error occurred. Please try again.');
    }
  }

  static retryable(error) {
    if (!error.response) return true; // Network errors are retryable
    
    const retryableCodes = ['TIMEOUT_ERROR', 'SERVICE_UNAVAILABLE'];
    return retryableCodes.includes(error.response.data?.code);
  }
}

// Usage with retry logic
class RetryableSearchClient {
  constructor(baseClient, maxRetries = 3) {
    this.client = baseClient;
    this.maxRetries = maxRetries;
  }

  async search(query, options = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.client.search(query, options);
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxRetries || !EnhancedSearchErrorHandler.retryable(error)) {
          break;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw EnhancedSearchErrorHandler.handle(lastError, {
      query,
      options,
      attempts: this.maxRetries
    });
  }
}
```

### 2. Monitoring and Metrics

```javascript
class SearchMetricsCollector {
  constructor() {
    this.metrics = {
      totalSearches: 0,
      successfulSearches: 0,
      failedSearches: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      errorRate: 0
    };
  }

  recordSearch(startTime, success, error = null, responseTime = 0, cacheHit = false) {
    this.metrics.totalSearches++;
    
    if (success) {
      this.metrics.successfulSearches++;
      
      // Update average response time
      const totalTime = this.metrics.averageResponseTime * (this.metrics.successfulSearches - 1) + responseTime;
      this.metrics.averageResponseTime = totalTime / this.metrics.successfulSearches;
    } else {
      this.metrics.failedSearches++;
      this.metrics.errorRate = this.metrics.failedSearches / this.metrics.totalSearches;
    }

    // Update cache hit rate (simplified)
    if (cacheHit) {
      const hits = this.metrics.cacheHitRate * (this.metrics.successfulSearches - 1) + 1;
      this.metrics.cacheHitRate = hits / this.metrics.successfulSearches;
    }

    // Log for external monitoring
    this.logMetrics(startTime, success, error, responseTime);
  }

  logMetrics(startTime, success, error, responseTime) {
    const logData = {
      timestamp: new Date().toISOString(),
      duration: responseTime,
      success,
      error: error?.message,
      metrics: this.metrics
    };

    if (success) {
      console.info('Search metrics:', logData);
    } else {
      console.error('Search error metrics:', logData);
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      totalSearches: 0,
      successfulSearches: 0,
      failedSearches: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      errorRate: 0
    };
  }
}
```

## Testing Integration

### 1. Unit Tests

```javascript
// enhancedSearch.test.js
const { EnhancedSearchClient } = require('./enhancedSearchClient');
const axios = require('axios');

jest.mock('axios');

describe('EnhancedSearchClient', () => {
  let client;
  let mockAxios;

  beforeEach(() => {
    client = new EnhancedSearchClient('http://test-api.com');
    mockAxios = axios;
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should perform basic search successfully', async () => {
      const mockResponse = {
        data: {
          query: 'test query',
          requestId: 'test-id',
          summary: { totalResults: 10, returnedResults: 10 },
          results: [{ id: '1', score: 0.9 }],
          metrics: { totalProcessingTime: 100 },
          pagination: { page: 1, totalPages: 1 }
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await client.search('test query');

      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://test-api.com',
        expect.objectContaining({
          query: 'test query',
          options: expect.any(Object)
        })
      );
      expect(result.summary.totalResults).toBe(10);
    });

    it('should handle validation errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            error: 'Validation Error',
            message: 'Query is required',
            code: 'VALIDATION_ERROR'
          }
        }
      };

      mockAxios.post.mockRejectedValue(mockError);

      await expect(client.search('')).rejects.toThrow('Validation failed: Query is required');
    });

    it('should handle timeout errors', async () => {
      const mockError = {
        response: {
          status: 408,
          data: {
            error: 'Timeout Error',
            message: 'Search request timed out',
            code: 'TIMEOUT_ERROR'
          }
        }
      };

      mockAxios.post.mockRejectedValue(mockError);

      await expect(client.search('test')).rejects.toThrow('Search timeout: Search request timed out');
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      const mockHealth = {
        data: {
          status: 'healthy',
          service: 'enhanced-search',
          version: '1.0.0'
        }
      };

      mockAxios.get.mockResolvedValue(mockHealth);

      const health = await client.healthCheck();

      expect(mockAxios.get).toHaveBeenCalledWith('http://test-api.com/health');
      expect(health.status).toBe('healthy');
    });
  });
});
```

### 2. Integration Tests

```javascript
// integration.test.js
const { EnhancedSearchClient } = require('./enhancedSearchClient');

describe('Enhanced Search Integration Tests', () => {
  let client;

  beforeAll(() => {
    client = new EnhancedSearchClient('http://localhost:4003/api/search/enhanced');
  });

  describe('Full search workflow', () => {
    it('should perform complete search with filters and pagination', async () => {
      // Skip if service is not available
      try {
        await client.healthCheck();
      } catch (error) {
        console.warn('Enhanced search service not available, skipping integration tests');
        return;
      }

      const results = await client.search('React testing tools', {
        filters: {
          categories: ['development']
        },
        pagination: {
          page: 1,
          limit: 5
        },
        debug: true
      });

      expect(results).toHaveProperty('query');
      expect(results).toHaveProperty('summary');
      expect(results).toHaveProperty('results');
      expect(results).toHaveProperty('metrics');
      expect(results).toHaveProperty('debug');
      expect(results.summary.returnedResults).toBeLessThanOrEqual(5);
    }, 10000);

    it('should handle configuration updates', async () => {
      try {
        await client.healthCheck();
      } catch (error) {
        return;
      }

      const originalConfig = await client.getConfig();
      
      await client.updateConfig({
        enableCache: false,
        maxConcurrentSearches: 3
      });

      const updatedConfig = await client.getConfig();
      expect(updatedConfig.config.enableCache).toBe(false);
      expect(updatedConfig.config.maxConcurrentSearches).toBe(3);

      // Restore original configuration
      await client.updateConfig({
        enableCache: originalConfig.config.enableCache,
        maxConcurrentSearches: originalConfig.config.maxConcurrentSearches
      });
    }, 5000);
  });
});
```

## Deployment Considerations

### 1. Production Configuration

```javascript
// productionClient.js
class ProductionEnhSearchClient extends EnhancedSearchClient {
  constructor(options = {}) {
    super({
      baseURL: process.env.ENHANCED_SEARCH_URL,
      timeout: parseInt(process.env.ENHANCED_SEARCH_TIMEOUT) || 10000,
      retryAttempts: 3,
      ...options
    });

    this.setupErrorHandling();
    this.setupMetrics();
  }

  setupErrorHandling() {
    // Add error reporting service integration
    this.onError = (error, context) => {
      // Send to error monitoring service
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(error, {
          contexts: { search: context }
        });
      }
    };
  }

  setupMetrics() {
    // Add performance monitoring
    this.onSearchComplete = (metrics) => {
      // Send to monitoring service
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track('Enhanced Search', metrics);
      }
    };
  }

  async search(query, options = {}) {
    const startTime = Date.now();
    const context = { query, options };

    try {
      const result = await super.search(query, options);
      const responseTime = Date.now() - startTime;
      
      this.onSearchComplete({
        query,
        responseTime,
        resultCount: result.summary.returnedResults,
        success: true
      });
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.onError(error, context);
      this.onSearchComplete({
        query,
        responseTime,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }
}
```

### 2. Load Balancing and Failover

```javascript
// failoverClient.js
class FailoverSearchClient {
  constructor(endpoints) {
    this.endpoints = endpoints;
    this.currentEndpointIndex = 0;
    this.clients = endpoints.map(endpoint => 
      new ProductionEnhSearchClient({ baseURL: endpoint })
    );
  }

  async search(query, options = {}) {
    let lastError;

    for (let i = 0; i < this.endpoints.length; i++) {
      const client = this.clients[this.currentEndpointIndex];
      
      try {
        const result = await client.search(query, options);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Endpoint ${this.endpoints[this.currentEndpointIndex]} failed, trying next endpoint`);
        
        // Move to next endpoint
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
      }
    }

    throw new Error(`All endpoints failed. Last error: ${lastError.message}`);
  }

  async healthCheck() {
    const healthChecks = await Promise.allSettled(
      this.clients.map(client => client.healthCheck())
    );

    const healthyEndpoints = healthChecks
      .map((result, index) => result.status === 'fulfilled' ? index : -1)
      .filter(index => index !== -1);

    if (healthyEndpoints.length === 0) {
      throw new Error('No healthy endpoints available');
    }

    return healthChecks[healthyEndpoints[0]].value;
  }
}
```

## Best Practices Summary

1. **Always handle errors gracefully** and provide user-friendly error messages
2. **Implement retry logic** for transient failures and timeouts
3. **Use caching** to improve performance for repeated queries
4. **Monitor performance metrics** to optimize search configurations
5. **Validate inputs** before sending requests to the API
6. **Use appropriate timeouts** based on your requirements
7. **Implement proper logging** for debugging and monitoring
8. **Configure failover mechanisms** for production deployments
9. **Test thoroughly** with unit and integration tests
10. **Keep clients updated** with the latest API versions and features

## Troubleshooting

### Common Issues

1. **Connection Timeout**: Check if the enhanced search service is running and accessible
2. **Invalid Request**: Validate request parameters against the API documentation
3. **Service Unavailable**: Use health check endpoint to verify service status
4. **Performance Issues**: Monitor metrics and adjust configuration parameters
5. **Memory Usage**: Implement cache management for high-traffic applications

### Debug Tips

1. Enable debug mode to get detailed execution information
2. Check the health endpoint for service status
3. Monitor performance metrics to identify bottlenecks
4. Use browser developer tools to inspect HTTP requests and responses
5. Check server logs for detailed error information

For additional support, refer to the main API documentation or contact the development team.

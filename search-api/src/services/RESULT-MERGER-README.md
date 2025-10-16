# Result Merger Service - Reciprocal Rank Fusion Algorithm

## Overview

The Result Merger Service implements the Reciprocal Rank Fusion (RRF) algorithm for merging search results from multiple sources. This service provides a clean interface for combining ranked results from different search systems (vector search, traditional search, etc.) while maintaining original metadata and removing duplicates.

## Features

- **Reciprocal Rank Fusion (RRF)**: Implements the standard RRF algorithm with configurable k parameter
- **Multi-source Support**: Handles results from different search sources (vector, traditional, hybrid, etc.)
- **Deduplication**: Removes duplicate results based on content similarity
- **Source Weighting**: Allows weighting different sources differently in the final ranking
- **Metadata Preservation**: Maintains original result metadata and source attribution
- **TypeScript Support**: Full TypeScript typing with comprehensive interfaces

## Quick Start

```typescript
import { resultMergerService, RankedResults } from './services';

// Define your search results from different sources
const vectorResults: RankedResults = {
  source: 'vector',
  results: [
    {
      id: 'tool_1',
      score: 0.95,
      payload: {
        name: 'React Components',
        description: 'A library of reusable React components',
        category: 'frontend'
      }
    }
  ]
};

const traditionalResults: RankedResults = {
  source: 'traditional',
  results: [
    {
      id: 'tool_2',
      score: 0.87,
      payload: {
        name: 'TypeScript Utils',
        description: 'TypeScript utility functions',
        category: 'development'
      }
    }
  ]
};

// Merge results using RRF
const mergedResults = resultMergerService.mergeResults([
  vectorResults,
  traditionalResults
]);

console.log('Merged results:', mergedResults);
```

## RRF Algorithm

The Reciprocal Rank Fusion algorithm calculates a combined score for each result using the formula:

```
score = Σ(1 / (k + rank_i))
```

Where:
- `k` is a constant (typically 60)
- `rank_i` is the rank of the item in list i

### Example Calculation

If a result appears at rank 1 in source A and rank 3 in source B (with k=60):

```
score = 1/(60+1) + 1/(60+3) = 0.0164 + 0.0156 = 0.0320
```

## Configuration

The service supports various configuration options:

```typescript
import { ReciprocalRankFusion } from './services';

const customMerger = new ReciprocalRankFusion({
  kValue: 60,                    // RRF k parameter
  maxResults: 100,                // Maximum results to return
  enableDeduplication: true,      // Enable duplicate removal
  deduplicationThreshold: 0.9,    // Similarity threshold for deduplication
  preserveMetadata: true,         // Preserve original metadata
  sourceWeights: {                // Weight different sources
    semantic: 1.2,
    traditional: 0.8,
    hybrid: 1.0
  }
});
```

## API Reference

### Interfaces

#### SearchResultItem
```typescript
interface SearchResultItem {
  id: string;
  score: number;
  payload?: any;
  metadata?: Record<string, any>;
  source?: string;
}
```

#### RankedResults
```typescript
interface RankedResults {
  source: string;
  results: SearchResultItem[];
  totalResults?: number;
  searchTime?: number;
  metadata?: Record<string, any>;
}
```

#### MergedResult
```typescript
interface MergedResult extends SearchResultItem {
  rrfScore: number;
  originalRankings: {
    [source: string]: {
      rank: number;
      score: number;
    };
  };
  sourceCount: number;
  finalRank: number;
}
```

#### MergeConfig
```typescript
interface MergeConfig {
  kValue?: number;                // RRF k parameter (typically 60)
  maxResults?: number;            // Maximum results to return
  enableDeduplication?: boolean;  // Enable duplicate removal
  deduplicationThreshold?: number; // Similarity threshold (0-1)
  preserveMetadata?: boolean;     // Preserve original metadata
  sourceWeights?: Record<string, number>; // Source weights
}
```

### Methods

#### mergeResults(resultsBySource, config?)
Merges multiple arrays of ranked results using RRF algorithm.

**Parameters:**
- `resultsBySource`: Array of RankedResults from different sources
- `config`: Optional merge configuration

**Returns:** Array of MergedResult objects

#### updateConfig(newConfig)
Updates the merge configuration.

**Parameters:**
- `newConfig`: Partial configuration to merge with existing config

#### getConfig()
Returns the current merge configuration.

**Returns:** Current configuration object

#### validateConfig(config) [static]
Validates a merge configuration.

**Parameters:**
- `config`: Configuration to validate

**Returns:** True if configuration is valid

## Use Cases

### 1. Multi-Vector Search
Combine results from different vector types (semantic, categories, functionality):

```typescript
const semanticResults = await vectorSearch('semantic', query);
const categoryResults = await vectorSearch('categories', query);
const functionResults = await vectorSearch('functionality', query);

const mergedResults = resultMergerService.mergeResults([
  { source: 'semantic', results: semanticResults },
  { source: 'categories', results: categoryResults },
  { source: 'functionality', results: functionResults }
]);
```

### 2. Hybrid Search
Combine vector search with traditional full-text search:

```typescript
const vectorResults = await vectorSearchEngine.search(query);
const textResults = await fullTextSearchEngine.search(query);

const mergedResults = resultMergerService.mergeResults([
  { source: 'vector', results: vectorResults },
  { source: 'fulltext', results: textResults }
], {
  sourceWeights: {
    vector: 1.2,
    fulltext: 0.8
  }
});
```

### 3. Cross-Platform Search
Merge results from different search platforms:

```typescript
const elasticResults = await elasticsearch.search(query);
const algoliaResults = await algolia.search(query);
const solrResults = await solr.search(query);

const mergedResults = resultMergerService.mergeResults([
  { source: 'elasticsearch', results: elasticResults },
  { source: 'algolia', results: algoliaResults },
  { source: 'solr', results: solrResults }
]);
```

## Examples

See the following files for complete examples:
- `result-merger.example.ts` - Usage examples
- `result-merger.service.test.ts` - Test examples

## Best Practices

1. **Choose appropriate k value**: The standard k=60 works well for most use cases
2. **Configure source weights**: Give more weight to higher-quality sources
3. **Enable deduplication**: Remove duplicates to improve result quality
4. **Preserve metadata**: Keep original metadata for debugging and analysis
5. **Validate input**: Ensure search results have proper IDs and scores

## Implementation Notes

- The service uses a 0-indexed rank internally but displays 1-indexed ranks
- Content similarity is calculated using Jaccard similarity on text fields
- Duplicate detection considers name (70% weight) and description (30% weight)
- The service maintains source attribution for traceability

## Dependencies

- No external dependencies
- Compatible with existing search infrastructure
- Follows TypeScript best practices

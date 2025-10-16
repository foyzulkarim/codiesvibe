# Enhanced Search Services Documentation

## Overview

The Enhanced Search API is built upon two core services that provide advanced result processing capabilities:

1. **Result Merger Service** - Combines and ranks results from multiple search sources using Reciprocal Rank Fusion (RRF)
2. **Duplicate Detection Service** - Identifies and removes duplicate results using various detection strategies

These services can be used independently or together as part of the enhanced search workflow.

## Result Merger Service

### Overview

The Result Merger Service is responsible for combining search results from multiple sources into a single, ranked result set. It uses the Reciprocal Rank Fusion algorithm to provide fair and accurate ranking across different search sources.

### Key Features

- **Reciprocal Rank Fusion (RRF)**: Advanced ranking algorithm that combines results from multiple sources
- **Source Weighting**: Configurable weights for different search sources
- **Metadata Preservation**: Maintains original ranking and scoring information
- **Performance Optimization**: Efficient merging algorithms for large result sets
- **Flexible Configuration**: Customizable merge strategies and parameters

### Core Concepts

#### Reciprocal Rank Fusion (RRF)

RRF is a data fusion technique that combines ranked lists from multiple sources. The formula is:

```
RRF_score(d) = Σ(1 / (k + rank_i(d)))
```

Where:
- `d` is a document/result
- `k` is a constant (typically 60)
- `rank_i(d)` is the rank of document d in source i

#### Source Attribution

The service maintains information about which sources contributed to each result, including:
- Original rankings from each source
- Scores from each source
- Source weights used in merging
- Final RRF score

### API Interface

#### Basic Usage

```typescript
import { resultMergerService, SearchResultItem, RankedResults, MergeConfig } from './src/services';

// Prepare search results from multiple sources
const searchResults: RankedResults[] = [
  {
    source: 'vector',
    results: [
      { id: '1', score: 0.95, payload: { name: 'Tool A' }, metadata: {}, source: 'vector' },
      { id: '2', score: 0.88, payload: { name: 'Tool B' }, metadata: {}, source: 'vector' }
    ],
    totalResults: 2,
    searchTime: 120,
    metadata: { weight: 1.0 }
  },
  {
    source: 'traditional',
    results: [
      { id: '2', score: 0.92, payload: { name: 'Tool B' }, metadata: {}, source: 'traditional' },
      { id: '3', score: 0.85, payload: { name: 'Tool C' }, metadata: {}, source: 'traditional' }
    ],
    totalResults: 2,
    searchTime: 80,
    metadata: { weight: 0.9 }
  }
];

// Configure merge options
const mergeConfig: MergeConfig = {
  kValue: 60,                    // RRF K value
  maxResults: 50,                // Maximum results to return
  enableDeduplication: false,    // Handle deduplication separately
  preserveMetadata: true,        // Keep original metadata
  sourceWeights: {               // Source weights
    vector: 1.0,
    traditional: 0.9
  },
  useEnhancedDuplicateDetection: false
};

// Merge results
const mergedResults = await resultMergerService.mergeResults(searchResults, mergeConfig);

console.log(`Merged ${mergedResults.length} results`);
mergedResults.forEach((result, index) => {
  console.log(`${index + 1}. ${result.payload.name} (RRF: ${result.rrfScore.toFixed(3)})`);
  console.log(`   Sources: ${result.sourceCount}, Original rankings:`, result.originalRankings);
});
```

#### Configuration Options

```typescript
interface MergeConfig {
  kValue: number;                           // RRF K value (default: 60)
  maxResults: number;                       // Maximum results to return
  enableDeduplication: boolean;             // Enable built-in deduplication
  preserveMetadata: boolean;                // Preserve original metadata
  sourceWeights: Record<string, number>;    // Weight for each source
  useEnhancedDuplicateDetection: boolean;   // Use enhanced duplicate detection
  customRankingFunction?: Function;         // Custom ranking function (optional)
}
```

#### Data Types

```typescript
interface SearchResultItem {
  id: string;                               // Unique identifier
  score: number;                            // Original confidence score
  payload: any;                             // Result data
  metadata: Record<string, any>;            // Additional metadata
  source: string;                           // Source identifier
}

interface RankedResults {
  source: string;                           // Source name
  results: SearchResultItem[];              // Results from this source
  totalResults: number;                     // Total results from source
  searchTime: number;                       // Search execution time
  metadata: Record<string, any>;            // Source metadata
}

interface MergedResult {
  id: string;                               // Result ID
  score: number;                            // Original score
  payload: any;                             // Result data
  metadata: Record<string, any>;            // Combined metadata
  source: string;                           // Primary source
  rrfScore: number;                         // RRF score
  originalRankings: Record<string, {       // Original rankings by source
    rank: number;
    score: number;
  }>;
  sourceCount: number;                      // Number of sources contributing
  finalRank: number;                        // Final rank after merging
}
```

### Advanced Usage

#### Custom Source Weights

```typescript
// Configure custom weights based on source reliability
const customWeights = {
  vector: 1.2,          // Give more weight to vector search
  traditional: 0.8,     // Reduce weight of traditional search
  hybrid: 1.0,          // Standard weight for hybrid search
  semantic: 1.1,        // Slightly boost semantic search
  fulltext: 0.7         // Lower weight for full-text search
};

const mergeConfig: MergeConfig = {
  kValue: 60,
  maxResults: 100,
  enableDeduplication: false,
  preserveMetadata: true,
  sourceWeights: customWeights,
  useEnhancedDuplicateDetection: false
};

const mergedResults = await resultMergerService.mergeResults(searchResults, mergeConfig);
```

#### Custom Ranking Function

```typescript
const customRankingFunction = (mergedResults: MergedResult[]): MergedResult[] => {
  // Apply custom ranking logic
  return mergedResults.sort((a, b) => {
    // Prioritize results from multiple sources
    if (a.sourceCount !== b.sourceCount) {
      return b.sourceCount - a.sourceCount;
    }
    
    // Then use RRF score
    return b.rrfScore - a.rrfScore;
  });
};

const mergeConfig: MergeConfig = {
  kValue: 60,
  maxResults: 50,
  enableDeduplication: false,
  preserveMetadata: true,
  sourceWeights: { vector: 1.0, traditional: 0.9 },
  useEnhancedDuplicateDetection: false,
  customRankingFunction
};

const mergedResults = await resultMergerService.mergeResults(searchResults, mergeConfig);
```

#### Performance Optimization

```typescript
// Optimize for large result sets
const optimizedConfig: MergeConfig = {
  kValue: 40,              // Lower K value for faster computation
  maxResults: 20,          // Limit results for better performance
  enableDeduplication: false, // Disable built-in deduplication
  preserveMetadata: false,  // Reduce memory usage
  sourceWeights: {
    vector: 1.0,
    traditional: 0.9
  },
  useEnhancedDuplicateDetection: false
};

// For very large result sets, consider batching
const batchSize = 100;
const allMergedResults = [];

for (let i = 0; i < searchResults.length; i += batchSize) {
  const batch = searchResults.slice(i, i + batchSize);
  const batchResults = await resultMergerService.mergeResults(batch, optimizedConfig);
  allMergedResults.push(...batchResults);
}
```

### Performance Metrics

The result merger service provides detailed performance metrics:

```typescript
const mergedResults = await resultMergerService.mergeResults(searchResults, mergeConfig);

// Access performance information
console.log(`Merge completed in ${mergedResults.metadata?.mergeTime || 0}ms`);
console.log(`Processed ${searchResults.length} sources`);
console.log(`Generated ${mergedResults.length} merged results`);
```

### Error Handling

```typescript
try {
  const mergedResults = await resultMergerService.mergeResults(searchResults, mergeConfig);
} catch (error) {
  if (error.message.includes('Invalid configuration')) {
    // Handle configuration errors
    console.error('Merge configuration is invalid:', error.message);
  } else if (error.message.includes('Empty results')) {
    // Handle empty result sets
    console.warn('No results to merge');
  } else {
    // Handle other errors
    console.error('Merge failed:', error);
  }
}
```

## Duplicate Detection Service

### Overview

The Duplicate Detection Service identifies and removes duplicate search results using multiple detection strategies. It provides flexible configuration for different use cases and data types.

### Key Features

- **Multiple Detection Strategies**: Various algorithms for identifying duplicates
- **Configurable Thresholds**: Adjustable similarity thresholds for different strategies
- **Performance Optimization**: Efficient comparison algorithms for large datasets
- **Enhanced Detection**: Advanced algorithms for improved accuracy
- **Parallel Processing**: Configurable parallel execution for better performance

### Detection Strategies

#### 1. EXACT_ID
Matches results with identical IDs.

```typescript
// Example: Results with same ID are considered duplicates
const result1 = { id: 'tool-123', payload: { name: 'Jest' } };
const result2 = { id: 'tool-123', payload: { name: 'Jest Testing' } };
// These will be detected as duplicates by EXACT_ID strategy
```

#### 2. EXACT_URL
Matches results with identical URLs.

```typescript
// Example: Results with same URL are considered duplicates
const result1 = { payload: { url: 'https://jestjs.io' } };
const result2 = { payload: { url: 'https://jestjs.io' } };
// These will be detected as duplicates by EXACT_URL strategy
```

#### 3. CONTENT_SIMILARITY
Uses content similarity algorithms to detect duplicates.

```typescript
// Example: Results with similar content are considered duplicates
const result1 = { payload: { 
  name: 'Jest',
  description: 'JavaScript testing framework'
}};
const result2 = { payload: { 
  name: 'Jest Testing',
  description: 'Framework for testing JavaScript applications'
}};
// These may be detected as duplicates by CONTENT_SIMILARITY strategy
```

#### 4. VERSION_AWARE
Detects duplicates while being aware of version differences.

```typescript
// Example: Results with version information are handled specially
const result1 = { payload: { 
  name: 'React',
  version: '18.0.0'
}};
const result2 = { payload: { 
  name: 'React',
  version: '18.1.0'
}};
// These may be considered different versions, not exact duplicates
```

#### 5. FUZZY_MATCH
Uses fuzzy string matching for duplicate detection.

```typescript
// Example: Results with similar names are detected as duplicates
const result1 = { payload: { name: 'React Router' } };
const result2 = { payload: { name: 'react-router' } };
// These may be detected as duplicates by FUZZY_MATCH strategy
```

#### 6. COMBINED
Combines multiple strategies for comprehensive detection.

### API Interface

#### Basic Usage

```typescript
import { duplicateDetectionService, DuplicateDetectionConfig, DetectionStrategy } from './src/services';

// Prepare search results
const searchResults: SearchResultItem[] = [
  {
    id: '1',
    score: 0.95,
    payload: {
      name: 'Jest',
      description: 'JavaScript testing framework',
      url: 'https://jestjs.io',
      category: 'development'
    },
    metadata: {},
    source: 'vector'
  },
  {
    id: '2',
    score: 0.88,
    payload: {
      name: 'Jest Testing',
      description: 'Framework for testing JavaScript applications',
      url: 'https://jestjs.io',
      category: 'development'
    },
    metadata: {},
    source: 'traditional'
  },
  {
    id: '3',
    score: 0.92,
    payload: {
      name: 'React Testing Library',
      description: 'Testing utilities for React',
      url: 'https://testing-library.com/react',
      category: 'development'
    },
    metadata: {},
    source: 'vector'
  }
];

// Configure duplicate detection
const duplicateConfig: DuplicateDetectionConfig = {
  enabled: true,
  strategies: [
    DetectionStrategy.EXACT_ID,
    DetectionStrategy.EXACT_URL,
    DetectionStrategy.CONTENT_SIMILARITY
  ],
  thresholds: {
    contentSimilarity: 0.8,
    fuzzyMatch: 0.85,
    versionAware: 0.9,
    combined: 0.75
  },
  fieldWeights: {
    name: 0.5,
    description: 0.3,
    url: 0.15,
    category: 0.05,
    metadata: 0.0
  },
  customRules: [],
  performance: {
    maxComparisonItems: 1000,
    enableCache: true,
    cacheSize: 10000,
    enableParallel: true,
    parallelWorkers: 4
  },
  logging: {
    enabled: false,
    level: 'info',
    includeStats: true
  }
};

// Detect duplicates
const duplicateResult = await duplicateDetectionService.detectDuplicates(searchResults, duplicateConfig);

console.log(`Original results: ${searchResults.length}`);
console.log(`Duplicates removed: ${duplicateResult.duplicatesRemoved}`);
console.log(`Final results: ${duplicateResult.deduplicatedItems.length}`);

// Access duplicate groups
duplicateResult.duplicateGroups.forEach((group, index) => {
  console.log(`Duplicate group ${index + 1}:`);
  group.items.forEach(item => {
    console.log(`  - ${item.payload.name} (ID: ${item.id})`);
  });
});
```

#### Configuration Options

```typescript
interface DuplicateDetectionConfig {
  enabled: boolean;                          // Enable duplicate detection
  strategies: DetectionStrategy[];           // Detection strategies to use
  thresholds: {                             // Similarity thresholds
    contentSimilarity: number;              // Content similarity threshold
    fuzzyMatch: number;                     // Fuzzy match threshold
    versionAware: number;                   // Version-aware threshold
    combined: number;                       // Combined strategy threshold
  };
  fieldWeights: {                           // Field importance weights
    name: number;                           // Name field weight
    description: number;                    // Description field weight
    url: number;                            // URL field weight
    category: number;                       // Category field weight
    metadata: number;                       // Metadata field weight
  };
  customRules: Array<{                      // Custom detection rules
    name: string;
    field: string;
    comparator: (a: any, b: any) => boolean;
    weight: number;
  }>;
  performance: {                            // Performance settings
    maxComparisonItems: number;             // Max items to compare
    enableCache: boolean;                   // Enable caching
    cacheSize: number;                      // Cache size
    enableParallel: boolean;                // Enable parallel processing
    parallelWorkers: number;                // Number of parallel workers
  };
  logging: {                                // Logging settings
    enabled: boolean;                       // Enable logging
    level: 'debug' | 'info' | 'warn' | 'error';
    includeStats: boolean;                  // Include performance stats
  };
}
```

#### Detection Result Types

```typescript
interface DuplicateDetectionResult {
  originalCount: number;                    // Original number of items
  duplicatesRemoved: number;                // Number of duplicates removed
  duplicateGroups: DuplicateGroup[];        // Groups of duplicate items
  deduplicatedItems: SearchResultItem[];    // Items after deduplication
  processingTime: number;                   // Processing time in ms
  strategy: string;                         // Primary strategy used
  statistics: {                             // Detection statistics
    comparisons: number;                    // Number of comparisons made
    cacheHits: number;                      // Cache hits
    cacheMisses: number;                    // Cache misses
  };
}

interface DuplicateGroup {
  groupId: string;                          // Unique group identifier
  representativeItem: SearchResultItem;     // Representative item (highest score)
  items: SearchResultItem[];                // All items in this group
  strategy: string;                         // Strategy that detected this group
  confidence: number;                       // Confidence score
  metadata: {                               // Group metadata
    fieldMatches: Record<string, boolean>;  // Which fields matched
    similarityScore: number;                // Similarity score
  };
}
```

### Advanced Usage

#### Custom Detection Rules

```typescript
const customRules = [
  {
    name: 'domain_match',
    field: 'url',
    comparator: (urlA: string, urlB: string) => {
      if (!urlA || !urlB) return false;
      const domainA = new URL(urlA).hostname;
      const domainB = new URL(urlB).hostname;
      return domainA === domainB;
    },
    weight: 0.3
  },
  {
    name: 'category_match',
    field: 'category',
    comparator: (catA: string, catB: string) => catA === catB,
    weight: 0.2
  }
];

const config: DuplicateDetectionConfig = {
  enabled: true,
  strategies: [DetectionStrategy.CONTENT_SIMILARITY],
  customRules,
  thresholds: { contentSimilarity: 0.7, fuzzyMatch: 0.8, versionAware: 0.9, combined: 0.6 },
  fieldWeights: { name: 0.4, description: 0.3, url: 0.2, category: 0.1, metadata: 0.0 },
  performance: { maxComparisonItems: 500, enableCache: true, cacheSize: 5000, enableParallel: true, parallelWorkers: 2 },
  logging: { enabled: true, level: 'info', includeStats: true }
};
```

#### Performance Optimization

```typescript
// Optimize for large datasets
const optimizedConfig: DuplicateDetectionConfig = {
  enabled: true,
  strategies: [DetectionStrategy.EXACT_ID, DetectionStrategy.EXACT_URL], // Use faster strategies
  thresholds: { contentSimilarity: 0.9, fuzzyMatch: 0.9, versionAware: 0.95, combined: 0.85 },
  fieldWeights: { name: 0.6, description: 0.2, url: 0.2, category: 0.0, metadata: 0.0 },
  customRules: [],
  performance: {
    maxComparisonItems: 100,                 // Limit comparisons
    enableCache: true,
    cacheSize: 1000,
    enableParallel: true,
    parallelWorkers: 8                       // Increase parallelism
  },
  logging: { enabled: false, level: 'error', includeStats: false }
};

// For very large datasets, consider processing in batches
const batchSize = 1000;
const allResults = [];
const allDuplicateGroups = [];

for (let i = 0; i < largeDataset.length; i += batchSize) {
  const batch = largeDataset.slice(i, i + batchSize);
  const batchResult = await duplicateDetectionService.detectDuplicates(batch, optimizedConfig);
  
  allResults.push(...batchResult.deduplicatedItems);
  allDuplicateGroups.push(...batchResult.duplicateGroups);
}
```

#### High-Quality Detection

```typescript
// Configure for maximum accuracy
const highQualityConfig: DuplicateDetectionConfig = {
  enabled: true,
  strategies: [
    DetectionStrategy.EXACT_ID,
    DetectionStrategy.EXACT_URL,
    DetectionStrategy.CONTENT_SIMILARITY,
    DetectionStrategy.VERSION_AWARE,
    DetectionStrategy.FUZZY_MATCH,
    DetectionStrategy.COMBINED
  ],
  thresholds: { 
    contentSimilarity: 0.7,    // Lower threshold for more detection
    fuzzyMatch: 0.8,
    versionAware: 0.85,
    combined: 0.6
  },
  fieldWeights: { 
    name: 0.5, 
    description: 0.25, 
    url: 0.15, 
    category: 0.1, 
    metadata: 0.0 
  },
  customRules: [],
  performance: {
    maxComparisonItems: 5000,            // Allow more comparisons
    enableCache: true,
    cacheSize: 50000,
    enableParallel: true,
    parallelWorkers: 4
  },
  logging: { enabled: true, level: 'debug', includeStats: true }
};
```

### Performance Monitoring

The duplicate detection service provides detailed performance statistics:

```typescript
const result = await duplicateDetectionService.detectDuplicates(searchResults, config);

console.log(`Duplicate detection completed in ${result.processingTime}ms`);
console.log(`Comparisons made: ${result.statistics.comparisons}`);
console.log(`Cache hit rate: ${result.statistics.cacheHits / (result.statistics.cacheHits + result.statistics.cacheMisses)}`);

// Detailed timing information
if (result.statistics.detailedTiming) {
  console.log('Strategy timing:', result.statistics.detailedTiming);
}
```

### Error Handling

```typescript
try {
  const result = await duplicateDetectionService.detectDuplicates(searchResults, config);
} catch (error) {
  if (error.message.includes('Invalid configuration')) {
    console.error('Duplicate detection configuration is invalid:', error.message);
  } else if (error.message.includes('Memory limit')) {
    console.error('Dataset too large for available memory:', error.message);
  } else if (error.message.includes('Strategy not found')) {
    console.error('Unknown detection strategy:', error.message);
  } else {
    console.error('Duplicate detection failed:', error);
  }
}
```

## Integration Examples

### Combined Usage

```typescript
// Example: Using both services together for complete result processing
import { resultMergerService } from './src/services/result-merger.service';
import { duplicateDetectionService } from './src/services/duplicate-detection.service';

async processSearchResults(searchResults: RankedResults[]): Promise<SearchResultItem[]> {
  try {
    // Step 1: Merge results using RRF
    const mergeConfig: MergeConfig = {
      kValue: 60,
      maxResults: 100,
      enableDeduplication: false,
      preserveMetadata: true,
      sourceWeights: {
        vector: 1.0,
        traditional: 0.9,
        hybrid: 0.95
      },
      useEnhancedDuplicateDetection: false
    };

    const mergedResults = await resultMergerService.mergeResults(searchResults, mergeConfig);
    console.log(`Merged ${mergedResults.length} results from ${searchResults.length} sources`);

    // Step 2: Convert to SearchResultItem format for duplicate detection
    const searchResultItems: SearchResultItem[] = mergedResults.map(result => ({
      id: result.id,
      score: result.score,
      payload: result.payload,
      metadata: {
        ...result.metadata,
        originalRankings: result.originalRankings,
        sourceCount: result.sourceCount,
        rrfScore: result.rrfScore
      },
      source: result.source
    }));

    // Step 3: Apply duplicate detection
    const duplicateConfig: DuplicateDetectionConfig = {
      enabled: true,
      strategies: [
        DetectionStrategy.EXACT_ID,
        DetectionStrategy.EXACT_URL,
        DetectionStrategy.CONTENT_SIMILARITY,
        DetectionStrategy.VERSION_AWARE
      ],
      thresholds: {
        contentSimilarity: 0.8,
        fuzzyMatch: 0.85,
        versionAware: 0.9,
        combined: 0.75
      },
      fieldWeights: {
        name: 0.5,
        description: 0.3,
        url: 0.15,
        category: 0.05,
        metadata: 0.0
      },
      customRules: [],
      performance: {
        maxComparisonItems: 1000,
        enableCache: true,
        cacheSize: 10000,
        enableParallel: true,
        parallelWorkers: 4
      },
      logging: {
        enabled: false,
        level: 'info',
        includeStats: true
      }
    };

    const duplicateResult = await duplicateDetectionService.detectDuplicates(
      searchResultItems, 
      duplicateConfig
    );

    console.log(`Removed ${duplicateResult.duplicatesRemoved} duplicates`);
    console.log(`Final result count: ${duplicateResult.deduplicatedItems.length}`);

    return duplicateResult.deduplicatedItems;
  } catch (error) {
    console.error('Failed to process search results:', error);
    throw error;
  }
}
```

### Real-time Processing

```typescript
// Example: Real-time search result processing with streaming
import { EventEmitter } from 'events';

class SearchResultProcessor extends EventEmitter {
  private mergeConfig: MergeConfig;
  private duplicateConfig: DuplicateDetectionConfig;

  constructor() {
    super();
    this.initializeConfigs();
  }

  private initializeConfigs() {
    this.mergeConfig = {
      kValue: 60,
      maxResults: 50,
      enableDeduplication: false,
      preserveMetadata: true,
      sourceWeights: { vector: 1.0, traditional: 0.9 },
      useEnhancedDuplicateDetection: false
    };

    this.duplicateConfig = {
      enabled: true,
      strategies: [DetectionStrategy.EXACT_ID, DetectionStrategy.CONTENT_SIMILARITY],
      thresholds: { contentSimilarity: 0.8, fuzzyMatch: 0.85, versionAware: 0.9, combined: 0.75 },
      fieldWeights: { name: 0.5, description: 0.3, url: 0.15, category: 0.05, metadata: 0.0 },
      customRules: [],
      performance: { maxComparisonItems: 100, enableCache: true, cacheSize: 1000, enableParallel: true, parallelWorkers: 2 },
      logging: { enabled: false, level: 'error', includeStats: false }
    };
  }

  async processPartialResults(partialResults: RankedResults[]): Promise<SearchResultItem[]> {
    try {
      // Merge partial results
      const mergedResults = await resultMergerService.mergeResults(partialResults, this.mergeConfig);
      this.emit('mergeComplete', { resultCount: mergedResults.length });

      // Convert to SearchResultItem format
      const searchResultItems: SearchResultItem[] = mergedResults.map(result => ({
        id: result.id,
        score: result.score,
        payload: result.payload,
        metadata: result.metadata,
        source: result.source
      }));

      // Apply duplicate detection
      const duplicateResult = await duplicateDetectionService.detectDuplicates(
        searchResultItems,
        this.duplicateConfig
      );

      this.emit('deduplicationComplete', {
        originalCount: searchResultItems.length,
        duplicatesRemoved: duplicateResult.duplicatesRemoved,
        finalCount: duplicateResult.deduplicatedItems.length
      });

      return duplicateResult.deduplicatedItems;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  updateMergeConfig(updates: Partial<MergeConfig>) {
    this.mergeConfig = { ...this.mergeConfig, ...updates };
    this.emit('configUpdated', { type: 'merge', config: this.mergeConfig });
  }

  updateDuplicateConfig(updates: Partial<DuplicateDetectionConfig>) {
    this.duplicateConfig = { ...this.duplicateConfig, ...updates };
    this.emit('configUpdated', { type: 'duplicate', config: this.duplicateConfig });
  }
}

// Usage
const processor = new SearchResultProcessor();

processor.on('mergeComplete', (data) => {
  console.log(`Merge completed: ${data.resultCount} results`);
});

processor.on('deduplicationComplete', (data) => {
  console.log(`Deduplication completed: ${data.duplicatesRemoved} duplicates removed`);
});

processor.on('configUpdated', (data) => {
  console.log(`${data.type} configuration updated`);
});

processor.on('error', (error) => {
  console.error('Processing error:', error);
});
```

## Best Practices

### Result Merger Service

1. **Choose appropriate K values**: Higher K values (60-100) work well for most use cases
2. **Balance source weights**: Adjust weights based on source reliability and relevance
3. **Preserve metadata**: Keep original ranking information for debugging and analysis
4. **Monitor performance**: Use performance metrics to optimize configuration
5. **Test with real data**: Validate merge results with actual search data

### Duplicate Detection Service

1. **Select appropriate strategies**: Use only the strategies needed for your data type
2. **Adjust thresholds carefully**: Set thresholds based on your data characteristics
3. **Optimize for performance**: Use parallel processing and caching for large datasets
4. **Monitor accuracy**: Review duplicate groups to ensure detection quality
5. **Use custom rules**: Implement custom rules for domain-specific duplicate detection

### Combined Usage

1. **Merge before deduplication**: Always merge results first, then detect duplicates
2. **Preserve source information**: Maintain source attribution for analysis
3. **Optimize end-to-end performance**: Balance merge and deduplication settings
4. **Monitor pipeline metrics**: Track performance across both services
5. **Test with realistic data**: Use real search data to validate the complete pipeline

## Troubleshooting

### Common Issues

1. **Slow performance**: Reduce maxComparisonItems, enable caching, or use fewer strategies
2. **Poor ranking quality**: Adjust source weights or K values
3. **Too many/few duplicates**: Adjust similarity thresholds
4. **Memory issues**: Process data in batches or reduce dataset size
5. **Inconsistent results**: Check configuration consistency and data quality

### Debug Tips

1. Enable debug logging for detailed execution information
2. Use performance metrics to identify bottlenecks
3. Review duplicate groups to validate detection quality
4. Test with small datasets to validate configuration
5. Monitor cache hit rates for optimization opportunities

For additional support, refer to the individual service documentation or contact the development team.

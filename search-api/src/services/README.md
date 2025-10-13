# Search API Services

This directory contains the core services for the search API, providing functionality for data access, vector operations, and context enrichment.

## Services Overview

### Core Services

- **MongoDBService** (`mongodb.service.ts`) - Handles all MongoDB operations for tool data
- **QdrantService** (`qdrant.service.ts`) - Manages vector database operations
- **EmbeddingService** (`embedding.service.ts`) - Generates and manages text embeddings
- **VectorIndexingService** (`vector-indexing.service.ts`) - Handles vector indexing operations
- **VectorSeedingService** (`vector-seeding.service.ts`) - Manages vector data seeding

### Enhanced Services

- **ContextEnrichmentService** (`context-enrichment.service.ts`) - Enriches search context with entity statistics and metadata
- **LocalNLPService** (`local-nlp.service.ts`) - Provides local natural language processing capabilities for entity extraction, intent classification, and vocabulary analysis
- **MultiVectorSearchService** (`multi-vector-search.service.ts`) - Performs multi-vector search across different vector types with advanced merging strategies

## Context Enrichment Service

The ContextEnrichmentService provides intelligent context enrichment for search queries by analyzing entity statistics and generating metadata to improve search relevance.

### Features

- **Multiple Enrichment Strategies**: Supports Qdrant multi-vector search, MongoDB aggregation, and hybrid approaches
- **Entity Statistics**: Analyzes categories, interfaces, pricing models, and functionality patterns
- **Intelligent Caching**: Configurable caching with TTL support for improved performance
- **Fallback Mechanisms**: Graceful degradation when enrichment fails
- **Performance Monitoring**: Built-in metrics and processing time tracking

### Configuration

The service uses the `ContextEnrichmentConfig` from the enhanced search configuration:

```typescript
interface ContextEnrichmentConfig {
  enabled: boolean;
  maxEntitiesPerQuery: number;
  minSampleSize: number;
  confidenceThreshold: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  enrichmentStrategy: 'qdrant_multi_vector';
  maxProcessingTime: number;
  fallbackEnabled: boolean;
}
```

### Usage Examples

#### Basic Context Enrichment

```typescript
import { contextEnrichmentService } from './services';

// Initialize the service
await contextEnrichmentService.initialize();

// Enrich context for a search query
const query = 'react components for dashboard';
const result = await contextEnrichmentService.enrichContext(query);

console.log('Entity Statistics:', result.entityStatistics);
console.log('Metadata Context:', result.metadataContext);
```

#### Configuration Updates

```typescript
// Update service configuration
contextEnrichmentService.updateConfig({
  maxEntitiesPerQuery: 10,
  confidenceThreshold: 0.8,
  enrichmentStrategy: 'qdrant_multi_vector'
});

// Get current configuration
const config = contextEnrichmentService.getConfig();
```

#### Cache Management

```typescript
// Get cache statistics
const stats = contextEnrichmentService.getCacheStats();
console.log('Cache size:', stats.size);

// Clear cache
contextEnrichmentService.clearCache();
```

### Enrichment Strategies

#### MongoDB Aggregation
- Analyzes tool data using MongoDB aggregation pipelines
- Provides category, interface, pricing, and functionality statistics
- Fast and efficient for large datasets
- No vector dependencies

#### Qdrant Multi-Vector Search
- Uses semantic similarity across multiple vector types
- Provides context-aware entity statistics
- Higher quality results for semantic queries
- Requires vector embeddings

#### Hybrid Approach
- Combines MongoDB and Qdrant strategies
- Merges results preferring higher confidence scores
- Provides comprehensive context enrichment
- Best of both approaches

### Entity Statistics Structure

The service returns entity statistics following the `EntityStatisticsSchema`:

```typescript
interface EntityStatistics {
  commonCategories: Array<{ category: string; percentage: number }>;
  commonInterfaces: Array<{ interface: string; percentage: number }>;
  commonPricing: Array<{ pricing: string; percentage: number }>;
  totalCount: number;
  confidence: number;
  semanticMatches: number;
  avgSimilarityScore: number;
  source: 'semantic_search';
  sampleTools: string[];
}
```

### Metadata Context Structure

The metadata context provides information about the enrichment process:

```typescript
interface MetadataContext {
  searchSpaceSize: number;
  metadataConfidence: number;
  assumptions: string[];
  lastUpdated: Date;
  enrichmentStrategy: 'qdrant_multi_vector';
  processingTime: number;
}
```

### Performance Considerations

- **Caching**: Enable caching for frequently used queries to improve performance
- **Processing Time**: Monitor processing times and adjust `maxProcessingTime` accordingly
- **Sample Size**: Balance between accuracy and performance with `minSampleSize`
- **Confidence Threshold**: Adjust based on your quality requirements

### Error Handling

The service includes comprehensive error handling:

- Automatic fallback to MongoDB aggregation when Qdrant fails
- Graceful degradation with minimal context when all strategies fail
- Detailed error logging for debugging
- Configurable timeout handling

### Integration with Enhanced Search

The ContextEnrichmentService is designed to integrate with the enhanced search system:

1. **Stage 0.5**: Enriches context before query planning
2. **State Management**: Updates `entityStatistics` and `metadataContext` in enhanced state
3. **Performance Metrics**: Tracks enrichment performance for monitoring

## Development

### Adding New Services

When adding new services:

1. Follow the existing service pattern with singleton export
2. Include proper TypeScript types and Zod schemas
3. Add comprehensive error handling
4. Include performance monitoring
5. Update the services index file

### Testing

Run the example file to test the context enrichment service:

```bash
cd search-api
npm run dev
# In another terminal:
node -r ts-node/register src/services/context-enrichment.example.ts
```

## Dependencies

- **MongoDB**: For tool data storage and aggregation
- **Qdrant**: For vector similarity search (optional)
- **Enhanced Search Config**: For configuration management
- **Enhanced State Types**: For type safety

## Local NLP Service

The LocalNLPService provides on-device natural language processing capabilities for text analysis, entity extraction, intent classification, and vocabulary candidate extraction. It uses transformers.js for local model inference with fallback to rule-based processing.

### Features

- **Local Model Inference**: Uses transformers.js for on-device NLP processing
- **Entity Recognition**: Extracts named entities like technologies, pricing models, and interfaces
- **Intent Classification**: Classifies user queries into intent categories (filter_search, comparison_query, discovery, exploration)
- **Vocabulary Extraction**: Identifies potential vocabulary candidates for categories, interfaces, pricing, and functionality
- **Batch Processing**: Efficiently processes multiple queries in batches
- **Intelligent Caching**: Caches models and results for improved performance
- **Fallback Mechanisms**: Graceful degradation to rule-based processing when models fail
- **Performance Monitoring**: Built-in metrics and processing time tracking

### Configuration

The service uses the `LocalNLPConfig` from the enhanced search configuration:

```typescript
interface LocalNLPConfig {
  enabled: boolean;
  nerModel: string;          // Model for named entity recognition
  classificationModel: string; // Model for intent classification
  modelCacheEnabled: boolean;
  modelCacheSize: number;
  confidenceThreshold: number;
  maxProcessingTime: number;
  fallbackEnabled: boolean;
  fallbackThreshold: number;
  batchProcessingEnabled: boolean;
  maxBatchSize: number;
  intentLabels: string[];
}
```

### Usage Examples

#### Basic Text Processing

```typescript
import { localNLPService } from './services';

// Initialize the service
await localNLPService.initialize();

// Process text with all features enabled
const result = await localNLPService.processText('Find free React components for dashboard');

console.log('Entities:', result.entities);
console.log('Intent:', result.intent);
console.log('Vocabulary Candidates:', result.vocabularyCandidates);
console.log('Processing Time:', result.processingTime);
```

#### Selective Processing

```typescript
// Process with specific features only
const result = await localNLPService.processText('Compare React vs Vue', {
  extractEntities: true,
  classifyIntent: true,
  extractVocabulary: false
});

console.log('Intent:', result.intent.label); // "comparison_query"
```

#### Batch Processing

```typescript
const queries = [
  'Find free React components',
  'Compare Vue and Angular',
  'API library for Node.js'
];

const results = await localNLPService.processBatch(queries);
results.forEach((result, index) => {
  console.log(`Query ${index + 1}: ${result.intent.label}`);
});
```

#### Configuration Management

```typescript
// Update service configuration
localNLPService.updateConfig({
  confidenceThreshold: 0.8,
  maxProcessingTime: 150,
  batchProcessingEnabled: true,
  maxBatchSize: 20
});

// Get current configuration
const config = localNLPService.getConfig();
```

#### Performance Monitoring

```typescript
// Get cache statistics
const stats = localNLPService.getCacheStats();
console.log('Model cache size:', stats.modelCache.size);
console.log('Result cache size:', stats.resultCache.size);

// Health check
const health = await localNLPService.healthCheck();
console.log('Service status:', health.status);
console.log('Details:', health.details);
```

### Processing Strategies

The service supports multiple processing strategies:

1. **Local Processing**: Uses transformers.js models for on-device inference
2. **LLM Fallback**: Uses rule-based processing when models fail
3. **Hybrid**: Combines local and fallback approaches

### Entity Types

The service can extract various entity types:

- **Technology**: Frameworks, libraries, programming languages (React, Vue, Node.js)
- **Pricing**: Cost models (free, paid, premium, open source)
- **Interface**: Interaction types (API, CLI, GUI, SDK)
- **Category**: Software categories (frontend, backend, database)

### Intent Classification

Supported intent categories:

- **filter_search**: Queries with specific filters or constraints
- **comparison_query**: Queries comparing multiple options
- **discovery**: General search and discovery queries
- **exploration**: Broad exploration queries

### Vocabulary Candidates

The service extracts vocabulary candidates for:

- **Categories**: Software categories and domains
- **Interfaces**: API types and interaction patterns
- **Pricing**: Cost and licensing models
- **Functionality**: Features and capabilities

### Performance Considerations

- **Model Caching**: Enable model caching for frequently used models
- **Batch Processing**: Use batch processing for multiple queries
- **Confidence Thresholds**: Adjust thresholds based on accuracy requirements
- **Processing Time**: Monitor and adjust time limits for your use case
- **Fallback Strategy**: Ensure fallback is enabled for reliability

### Error Handling

The service includes comprehensive error handling:

- Automatic fallback when model inference fails
- Graceful degradation with rule-based processing
- Timeout handling for long-running operations
- Detailed error logging for debugging

### Integration with Enhanced Search

The LocalNLPService integrates with the enhanced search system:

1. **Stage 1**: Processes user queries for intent and entities
2. **State Management**: Updates `nlpResults` in enhanced state
3. **Performance Metrics**: Tracks NLP processing performance

## Multi-Vector Search Service

The MultiVectorSearchService provides advanced search capabilities across multiple vector types with intelligent result merging and deduplication. It enables comprehensive semantic search by leveraging different vector representations of the same data.

### Features

- **Multiple Vector Types**: Supports semantic, categories, functionality, aliases, and composites vectors
- **Advanced Merging Strategies**: Reciprocal Rank Fusion (RRF), weighted average, and custom strategies
- **Parallel Search**: Concurrent searching across vector types for improved performance
- **Result Deduplication**: Intelligent duplicate detection and removal
- **Source Attribution**: Tracks which vector types contributed to each result
- **Intelligent Caching**: Configurable caching with TTL support for improved performance
- **Timeout Handling**: Configurable timeouts for search operations
- **Performance Monitoring**: Built-in metrics and timing analysis

### Configuration

The service uses the `MultiVectorSearchConfig` from the enhanced search configuration:

```typescript
interface MultiVectorSearchConfig {
  enabled: boolean;
  vectorTypes: string[];
  mergeStrategy: 'reciprocal_rank_fusion' | 'weighted_average' | 'custom';
  rrfKValue: number;
  maxResultsPerVector: number;
  deduplicationEnabled: boolean;
  deduplicationThreshold: number;
  sourceAttributionEnabled: boolean;
  parallelSearchEnabled: boolean;
  searchTimeout: number;
}
```

### Usage Examples

#### Basic Multi-Vector Search

```typescript
import { multiVectorSearchService } from './services';

// Initialize the service
await multiVectorSearchService.initialize();

// Perform basic search
const result = await multiVectorSearchService.searchMultiVector('react components', {
  limit: 10,
  vectorTypes: ['semantic']
});

console.log('Search results:', result.vectorSearchResults);
console.log('Search metrics:', result.searchMetrics);
```

#### Advanced Search with Multiple Vector Types

```typescript
// Search across multiple vector types with filters
const result = await multiVectorSearchService.searchMultiVector('free api tools', {
  limit: 20,
  vectorTypes: ['semantic', 'categories', 'functionality'],
  filter: {
    must: [
      { key: 'pricing_model', match: { value: 'free' } }
    ]
  }
});

console.log('Results by vector type:');
Object.entries(result.vectorSearchResults).forEach(([type, results]) => {
  console.log(`${type}: ${results.length} results`);
});
```

#### Configuration Management

```typescript
// Update service configuration
multiVectorSearchService.updateConfig({
  mergeStrategy: 'weighted_average',
  maxResultsPerVector: 25,
  rrfKValue: 100,
  deduplicationThreshold: 0.85
});

// Get current configuration
const config = multiVectorSearchService.getConfig();
console.log('Current merge strategy:', config.mergeStrategy);
```

#### Testing Different Merge Strategies

```typescript
const strategies = ['reciprocal_rank_fusion', 'weighted_average', 'custom'] as const;

for (const strategy of strategies) {
  multiVectorSearchService.updateConfig({ mergeStrategy: strategy });
  
  const results = await multiVectorSearchService.searchMultiVector('javascript framework', {
    limit: 10,
    vectorTypes: ['semantic', 'categories']
  });
  
  console.log(`${strategy} strategy: ${Object.values(results.vectorSearchResults).flat().length} results`);
}
```

### Merge Strategies

#### Reciprocal Rank Fusion (RRF)
- Combines rankings from multiple vector types using the formula: 1/(k + rank + 1)
- Default k-value of 60 provides good balance between rank and score
- Effective for combining diverse ranking signals

#### Weighted Average
- Applies different weights to vector types (semantic: 1.0, categories: 0.8, etc.)
- Useful when certain vector types are more important for your use case
- Configurable weights can be customized

#### Custom Strategy
- Extensible framework for domain-specific merging logic
- Can be implemented based on business requirements
- Falls back to RRF if not customized

### Performance Considerations

- **Parallel Search**: Enable for better performance with multiple vector types
- **Caching**: Enable for frequently used queries to improve response time
- **Deduplication**: Balance between quality and performance with threshold tuning
- **Timeout Handling**: Set appropriate timeouts based on your latency requirements
- **Result Limits**: Adjust `maxResultsPerVector` based on quality vs. performance needs

### Integration with Enhanced Search

The MultiVectorSearchService integrates with the enhanced search system:

1. **Stage 2**: Performs multi-vector search as part of the execution plan
2. **State Management**: Updates `vectorSearchState` in enhanced state
3. **Performance Metrics**: Tracks search performance and merging efficiency

### Error Handling

The service includes comprehensive error handling:

- Graceful degradation when individual vector types fail
- Timeout handling for long-running searches
- Detailed error logging for debugging
- Fallback to available vector types when some are unavailable

### Health Monitoring

```typescript
// Check service health
const health = await multiVectorSearchService.healthCheck();
console.log('Service status:', health.status);
console.log('Qdrant connection:', health.details.qdrantConnection);

// Get performance metrics
const metrics = multiVectorSearchService.getLastSearchMetrics();
if (metrics) {
  console.log('Total search time:', metrics.totalSearchTime);
  console.log('Vector type metrics:', metrics.vectorTypeMetrics);
}
```

## Contributing

When contributing to services:

1. Maintain backward compatibility
2. Add comprehensive error handling
3. Include performance monitoring
4. Update documentation
5. Follow existing code patterns

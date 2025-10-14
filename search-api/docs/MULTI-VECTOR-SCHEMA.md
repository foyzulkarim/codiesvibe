# Multi-Vector Qdrant Collection Schema

## Overview

This document describes the enhanced Qdrant collection schema that supports multiple named vectors per tool, enabling more sophisticated semantic search capabilities as part of Phase 2: Enhanced Qdrant Integration for the AI Search Enhancement v2.0 project.

## Architecture

The multi-vector implementation uses separate collections for each vector type, providing better performance and isolation compared to named vectors within a single collection.

### Vector Types

| Vector Type | Collection Name | Description | Use Case |
|-------------|----------------|-------------|----------|
| `semantic` | `tools_semantic` | General semantic similarity | Overall tool similarity and relevance |
| `entities.categories` | `tools_categories` | Category-based embeddings | Category-specific searches |
| `entities.functionality` | `tools_functionality` | Functionality embeddings | Feature-based searches |
| `entities.aliases` | `tools_aliases` | Alias and alternative name embeddings | Name variation searches |
| `composites.toolType` | `tools_tool_type` | Tool type embeddings | Tool type classification |

### Collection Configuration

Each collection uses the following vector configuration:
- **Dimensions**: 1024 (compatible with mxbai-embed-large model)
- **Distance**: Cosine
- **Indexing**: HNSW (default)

## Schema Structure

### Database Configuration

```typescript
// search-api/src/config/database.ts
export const qdrantConfig = {
  host: process.env.QDRANT_HOST || "localhost",
  port: parseInt(process.env.QDRANT_PORT || "6333"),
  collectionName: process.env.QDRANT_COLLECTION_NAME || "tools", // Legacy collection
  multiVectorsConfig: {
    semantic: {
      size: 1024,
      distance: "Cosine" as const,
    },
    "entities.categories": {
      size: 1024,
      distance: "Cosine" as const,
    },
    "entities.functionality": {
      size: 1024,
      distance: "Cosine" as const,
    },
    "entities.aliases": {
      size: 1024,
      distance: "Cosine" as const,
    },
    "composites.toolType": {
      size: 1024,
      distance: "Cosine" as const,
    },
  },
  collectionNames: {
    semantic: "tools_semantic",
    "entities.categories": "tools_categories",
    "entities.functionality": "tools_functionality",
    "entities.aliases": "tools_aliases",
    "composites.toolType": "tools_tool_type",
  }
};
```

### Point Structure

Each point in the collections follows this structure:

```typescript
{
  id: "uuid-v5-based-hash", // Deterministic UUID based on tool ID
  vector: number[], // 1024-dimensional embedding
  payload: {
    id: "original-tool-id",
    name: "Tool Name",
    description: "Tool description",
    category: "tool-category",
    // ... other metadata
  }
}
```

## API Usage

### Search Operations

#### Single Vector Type Search

```typescript
// Search using semantic vectors
const results = await qdrantService.searchByVectorType(
  embedding,
  'semantic',
  10,
  filter
);

// Search using category vectors
const categoryResults = await qdrantService.searchByVectorType(
  embedding,
  'entities.categories',
  10,
  filter
);
```

#### Text-based Search

```typescript
// Search by text with specific vector type
const results = await qdrantService.searchByTextAndVectorType(
  "api library for nodejs",
  'semantic',
  10,
  filter
);
```

#### Similar Tool Search

```typescript
// Find similar tools using specific vector type
const similarTools = await qdrantService.findSimilarTools(
  'tool-id',
  10,
  filter,
  'entities.functionality'
);
```

### Upsert Operations

#### Single Vector Type

```typescript
// Upsert tool with semantic vector
await qdrantService.upsertToolVector(
  'tool-id',
  semanticEmbedding,
  payload,
  'semantic'
);
```

#### Multi-Vector Upsert

```typescript
// Upsert multiple vectors for a tool
await qdrantService.upsertToolMultiVector(
  'tool-id',
  {
    semantic: semanticEmbedding,
    'entities.categories': categoryEmbedding,
    'entities.functionality': functionalityEmbedding,
    'entities.aliases': aliasesEmbedding,
    'composites.toolType': toolTypeEmbedding,
  },
  payload
);
```

### Delete Operations

#### Single Vector Type Deletion

```typescript
// Delete specific vector type for a tool
await qdrantService.deleteToolVector('tool-id', 'semantic');
```

#### Complete Tool Deletion

```typescript
// Delete all vectors for a tool
await qdrantService.deleteToolAllVectors('tool-id');
```

### Collection Management

#### Get Collection Information

```typescript
// Get info for specific vector type collection
const info = await qdrantService.getCollectionInfoForVectorType('semantic');

// Get info for all collections
const allInfo = await qdrantService.getAllCollectionsInfo();
```

#### Clear Collections

```typescript
// Clear specific vector type collection
await qdrantService.clearAllPointsForVectorType('semantic');

// Clear all collections
await qdrantService.clearAllPointsFromAllCollections();
```

## Validation

The implementation includes comprehensive validation for all operations:

### Input Validation

- **Embedding Validation**: Ensures correct dimensions (1024) and valid numerical values
- **Vector Type Validation**: Checks against supported vector types
- **Tool ID Validation**: Validates format and length constraints
- **Payload Validation**: Ensures required fields and size limits
- **Filter Validation**: Validates filter structure and allowed keys

### Error Handling

All validation errors use the `VectorValidationError` class with specific error codes:

```typescript
export class VectorValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'VectorValidationError';
  }
}
```

### Error Codes

| Error Code | Description |
|------------|-------------|
| `INVALID_EMBEDDING_TYPE` | Embedding is not an array |
| `INVALID_EMBEDDING_DIMENSIONS` | Embedding has incorrect dimensions |
| `INVALID_EMBEDDING_VALUE` | Embedding contains invalid values |
| `UNSUPPORTED_VECTOR_TYPE` | Vector type is not supported |
| `INVALID_TOOL_ID` | Tool ID is invalid |
| `INVALID_PAYLOAD_TYPE` | Payload is not an object |
| `PAYLOAD_TOO_LARGE` | Payload exceeds size limit |
| `INVALID_FILTER_TYPE` | Filter is not an object |
| `INVALID_SEARCH_LIMIT` | Search limit is invalid |

## Migration Strategy

### Backward Compatibility

The implementation maintains backward compatibility with the existing `tools` collection (legacy). New operations will use the multi-vector collections, while existing code continues to work with the legacy collection.

### Migration Steps

1. **Phase 1**: Deploy multi-vector support alongside existing implementation
2. **Phase 2**: Seed new collections with enhanced vectors
3. **Phase 3**: Gradually migrate search operations to use multi-vector collections
4. **Phase 4**: Deprecate legacy collection (future)

### Collection Creation

Collections are automatically created during the Qdrant connection process if they don't exist:

```typescript
// search-api/src/config/database.ts
export async function connectToQdrant(): Promise<QdrantClient> {
  // ... connection logic
  
  // Create multi-vector collections
  for (const [vectorType, collectionName] of Object.entries(qdrantConfig.collectionNames)) {
    if (!existingCollectionNames.includes(collectionName)) {
      const vectorConfig = qdrantConfig.multiVectorsConfig[vectorType];
      if (vectorConfig) {
        await qdrantClient.createCollection(collectionName, {
          vectors: vectorConfig,
        });
        console.log(`Created Qdrant collection for ${vectorType}: ${collectionName}`);
      }
    }
  }
}
```

## Performance Considerations

### Collection Isolation

Using separate collections for each vector type provides:
- **Better Performance**: Each collection can be optimized for its specific use case
- **Independent Scaling**: Collections can be scaled independently
- **Easier Maintenance**: Individual collections can be rebuilt or optimized without affecting others

### Memory Usage

- **Embedding Storage**: Each vector type requires separate storage (5x storage for 5 vector types)
- **Index Memory**: Each collection maintains its own HNSW index
- **Cache Efficiency**: Smaller, focused collections improve cache hit rates

### Search Performance

- **Parallel Search**: Multiple vector types can be searched in parallel
- **Result Merging**: Results from different vector types are merged using configurable strategies
- **Timeout Handling**: Individual vector type searches can timeout independently

## Configuration

### Environment Variables

```bash
# Qdrant connection
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Collection names (optional, uses defaults if not specified)
QDRANT_COLLECTION_SEMANTIC=tools_semantic
QDRANT_COLLECTION_CATEGORIES=tools_categories
QDRANT_COLLECTION_FUNCTIONALITY=tools_functionality
QDRANT_COLLECTION_ALIASES=tools_aliases
QDRANT_COLLECTION_TOOL_TYPE=tools_tool_type

# Legacy collection (for backward compatibility)
QDRANT_COLLECTION_NAME=tools
```

### Multi-Vector Search Configuration

The multi-vector search behavior is configured through the enhanced search configuration:

```typescript
// search-api/src/config/enhanced-search-config.ts
export const MultiVectorSearchConfigSchema = z.object({
  enabled: z.boolean().default(true),
  vectorTypes: z.array(z.string()).default(['semantic', 'categories', 'functionality', 'aliases', 'composites']),
  mergeStrategy: z.enum(['reciprocal_rank_fusion', 'weighted_average', 'custom']).default('reciprocal_rank_fusion'),
  rrfKValue: z.number().default(60),
  maxResultsPerVector: z.number().default(20),
  deduplicationEnabled: z.boolean().default(true),
  deduplicationThreshold: z.number().default(0.9),
  sourceAttributionEnabled: z.boolean().default(true),
  parallelSearchEnabled: z.boolean().default(true),
  searchTimeout: z.number().default(5000), // ms
});
```

## Testing

### Unit Tests

The implementation includes comprehensive unit tests for:
- Vector validation
- Collection operations
- Search functionality
- Error handling

### Integration Tests

Integration tests verify:
- End-to-end search operations
- Multi-vector result merging
- Performance characteristics
- Error scenarios

### Performance Benchmarks

Benchmark tests measure:
- Search latency for each vector type
- Memory usage patterns
- Throughput characteristics
- Scalability limits

## Monitoring and Observability

### Metrics

The implementation tracks:
- Search operation counts and latency per vector type
- Collection sizes and growth rates
- Cache hit rates
- Error rates and types

### Logging

Detailed logging includes:
- Operation start/end times
- Vector types used
- Result counts and quality metrics
- Error details and stack traces

### Health Checks

Health checks verify:
- Qdrant connectivity
- Collection availability
- Vector type support
- Performance thresholds

## Future Enhancements

### Planned Features

1. **Dynamic Vector Types**: Support for adding new vector types without code changes
2. **Vector Versioning**: Support for multiple embedding model versions
3. **Hybrid Search**: Combination of vector and keyword search
4. **Real-time Updates**: Live vector updates without reindexing
5. **Advanced Filtering**: More sophisticated filter capabilities

### Performance Optimizations

1. **Quantization**: Support for vector quantization to reduce memory usage
2. **Tuning**: Automatic HNSW parameter tuning
3. **Caching**: Enhanced caching strategies for frequently accessed vectors
4. **Sharding**: Collection sharding for large-scale deployments

## Troubleshooting

### Common Issues

1. **Collection Not Found**: Ensure Qdrant is running and collections are created
2. **Dimension Mismatch**: Verify all embeddings are 1024 dimensions
3. **Connection Issues**: Check Qdrant host and port configuration
4. **Memory Issues**: Monitor memory usage and consider collection optimization

### Debug Commands

```typescript
// Check collection info
const info = await qdrantService.getAllCollectionsInfo();
console.log('Collections:', info);

// Test vector type support
const supportedTypes = qdrantService.getSupportedVectorTypes();
console.log('Supported vector types:', supportedTypes);

// Validate embeddings
import { validateEmbedding } from '@/utils/vector-validation';
try {
  validateEmbedding(embedding);
  console.log('Embedding is valid');
} catch (error) {
  console.error('Embedding validation failed:', error);
}
```

## Conclusion

The multi-vector Qdrant collection schema provides a robust foundation for advanced semantic search capabilities. By supporting multiple vector types with comprehensive validation and error handling, it enables sophisticated search strategies while maintaining performance and reliability.

The implementation is designed to be backward compatible, easily extensible, and well-validated, making it suitable for production use in the AI Search Enhancement v2.0 project.

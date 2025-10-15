# Enhanced Qdrant Collection Schema with Named Vectors

## Overview

This document describes the enhanced Qdrant collection schema that supports multiple named vectors within a single collection, enabling more sophisticated semantic search capabilities as part of Task T008: Enhance Qdrant collection schema for multi-vector support.

## Architecture

The enhanced schema uses Qdrant's named vectors feature to store multiple vector types in a single collection, providing better performance and data consistency compared to using separate collections for each vector type.

### Vector Types

| Vector Type | Description | Use Case | Priority |
|-------------|-------------|----------|----------|
| `semantic` | Primary semantic similarity vector for overall tool relevance | General similarity search and relevance ranking | 1 |
| `entities.categories` | Category-based embeddings for domain-specific searches | Finding tools in specific categories or domains | 2 |
| `entities.functionality` | Functionality embeddings for feature-based searches | Finding tools with specific features or capabilities | 3 |
| `entities.aliases` | Alias and alternative name embeddings | Finding tools by alternative names or synonyms | 4 |
| `composites.toolType` | Tool type classification embeddings | Finding tools of specific types or classifications | 5 |

## Schema Structure

### Enhanced Collection Configuration

```typescript
// search-api/src/config/enhanced-qdrant-schema.ts
export const enhancedCollectionConfig = {
  vectors_config: {
    semantic: {
      size: 1024,
      distance: "Cosine",
    },
    "entities.categories": {
      size: 1024,
      distance: "Cosine",
    },
    "entities.functionality": {
      size: 1024,
      distance: "Cosine",
    },
    "entities.aliases": {
      size: 1024,
      distance: "Cosine",
    },
    "composites.toolType": {
      size: 1024,
      distance: "Cosine",
    },
  },
};
```

### Point Structure

Each point in the enhanced collection follows this structure:

```typescript
{
  id: "uuid-v5-based-hash", // Deterministic UUID based on tool ID
  vector: {
    semantic: number[],           // 1024-dimensional semantic embedding
    "entities.categories": number[],  // 1024-dimensional category embedding
    "entities.functionality": number[], // 1024-dimensional functionality embedding
    "entities.aliases": number[],      // 1024-dimensional aliases embedding
    "composites.toolType": number[]    // 1024-dimensional tool type embedding
  },
  payload: {
    id: "original-tool-id",
    name: "Tool Name",
    description: "Tool description",
    category: "tool-category",
    // ... other metadata
  }
}
```

## Configuration

### Environment Variables

```bash
# Qdrant connection
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Enhanced collection configuration
QDRANT_USE_ENHANCED_COLLECTION=true          # Enable enhanced schema
QDRANT_ENHANCED_COLLECTION_NAME=tools_enhanced # Enhanced collection name

# Legacy collection (for backward compatibility)
QDRANT_COLLECTION_NAME=tools
```

### Collection Creation Options

```typescript
export const defaultEnhancedCollectionOptions = {
  vectors_config: enhancedCollectionConfig.vectors_config,
  shard_number: 1,
  replication_factor: 1,
  write_consistency_factor: 1,
  on_disk: false,
  hnsw_config: {
    m: 16,
    ef_construct: 100,
    full_scan_threshold: 10000,
    max_indexing_threads: 4,
    on_disk: false,
  },
  wal_config: {
    wal_capacity_mb: 32,
    wal_segments_ahead: 2,
  },
  optimizers_config: {
    deleted_threshold: 0.2,
    vacuum_min_vector_number: 1000,
    default_segment_number: 2,
    max_segment_size: 200000,
    memmap_threshold: 50000,
    indexing_threshold: 20000,
    flush_interval_sec: 5,
    max_optimization_threads: 1,
  },
};
```

## API Usage

### Enhanced Upsert Operations

#### Multi-Vector Upsert

```typescript
// Upsert multiple vectors for a tool
await qdrantService.upsertToolEnhanced(
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

#### Single Named Vector Upsert

```typescript
// Upsert single named vector
await qdrantService.upsertToolNamedVector(
  'tool-id',
  'semantic',
  semanticEmbedding,
  payload
);
```

### Enhanced Search Operations

#### Search by Vector Type

```typescript
// Search using specific vector type
const results = await qdrantService.searchByTextAndVectorType(
  "api library for nodejs",
  'semantic',
  10,
  filter
);
```

#### Multi-Vector Search

```typescript
// Search across multiple vector types
const semanticResults = await qdrantService.searchByEmbedding(
  embedding,
  10,
  filter,
  'semantic'
);

const categoryResults = await qdrantService.searchByEmbedding(
  embedding,
  10,
  filter,
  'entities.categories'
);
```

#### Similar Tools Search

```typescript
// Find similar tools using specific vector type
const similarTools = await qdrantService.findSimilarTools(
  'tool-id',
  10,
  filter,
  'entities.functionality'
);
```

### Collection Management

#### Get Enhanced Collection Info

```typescript
// Get enhanced collection information
const info = await qdrantService.getEnhancedCollectionInfo();
console.log('Vector types:', Object.keys(info.config.params.vectors));
console.log('Points count:', info.points_count);
```

#### Get Tool Vector Types

```typescript
// Get available vector types for a specific tool
const vectorTypes = await qdrantService.getToolVectorTypes('tool-id');
console.log('Available vectors:', vectorTypes);
```

#### Health Check

```typescript
// Enhanced health check
const healthInfo = await qdrantService.healthCheck();
console.log('Status:', healthInfo.status);
console.log('Collections:', Object.keys(healthInfo.collections));
```

## Validation

### Enhanced Vector Validation

The enhanced schema includes comprehensive validation for all operations:

```typescript
import { validateEnhancedVectors, validateEnhancedVectorOperation } from '@/config/enhanced-qdrant-schema';
import { validateEnhancedSearchParams } from '@/utils/vector-validation';

// Validate multiple vectors
validateEnhancedVectors({
  semantic: semanticEmbedding,
  'entities.categories': categoryEmbedding,
  // ... other vectors
});

// Validate enhanced operations
validateEnhancedVectorOperation({
  toolId: 'tool-id',
  vectors: { semantic: embedding },
  payload: { id: 'tool-id', name: 'Tool' },
  operation: 'upsert'
});

// Validate enhanced search parameters
validateEnhancedSearchParams({
  query: 'search query',
  vectorTypes: ['semantic', 'entities.categories'],
  limit: 10,
  useEnhanced: true
});
```

### Error Handling

Enhanced validation errors provide specific error codes:

```typescript
export const ENHANCED_VECTOR_ERROR_CODES = {
  INVALID_ENHANCED_VECTOR_TYPE: 'INVALID_ENHANCED_VECTOR_TYPE',
  MISSING_REQUIRED_VECTOR_TYPE: 'MISSING_REQUIRED_VECTOR_TYPE',
  UNSUPPORTED_ENHANCED_VECTOR_TYPE: 'UNSUPPORTED_ENHANCED_VECTOR_TYPE',
  INVALID_COLLECTION_CONFIG: 'INVALID_COLLECTION_CONFIG',
  INVALID_VECTOR_SIZE: 'INVALID_VECTOR_SIZE',
  INVALID_DISTANCE_METRIC: 'INVALID_DISTANCE_METRIC',
} as const;
```

## Migration Strategy

### Backward Compatibility

The enhanced schema maintains backward compatibility with the existing implementation:

1. **Legacy Collections**: Original separate collections continue to work
2. **Gradual Migration**: Can migrate incrementally without breaking existing functionality
3. **Feature Flag**: `QDRANT_USE_ENHANCED_COLLECTION` controls which schema to use

### Migration Steps

1. **Phase 1**: Deploy enhanced schema alongside existing implementation
2. **Phase 2**: Create enhanced collection using migration script
3. **Phase 3**: Seed enhanced collection with existing vectors
4. **Phase 4**: Enable enhanced collection via environment variable
5. **Phase 5**: Gradually deprecate legacy collections (future)

### Migration Script

```bash
# Create enhanced collections
npm run create-enhanced-collections

# Test enhanced schema
npm run test-enhanced-schema
```

## Performance Considerations

### Storage Requirements

- **Vector Storage**: Each tool requires 5 × 1024 × 4 bytes = ~20KB for vectors
- **Index Memory**: HNSW index for all vector types in single collection
- **Payload Storage**: Shared across all vector types

### Search Performance

- **Single Collection**: Reduced connection overhead
- **Named Vectors**: Efficient vector-specific searches
- **Shared Index**: Better cache utilization for related searches

### Memory Usage

- **Consolidated Storage**: More efficient than separate collections
- **Shared Payloads**: Reduced memory overhead for metadata
- **Index Optimization**: Single HNSW index for all vector types

## Monitoring and Observability

### Metrics

The enhanced implementation tracks:

- **Search Operations**: Count and latency per vector type
- **Collection Health**: Status and configuration verification
- **Vector Validation**: Error rates and types
- **Migration Progress**: Legacy vs enhanced collection usage

### Health Checks

Enhanced health checks verify:

```typescript
// Comprehensive health check
const healthInfo = await qdrantService.healthCheck();
// Returns: { status, collections: { legacy, enhanced }, enhanced? }

// Enhanced vector support information
const vectorSupport = qdrantService.getEnhancedVectorSupport();
// Returns: { enabled, supportedTypes, collectionName }
```

## Testing

### Test Scripts

```bash
# Create enhanced collections
ts-node src/scripts/create-enhanced-collections.ts

# Test enhanced schema functionality
ts-node src/scripts/test-enhanced-schema.ts
```

### Test Coverage

The test suite validates:

1. **Configuration Validation**: Enhanced schema configuration
2. **Collection Operations**: Creation, info retrieval, health checks
3. **Vector Operations**: Upsert, search, similarity operations
4. **Validation Logic**: Input validation and error handling
5. **Performance**: Search latency and result quality

## Troubleshooting

### Common Issues

1. **Collection Not Found**: Ensure enhanced collection is created
2. **Vector Type Not Supported**: Check vector type configuration
3. **Dimension Mismatch**: Verify all embeddings are 1024 dimensions
4. **Validation Errors**: Check vector format and content

### Debug Commands

```typescript
// Check enhanced collection info
const info = await qdrantService.getEnhancedCollectionInfo();
console.log('Enhanced collection:', info);

// Check vector type support
const support = qdrantService.getEnhancedVectorSupport();
console.log('Enhanced support:', support);

// Validate vectors
import { validateEnhancedVectors } from '@/config/enhanced-qdrant-schema';
try {
  validateEnhancedVectors(vectors);
  console.log('Vectors are valid');
} catch (error) {
  console.error('Vector validation failed:', error);
}
```

## Future Enhancements

### Planned Features

1. **Dynamic Vector Types**: Runtime addition of new vector types
2. **Vector Versioning**: Support for multiple embedding model versions
3. **Advanced Filtering**: More sophisticated filter capabilities
4. **Performance Optimization**: Query optimization and caching

### Extension Points

The enhanced schema is designed for extensibility:

```typescript
// Add new vector type
export const enhancedCollectionConfig = {
  vectors_config: {
    // Existing vectors...
    "new.vector.type": {
      size: 1024,
      distance: "Cosine",
    },
  },
};
```

## Conclusion

The enhanced Qdrant collection schema provides a robust foundation for advanced semantic search capabilities. By supporting multiple named vectors in a single collection, it enables sophisticated search strategies while maintaining performance, data consistency, and backward compatibility.

The implementation is designed to be production-ready with comprehensive validation, error handling, monitoring, and testing capabilities, making it suitable for immediate deployment in the AI Search Enhancement v2.0 project.

# Enhanced Embedding Cache

A high-performance, feature-rich embedding cache utility designed for AI-powered search applications. This enhanced cache provides intelligent caching mechanisms with semantic similarity, adaptive TTL, compression, and comprehensive monitoring capabilities.

## Features

### 🚀 Core Features
- **Intelligent Caching**: Semantic similarity-based cache lookup for finding similar embeddings
- **Adaptive TTL**: Dynamic time-to-live based on access patterns
- **Compression**: Optional compression to reduce memory usage
- **Batch Operations**: Efficient bulk get/set operations
- **Multiple Eviction Policies**: LRU, LFU, priority-based, and adaptive eviction

### 📊 Monitoring & Metrics
- **Detailed Metrics**: Hit rates, compression ratios, memory usage tracking
- **Performance Monitoring**: Access time tracking and cache statistics
- **Top Entries Tracking**: Identify most frequently accessed embeddings

### 🔧 Advanced Features
- **Cache Warming**: Pre-populate cache with frequently used embeddings
- **Export/Import**: Persist cache state for recovery
- **Priority System**: Weighted caching based on importance
- **Source Tracking**: Track embedding origins (model versions, etc.)

## Installation

```typescript
import { EnhancedEmbeddingCache } from "./utils/enhanced-embedding-cache";
import { defaultEnhancedSearchConfig } from "./config/enhanced-search-config";
```

## Quick Start

```typescript
// Create cache instance
const cache = new EnhancedEmbeddingCache(
  defaultEnhancedSearchConfig.performance
);

// Initialize
await cache.initialize();

// Basic usage
cache.set("query-1", [0.1, 0.2, 0.3, 0.4, 0.5]);
const embedding = cache.get("query-1");

// Semantic similarity lookup
const similar = cache.get("non-existent", [0.11, 0.21, 0.31, 0.41, 0.51]);

// Clean up
cache.destroy();
```

## Configuration

The cache accepts a `PerformanceConfig` object with the following options:

```typescript
{
  cacheEnabled: true,              // Enable/disable caching
  embeddingCacheSize: 1000,        // Maximum number of entries
  cacheTTL: 3600,                  // Default TTL in seconds
  intelligentCacheEnabled: true,   // Enable semantic similarity
  semanticSimilarityThreshold: 0.8, // Threshold for semantic matches
  adaptiveTTLEnabled: true,        // Enable adaptive TTL
  minTTL: 300,                     // Minimum TTL in seconds
  maxTTL: 7200,                    // Maximum TTL in seconds
  cacheCompressionEnabled: true,   // Enable compression
  cacheWarmingEnabled: false,      // Enable cache warming
  maxConcurrentRequests: 10,       // Max concurrent operations
  requestTimeout: 10000,          // Request timeout in ms
}
```

## API Reference

### Basic Operations

#### `set(key: string, embedding: number[], options?: SetOptions): void`
Store an embedding in the cache.

```typescript
cache.set("query", embedding, {
  priority: 5,           // Cache priority (1-10)
  source: "model-v1",    // Source identifier
  customTTL: 7200        // Custom TTL in seconds
});
```

#### `get(key: string, queryEmbedding?: number[]): number[] | null`
Retrieve an embedding from the cache.

```typescript
// Direct lookup
const embedding = cache.get("query");

// Semantic similarity lookup
const similar = cache.get("non-existent", queryEmbedding);
```

#### `has(key: string): boolean`
Check if a key exists in the cache.

```typescript
if (cache.has("query")) {
  // Key exists and hasn't expired
}
```

#### `delete(key: string): boolean`
Remove a specific entry from the cache.

```typescript
const deleted = cache.delete("query");
```

#### `clear(): void`
Clear all entries from the cache.

```typescript
cache.clear();
```

### Batch Operations

#### `setBatch(entries: BatchEntry[]): void`
Store multiple embeddings efficiently.

```typescript
cache.setBatch([
  { key: "query1", embedding: [0.1, 0.2, 0.3] },
  { key: "query2", embedding: [0.4, 0.5, 0.6] }
]);
```

#### `getBatch(keys: string[], queryEmbeddings?: number[][]): BatchResult[]`
Retrieve multiple embeddings efficiently.

```typescript
const results = cache.getBatch(["query1", "query2"]);
```

### Cache Management

#### `size(): number`
Get the current number of entries in the cache.

#### `cleanup(): number`
Remove expired entries and return the count of removed items.

#### `setEvictionPolicy(policy: EvictionPolicy): void`
Set the cache eviction policy.

```typescript
cache.setEvictionPolicy('lru');      // Least Recently Used
cache.setEvictionPolicy('lfu');      // Least Frequently Used
cache.setEvictionPolicy('priority'); // Priority-based
cache.setEvictionPolicy('adaptive'); // Adaptive (default)
```

### Metrics and Monitoring

#### `getMetrics(): CacheMetrics`
Get detailed cache metrics.

```typescript
const metrics = cache.getMetrics();
console.log(`Hit rate: ${(metrics.hitRate * 100).toFixed(2)}%`);
console.log(`Memory usage: ${(metrics.memoryUsage / 1024).toFixed(2)} KB`);
console.log(`Compression ratio: ${(metrics.compressionRatio * 100).toFixed(2)}%`);
```

#### `getStats(): CacheStats`
Get comprehensive cache statistics including top entries.

```typescript
const stats = cache.getStats();
console.log(`Total entries: ${stats.size}`);
console.log(`Top entries:`, stats.topEntries);
```

### Persistence

#### `export(): CacheExport[]`
Export the current cache state for persistence.

```typescript
const exported = cache.export();
// Save to file or database
```

#### `import(data: CacheExport[]): void`
Import previously exported cache state.

```typescript
cache.import(exportedData);
```

### Lifecycle Management

#### `initialize(): Promise<void>`
Initialize the cache and perform setup tasks.

#### `destroy(): void`
Clean up resources and stop background processes.

## Use Cases

### 1. Embedding Service Integration

```typescript
class EmbeddingService {
  private cache: EnhancedEmbeddingCache;

  constructor() {
    this.cache = new EnhancedEmbeddingCache(config);
  }

  async getEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cached = this.cache.get(text);
    if (cached) return cached;

    // Generate embedding
    const embedding = await this.generateEmbedding(text);
    
    // Cache with high priority for common terms
    const priority = this.isCommonTerm(text) ? 10 : 1;
    this.cache.set(text, embedding, { priority });
    
    return embedding;
  }
}
```

### 2. Semantic Search Optimization

```typescript
class SemanticSearchService {
  async findSimilar(query: string): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddingService.getEmbedding(query);
    
    // Try semantic cache first
    const cachedSimilar = this.cache.get(query, queryEmbedding);
    if (cachedSimilar) {
      return this.formatResults(cachedSimilar);
    }
    
    // Perform actual search
    const results = await this.vectorSearch(queryEmbedding);
    
    // Cache results
    this.cache.set(query, results.embeddings, { priority: 8 });
    
    return results;
  }
}
```

### 3. Batch Processing

```typescript
async function processBatch(documents: string[]): Promise<ProcessedDocument[]> {
  // Check cache for all documents
  const cachedResults = cache.getBatch(documents);
  
  const uncached = cachedResults
    .filter(result => result.embedding === null)
    .map(result => result.key);
  
  // Generate embeddings for uncached documents
  const newEmbeddings = await batchGenerateEmbeddings(uncached);
  
  // Cache new embeddings
  cache.setBatch(
    uncached.map((doc, index) => ({
      key: doc,
      embedding: newEmbeddings[index]
    }))
  );
  
  // Combine cached and new results
  return combineResults(cachedResults, newEmbeddings);
}
```

## Performance Considerations

### Memory Usage
- Enable compression for large embeddings to reduce memory footprint
- Monitor memory usage through metrics to optimize cache size
- Use appropriate TTL values to balance memory usage and hit rate

### Hit Rate Optimization
- Enable semantic similarity for improved hit rates on similar queries
- Use adaptive TTL to keep frequently accessed items longer
- Implement cache warming for predictable access patterns

### Eviction Policies
- **LRU**: Best for general-purpose caching with temporal locality
- **LFU**: Ideal for stable access patterns with clear favorites
- **Priority**: Use when you have importance-based requirements
- **Adaptive**: Recommended for most use cases (default)

## Monitoring and Debugging

### Key Metrics to Monitor
- **Hit Rate**: Target >70% for effective caching
- **Semantic Hit Rate**: Bonus hits from similarity matching
- **Compression Ratio**: Memory savings from compression
- **Eviction Rate**: Indicates cache size optimization
- **Average Access Time**: Performance measurement

### Debug Information

```typescript
// Get detailed cache statistics
const stats = cache.getStats();
console.log('Cache Performance:', {
  size: stats.size,
  hitRate: `${(stats.metrics.hitRate * 100).toFixed(2)}%`,
  memoryUsage: `${(stats.metrics.memoryUsage / 1024).toFixed(2)} KB`,
  compressionRatio: `${(stats.metrics.compressionRatio * 100).toFixed(2)}%`,
  topEntries: stats.topEntries.slice(0, 5)
});
```

## Best Practices

1. **Configuration**: Start with default settings and adjust based on usage patterns
2. **Monitoring**: Regularly check metrics to optimize cache performance
3. **Cleanup**: Use automatic cleanup or schedule regular cleanup operations
4. **Persistence**: Export cache state periodically for disaster recovery
5. **Testing**: Use the provided examples to validate cache behavior
6. **Error Handling**: Always wrap cache operations in try-catch blocks

## Examples

See [`enhanced-embedding-cache.example.ts`](./enhanced-embedding-cache.example.ts) for comprehensive usage examples and the [`demonstrateEnhancedCache()`](./enhanced-embedding-cache.example.ts#7) function for a complete demo.

## Testing

Run the test suite to validate cache functionality:

```bash
npm test -- enhanced-embedding-cache.test.ts
```

The tests cover:
- Basic cache operations
- TTL and expiration handling
- Semantic similarity lookup
- Cache eviction policies
- Compression and decompression
- Batch operations
- Metrics and monitoring
- Error handling
- Export/import functionality

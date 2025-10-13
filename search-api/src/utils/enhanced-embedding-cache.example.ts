import { EnhancedEmbeddingCache } from "./enhanced-embedding-cache";
import { defaultEnhancedSearchConfig } from "../config/enhanced-search-config";

/**
 * Example usage of the Enhanced Embedding Cache
 */
export async function demonstrateEnhancedCache(): Promise<void> {
  console.log("=== Enhanced Embedding Cache Demo ===\n");

  // Create cache instance with custom configuration
  const cache = new EnhancedEmbeddingCache({
    ...defaultEnhancedSearchConfig.performance,
    cacheEnabled: true,
    embeddingCacheSize: 100,
    cacheTTL: 3600, // 1 hour
    intelligentCacheEnabled: true,
    semanticSimilarityThreshold: 0.8,
    adaptiveTTLEnabled: true,
    cacheCompressionEnabled: true,
    cacheWarmingEnabled: false, // Disable for demo
  });

  try {
    // Initialize the cache
    await cache.initialize();
    console.log("✓ Cache initialized\n");

    // Example 1: Basic cache operations
    console.log("1. Basic Cache Operations:");
    const key1 = "example-query-1";
    const embedding1 = [0.1, 0.2, 0.3, 0.4, 0.5];
    
    cache.set(key1, embedding1, { 
      priority: 5, 
      source: "demo-model-v1" 
    });
    
    const retrieved = cache.get(key1);
    console.log(`   Stored and retrieved embedding: ${JSON.stringify(retrieved)}`);
    console.log(`   Cache size: ${cache.size()}\n`);

    // Example 2: Semantic similarity lookup
    console.log("2. Semantic Similarity Lookup:");
    const key2 = "example-query-2";
    const embedding2 = [0.11, 0.21, 0.31, 0.41, 0.51]; // Very similar to embedding1
    const queryEmbedding = [0.12, 0.22, 0.32, 0.42, 0.52]; // Similar to both
    
    cache.set(key2, embedding2);
    
    // Try to get a non-existent key with semantic similarity
    const similarResult = cache.get("non-existent-key", queryEmbedding);
    console.log(`   Semantic lookup result: ${JSON.stringify(similarResult)}`);
    console.log(`   Found similar embedding: ${similarResult !== null}\n`);

    // Example 3: Batch operations
    console.log("3. Batch Operations:");
    const batchEntries = [
      { key: "batch-1", embedding: [0.6, 0.7, 0.8, 0.9, 1.0] },
      { key: "batch-2", embedding: [1.1, 1.2, 1.3, 1.4, 1.5] },
      { key: "batch-3", embedding: [1.6, 1.7, 1.8, 1.9, 2.0] },
    ];
    
    cache.setBatch(batchEntries);
    console.log(`   Added ${batchEntries.length} entries via batch set`);
    
    const batchResults = cache.getBatch(["batch-1", "batch-2", "batch-3"]);
    console.log(`   Retrieved ${batchResults.length} entries via batch get\n`);

    // Example 4: Cache eviction and policies
    console.log("4. Cache Eviction Policies:");
    cache.setEvictionPolicy('lru');
    console.log(`   Set eviction policy to LRU`);
    
    // Fill cache beyond capacity to trigger eviction
    for (let i = 0; i < 105; i++) {
      cache.set(`overflow-${i}`, [i * 0.1, i * 0.2, i * 0.3]);
    }
    
    console.log(`   Cache size after overflow: ${cache.size()}`);
    console.log(`   Max size configured: ${defaultEnhancedSearchConfig.performance.embeddingCacheSize}\n`);

    // Example 5: Metrics and monitoring
    console.log("5. Cache Metrics:");
    const metrics = cache.getMetrics();
    console.log(`   Cache hits: ${metrics.hits}`);
    console.log(`   Cache misses: ${metrics.misses}`);
    console.log(`   Semantic hits: ${metrics.semanticHits}`);
    console.log(`   Hit rate: ${(metrics.hitRate * 100).toFixed(2)}%`);
    console.log(`   Semantic hit rate: ${(metrics.semanticHitRate * 100).toFixed(2)}%`);
    console.log(`   Evictions: ${metrics.evictions}`);
    console.log(`   Compressions: ${metrics.compressions}`);
    console.log(`   Memory usage: ${(metrics.memoryUsage / 1024).toFixed(2)} KB`);
    console.log(`   Compression ratio: ${(metrics.compressionRatio * 100).toFixed(2)}%\n`);

    // Example 6: Cache statistics
    console.log("6. Detailed Cache Statistics:");
    const stats = cache.getStats();
    console.log(`   Total entries: ${stats.size}`);
    console.log(`   Top 3 entries by priority:`);
    stats.topEntries.slice(0, 3).forEach((entry, index) => {
      console.log(`     ${index + 1}. ${entry.key} (accessed ${entry.accessCount} times)`);
    });
    console.log();

    // Example 7: Export and import
    console.log("7. Cache Export/Import:");
    const exported = cache.export();
    console.log(`   Exported ${exported.length} cache entries`);
    
    // Create new cache and import
    const newCache = new EnhancedEmbeddingCache(defaultEnhancedSearchConfig.performance);
    await newCache.initialize();
    newCache.import(exported);
    console.log(`   Imported into new cache, size: ${newCache.size()}`);
    
    // Clean up
    newCache.destroy();
    console.log("   ✓ New cache cleaned up\n");

    // Example 8: TTL and expiration
    console.log("8. TTL and Expiration:");
    const shortTTLKey = "short-ttl";
    cache.set(shortTTLKey, [0.99, 0.98, 0.97], { customTTL: 2 }); // 2 seconds
    
    console.log(`   Set entry with 2-second TTL`);
    console.log(`   Immediately available: ${cache.has(shortTTLKey)}`);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 2100));
    console.log(`   After 2.1 seconds: ${cache.has(shortTTLKey)}`);
    
    // Clean up expired entries
    const cleanedUp = cache.cleanup();
    console.log(`   Cleaned up ${cleanedUp} expired entries\n");

    // Example 9: Adaptive TTL
    console.log("9. Adaptive TTL:");
    const adaptiveKey = "adaptive-ttl";
    cache.set(adaptiveKey, [0.1, 0.2, 0.3]);
    
    // Access multiple times to increase frequency
    for (let i = 0; i < 10; i++) {
      cache.get(adaptiveKey);
    }
    
    const finalMetrics = cache.getMetrics();
    console.log(`   Average TTL after frequent access: ${finalMetrics.averageTTL.toFixed(0)}s`);
    console.log(`   Original TTL: ${defaultEnhancedSearchConfig.performance.cacheTTL}s`);
    console.log(`   TTL increased by: ${((finalMetrics.averageTTL / defaultEnhancedSearchConfig.performance.cacheTTL - 1) * 100).toFixed(1)}%\n`);

    console.log("=== Demo Complete ===");

  } catch (error) {
    console.error("Error during demo:", error);
  } finally {
    // Clean up
    cache.destroy();
    console.log("✓ Cache cleaned up");
  }
}

/**
 * Example of using the enhanced cache in an embedding service
 */
export class ExampleEmbeddingService {
  private cache: EnhancedEmbeddingCache;

  constructor() {
    this.cache = new EnhancedEmbeddingCache(defaultEnhancedSearchConfig.performance);
  }

  async initialize(): Promise<void> {
    await this.cache.initialize();
  }

  async getEmbedding(text: string): Promise<number[]> {
    // Try cache first
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    // Simulate embedding generation (in real app, this would call an embedding model)
    console.log(`Generating embedding for: "${text}"`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
    
    const embedding = this.mockEmbeddingGeneration(text);
    
    // Cache with high priority for frequently used terms
    const priority = this.isCommonTerm(text) ? 10 : 1;
    this.cache.set(text, embedding, { 
      priority,
      source: "mock-embedder-v1"
    });

    return embedding;
  }

  async getSimilarEmbeddings(queryText: string, limit: number = 5): Promise<Array<{ text: string; embedding: number[]; similarity: number }>> {
    // Generate embedding for query
    const queryEmbedding = await this.getEmbedding(queryText);
    
    // Find similar embeddings in cache
    const results: Array<{ text: string; embedding: number[]; similarity: number }> = [];
    
    // This is a simplified approach - in practice, you'd iterate through cache entries
    // and calculate similarities
    const stats = this.cache.getStats();
    console.log(`Found ${stats.size} cached embeddings to search through`);
    
    return results;
  }

  private mockEmbeddingGeneration(text: string): number[] {
    // Simple mock: generate deterministic but pseudo-random embeddings
    const hash = this.simpleHash(text);
    const embedding: number[] = [];
    
    for (let i = 0; i < 1024; i++) {
      embedding.push(Math.sin(hash + i) * 0.5 + 0.5);
    }
    
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  private isCommonTerm(text: string): boolean {
    const commonTerms = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    return commonTerms.includes(text.toLowerCase());
  }

  getCacheMetrics() {
    return this.cache.getMetrics();
  }

  destroy(): void {
    this.cache.destroy();
  }
}

/**
 * Run the demo if this file is executed directly
 */
if (require.main === module) {
  demonstrateEnhancedCache().catch(console.error);
}

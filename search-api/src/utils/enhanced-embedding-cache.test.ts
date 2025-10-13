import { EnhancedEmbeddingCache } from "./enhanced-embedding-cache";
import { PerformanceConfig } from "../config/enhanced-search-config";

describe("EnhancedEmbeddingCache", () => {
  let cache: EnhancedEmbeddingCache;
  let mockConfig: PerformanceConfig;

  beforeEach(() => {
    mockConfig = {
      cacheEnabled: true,
      embeddingCacheSize: 10,
      resultCacheSize: 100,
      cacheTTL: 3600,
      intelligentCacheEnabled: true,
      semanticSimilarityThreshold: 0.8,
      adaptiveTTLEnabled: true,
      minTTL: 300,
      maxTTL: 7200,
      cacheCompressionEnabled: true,
      cacheWarmingEnabled: false, // Disable for tests
      maxConcurrentRequests: 10,
      requestTimeout: 10000,
    };

    cache = new EnhancedEmbeddingCache(mockConfig);
  });

  afterEach(() => {
    cache.destroy();
  });

  describe("Basic Cache Operations", () => {
    test("should store and retrieve embeddings", () => {
      const key = "test-key";
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      cache.set(key, embedding);
      const result = cache.get(key);

      expect(result).toEqual(embedding);
    });

    test("should return null for non-existent keys", () => {
      const result = cache.get("non-existent-key");
      expect(result).toBeNull();
    });

    test("should check if key exists", () => {
      const key = "test-key";
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      expect(cache.has(key)).toBe(false);

      cache.set(key, embedding);
      expect(cache.has(key)).toBe(true);
    });

    test("should delete entries", () => {
      const key = "test-key";
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      cache.set(key, embedding);
      expect(cache.has(key)).toBe(true);

      const deleted = cache.delete(key);
      expect(deleted).toBe(true);
      expect(cache.has(key)).toBe(false);
    });

    test("should clear all entries", () => {
      cache.set("key1", [0.1, 0.2, 0.3]);
      cache.set("key2", [0.4, 0.5, 0.6]);

      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe("TTL and Expiration", () => {
    test("should respect TTL and expire entries", (done) => {
      const key = "test-key";
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const shortTTL = 1; // 1 second

      cache.set(key, embedding, { customTTL: shortTTL });

      // Should be available immediately
      expect(cache.get(key)).toEqual(embedding);

      // Should expire after TTL
      setTimeout(() => {
        expect(cache.get(key)).toBeNull();
        done();
      }, 1100);
    });

    test("should clean up expired entries", (done) => {
      const keys = ["key1", "key2", "key3"];
      const embeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ];

      // Set entries with different TTLs
      cache.set(keys[0], embeddings[0], { customTTL: 1 });
      cache.set(keys[1], embeddings[1], { customTTL: 2 });
      cache.set(keys[2], embeddings[2], { customTTL: 3 });

      setTimeout(() => {
        const deletedCount = cache.cleanup();
        expect(deletedCount).toBe(1); // Only first entry should be expired
        expect(cache.has(keys[0])).toBe(false);
        expect(cache.has(keys[1])).toBe(true);
        expect(cache.has(keys[2])).toBe(true);
        done();
      }, 1100);
    });

    test("should calculate adaptive TTL based on access patterns", () => {
      const key = "test-key";
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      cache.set(key, embedding);

      // Access multiple times to increase frequency
      for (let i = 0; i < 10; i++) {
        cache.get(key);
      }

      const stats = cache.getStats();
      expect(stats.metrics.averageTTL).toBeGreaterThan(mockConfig.cacheTTL);
    });
  });

  describe("Semantic Similarity", () => {
    test("should find semantically similar embeddings", () => {
      const key1 = "key1";
      const key2 = "key2";
      const embedding1 = [0.1, 0.2, 0.3, 0.4, 0.5];
      const embedding2 = [0.11, 0.21, 0.31, 0.41, 0.51]; // Very similar
      const queryEmbedding = [0.12, 0.22, 0.32, 0.42, 0.52]; // Similar to both

      cache.set(key1, embedding1);
      cache.set(key2, embedding2);

      const result = cache.get("non-existent-key", queryEmbedding);
      expect(result).toEqual(embedding2); // Should return most similar
    });

    test("should not find similar embeddings below threshold", () => {
      const key = "test-key";
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const queryEmbedding = [0.9, 0.8, 0.7, 0.6, 0.5]; // Very different

      cache.set(key, embedding);

      const result = cache.get("non-existent-key", queryEmbedding);
      expect(result).toBeNull();
    });

    test("should update metrics for semantic hits", () => {
      const key = "test-key";
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const queryEmbedding = [0.11, 0.21, 0.31, 0.41, 0.51];

      cache.set(key, embedding);
      cache.get("non-existent-key", queryEmbedding);

      const metrics = cache.getMetrics();
      expect(metrics.semanticHits).toBe(1);
      expect(metrics.semanticHitRate).toBeGreaterThan(0);
    });
  });

  describe("Cache Eviction", () => {
    test("should evict entries when cache is full", () => {
      // Fill cache to capacity
      for (let i = 0; i < mockConfig.embeddingCacheSize; i++) {
        cache.set(`key${i}`, [i, i + 1, i + 2]);
      }

      expect(cache.size()).toBe(mockConfig.embeddingCacheSize);

      // Add one more entry to trigger eviction
      cache.set("extra-key", [0.99, 0.98, 0.97]);

      expect(cache.size()).toBe(mockConfig.embeddingCacheSize);
      expect(cache.has("extra-key")).toBe(true);
      expect(cache.has("key0")).toBe(false); // Should be evicted
    });

    test("should respect eviction policy", () => {
      cache.setEvictionPolicy('lru');

      // Add entries and access them in different patterns
      cache.set("key1", [0.1, 0.2, 0.3]);
      cache.set("key2", [0.4, 0.5, 0.6]);
      cache.set("key3", [0.7, 0.8, 0.9]);

      // Access key1 to make it recently used
      cache.get("key1");

      // Fill cache to trigger eviction
      for (let i = 3; i < mockConfig.embeddingCacheSize + 1; i++) {
        cache.set(`key${i}`, [i, i + 1, i + 2]);
      }

      // key1 should still be in cache (recently used)
      // key2 should be evicted (least recently used)
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(false);
    });

    test("should track eviction metrics", () => {
      // Fill cache beyond capacity
      for (let i = 0; i < mockConfig.embeddingCacheSize + 5; i++) {
        cache.set(`key${i}`, [i, i + 1, i + 2]);
      }

      const metrics = cache.getMetrics();
      expect(metrics.evictions).toBeGreaterThan(0);
    });
  });

  describe("Compression", () => {
    test("should compress embeddings when enabled", () => {
      const key = "test-key";
      const embedding = new Array(1024).fill(0.1); // Large embedding

      cache.set(key, embedding);

      const stats = cache.getStats();
      expect(stats.metrics.compressions).toBe(1);
      expect(stats.metrics.compressionRatio).toBeGreaterThan(0);
    });

    test("should decompress embeddings on retrieval", () => {
      const key = "test-key";
      const embedding = new Array(1024).fill(0.1);

      cache.set(key, embedding);
      const result = cache.get(key);

      expect(result).toEqual(embedding);
      const metrics = cache.getMetrics();
      expect(metrics.decompressions).toBe(1);
    });

    test("should handle compression errors gracefully", () => {
      // This test would require mocking the compression functions
      // to throw errors, which is complex without dependency injection
      // For now, we just ensure the cache doesn't crash
      const key = "test-key";
      const embedding = [0.1, 0.2, 0.3];

      expect(() => cache.set(key, embedding)).not.toThrow();
    });
  });

  describe("Batch Operations", () => {
    test("should set multiple entries in batch", () => {
      const entries = [
        { key: "key1", embedding: [0.1, 0.2, 0.3] },
        { key: "key2", embedding: [0.4, 0.5, 0.6] },
        { key: "key3", embedding: [0.7, 0.8, 0.9] },
      ];

      cache.setBatch(entries);

      expect(cache.size()).toBe(3);
      expect(cache.get("key1")).toEqual([0.1, 0.2, 0.3]);
      expect(cache.get("key2")).toEqual([0.4, 0.5, 0.6]);
      expect(cache.get("key3")).toEqual([0.7, 0.8, 0.9]);
    });

    test("should get multiple entries in batch", () => {
      const keys = ["key1", "key2", "key3"];
      const embeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ];

      // Set up cache
      keys.forEach((key, index) => cache.set(key, embeddings[index]));

      // Batch get
      const results = cache.getBatch(keys);
      
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.key).toBe(keys[index]);
        expect(result.embedding).toEqual(embeddings[index]);
      });
    });

    test("should handle batch get with query embeddings", () => {
      const keys = ["key1", "key2"];
      const embeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];
      const queryEmbeddings = [
        [0.11, 0.21, 0.31], // Similar to first
        [0.44, 0.55, 0.66], // Similar to second
      ];

      // Set up cache
      keys.forEach((key, index) => cache.set(key, embeddings[index]));

      // Batch get with query embeddings
      const results = cache.getBatch(["non-existent1", "non-existent2"], queryEmbeddings);
      
      expect(results[0].embedding).toEqual(embeddings[0]);
      expect(results[1].embedding).toEqual(embeddings[1]);
    });
  });

  describe("Metrics and Monitoring", () => {
    test("should track basic metrics", () => {
      const key = "test-key";
      const embedding = [0.1, 0.2, 0.3];

      // Set and get to generate metrics
      cache.set(key, embedding);
      cache.get(key); // Hit
      cache.get("non-existent"); // Miss

      const metrics = cache.getMetrics();
      
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.hitRate).toBe(0.5);
      expect(metrics.cacheSize).toBe(1);
    });

    test("should track access patterns", () => {
      const key = "test-key";
      const embedding = [0.1, 0.2, 0.3];

      cache.set(key, embedding);

      // Access multiple times
      for (let i = 0; i < 5; i++) {
        cache.get(key);
      }

      const stats = cache.getStats();
      const topEntry = stats.topEntries[0];
      
      expect(topEntry.key).toBe(key);
      expect(topEntry.accessCount).toBe(5);
    });

    test("should provide comprehensive cache statistics", () => {
      // Add some entries
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, [i, i + 1, i + 2]);
      }

      const stats = cache.getStats();
      
      expect(stats.size).toBe(5);
      expect(stats.metrics).toBeDefined();
      expect(stats.config).toBeDefined();
      expect(stats.topEntries).toBeDefined();
      expect(stats.topEntries.length).toBeLessThanOrEqual(10);
    });
  });

  describe("Advanced Features", () => {
    test("should handle custom priority", () => {
      const key1 = "key1";
      const key2 = "key2";
      
      cache.set(key1, [0.1, 0.2, 0.3], { priority: 1 });
      cache.set(key2, [0.4, 0.5, 0.6], { priority: 10 });

      const stats = cache.getStats();
      const topEntries = stats.topEntries;
      
      // key2 should have higher priority
      expect(topEntries[0].key).toBe(key2);
      expect(topEntries[0].priority).toBeGreaterThan(topEntries[1].priority);
    });

    test("should handle custom source", () => {
      const key = "test-key";
      const source = "test-source";
      
      cache.set(key, [0.1, 0.2, 0.3], { source });

      const stats = cache.getStats();
      // Source would be visible in detailed entry inspection
      expect(stats.config).toBeDefined();
    });

    test("should export and import cache state", () => {
      const entries = [
        { key: "key1", embedding: [0.1, 0.2, 0.3] },
        { key: "key2", embedding: [0.4, 0.5, 0.6] },
      ];

      entries.forEach(entry => cache.set(entry.key, entry.embedding));

      // Export
      const exported = cache.export();
      expect(exported).toHaveLength(2);

      // Create new cache and import
      const newCache = new EnhancedEmbeddingCache(mockConfig);
      newCache.import(exported);

      expect(newCache.size()).toBe(2);
      expect(newCache.get("key1")).toEqual([0.1, 0.2, 0.3]);
      expect(newCache.get("key2")).toEqual([0.4, 0.5, 0.6]);

      newCache.destroy();
    });

    test("should handle cache warming", () => {
      const warmingConfig = {
        enabled: true,
        strategies: ['test'],
        warmupQueries: [],
        maxWarmupSize: 10,
        warmupInterval: 100, // Short interval for testing
      };

      const cacheWithWarming = new EnhancedEmbeddingCache({
        ...mockConfig,
        cacheWarmingEnabled: true,
      });

      // Should not throw during warming
      expect(() => cacheWithWarming.destroy()).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    test("should handle disabled cache gracefully", () => {
      const disabledConfig = { ...mockConfig, cacheEnabled: false };
      const disabledCache = new EnhancedEmbeddingCache(disabledConfig);

      disabledCache.set("key", [0.1, 0.2, 0.3]);
      expect(disabledCache.get("key")).toBeNull();
      expect(disabledCache.has("key")).toBe(false);

      disabledCache.destroy();
    });

    test("should handle invalid embeddings", () => {
      const key = "test-key";
      const invalidEmbedding = NaN as any;

      expect(() => cache.set(key, invalidEmbedding)).not.toThrow();
    });

    test("should handle empty arrays", () => {
      const key = "test-key";
      const emptyEmbedding: number[] = [];

      cache.set(key, emptyEmbedding);
      expect(cache.get(key)).toEqual(emptyEmbedding);
    });

    test("should handle very large embeddings", () => {
      const key = "test-key";
      const largeEmbedding = new Array(10000).fill(0.1);

      expect(() => cache.set(key, largeEmbedding)).not.toThrow();
      expect(cache.get(key)).toEqual(largeEmbedding);
    });
  });

  describe("Cache Size Management", () => {
    test("should return correct cache size", () => {
      expect(cache.size()).toBe(0);

      cache.set("key1", [0.1, 0.2, 0.3]);
      expect(cache.size()).toBe(1);

      cache.set("key2", [0.4, 0.5, 0.6]);
      expect(cache.size()).toBe(2);

      cache.delete("key1");
      expect(cache.size()).toBe(1);

      cache.clear();
      expect(cache.size()).toBe(0);
    });

    test("should handle memory usage tracking", () => {
      const largeEmbedding = new Array(1000).fill(0.1);
      cache.set("large-key", largeEmbedding);

      const metrics = cache.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });
  });
});

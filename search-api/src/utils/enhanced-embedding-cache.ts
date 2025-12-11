import { PerformanceConfig } from "#config/enhanced-search-config";
import { cosineSimilarity } from "./cosine-similarity.js";
import { gzipSync, gunzipSync } from "zlib";

/**
 * Enhanced cache entry with metadata and access tracking
 */
interface EnhancedCacheEntry {
  embedding: number[];
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  ttl: number; // Dynamic TTL based on access patterns
  compressedEmbedding?: Buffer; // Compressed embedding data
  hash?: string; // Content hash for integrity verification
  semanticHash?: string; // Hash based on semantic content
  priority: number; // Cache priority based on usage patterns
  size: number; // Size in bytes
  source?: string; // Source of the embedding (e.g., model version)
}

/**
 * Cache statistics and metrics
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  semanticHits: number; // Hits from semantic similarity
  evictions: number;
  compressions: number;
  decompressions: number;
  totalRequests: number;
  averageAccessTime: number;
  cacheSize: number;
  memoryUsage: number;
  hitRate: number;
  semanticHitRate: number;
  evictionPolicy: string;
  averageTTL: number;
  compressionRatio: number;
}

/**
 * Cache warming configuration
 */
interface CacheWarmingConfig {
  enabled: boolean;
  strategies: string[];
  warmupQueries: string[];
  maxWarmupSize: number;
  warmupInterval: number; // ms
}

/**
 * Cache eviction policies
 */
type EvictionPolicy = 'lru' | 'lfu' | 'priority' | 'adaptive';

/**
 * Enhanced embedding cache with advanced features
 */
export class EnhancedEmbeddingCache {
  private cache: Map<string, EnhancedCacheEntry> = new Map();
  private accessOrder: string[] = []; // For LRU tracking
  private accessFrequency: Map<string, number> = new Map(); // For LFU tracking
  private metrics: CacheMetrics;
  private config: PerformanceConfig;
  private evictionPolicy: EvictionPolicy;
  private warmingConfig: CacheWarmingConfig;
  private warmingTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: PerformanceConfig) {
    this.config = config;
    this.metrics = this.initializeMetrics();
    this.evictionPolicy = 'adaptive'; // Default to adaptive
    this.warmingConfig = {
      enabled: config.cacheWarmingEnabled,
      strategies: ['semantic_similarity', 'frequency_based'],
      warmupQueries: [],
      maxWarmupSize: 100,
      warmupInterval: 300000, // 5 minutes
    };

    if (this.warmingConfig.enabled) {
      this.startCacheWarming();
    }
  }

  /**
   * Initialize cache metrics
   */
  private initializeMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      semanticHits: 0,
      evictions: 0,
      compressions: 0,
      decompressions: 0,
      totalRequests: 0,
      averageAccessTime: 0,
      cacheSize: 0,
      memoryUsage: 0,
      hitRate: 0,
      semanticHitRate: 0,
      evictionPolicy: 'adaptive',
      averageTTL: this.config.cacheTTL,
      compressionRatio: 0,
    };
  }

  /**
   * Generate a hash for the embedding content
   */
  private generateContentHash(embedding: number[]): string {
    const str = embedding.join(',');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Generate a semantic hash based on vector characteristics
   */
  private generateSemanticHash(embedding: number[]): string {
    const normalized = this.normalizeVector(embedding);
    const buckets = 16; // Number of buckets for semantic hashing
    const bucketSize = normalized.length / buckets;
    let hash = '';
    
    for (let i = 0; i < buckets; i++) {
      const start = Math.floor(i * bucketSize);
      const end = Math.floor((i + 1) * bucketSize);
      const sum = normalized.slice(start, end).reduce((a, b) => a + b, 0);
      hash += sum > 0 ? '1' : '0';
    }
    
    return hash;
  }

  /**
   * Normalize a vector
   */
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm === 0 ? vector : vector.map(val => val / norm);
  }

  /**
   * Compress embedding data
   */
  private compressEmbedding(embedding: number[]): Buffer {
    const jsonString = JSON.stringify(embedding);
    const compressed = gzipSync(Buffer.from(jsonString));
    return compressed;
  }

  /**
   * Decompress embedding data
   */
  private decompressEmbedding(compressed: Buffer): number[] {
    const decompressed = gunzipSync(compressed);
    return JSON.parse(decompressed.toString());
  }

  /**
   * Calculate adaptive TTL based on access patterns
   */
  private calculateAdaptiveTTL(entry: EnhancedCacheEntry): number {
    if (!this.config.adaptiveTTLEnabled) {
      return this.config.cacheTTL;
    }

    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // Age in seconds
    const accessFrequency = entry.accessCount / Math.max(age, 1); // Accesses per second
    
    // Higher access frequency = longer TTL
    const frequencyMultiplier = Math.min(Math.log(accessFrequency + 1) + 1, 3);
    const adaptiveTTL = Math.min(
      this.config.cacheTTL * frequencyMultiplier,
      this.config.maxTTL
    );
    
    return Math.max(adaptiveTTL, this.config.minTTL);
  }

  /**
   * Update access tracking for LRU and LFU
   */
  private updateAccessTracking(key: string): void {
    // Update LRU order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    // Update LFU frequency
    const currentFreq = this.accessFrequency.get(key) || 0;
    this.accessFrequency.set(key, currentFreq + 1);
  }

  /**
   * Calculate cache priority based on multiple factors
   */
  private calculatePriority(entry: EnhancedCacheEntry): number {
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000;
    const accessFrequency = entry.accessCount / Math.max(age, 1);
    const recencyFactor = 1 / (Math.max(age, 1) / 3600); // More recent = higher priority
    const frequencyFactor = Math.log(accessFrequency + 1);
    
    return recencyFactor * frequencyFactor * entry.priority;
  }

  /**
   * Evict entries based on the configured policy
   */
  private evictEntries(requiredSpace: number): number {
    let evictedCount = 0;
    const entries = Array.from(this.cache.entries());
    
    // Sort entries based on eviction policy
    entries.sort((a, b) => {
      const [, entryA] = a;
      const [, entryB] = b;
      
      switch (this.evictionPolicy) {
        case 'lru':
          return entryA.lastAccessed - entryB.lastAccessed;
        case 'lfu':
          return entryA.accessCount - entryB.accessCount;
        case 'priority':
          return this.calculatePriority(entryA) - this.calculatePriority(entryB);
        case 'adaptive': {
          // Combine multiple factors for adaptive eviction
          const priorityA = this.calculatePriority(entryA);
          const priorityB = this.calculatePriority(entryB);
          return priorityA - priorityB;
        }
        default:
          return entryA.lastAccessed - entryB.lastAccessed;
      }
    });

    // Evict entries until we have enough space
    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessFrequency.delete(key);
      
      freedSpace += entry.size;
      evictedCount++;
      this.metrics.evictions++;
    }

    return evictedCount;
  }

  /**
   * Get an embedding from the cache with semantic similarity fallback
   */
  get(key: string, queryEmbedding?: number[]): number[] | null {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    if (!this.config.cacheEnabled) {
      this.metrics.misses++;
      return null;
    }

    // Direct cache lookup
    const entry = this.cache.get(key);
    if (entry) {
      const now = Date.now();
      const ageInSeconds = (now - entry.timestamp) / 1000;

      // Check if the entry has expired
      if (ageInSeconds > entry.ttl) {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        this.accessFrequency.delete(key);
        this.metrics.misses++;
        return null;
      }

      // Update access tracking
      this.updateAccessTracking(key);
      entry.lastAccessed = now;
      entry.accessCount++;
      entry.ttl = this.calculateAdaptiveTTL(entry);

      // Decompress if necessary
      const embedding = entry.compressedEmbedding 
        ? this.decompressEmbedding(entry.compressedEmbedding)
        : entry.embedding;

      this.metrics.hits++;
      this.metrics.averageAccessTime = 
        (this.metrics.averageAccessTime + (Date.now() - startTime)) / 2;
      
      return embedding;
    }

    // Semantic similarity lookup if enabled and query embedding provided
    if (this.config.intelligentCacheEnabled && queryEmbedding) {
      const similarEmbedding = this.findSimilarEmbedding(queryEmbedding);
      if (similarEmbedding) {
        this.metrics.semanticHits++;
        this.metrics.averageAccessTime = 
          (this.metrics.averageAccessTime + (Date.now() - startTime)) / 2;
        return similarEmbedding;
      }
    }

    this.metrics.misses++;
    this.metrics.averageAccessTime = 
      (this.metrics.averageAccessTime + (Date.now() - startTime)) / 2;
    
    return null;
  }

  /**
   * Find semantically similar embeddings in the cache
   */
  private findSimilarEmbedding(queryEmbedding: number[]): number[] | null {
    if (!this.config.intelligentCacheEnabled) {
      return null;
    }

    let bestMatch: { key: string; similarity: number } | null = null;
    const threshold = this.config.semanticSimilarityThreshold;

    for (const [key, entry] of this.cache.entries()) {
      const embedding = entry.compressedEmbedding 
        ? this.decompressEmbedding(entry.compressedEmbedding)
        : entry.embedding;
      
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      
      if (similarity > threshold && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { key, similarity };
      }
    }

    if (bestMatch) {
      const entry = this.cache.get(bestMatch.key);
      if (entry) {
        // Update access tracking for semantic hit
        this.updateAccessTracking(bestMatch.key);
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        
        return entry.compressedEmbedding 
          ? this.decompressEmbedding(entry.compressedEmbedding)
          : entry.embedding;
      }
    }

    return null;
  }

  /**
   * Set an embedding in the cache with enhanced features
   */
  set(key: string, embedding: number[], options: {
    priority?: number;
    source?: string;
    customTTL?: number;
  } = {}): void {
    if (!this.config.cacheEnabled) return;

    const now = Date.now();
    const embeddingSize = embedding.length * 8; // 8 bytes per number
    const contentHash = this.generateContentHash(embedding);
    const semanticHash = this.generateSemanticHash(embedding);
    
    // Check if we need to make space
    const maxSize = this.config.embeddingCacheSize;
    if (this.cache.size >= maxSize) {
      this.evictEntries(1);
    }

    // Prepare entry
    const entry: EnhancedCacheEntry = {
      embedding,
      timestamp: now,
      lastAccessed: now,
      accessCount: 1,
      ttl: options.customTTL || this.config.cacheTTL,
      priority: options.priority || 1,
      size: embeddingSize,
      source: options.source,
      hash: contentHash,
      semanticHash,
    };

    // Compress if enabled
    if (this.config.cacheCompressionEnabled) {
      try {
        entry.compressedEmbedding = this.compressEmbedding(embedding);
        entry.size = entry.compressedEmbedding.length;
        this.metrics.compressions++;
      } catch (error) {
        console.warn('Failed to compress embedding:', error);
      }
    }

    // Store in cache
    this.cache.set(key, entry);
    this.updateAccessTracking(key);
    
    // Update metrics
    this.updateMetrics();
  }

  /**
   * Batch set multiple embeddings
   */
  setBatch(entries: Array<{
    key: string;
    embedding: number[];
    options?: {
      priority?: number;
      source?: string;
      customTTL?: number;
    };
  }>): void {
    for (const { key, embedding, options } of entries) {
      this.set(key, embedding, options);
    }
  }

  /**
   * Batch get multiple embeddings
   */
  getBatch(keys: string[], queryEmbeddings?: number[][]): Array<{ key: string; embedding: number[] | null }> {
    return keys.map((key, index) => ({
      key,
      embedding: this.get(key, queryEmbeddings?.[index])
    }));
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    if (!this.config.cacheEnabled) return false;

    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    const ageInSeconds = (now - entry.timestamp) / 1000;

    if (ageInSeconds > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessFrequency.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete an entry from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessFrequency.delete(key);
      this.updateMetrics();
    }
    return deleted;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.accessFrequency.clear();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      const ageInSeconds = (now - entry.timestamp) / 1000;

      if (ageInSeconds > entry.ttl) {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        this.accessFrequency.delete(key);
        deletedCount++;
      }
    }

    this.updateMetrics();
    return deletedCount;
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    this.metrics.cacheSize = this.cache.size;
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? this.metrics.hits / this.metrics.totalRequests 
      : 0;
    this.metrics.semanticHitRate = this.metrics.totalRequests > 0 
      ? this.metrics.semanticHits / this.metrics.totalRequests 
      : 0;
    
    // Calculate memory usage
    let totalSize = 0;
    let compressedSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.embedding.length * 8;
      if (entry.compressedEmbedding) {
        compressedSize += entry.compressedEmbedding.length;
      }
    }
    this.metrics.memoryUsage = totalSize;
    
    if (compressedSize > 0) {
      this.metrics.compressionRatio = 1 - (compressedSize / totalSize);
    }
    
    // Calculate average TTL
    const totalTTL = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.ttl, 0);
    this.metrics.averageTTL = this.cache.size > 0 
      ? totalTTL / this.cache.size 
      : this.config.cacheTTL;
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Set eviction policy
   */
  setEvictionPolicy(policy: EvictionPolicy): void {
    this.evictionPolicy = policy;
    this.metrics.evictionPolicy = policy;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    metrics: CacheMetrics;
    config: Partial<PerformanceConfig>;
    topEntries: Array<{
      key: string;
      accessCount: number;
      lastAccessed: number;
      priority: number;
    }>;
  } {
    const topEntries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        priority: this.calculatePriority(entry),
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);

    return {
      size: this.cache.size,
      metrics: this.getMetrics(),
      config: {
        cacheEnabled: this.config.cacheEnabled,
        embeddingCacheSize: this.config.embeddingCacheSize,
        cacheTTL: this.config.cacheTTL,
        intelligentCacheEnabled: this.config.intelligentCacheEnabled,
        semanticSimilarityThreshold: this.config.semanticSimilarityThreshold,
        adaptiveTTLEnabled: this.config.adaptiveTTLEnabled,
        cacheCompressionEnabled: this.config.cacheCompressionEnabled,
      },
      topEntries,
    };
  }

  /**
   * Start cache warming process
   */
  private startCacheWarming(): void {
    if (this.warmingTimer) {
      clearInterval(this.warmingTimer);
    }

    this.warmingTimer = setInterval(() => {
      this.performCacheWarming();
    }, this.warmingConfig.warmupInterval);
  }

  /**
   * Perform cache warming
   */
  private async performCacheWarming(): Promise<void> {
    // This would typically be implemented with actual embedding generation
    // For now, it's a placeholder for the warming logic
    console.log('Performing cache warming...');
  }

  /**
   * Stop cache warming
   */
  stopCacheWarming(): void {
    if (this.warmingTimer) {
      clearInterval(this.warmingTimer);
      this.warmingTimer = undefined;
    }
  }

  /**
   * Initialize the cache
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Perform any initialization tasks
    this.updateMetrics();
    this.isInitialized = true;
  }

  /**
   * Destroy the cache and clean up resources
   */
  destroy(): void {
    this.stopCacheWarming();
    this.clear();
    this.isInitialized = false;
  }

  /**
   * Export cache state for persistence
   */
  export(): Array<{
    key: string;
    entry: Omit<EnhancedCacheEntry, 'compressedEmbedding'>;
  }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry: {
        ...entry,
        embedding: entry.compressedEmbedding 
          ? this.decompressEmbedding(entry.compressedEmbedding)
          : entry.embedding,
        compressedEmbedding: undefined,
      },
    }));
  }

  /**
   * Import cache state
   */
  import(data: Array<{
    key: string;
    entry: Omit<EnhancedCacheEntry, 'compressedEmbedding'>;
  }>): void {
    this.clear();
    
    for (const { key, entry } of data) {
      this.set(key, entry.embedding, {
        priority: entry.priority,
        source: entry.source,
        customTTL: entry.ttl,
      });
    }
  }
}

// Export singleton instance with default configuration
import { defaultEnhancedSearchConfig } from "#config/enhanced-search-config";

export const enhancedEmbeddingCache = new EnhancedEmbeddingCache(
  defaultEnhancedSearchConfig.performance
);

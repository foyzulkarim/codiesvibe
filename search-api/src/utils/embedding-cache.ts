import { embeddingConfig } from "#config/constants.js";

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();

  /**
   * Get an embedding from the cache
   */
  get(key: string): number[] | null {
    if (!embeddingConfig.cacheEnabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if the entry has expired
    const now = Date.now();
    const ageInSeconds = (now - entry.timestamp) / 1000;

    if (ageInSeconds > embeddingConfig.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.embedding;
  }

  /**
   * Set an embedding in the cache
   */
  set(key: string, embedding: number[]): void {
    if (!embeddingConfig.cacheEnabled) return;

    // Simple cache size management
    if (this.cache.size >= 1000) {
      // Remove the oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    if (!embeddingConfig.cacheEnabled) return false;

    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if the entry has expired
    const now = Date.now();
    const ageInSeconds = (now - entry.timestamp) / 1000;

    if (ageInSeconds > embeddingConfig.cacheTTL) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete an entry from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      const ageInSeconds = (now - entry.timestamp) / 1000;

      if (ageInSeconds > embeddingConfig.cacheTTL) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

// Export singleton instance
export const embeddingCache = new EmbeddingCache();
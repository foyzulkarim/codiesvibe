import { Db, ObjectId } from "mongodb";
import { connectToMongoDB, disconnectFromMongoDB } from "#config/database";
import { productionEmbeddingService } from "./production-embedding.service.js";
import { embeddingConfig } from "#config/constants";
import { IntentState } from "#types/intent-state";
import { QueryPlan } from "#types/query-plan";
import { Candidate } from "#types/candidate";
import crypto from "crypto";

/**
 * Plan document interface for MongoDB
 */
export interface PlanDocument {
  _id: ObjectId;
  originalQuery: string;
  queryEmbedding: number[];
  intentState: IntentState;
  executionPlan: QueryPlan;
  candidates: Candidate[];
  executionTime: number;
  usageCount: number;
  lastUsed: Date;
  createdAt: Date;
  queryHash: string;
  confidence: number;
  metadata: {
    executionPath: string[];
    totalNodesExecuted: number;
    pipelineVersion: string;
  };
}

/**
 * Cache lookup result interface
 */
export interface CacheLookupResult {
  found: boolean;
  plan?: PlanDocument;
  similarity?: number;
  cacheType: 'exact' | 'similar' | 'miss';
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  totalPlans: number;
  cacheHits: number;
  cacheMisses: number;
  exactMatches: number;
  similarMatches: number;
  hitRate: number;
  averageSimilarity: number;
  costSavings: number;
}

export class PlanCacheService {
  private db: Db | null = null;
  private dbPromise: Promise<Db> | null = null;
  private readonly SIMILARITY_THRESHOLD = 0.90;
  private readonly CACHE_TTL_DAYS = 90;

  constructor() {}

  private async ensureConnected(): Promise<Db> {
    if (this.db) return this.db;
    if (!this.dbPromise) {
      this.dbPromise = connectToMongoDB();
    }
    this.db = await this.dbPromise;
    return this.db;
  }

  /**
   * Generate MD5 hash for exact query matching
   */
  private generateQueryHash(query: string): string {
    return crypto.createHash('md5').update(query.trim().toLowerCase()).digest('hex');
  }

  /**
   * Store a successful pipeline result in cache
   */
  async storePlan(
    query: string,
    intentState: IntentState,
    executionPlan: QueryPlan,
    candidates: Candidate[],
    executionTime: number,
    metadata: any
  ): Promise<ObjectId> {
    const db = await this.ensureConnected();
    const startTime = Date.now();

    try {
      // Generate embedding for the query using Together AI
      const queryEmbedding = await productionEmbeddingService.generateEmbedding(query);

      // Generate query hash for exact matching
      const queryHash = this.generateQueryHash(query);

      const planDocument: Omit<PlanDocument, '_id'> = {
        originalQuery: query,
        queryEmbedding,
        intentState,
        executionPlan,
        candidates,
        executionTime,
        usageCount: 1,
        lastUsed: new Date(),
        createdAt: new Date(),
        queryHash,
        confidence: executionPlan.confidence || 0.7,
        metadata: {
          executionPath: metadata.executionPath || [],
          totalNodesExecuted: metadata.totalNodesExecuted || 0,
          pipelineVersion: metadata.pipelineVersion || "2.0-llm-first"
        }
      };

      const collection = db.collection("plans");
      const result = await collection.insertOne(planDocument as any);

      console.log(`💾 Cached plan for query: "${query}" (ID: ${result.insertedId})`);

      // Update cache statistics
      await this.updateCacheStats('store');

      return result.insertedId;
    } catch (error) {
      console.error("Error storing plan in cache:", error);
      throw error;
    } finally {
      const cacheTime = Date.now() - startTime;
      console.log(`⏱️ Cache store operation took ${cacheTime}ms`);
    }
  }

  /**
   * Lookup plan in cache using exact match first, then vector similarity
   */
  async lookupPlan(query: string): Promise<CacheLookupResult> {
    const db = await this.ensureConnected();
    const startTime = Date.now();

    try {
      const queryHash = this.generateQueryHash(query);
      const collection = db.collection("plans");

      // Step 1: Try exact hash match first
      const exactMatch = await collection.findOne({ queryHash });
      if (exactMatch) {
        // Update usage statistics
        await collection.updateOne(
          { _id: exactMatch._id },
          {
            $inc: { usageCount: 1 },
            $set: { lastUsed: new Date() }
          }
        );

        console.log(`🎯 Exact cache hit for query: "${query}" (used ${exactMatch.usageCount + 1} times)`);

        await this.updateCacheStats('exact_hit');

        return {
          found: true,
          plan: exactMatch as PlanDocument,
          similarity: 1.0,
          cacheType: 'exact'
        };
      }

      // Step 2: Try vector similarity search
      const queryEmbedding = await productionEmbeddingService.generateEmbedding(query);

      // MongoDB Atlas vector search pipeline
      const vectorSearchPipeline = [
        {
          $search: {
            index: "plans_vector_index", // This index needs to be created in MongoDB Atlas
            knn: {
              queryVector: queryEmbedding,
              path: "queryEmbedding",
              k: 5,
              filter: {
                // Optional: Filter by minimum confidence
                confidence: { $gte: 0.6 }
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            originalQuery: 1,
            intentState: 1,
            executionPlan: 1,
            candidates: 1,
            executionTime: 1,
            usageCount: 1,
            lastUsed: 1,
            createdAt: 1,
            queryHash: 1,
            confidence: 1,
            metadata: 1,
            score: { $meta: "searchScore" }
          }
        },
        {
          $match: {
            score: { $gte: this.SIMILARITY_THRESHOLD }
          }
        },
        {
          $limit: 1
        }
      ];

      const similarResults = await collection.aggregate(vectorSearchPipeline).toArray();

      if (similarResults.length > 0) {
        const similarPlan = similarResults[0] as any;
        const similarity = similarPlan.score;

        // Update usage statistics
        await collection.updateOne(
          { _id: similarPlan._id },
          {
            $inc: { usageCount: 1 },
            $set: { lastUsed: new Date() }
          }
        );

        console.log(`🔍 Similar cache hit for query: "${query}" (similarity: ${similarity.toFixed(3)}, original: "${similarPlan.originalQuery}")`);

        await this.updateCacheStats('similar_hit');

        return {
          found: true,
          plan: similarPlan as PlanDocument,
          similarity,
          cacheType: 'similar'
        };
      }

      // No cache hit found
      console.log(`❌ Cache miss for query: "${query}"`);
      await this.updateCacheStats('miss');

      return {
        found: false,
        cacheType: 'miss'
      };

    } catch (error) {
      console.error("Error looking up plan in cache:", error);

      // If vector search fails, fall back to miss
      await this.updateCacheStats('miss');

      return {
        found: false,
        cacheType: 'miss'
      };
    } finally {
      const lookupTime = Date.now() - startTime;
      console.log(`⏱️ Cache lookup operation took ${lookupTime}ms`);
    }
  }

  /**
   * Update cache statistics for monitoring
   */
  private async updateCacheStats(operation: 'store' | 'exact_hit' | 'similar_hit' | 'miss'): Promise<void> {
    const db = await this.ensureConnected();

    try {
      const statsCollection = db.collection("cache_stats");
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

      const updateFields: any = {
        $set: { lastUpdated: now }
      };

      const incFields: any = {};
      switch (operation) {
        case 'store':
          incFields.totalPlans = 1;
          break;
        case 'exact_hit':
          incFields.cacheHits = 1;
          incFields.exactMatches = 1;
          incFields.totalLookups = 1;
          break;
        case 'similar_hit':
          incFields.cacheHits = 1;
          incFields.similarMatches = 1;
          incFields.totalLookups = 1;
          break;
        case 'miss':
          incFields.cacheMisses = 1;
          incFields.totalLookups = 1;
          break;
      }

      // Only add $inc if there are fields to increment
      if (Object.keys(incFields).length > 0) {
        updateFields.$inc = incFields;
      }

      await statsCollection.updateOne(
        { date: today },
        updateFields,
        { upsert: true }
      );

    } catch (error) {
      console.error("Error updating cache stats:", error);
      // Don't throw here as stats updates shouldn't break the main flow
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(days: number = 7): Promise<CacheStats> {
    const db = await this.ensureConnected();

    try {
      const statsCollection = db.collection("cache_stats");
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await statsCollection.find({
        date: { $gte: startDate.toISOString().split('T')[0] }
      }).toArray();

      const totalPlans = await db.collection("plans").countDocuments();

      const aggregatedStats = stats.reduce((acc: any, stat: any) => {
        acc.cacheHits += stat.cacheHits || 0;
        acc.cacheMisses += stat.cacheMisses || 0;
        acc.exactMatches += stat.exactMatches || 0;
        acc.similarMatches += stat.similarMatches || 0;
        acc.totalLookups += stat.totalLookups || 0;
        return acc;
      }, {
        cacheHits: 0,
        cacheMisses: 0,
        exactMatches: 0,
        similarMatches: 0,
        totalLookups: 0
      });

      const hitRate = aggregatedStats.totalLookups > 0
        ? aggregatedStats.cacheHits / aggregatedStats.totalLookups
        : 0;

      const averageSimilarity = aggregatedStats.cacheHits > 0
        ? (aggregatedStats.exactMatches * 1.0 + aggregatedStats.similarMatches * 0.95) / aggregatedStats.cacheHits
        : 0;

      // Estimate cost savings (assuming $0.01 per query for LLM calls)
      const estimatedCostPerQuery = 0.01;
      const costSavings = aggregatedStats.cacheHits * estimatedCostPerQuery;

      return {
        totalPlans,
        cacheHits: aggregatedStats.cacheHits,
        cacheMisses: aggregatedStats.cacheMisses,
        exactMatches: aggregatedStats.exactMatches,
        similarMatches: aggregatedStats.similarMatches,
        hitRate,
        averageSimilarity,
        costSavings
      };

    } catch (error) {
      console.error("Error getting cache stats:", error);
      throw error;
    }
  }

  /**
   * Clean up old cache entries based on TTL
   */
  async cleanupCache(): Promise<void> {
    const db = await this.ensureConnected();

    try {
      const collection = db.collection("plans");
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.CACHE_TTL_DAYS);

      const result = await collection.deleteMany({
        createdAt: { $lt: cutoffDate },
        usageCount: { $lt: 5 } // Keep frequently used plans even if old
      });

      console.log(`🧹 Cache cleanup completed: removed ${result.deletedCount} old plans`);

    } catch (error) {
      console.error("Error during cache cleanup:", error);
      throw error;
    }
  }

  /**
   * Manually invalidate cache entries for a specific query
   */
  async invalidateCache(query: string): Promise<boolean> {
    const db = await this.ensureConnected();

    try {
      const collection = db.collection("plans");
      const queryHash = this.generateQueryHash(query);

      const result = await collection.deleteMany({ queryHash });

      if (result.deletedCount > 0) {
        console.log(`🗑️ Invalidated ${result.deletedCount} cache entries for query: "${query}"`);
        return true;
      }

      return false;

    } catch (error) {
      console.error("Error invalidating cache:", error);
      throw error;
    }
  }

  /**
   * Clear all cache data (use with caution)
   */
  async clearAllCache(): Promise<void> {
    const db = await this.ensureConnected();

    try {
      await db.collection("plans").deleteMany({});
      await db.collection("cache_stats").deleteMany({});

      console.log("🗑️ All cache data cleared");

    } catch (error) {
      console.error("Error clearing cache:", error);
      throw error;
    }
  }

  /**
   * Initialize the cache service and ensure indexes are created
   */
  async initialize(): Promise<void> {
    try {
      const db = await this.ensureConnected();

      // Test embedding generation with Together AI
      await productionEmbeddingService.initialize();

      // Log model information
      console.log(`✅ PlanCacheService initialized successfully`);
      console.log(`📊 Using embedding model: ${embeddingConfig.model}`);
      console.log(`📊 Embedding dimensions: ${embeddingConfig.dimensions}`);

      // Log current cache stats
      const stats = await this.getCacheStats();
      console.log(`📊 Current cache stats: ${stats.totalPlans} plans, ${stats.hitRate.toFixed(2)} hit rate`);

    } catch (error) {
      throw new Error(`PlanCacheService initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await disconnectFromMongoDB();
    this.db = null;
    this.dbPromise = null;
  }
}

// Export singleton instance
export const planCacheService = new PlanCacheService();
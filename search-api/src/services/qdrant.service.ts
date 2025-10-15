import { QdrantClient } from "@qdrant/js-client-rest";
import {
  connectToQdrant,
  qdrantConfig,
  getCollectionName,
  isSupportedVectorType,
  getSupportedVectorTypes,
  getEnhancedCollectionName,
  shouldUseEnhancedCollection,
  getCollectionNameForVectorType
} from "@/config/database";
import {
  isEnhancedVectorTypeSupported,
  validateEnhancedVectors,
  getVectorConfig
} from "@/config/enhanced-qdrant-schema";
import { embeddingService } from "./embedding.service";
import { createHash } from "crypto";
import {
  VectorValidationError,
  validateSearchParams,
  validateUpsertParams,
  validateBatchOperations,
  validateVectorType,
  validateToolId,
  validateEmbedding
} from "@/utils/vector-validation";

export class QdrantService {
  private client: QdrantClient | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.client = await connectToQdrant();
  }

  /**
   * Deterministically map a string ID to a UUIDv5-like string for Qdrant point IDs
   */
  private toPointId(originalId: string, namespace: string = "codiesvibe-tools"): string {
    const hash = createHash("sha1").update(`${namespace}:${originalId}`).digest();
    const bytes = Buffer.from(hash.slice(0, 16));
    // Set version (5)
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    // Set variant (RFC 4122)
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /**
   * Search for similar tools based on embedding
   */
  async searchByEmbedding(
    embedding: number[],
    limit: number = 10,
    filter?: Record<string, any>,
    vectorType?: string
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Validate search parameters
      validateSearchParams({ embedding, limit, filter, vectorType });

      // Determine collection name based on vector type and configuration
      const collectionName = getCollectionNameForVectorType(vectorType);
      const useEnhanced = shouldUseEnhancedCollection() && (!vectorType || isEnhancedVectorTypeSupported(vectorType));
      
      console.log("🔍 Qdrant searchByEmbedding called with:");
      console.log("   - collection:", collectionName);
      console.log("   - vectorType:", vectorType || 'default');
      console.log("   - useEnhanced:", useEnhanced);
      console.log("   - limit:", limit);

      const searchParams: any = {
        limit: limit,
        filter: filter,
        with_payload: true,
      };

      // Add vector parameter based on whether we're using named vectors or separate collections
      if (useEnhanced && vectorType) {
        // Use named vector in enhanced collection
        searchParams.vector = embedding;
        searchParams.vector_name = vectorType;
      } else {
        // Use single vector in legacy collection
        searchParams.vector = embedding;
      }

      const searchResult = await this.client.search(collectionName, searchParams);

      console.log("🔍 Qdrant search returned", searchResult.length, "results");
      if (searchResult.length > 0) {
        console.log("   First result payload keys:", Object.keys(searchResult[0].payload || {}));
      }

      return searchResult.map(result => {
        const payloadAny = result.payload as any;
        const originalId = payloadAny?.id;
        return {
          id: (originalId ?? (result.id as string)),
          score: result.score,
          payload: result.payload,
        };
      });
    } catch (error) {
      console.error("Error searching by embedding:", error);
      if (error instanceof VectorValidationError) {
        throw error;
      }
      throw new Error(`Qdrant search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search for similar tools using specific vector type
   */
  async searchByVectorType(
    embedding: number[],
    vectorType: string,
    limit: number = 10,
    filter?: Record<string, any>
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    try {
      // Validate vector type (additional validation beyond searchByEmbedding)
      validateVectorType(vectorType);
      return this.searchByEmbedding(embedding, limit, filter, vectorType);
    } catch (error) {
      console.error("Error searching by vector type:", error);
      if (error instanceof VectorValidationError) {
        throw error;
      }
      throw new Error(`Qdrant vector type search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Enhanced multi-vector search with parallel execution and detailed metrics
   */
  async searchMultipleVectorTypes(
    embedding: number[],
    vectorTypes: string[],
    limit: number = 10,
    filter?: Record<string, any>,
    options: {
      timeout?: number;
      includeMetrics?: boolean;
      maxResultsPerVector?: number;
    } = {}
  ): Promise<{
    results: Record<string, Array<{ id: string; score: number; payload: any; rank: number; vectorType: string }>>;
    metrics: Record<string, { searchTime: number; resultCount: number; avgScore: number; error?: string }>;
    totalTime: number;
  }> {
    if (!this.client) throw new Error("Qdrant client not connected");

    const startTime = Date.now();
    const {
      timeout = 5000,
      includeMetrics = true,
      maxResultsPerVector = limit * 2
    } = options;

    const results: Record<string, Array<{ id: string; score: number; payload: any; rank: number; vectorType: string }>> = {};
    const metrics: Record<string, { searchTime: number; resultCount: number; avgScore: number; error?: string }> = {};

    // Create search promises for parallel execution
    const searchPromises = vectorTypes.map(async (vectorType) => {
      const vectorStartTime = Date.now();
      
      try {
        // Validate vector type
        validateVectorType(vectorType);
        
        // Search with timeout
        const searchPromise = this.searchByVectorType(
          embedding,
          vectorType,
          maxResultsPerVector,
          filter
        );

        const searchResults = timeout > 0
          ? await this.withTimeout(searchPromise, timeout)
          : await searchPromise;

        const searchTime = Date.now() - vectorStartTime;
        const avgScore = searchResults.length > 0
          ? searchResults.reduce((sum, result) => sum + result.score, 0) / searchResults.length
          : 0;

        // Enhance results with rank and vector type
        const enhancedResults = searchResults.map((result, index) => ({
          ...result,
          rank: index + 1,
          vectorType
        }));

        results[vectorType] = enhancedResults;
        metrics[vectorType] = {
          searchTime,
          resultCount: searchResults.length,
          avgScore
        };

      } catch (error) {
        const searchTime = Date.now() - vectorStartTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        console.warn(`⚠️ Search failed for vector type ${vectorType}:`, errorMessage);
        
        results[vectorType] = [];
        metrics[vectorType] = {
          searchTime,
          resultCount: 0,
          avgScore: 0,
          error: errorMessage
        };
      }
    });

    // Execute all searches in parallel
    await Promise.allSettled(searchPromises);

    const totalTime = Date.now() - startTime;

    console.log(`🔍 Multi-vector search completed in ${totalTime}ms across ${vectorTypes.length} vector types`);
    console.log(`📊 Results: ${Object.values(results).reduce((sum, arr) => sum + arr.length, 0)} total results`);

    return {
      results,
      metrics: includeMetrics ? metrics : {},
      totalTime
    };
  }

  /**
   * Get available vector types in the enhanced collection
   */
  async getAvailableVectorTypes(): Promise<string[]> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      if (shouldUseEnhancedCollection()) {
        const collectionInfo = await this.getEnhancedCollectionInfo();
        return Object.keys(collectionInfo.config.params.vectors_config || {});
      } else {
        // For legacy collections, return supported vector types
        return getSupportedVectorTypes();
      }
    } catch (error) {
      console.error("Error getting available vector types:", error);
      return getSupportedVectorTypes();
    }
  }

  /**
   * Check if specific vector types are available in the enhanced collection
   */
  async checkVectorTypeAvailability(vectorTypes: string[]): Promise<Record<string, boolean>> {
    const availableTypes = await this.getAvailableVectorTypes();
    const availability: Record<string, boolean> = {};
    
    for (const vectorType of vectorTypes) {
      availability[vectorType] = availableTypes.includes(vectorType);
    }

    return availability;
  }

  /**
   * Apply timeout to a promise
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Search for similar tools based on text query
   */
  async searchByText(
    query: string,
    limit: number = 10,
    filter?: Record<string, any>,
    vectorType?: string
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    try {
      // Validate search parameters (excluding embedding which will be generated)
      validateSearchParams({ query, limit, filter, vectorType });

      // Generate embedding for the query
      const embedding = await embeddingService.generateEmbedding(query);

      // Search using the embedding
      return this.searchByEmbedding(embedding, limit, filter, vectorType);
    } catch (error) {
      console.error("Error searching by text:", error);
      if (error instanceof VectorValidationError) {
        throw error;
      }
      throw new Error(`Qdrant text search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search for similar tools using text query with specific vector type
   */
  async searchByTextAndVectorType(
    query: string,
    vectorType: string,
    limit: number = 10,
    filter?: Record<string, any>
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    try {
      // Validate vector type (additional validation beyond searchByText)
      validateVectorType(vectorType);
      return this.searchByText(query, limit, filter, vectorType);
    } catch (error) {
      console.error("Error searching by text and vector type:", error);
      if (error instanceof VectorValidationError) {
        throw error;
      }
      throw new Error(`Qdrant text vector type search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find tools similar to a reference tool
   */
  async findSimilarTools(
    toolId: string,
    limit: number = 10,
    filter?: Record<string, any>,
    vectorType?: string
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Validate input parameters
      validateToolId(toolId);
      if (limit !== undefined) {
        validateSearchParams({ limit, filter, vectorType });
      }

      // Determine collection name based on vector type and configuration
      const collectionName = getCollectionNameForVectorType(vectorType);
      const useEnhanced = shouldUseEnhancedCollection() && (!vectorType || isEnhancedVectorTypeSupported(vectorType));
      
      // Get the reference tool's embedding
      const pointId = this.toPointId(toolId);
      const retrieveParams: any = {
        ids: [pointId],
        with_payload: false,
        with_vector: true,
      };

      // For enhanced collection, specify which vector to retrieve
      if (useEnhanced && vectorType) {
        retrieveParams.with_vector = [vectorType];
      }

      const retrieveResult = await this.client.retrieve(collectionName, retrieveParams);

      if (retrieveResult.length === 0) {
        throw new Error(`Tool with ID ${toolId} not found in collection ${collectionName}`);
      }

      const referenceEmbedding = retrieveResult[0].vector;
      if (!referenceEmbedding) {
        throw new Error(`No embedding found for tool with ID ${toolId}`);
      }

      // Handle both single vectors and named vectors
      let embeddingVector: number[];
      if (Array.isArray(referenceEmbedding)) {
        embeddingVector = referenceEmbedding as number[];
      } else if (typeof referenceEmbedding === 'object') {
        // Named vectors case
        const namedVectors = referenceEmbedding as { [key: string]: number[] };
        if (vectorType && namedVectors[vectorType]) {
          embeddingVector = namedVectors[vectorType];
        } else {
          // Get the first available vector
          embeddingVector = Object.values(namedVectors)[0];
        }
      } else {
        throw new Error(`Invalid embedding format for tool with ID ${toolId}`);
      }

      // Validate the retrieved embedding
      validateEmbedding(embeddingVector);

      // Search for similar tools, excluding the reference tool (by payload id)
      const searchFilter = {
        ...filter,
        must_not: [
          ...(filter?.must_not || []),
          { key: "id", match: { value: toolId } },
        ],
      };

      return this.searchByEmbedding(embeddingVector, limit, searchFilter, vectorType);
    } catch (error) {
      console.error("Error finding similar tools:", error);
      if (error instanceof VectorValidationError) {
        throw error;
      }
      throw new Error(`Qdrant similar tools search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add or update a tool's embedding
   */
  async upsertTool(toolId: string, embedding: number[], payload: Record<string, any>): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const pointId = this.toPointId(toolId);
      await this.client.upsert(qdrantConfig.collectionName, {
        points: [
          {
            id: pointId,
            vector: embedding,
            payload: payload,
          },
        ],
      });
    } catch (error) {
      console.error("Error upserting tool:", error);
      throw error;
    }
  }

  /**
   * Add or update a tool's embedding for specific vector type
   */
  async upsertToolVector(
    toolId: string,
    embedding: number[],
    payload: Record<string, any>,
    vectorType: string
  ): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Validate upsert parameters
      validateUpsertParams({ toolId, vectors: embedding, payload, vectorType });

      const pointId = this.toPointId(toolId);
      const collectionName = getCollectionName(vectorType);
      
      await this.client.upsert(collectionName, {
        points: [
          {
            id: pointId,
            vector: embedding,
            payload: payload,
          },
        ],
      });
    } catch (error) {
      console.error(`Error upserting tool vector for type ${vectorType}:`, error);
      if (error instanceof VectorValidationError) {
        throw error;
      }
      throw new Error(`Qdrant upsert tool vector failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add or update multiple vectors for a tool in a single operation
   */
  async upsertToolMultiVector(
    toolId: string,
    vectors: { [vectorType: string]: number[] },
    payload: Record<string, any>
  ): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Validate upsert parameters
      validateUpsertParams({ toolId, vectors, payload });

      const pointId = this.toPointId(toolId);

      // Check if we should use enhanced collection
      if (shouldUseEnhancedCollection()) {
        // Validate all vectors against enhanced schema
        validateEnhancedVectors(vectors);
        
        // Upsert to enhanced collection with named vectors
        await this.client.upsert(getEnhancedCollectionName(), {
          points: [
            {
              id: pointId,
              vector: vectors,
              payload: payload,
            },
          ],
        });
        console.log(`Upserted ${Object.keys(vectors).length} vectors to enhanced collection for tool ${toolId}`);
      } else {
        // Legacy approach: upsert to each collection
        const upsertPromises = Object.entries(vectors).map(async ([vectorType, embedding]) => {
          const collectionName = getCollectionName(vectorType);
          return this.client.upsert(collectionName, {
            points: [
              {
                id: pointId,
                vector: embedding,
                payload: payload,
              },
            ],
          });
        });

        await Promise.all(upsertPromises);
        console.log(`Upserted ${Object.keys(vectors).length} vectors to legacy collections for tool ${toolId}`);
      }
    } catch (error) {
      console.error("Error upserting tool multi-vectors:", error);
      if (error instanceof VectorValidationError) {
        throw error;
      }
      throw new Error(`Qdrant upsert tool multi-vectors failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add or update multiple vectors for a tool using enhanced schema
   */
  async upsertToolEnhanced(
    toolId: string,
    vectors: { [vectorType: string]: number[] },
    payload: Record<string, any>
  ): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Validate parameters
      validateUpsertParams({ toolId, vectors, payload });
      
      // Validate against enhanced schema
      validateEnhancedVectors(vectors);

      const pointId = this.toPointId(toolId);

      // Upsert to enhanced collection with named vectors
      await this.client.upsert(getEnhancedCollectionName(), {
        points: [
          {
            id: pointId,
            vector: vectors,
            payload: payload,
          },
        ],
      });

      console.log(`Upserted ${Object.keys(vectors).length} named vectors to enhanced collection for tool ${toolId}`);
    } catch (error) {
      console.error("Error upserting tool enhanced vectors:", error);
      if (error instanceof VectorValidationError) {
        throw error;
      }
      throw new Error(`Qdrant upsert tool enhanced vectors failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add or update a single named vector for a tool in enhanced collection
   */
  async upsertToolNamedVector(
    toolId: string,
    vectorType: string,
    embedding: number[],
    payload: Record<string, any>
  ): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Validate parameters
      validateUpsertParams({ toolId, vectors: embedding, payload, vectorType });
      
      // Validate against enhanced schema
      if (!isEnhancedVectorTypeSupported(vectorType)) {
        throw new Error(`Unsupported vector type for enhanced collection: ${vectorType}`);
      }
      
      validateEnhancedVectors({ [vectorType]: embedding });

      const pointId = this.toPointId(toolId);

      // Upsert to enhanced collection with named vector
      await this.client.upsert(getEnhancedCollectionName(), {
        points: [
          {
            id: pointId,
            vector: { [vectorType]: embedding },
            payload: payload,
          },
        ],
      });

      console.log(`Upserted named vector ${vectorType} to enhanced collection for tool ${toolId}`);
    } catch (error) {
      console.error(`Error upserting tool named vector ${vectorType}:`, error);
      if (error instanceof VectorValidationError) {
        throw error;
      }
      throw new Error(`Qdrant upsert tool named vector failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a tool's embedding
   */
  async deleteTool(toolId: string): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const pointId = this.toPointId(toolId);
      await this.client.delete(qdrantConfig.collectionName, {
        points: [pointId],
      });
    } catch (error) {
      console.error("Error deleting tool:", error);
      throw error;
    }
  }

  /**
   * Delete a tool's embedding for specific vector type
   */
  async deleteToolVector(toolId: string, vectorType: string): Promise<void> {
    if (!isSupportedVectorType(vectorType)) {
      throw new Error(`Unsupported vector type: ${vectorType}. Supported types: ${getSupportedVectorTypes().join(', ')}`);
    }

    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const pointId = this.toPointId(toolId);
      const collectionName = getCollectionName(vectorType);
      
      await this.client.delete(collectionName, {
        points: [pointId],
      });
    } catch (error) {
      console.error(`Error deleting tool vector for type ${vectorType}:`, error);
      throw error;
    }
  }

  /**
   * Delete all vectors for a tool across all collections
   */
  async deleteToolAllVectors(toolId: string): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const pointId = this.toPointId(toolId);

      // Delete from legacy collection
      await this.client.delete(qdrantConfig.collectionName, {
        points: [pointId],
      });

      // Delete from all vector type collections
      const deletePromises = getSupportedVectorTypes().map(async (vectorType) => {
        const collectionName = getCollectionName(vectorType);
        return this.client.delete(collectionName, {
          points: [pointId],
        });
      });

      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error deleting tool all vectors:", error);
      throw error;
    }
  }

  /**
   * Clear all points from the collection (for force re-indexing)
   */
  async clearAllPoints(): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Delete all points by using an empty filter (matches all)
      await this.client.delete(qdrantConfig.collectionName, {
        filter: {},
      });
      console.log("Successfully cleared all points from legacy collection");
    } catch (error) {
      console.error("Error clearing all points:", error);
      throw error;
    }
  }

  /**
   * Clear all points from specific vector type collection
   */
  async clearAllPointsForVectorType(vectorType: string): Promise<void> {
    if (!isSupportedVectorType(vectorType)) {
      throw new Error(`Unsupported vector type: ${vectorType}. Supported types: ${getSupportedVectorTypes().join(', ')}`);
    }

    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const collectionName = getCollectionName(vectorType);
      
      // Delete all points by using an empty filter (matches all)
      await this.client.delete(collectionName, {
        filter: {},
      });
      console.log(`Successfully cleared all points from ${vectorType} collection`);
    } catch (error) {
      console.error(`Error clearing all points for vector type ${vectorType}:`, error);
      throw error;
    }
  }

  /**
   * Clear all points from all collections (for force re-indexing)
   */
  async clearAllPointsFromAllCollections(): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Clear legacy collection
      await this.clearAllPoints();

      // Clear all vector type collections
      const clearPromises = getSupportedVectorTypes().map(async (vectorType) => {
        return this.clearAllPointsForVectorType(vectorType);
      });

      await Promise.all(clearPromises);
      console.log("Successfully cleared all points from all collections");
    } catch (error) {
      console.error("Error clearing all points from all collections:", error);
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(): Promise<any> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      return await this.client.getCollection(qdrantConfig.collectionName);
    } catch (error) {
      console.error("Error getting collection info:", error);
      throw error;
    }
  }

  /**
   * Get collection info for specific vector type
   */
  async getCollectionInfoForVectorType(vectorType: string): Promise<any> {
    if (!isSupportedVectorType(vectorType)) {
      throw new Error(`Unsupported vector type: ${vectorType}. Supported types: ${getSupportedVectorTypes().join(', ')}`);
    }

    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const collectionName = getCollectionName(vectorType);
      return await this.client.getCollection(collectionName);
    } catch (error) {
      console.error(`Error getting collection info for vector type ${vectorType}:`, error);
      throw error;
    }
  }

  /**
   * Get enhanced collection info
   */
  async getEnhancedCollectionInfo(): Promise<any> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      return await this.client.getCollection(getEnhancedCollectionName());
    } catch (error) {
      console.error("Error getting enhanced collection info:", error);
      throw error;
    }
  }

  /**
   * Get info for all collections including enhanced
   */
  async getAllCollectionsInfo(): Promise<{ [collectionType: string]: any }> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const allInfo: { [collectionType: string]: any } = {};

      // Get legacy collection info
      allInfo.legacy = await this.getCollectionInfo();

      // Get all vector type collection info (legacy approach)
      const infoPromises = getSupportedVectorTypes().map(async (vectorType) => {
        try {
          const info = await this.getCollectionInfoForVectorType(vectorType);
          allInfo[`legacy_${vectorType}`] = info;
        } catch (error) {
          console.warn(`Could not get info for ${vectorType} collection:`, error);
          allInfo[`legacy_${vectorType}`] = { error: error instanceof Error ? error.message : String(error) };
        }
      });

      // Get enhanced collection info
      try {
        allInfo.enhanced = await this.getEnhancedCollectionInfo();
      } catch (error) {
        console.warn("Could not get info for enhanced collection:", error);
        allInfo.enhanced = { error: error instanceof Error ? error.message : String(error) };
      }

      await Promise.all(infoPromises);
      return allInfo;
    } catch (error) {
      console.error("Error getting all collections info:", error);
      throw error;
    }
  }

  /**
   * Get supported vector types
   */
  getSupportedVectorTypes(): string[] {
    return getSupportedVectorTypes();
  }

  /**
   * Check if a vector type is supported
   */
  isVectorTypeSupported(vectorType: string): boolean {
    return isSupportedVectorType(vectorType);
  }
  /**
   * Clear all points from enhanced collection
   */
  async clearEnhancedCollection(): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Delete all points by using an empty filter (matches all)
      await this.client.delete(getEnhancedCollectionName(), {
        filter: {},
      });
      console.log("Successfully cleared all points from enhanced collection");
    } catch (error) {
      console.error("Error clearing enhanced collection:", error);
      throw error;
    }
  }

  /**
   * Delete a tool's vectors from enhanced collection
   */
  async deleteToolFromEnhanced(toolId: string): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const pointId = this.toPointId(toolId);
      await this.client.delete(getEnhancedCollectionName(), {
        points: [pointId],
      });
      console.log(`Successfully deleted tool ${toolId} from enhanced collection`);
    } catch (error) {
      console.error(`Error deleting tool ${toolId} from enhanced collection:`, error);
      throw error;
    }
  }

  /**
   * Get vector types available for a tool in enhanced collection
   */
  async getToolVectorTypes(toolId: string): Promise<string[]> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const pointId = this.toPointId(toolId);
      const retrieveResult = await this.client.retrieve(getEnhancedCollectionName(), {
        ids: [pointId],
        with_payload: false,
        with_vector: true,
      });

      if (retrieveResult.length === 0) {
        return [];
      }

      const vectorData = retrieveResult[0].vector;
      if (!vectorData) {
        return [];
      }

      if (typeof vectorData === 'object' && !Array.isArray(vectorData)) {
        return Object.keys(vectorData);
      }

      return [];
    } catch (error) {
      console.error(`Error getting vector types for tool ${toolId}:`, error);
      return [];
    }
  }

  /**
   * Health check for Qdrant service
   * Verifies connection and collection availability
   */
  async healthCheck(): Promise<{ status: string; collections: any; enhanced?: any }> {
    if (!this.client) {
      throw new Error("Qdrant client not initialized");
    }

    try {
      // Try to get collection info to verify connection
      const legacyInfo = await this.getCollectionInfo();
      const healthData: any = {
        status: "healthy",
        collections: {
          legacy: legacyInfo
        }
      };

      // Check enhanced collection if enabled
      if (shouldUseEnhancedCollection()) {
        try {
          const enhancedInfo = await this.getEnhancedCollectionInfo();
          healthData.collections.enhanced = enhancedInfo;
        } catch (error) {
          healthData.status = "degraded";
          healthData.collections.enhanced = {
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }

      return healthData;
    } catch (error) {
      throw new Error(`Qdrant health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get enhanced vector type support information
   */
  getEnhancedVectorSupport(): {
    enabled: boolean;
    supportedTypes: string[];
    collectionName: string;
  } {
    return {
      enabled: shouldUseEnhancedCollection(),
      supportedTypes: getSupportedVectorTypes().filter(type => isEnhancedVectorTypeSupported(type)),
      collectionName: getEnhancedCollectionName(),
    };
  }
}

// Export singleton instance
export const qdrantService = new QdrantService();

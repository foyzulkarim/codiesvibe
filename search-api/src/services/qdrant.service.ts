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
} from "#config/database";
import {
  isEnhancedVectorTypeSupported,
  validateEnhancedVectors,
  getVectorConfig
} from "#config/enhanced-qdrant-schema";
import { embeddingService } from "./embedding.service.js";
import { createHash } from "crypto";
import {
  VectorValidationError,
  validateSearchParams,
  validateUpsertParams,
  validateBatchOperations,
  validateVectorType,
  validateToolId,
  validateEmbedding
} from "#utils/vector-validation";
import { CollectionConfigService } from "./collection-config.service.js";
import { ContentGeneratorFactory } from "./content-generator-factory.service.js";

// Multi-collection management interfaces
export interface CollectionInfo {
  name: string;
  exists: boolean;
  pointsCount: number;
  vectorSize: number;
  distance: string;
  status: 'green' | 'yellow' | 'red';
  optimizerStatus?: any;
  indexedVectorsCount?: number;
  config?: any;
}

export interface MultiCollectionStats {
  totalCollections: number;
  healthyCollections: number;
  totalVectors: number;
  collections: Record<string, CollectionInfo>;
  summary: {
    healthy: string[];
    unhealthy: string[];
    missing: string[];
  };
}

export interface CollectionOperationResult {
  success: boolean;
  collection: string;
  operation: string;
  message?: string;
  error?: string;
  duration?: number;
}

export class QdrantService {
  private client: QdrantClient | null = null;
  private collectionConfig: CollectionConfigService;
  private contentFactory: ContentGeneratorFactory;

  constructor() {
    // Initialize multi-collection services
    this.collectionConfig = new CollectionConfigService();
    this.contentFactory = new ContentGeneratorFactory(this.collectionConfig);
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
  /**
   * Search directly on a specific collection without vector type validation
   * Used for collection health checks and accessibility tests
   */
  async searchDirectOnCollection(
    embedding: number[],
    collectionName: string,
    limit: number = 1,
    filter?: Record<string, any>
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Validate only the embedding, not the vector type
      validateEmbedding(embedding, 768);

      const searchParams: any = {
        vector: embedding,
        limit,
        with_payload: true,
        with_vector: false
      };

      if (filter) {
        searchParams.filter = filter;
      }

      const response = await this.client.search(collectionName, searchParams);

      return response.map((point: any) => ({
        id: point.id.toString(),
        score: point.score,
        payload: point.payload || {}
      }));

    } catch (error) {
      console.error(`❌ Error searching collection ${collectionName}:`, error.message);
      throw error;
    }
  }

  async searchByEmbedding(
    embedding: number[],
    limit: number = 10,
    filter?: Record<string, any>,
    vectorType?: string,
    collection?: string,
    scoreThreshold?: number
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Validate search parameters
      validateSearchParams({ embedding, limit, filter, vectorType });
      
      // Set default score threshold if not provided
      const threshold = scoreThreshold !== undefined ? scoreThreshold : parseFloat(process.env.SEARCH_SCORE_THRESHOLD || '0.5');

      // Determine collection name based on vector type and configuration
      const collectionName = collection || getCollectionNameForVectorType(vectorType);
      const useEnhanced = shouldUseEnhancedCollection() && (!vectorType || isEnhancedVectorTypeSupported(vectorType));

      console.log("🔍 Qdrant searchByEmbedding called with:");
      console.log("   - collection:", collectionName);
      console.log("   - vectorType:", vectorType || 'default');
      console.log("   - useEnhanced:", useEnhanced);
      console.log("   - limit:", limit);
      console.log("   - scoreThreshold:", threshold);

      const searchParams: any = {
        limit: limit,
        filter: filter,
        with_payload: true,
        score_threshold: threshold,
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
    console.log(`Upserting tool vector for type ${vectorType} with ID ${toolId}`, {
      embedding,
      payload,
    });
    try {
      // Validate upsert parameters
      validateUpsertParams({ toolId, vectors: embedding, payload, vectorType });

      const pointId = this.toPointId(toolId);
      const collectionName = getCollectionName(vectorType);
      console.log(`Upserting tool vector for type ${vectorType} with ID ${toolId} to collection ${collectionName}`);
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

  // ========================================
  // MULTI-COLLECTION MANAGEMENT METHODS
  // ========================================

  /**
   * Get comprehensive statistics for all multi-collection architecture collections
   */
  async getMultiCollectionStats(): Promise<MultiCollectionStats> {
    if (!this.client) throw new Error("Qdrant client not connected");

    const enabledCollections = this.collectionConfig.getEnabledCollectionNames();
    const collections: Record<string, CollectionInfo> = {};
    let totalVectors = 0;
    let healthyCount = 0;

    console.log(`🔍 Getting stats for ${enabledCollections.length} collections...`);

    for (const collectionName of enabledCollections) {
      try {
        const info = await this.getCollectionInfoForCollection(collectionName);
        collections[collectionName] = info;
        totalVectors += info.pointsCount;
        if (info.status === 'green') healthyCount++;
      } catch (error) {
        collections[collectionName] = {
          name: collectionName,
          exists: false,
          pointsCount: 0,
          vectorSize: 0,
          distance: 'unknown',
          status: 'red',
          config: { error: error instanceof Error ? error.message : String(error) }
        };
      }
    }

    return {
      totalCollections: enabledCollections.length,
      healthyCollections: healthyCount,
      totalVectors,
      collections,
      summary: {
        healthy: Object.entries(collections)
          .filter(([_, info]) => info.status === 'green')
          .map(([name]) => name),
        unhealthy: Object.entries(collections)
          .filter(([_, info]) => info.status !== 'green')
          .map(([name]) => name),
        missing: Object.entries(collections)
          .filter(([_, info]) => !info.exists)
          .map(([name]) => name)
      }
    };
  }

  /**
   * Get information for a specific collection by name
   */
  async getCollectionInfoForCollection(collectionName: string): Promise<CollectionInfo> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const collection = await this.client.getCollection(collectionName);

      const vectors = collection.config.params.vectors;

      // Handle different vector configuration formats
      let vectorSize: number;
      let distance: string;

      if (typeof vectors === 'object' && vectors !== null) {
        // Check if it's a direct vector config with size and distance
        if ('size' in vectors && 'distance' in vectors && typeof vectors.size === 'number' && typeof vectors.distance === 'string') {
          vectorSize = vectors.size;
          distance = vectors.distance;
        } else {
          // Multiple named vectors - take the first one
          const firstVectorName = Object.keys(vectors)[0];
          const firstVector = vectors[firstVectorName];
          if (firstVector && typeof firstVector === 'object' && 'size' in firstVector && 'distance' in firstVector) {
            vectorSize = firstVector.size as number;
            distance = firstVector.distance as string;
          } else {
            vectorSize = 0;
            distance = 'unknown';
          }
        }
      } else {
        // Legacy single vector configuration or unknown format
        vectorSize = 0;
        distance = 'unknown';
      }
      const status = (collection.status === 'grey' ? 'yellow' : collection.status) || 'green';

      return {
        name: collectionName,
        exists: true,
        pointsCount: collection.points_count || 0,
        vectorSize: vectorSize,
        distance: distance,
        status: status as 'green' | 'yellow' | 'red',
        optimizerStatus: collection.optimizer_status,
        indexedVectorsCount: collection.indexed_vectors_count,
        config: collection.config
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          name: collectionName,
          exists: false,
          pointsCount: 0,
          vectorSize: 0,
          distance: 'unknown',
          status: 'red'
        };
      }
      throw error;
    }
  }

  /**
   * Create collections based on collection configuration
   */
  async createMultiCollections(): Promise<CollectionOperationResult[]> {
    if (!this.client) throw new Error("Qdrant client not connected");

    const enabledCollections = this.collectionConfig.getEnabledCollectionNames();
    const results: CollectionOperationResult[] = [];

    console.log(`🔧 Creating ${enabledCollections.length} collections...`);

    for (const collectionName of enabledCollections) {
      const startTime = Date.now();
      try {
        const result = await this.createCollection(collectionName);
        results.push({
          ...result,
          duration: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          success: false,
          collection: collectionName,
          operation: 'create',
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Created ${successCount}/${enabledCollections.length} collections successfully`);

    return results;
  }

  /**
   * Create a single collection with proper configuration
   */
  async createCollection(collectionName: string): Promise<CollectionOperationResult> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Check if collection already exists
      const existingInfo = await this.getCollectionInfoForCollection(collectionName);
      if (existingInfo.exists) {
        return {
          success: true,
          collection: collectionName,
          operation: 'create',
          message: 'Collection already exists'
        };
      }

      // Get collection configuration
      const collectionConfig = this.collectionConfig.getCollectionByName(collectionName);
      if (!collectionConfig) {
        throw new Error(`No configuration found for collection: ${collectionName}`);
      }

      // Create collection with standard vector configuration
      await this.client.createCollection(collectionName, {
        vectors: {
          size: 768, // togethercomputer/m2-bert-80M-32k-retrieval dimensions
          distance: 'Cosine'
        },
        // optimizers_config: { // Commented out as it's not supported by current Qdrant API version
        //   default_segment_number: 2,
        //   max_segment_size: 200000,
        //   memmap_threshold: 20000,
        //   indexing_threshold: 20000,
        //   flush_interval_sec: 5,
        //   max_optimization_threads: 1
        // },
        // replication_factor: 1,
        // write_consistency_factor: 1 // Commented out as not supported by current API
      });

      return {
        success: true,
        collection: collectionName,
        operation: 'create',
        message: `Collection ${collectionName} created successfully`
      };
    } catch (error) {
      throw new Error(`Failed to create collection ${collectionName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete collections (use with caution!)
   */
  async deleteMultiCollections(collectionNames?: string[]): Promise<CollectionOperationResult[]> {
    if (!this.client) throw new Error("Qdrant client not connected");

    const collectionsToDelete = collectionNames || this.collectionConfig.getEnabledCollectionNames();
    const results: CollectionOperationResult[] = [];

    console.log(`🗑️ Deleting ${collectionsToDelete.length} collections...`);

    for (const collectionName of collectionsToDelete) {
      const startTime = Date.now();
      try {
        const result = await this.deleteCollection(collectionName);
        results.push({
          ...result,
          duration: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          success: false,
          collection: collectionName,
          operation: 'delete',
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Deleted ${successCount}/${collectionsToDelete.length} collections successfully`);

    return results;
  }

  /**
   * Delete a single collection
   */
  async deleteCollection(collectionName: string): Promise<CollectionOperationResult> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Check if collection exists
      const existingInfo = await this.getCollectionInfoForCollection(collectionName);
      if (!existingInfo.exists) {
        return {
          success: true,
          collection: collectionName,
          operation: 'delete',
          message: 'Collection does not exist'
        };
      }

      await this.client.deleteCollection(collectionName);

      return {
        success: true,
        collection: collectionName,
        operation: 'delete',
        message: `Collection ${collectionName} deleted successfully`
      };
    } catch (error) {
      throw new Error(`Failed to delete collection ${collectionName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all points from specific collections
   */
  async clearMultiCollections(collectionNames?: string[]): Promise<CollectionOperationResult[]> {
    if (!this.client) throw new Error("Qdrant client not connected");

    const collectionsToClear = collectionNames || this.collectionConfig.getEnabledCollectionNames();
    const results: CollectionOperationResult[] = [];

    console.log(`🧹 Clearing ${collectionsToClear.length} collections...`);

    for (const collectionName of collectionsToClear) {
      const startTime = Date.now();
      try {
        await this.client.delete(collectionName, { filter: {} });
        console.log(`✅ Collection ${collectionName} cleared successfully`);
        results.push({
          success: true,
          collection: collectionName,
          operation: 'clear',
          message: `Collection ${collectionName} cleared successfully`,
          duration: Date.now() - startTime
        });
      } catch (error) {
        console.error(`❌ Failed to clear collection ${collectionName}: ${error instanceof Error ? error.message : String(error)}`);
        results.push({
          success: false,
          collection: collectionName,
          operation: 'clear',
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Cleared ${successCount}/${collectionsToClear.length} collections successfully`);

    return results;
  }

  /**
   * Enhanced search across multiple collections with result merging
   */
  async searchMultiCollection(
    embedding: number[],
    options: {
      collections?: string[];
      limit?: number;
      filter?: Record<string, any>;
      mergeStrategy?: 'weighted' | 'ranked' | 'best';
      timeout?: number;
    } = {}
  ): Promise<{
    results: Array<{
      id: string;
      score: number;
      payload: any;
      collection: string;
      rank: number;
    }>;
    collectionStats: Record<string, { resultCount: number; avgScore: number; searchTime: number }>;
    totalSearchTime: number;
  }> {
    if (!this.client) throw new Error("Qdrant client not connected");

    const {
      collections: specifiedCollections,
      limit = 10,
      filter,
      mergeStrategy = 'weighted',
      timeout = 5000
    } = options;

    const collections = specifiedCollections || this.collectionConfig.getEnabledCollectionNames();
    const startTime = Date.now();

    console.log(`🔍 Searching across ${collections.length} collections...`);

    // Create search promises for parallel execution
    const searchPromises = collections.map(async (collectionName) => {
      const collectionStartTime = Date.now();

      try {
        const vectorType = this.collectionConfig.getVectorTypeForCollection(collectionName);
        const searchPromise = this.searchByEmbedding(embedding, limit, filter, vectorType);
        const results = timeout > 0
          ? await this.withTimeout(searchPromise, timeout)
          : await searchPromise;

        const searchTime = Date.now() - collectionStartTime;
        const avgScore = results.length > 0
          ? results.reduce((sum, result) => sum + result.score, 0) / results.length
          : 0;

        return {
          collectionName,
          results: results.map((result, index) => ({
            ...result,
            collection: collectionName,
            rank: index + 1
          })),
          stats: {
            resultCount: results.length,
            avgScore,
            searchTime
          }
        };
      } catch (error) {
        const searchTime = Date.now() - collectionStartTime;
        console.warn(`⚠️ Search failed for collection ${collectionName}:`, error);

        return {
          collectionName,
          results: [],
          stats: {
            resultCount: 0,
            avgScore: 0,
            searchTime,
            error: error instanceof Error ? error.message : String(error)
          }
        };
      }
    });

    // Execute all searches in parallel
    const searchResults = await Promise.allSettled(searchPromises);

    // Process and merge results
    const allResults: Array<{
      id: string;
      score: number;
      payload: any;
      collection: string;
      rank: number;
    }> = [];
    const collectionStats: Record<string, { resultCount: number; avgScore: number; searchTime: number }> = {};

    for (const result of searchResults) {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value.results);
        collectionStats[result.value.collectionName] = result.value.stats;
      }
    }

    // Apply merge strategy
    const mergedResults = this.mergeSearchResults(allResults, mergeStrategy, limit);

    const totalSearchTime = Date.now() - startTime;
    console.log(`🔍 Multi-collection search completed in ${totalSearchTime}ms across ${collections.length} collections`);
    console.log(`📊 Total results: ${mergedResults.length}`);

    return {
      results: mergedResults,
      collectionStats,
      totalSearchTime
    };
  }

  /**
   * Merge search results from multiple collections using different strategies
   */
  private mergeSearchResults(
    results: Array<{
      id: string;
      score: number;
      payload: any;
      collection: string;
      rank: number;
    }>,
    strategy: 'weighted' | 'ranked' | 'best',
    limit: number
  ): Array<{
    id: string;
    score: number;
    payload: any;
    collection: string;
    rank: number;
  }> {
    // Remove duplicates (same toolId across collections)
    const uniqueResults = new Map<string, any>();

    for (const result of results) {
      const toolId = result.payload?.toolId || result.id;

      if (!uniqueResults.has(toolId)) {
        uniqueResults.set(toolId, result);
      } else {
        // Merge if tool appears in multiple collections
        const existing = uniqueResults.get(toolId);
        if (strategy === 'best') {
          if (result.score > existing.score) {
            uniqueResults.set(toolId, result);
          }
        } else if (strategy === 'weighted') {
          // Weight by collection priority and combine scores
          const collectionPriority = this.getCollectionPriority(result.collection);
          const existingPriority = this.getCollectionPriority(existing.collection);

          if (result.score * collectionPriority > existing.score * existingPriority) {
            uniqueResults.set(toolId, result);
          }
        }
      }
    }

    // Sort and limit results
    const merged = Array.from(uniqueResults.values());

    if (strategy === 'ranked') {
      merged.sort((a, b) => b.rank - a.rank);
    } else {
      merged.sort((a, b) => b.score - a.score);
    }

    return merged.slice(0, limit).map((result, index) => ({
      ...result,
      rank: index + 1
    }));
  }

  /**
   * Get priority weight for a collection
   */
  private getCollectionPriority(collectionName: string): number {
    const config = this.collectionConfig.getCollectionByName(collectionName);
    if (!config) return 1.0;

    // Higher priority for identity collections
    switch (config.purpose) {
      case 'identity': return 3.0;
      case 'capability': return 2.0;
      case 'usecase': return 2.0;
      case 'technical': return 1.5;
      default: return 1.0;
    }
  }

  /**
   * Validate collection integrity and consistency
   */
  async validateMultiCollectionIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
    collectionStatus: Record<string, { healthy: boolean; issues: string[] }>;
  }> {
    const stats = await this.getMultiCollectionStats();
    const issues: string[] = [];
    const recommendations: string[] = [];
    const collectionStatus: Record<string, { healthy: boolean; issues: string[] }> = {};

    // Check each collection
    for (const [collectionName, info] of Object.entries(stats.collections)) {
      const collectionIssues: string[] = [];

      if (!info.exists) {
        collectionIssues.push('Collection does not exist');
        issues.push(`Collection ${collectionName} does not exist`);
        recommendations.push(`Create collection ${collectionName}`);
      } else {
        if (info.status !== 'green') {
          collectionIssues.push(`Collection status is ${info.status}`);
          issues.push(`Collection ${collectionName} has status ${info.status}`);
        }

        if (info.vectorSize !== 768) {
          collectionIssues.push(`Invalid vector size: ${info.vectorSize} (expected 768)`);
          issues.push(`Collection ${collectionName} has incorrect vector size`);
          recommendations.push(`Recreate collection ${collectionName} with correct vector size`);
        }

        if (info.pointsCount === 0) {
          collectionIssues.push('Collection is empty');
        }
      }

      collectionStatus[collectionName] = {
        healthy: collectionIssues.length === 0,
        issues: collectionIssues
      };
    }

    // Overall health check
    const healthyCount = stats.healthyCollections;
    const totalCount = stats.totalCollections;

    if (healthyCount < totalCount) {
      issues.push(`${totalCount - healthyCount} of ${totalCount} collections are unhealthy`);
    }

    if (stats.totalVectors === 0) {
      issues.push('No vectors found in any collection');
      recommendations.push('Run indexing process to populate collections');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
      collectionStatus
    };
  }

  /**
   * Get access to collection configuration
   */
  getCollectionConfiguration(): CollectionConfigService {
    return this.collectionConfig;
  }

  /**
   * Get access to content factory
   */
  getContentFactory(): ContentGeneratorFactory {
    return this.contentFactory;
  }

  /**
   * Get enabled collection names
   */
  getEnabledCollections(): string[] {
    return this.collectionConfig.getEnabledCollectionNames();
  }
}

// Export singleton instance
export const qdrantService = new QdrantService();

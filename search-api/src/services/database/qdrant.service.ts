import { QdrantClient } from "@qdrant/js-client-rest";
import type {
  QdrantPayload,
  QdrantFilter,
  QdrantCollectionInfo
} from "@qdrant/js-client-rest";
import {
  connectToQdrant,
  qdrantConfig,
  getCollectionName,
  isSupportedVectorType,
  getSupportedVectorTypes,
  getEnhancedCollectionName,
  shouldUseEnhancedCollection,
  getCollectionNameForVectorType
} from "#config/database.js";
import {
  isEnhancedVectorTypeSupported,
  validateEnhancedVectors
} from "#config/enhanced-qdrant-schema.js";
import { CONFIG } from '#config/env.config.js';
import { embeddingService } from "#services/embedding/embedding.service.js";
import { createHash } from "crypto";
import {
  VectorValidationError,
  validateSearchParams,
  validateUpsertParams,
  validateVectorType,
  validateToolId,
  validateEmbedding
} from "#utils/vector-validation.js";
import { QdrantCollectionConfigService } from "./qdrant-collection-config.service.js";
import { ContentGeneratorFactory } from "#services/embedding/content-generator-factory.service.js";

// Local type definitions for Qdrant service operations
export interface OptimizerStatus {
  ok: boolean;
  error?: string;
  status?: string;
}

export interface VectorParams {
  size: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
  hnsw_config?: {
    m?: number;
    ef_construct?: number;
    full_scan_threshold?: number;
  };
}

export interface CollectionConfig {
  params: {
    vectors: VectorParams | Record<string, VectorParams>;
    shard_number?: number;
  };
}

export interface UpsertResult {
  operation_id?: number;
  status: string;
}

// Multi-collection management interfaces
export interface CollectionInfo {
  name: string;
  exists: boolean;
  pointsCount: number;
  vectorSize: number;
  distance: string;
  status: 'green' | 'yellow' | 'red';
  optimizerStatus?: OptimizerStatus;
  indexedVectorsCount?: number;
  config?: CollectionConfig;
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
  private initPromise: Promise<void> | null = null;  // Track initialization
  private isInitialized: boolean = false;            // Ready state flag
  private collectionConfig: QdrantCollectionConfigService;
  private contentFactory: ContentGeneratorFactory;

  constructor() {
    // Initialize multi-collection services (synchronous)
    this.collectionConfig = new QdrantCollectionConfigService();
    this.contentFactory = new ContentGeneratorFactory(this.collectionConfig);
    // Don't auto-initialize - initialization now happens explicitly via initialize()
  }

  /**
   * Initialize Qdrant client connection
   * Safe to call multiple times - returns same promise if already initializing
   */
  public async initialize(): Promise<void> {
    // Return existing initialization promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized && this.client) {
      return Promise.resolve();
    }

    // Create initialization promise
    this.initPromise = this._doInitialize();

    try {
      await this.initPromise;
      this.isInitialized = true;
    } catch (error) {
      // Reset state on failure to allow retry
      this.initPromise = null;
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Internal initialization logic
   */
  private async _doInitialize(): Promise<void> {
    try {
      this.client = await connectToQdrant();
      if (!this.client) {
        throw new Error('Failed to connect to Qdrant: client is null');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Qdrant client:', error);
      throw error;
    }
  }

  /**
   * Check if QdrantService is initialized and ready
   */
  public isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Ensure client is initialized before use
   * All public methods should call this first
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }
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
  async searchDirectOnCollection<T extends QdrantPayload = QdrantPayload>(
    embedding: number[],
    collectionName: string,
    limit: number = 1,
    filter?: QdrantFilter
  ): Promise<Array<{ id: string; score: number; payload: T }>> {
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Validate only the embedding, not the vector type
      validateEmbedding(embedding, 768);

      const searchParams: {
        vector: number[];
        limit: number;
        with_payload: boolean;
        with_vector: boolean;
        filter?: QdrantFilter;
      } = {
        vector: embedding,
        limit,
        with_payload: true,
        with_vector: false
      };

      if (filter) {
        searchParams.filter = filter;
      }

      const response = await this.client.search<T>(collectionName, searchParams);

      return response.map((point) => ({
        id: point.id.toString(),
        score: point.score,
        payload: point.payload || ({} as T)
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error searching collection ${collectionName}:`, errorMessage);
      throw error;
    }
  }

  async searchByEmbedding<T extends QdrantPayload = QdrantPayload>(
    embedding: number[],
    limit: number = 10,
    filter?: QdrantFilter,
    vectorType?: string,
    collection?: string,
    scoreThreshold?: number
  ): Promise<Array<{ id: string; score: number; payload: T }>> {
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Validate search parameters
      validateSearchParams({ embedding, limit, filter: filter as Record<string, unknown>, vectorType });

      // Set default score threshold if not provided
      const threshold = scoreThreshold !== undefined ? scoreThreshold : CONFIG.search.SEARCH_SCORE_THRESHOLD;

      // Determine collection name based on vector type and configuration
      const collectionName = collection || getCollectionNameForVectorType(vectorType);
      const useEnhanced = shouldUseEnhancedCollection() && (!vectorType || isEnhancedVectorTypeSupported(vectorType));

      console.log("🔍 Qdrant searchByEmbedding called with:");
      console.log("   - collection:", collectionName);
      console.log("   - vectorType:", vectorType || 'default');
      console.log("   - useEnhanced:", useEnhanced);
      console.log("   - limit:", limit);
      console.log("   - scoreThreshold:", threshold);

      const searchParams: {
        limit: number;
        filter?: QdrantFilter;
        with_payload: boolean;
        score_threshold: number;
        vector: number[];
        vector_name?: string;
      } = {
        limit: limit,
        filter: filter,
        with_payload: true,
        score_threshold: threshold,
        vector: embedding
      };

      // Add vector parameter based on whether we're using named vectors or separate collections
      if (useEnhanced && vectorType) {
        // Use named vector in enhanced collection
        searchParams.vector_name = vectorType;
      }

      const searchResult = await this.client.search<T>(collectionName, searchParams);

      console.log("🔍 Qdrant search returned", searchResult.length, "results");
      if (searchResult.length > 0) {
        console.log("   First result payload keys:", Object.keys(searchResult[0].payload || {}));
      }

      return searchResult.map(result => {
        const payload = result.payload || ({} as T);
        const originalId = typeof payload === 'object' && payload !== null && 'id' in payload
          ? (payload as { id?: string }).id
          : undefined;
        return {
          id: (originalId ?? (result.id as string)),
          score: result.score,
          payload: payload,
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
  async searchByVectorType<T extends QdrantPayload = QdrantPayload>(
    embedding: number[],
    vectorType: string,
    limit: number = 10,
    filter?: QdrantFilter
  ): Promise<Array<{ id: string; score: number; payload: T }>> {
    try {
      // Validate vector type (additional validation beyond searchByEmbedding)
      validateVectorType(vectorType);
      return this.searchByEmbedding<T>(embedding, limit, filter, vectorType);
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
  async searchMultipleVectorTypes<T extends QdrantPayload = QdrantPayload>(
    embedding: number[],
    vectorTypes: string[],
    limit: number = 10,
    filter?: QdrantFilter,
    options: {
      timeout?: number;
      includeMetrics?: boolean;
      maxResultsPerVector?: number;
    } = {}
  ): Promise<{
    results: Record<string, Array<{ id: string; score: number; payload: T; rank: number; vectorType: string }>>;
    metrics: Record<string, { searchTime: number; resultCount: number; avgScore: number; error?: string }>;
    totalTime: number;
  }> {
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");

    const startTime = Date.now();
    const {
      timeout = 5000,
      includeMetrics = true,
      maxResultsPerVector = limit * 2
    } = options;

    const results: Record<string, Array<{ id: string; score: number; payload: T; rank: number; vectorType: string }>> = {};
    const metrics: Record<string, { searchTime: number; resultCount: number; avgScore: number; error?: string }> = {};

    // Create search promises for parallel execution
    const searchPromises = vectorTypes.map(async (vectorType) => {
      const vectorStartTime = Date.now();

      try {
        // Validate vector type
        validateVectorType(vectorType);

        // Search with timeout
        const searchPromise = this.searchByVectorType<T>(
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
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      if (shouldUseEnhancedCollection()) {
        const collectionInfo = await this.getEnhancedCollectionInfo();
        const vectors = collectionInfo.config?.params?.vectors;

        // Check if vectors is an object with named vectors
        if (vectors && typeof vectors === 'object' && !('size' in vectors)) {
          return Object.keys(vectors);
        }
        return getSupportedVectorTypes();
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
  async searchByText<T extends QdrantPayload = QdrantPayload>(
    query: string,
    limit: number = 10,
    filter?: QdrantFilter,
    vectorType?: string
  ): Promise<Array<{ id: string; score: number; payload: T }>> {
    try {
      // Validate search parameters (excluding embedding which will be generated)
      validateSearchParams({ query, limit, filter: filter as Record<string, unknown>, vectorType });

      // Generate embedding for the query
      const embedding = await embeddingService.generateEmbedding(query);

      // Search using the embedding
      return this.searchByEmbedding<T>(embedding, limit, filter, vectorType);
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
  async searchByTextAndVectorType<T extends QdrantPayload = QdrantPayload>(
    query: string,
    vectorType: string,
    limit: number = 10,
    filter?: QdrantFilter
  ): Promise<Array<{ id: string; score: number; payload: T }>> {
    try {
      // Validate vector type (additional validation beyond searchByText)
      validateVectorType(vectorType);
      return this.searchByText<T>(query, limit, filter, vectorType);
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
  async findSimilarTools<T extends QdrantPayload = QdrantPayload>(
    toolId: string,
    limit: number = 10,
    filter?: QdrantFilter,
    vectorType?: string
  ): Promise<Array<{ id: string; score: number; payload: T }>> {
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Validate input parameters
      validateToolId(toolId);
      if (limit !== undefined) {
        validateSearchParams({ limit, filter: filter as Record<string, unknown>, vectorType });
      }

      // Determine collection name based on vector type and configuration
      const collectionName = getCollectionNameForVectorType(vectorType);
      const useEnhanced = shouldUseEnhancedCollection() && (!vectorType || isEnhancedVectorTypeSupported(vectorType));

      // Get the reference tool's embedding
      const pointId = this.toPointId(toolId);
      const retrieveParams: {
        ids: string[];
        with_payload: boolean;
        with_vector: boolean | string[];
      } = {
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
      const searchFilter: QdrantFilter = {
        ...filter,
        must_not: [
          ...(filter?.must_not || []),
          { key: "id", match: { value: toolId } },
        ],
      };

      return this.searchByEmbedding<T>(embeddingVector, limit, searchFilter, vectorType);
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
  async upsertTool(toolId: string, embedding: number[], payload: QdrantPayload): Promise<void> {
    await this.ensureInitialized();
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
    payload: QdrantPayload,
    vectorType: string
  ): Promise<void> {
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");
    console.log(`[QdrantService] Upserting tool vector for type ${vectorType} with ID ${toolId}`, {
      embedding,
      payload,
    });
    try {
      // Validate upsert parameters
      validateUpsertParams({ toolId, vectors: embedding, payload, vectorType });

      const pointId = this.toPointId(toolId);
      const collectionName = getCollectionName(vectorType);
      console.log(`[QdrantService] Upserting tool vector for type ${vectorType} with ID ${toolId} to collection ${collectionName}`);
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
    payload: QdrantPayload
  ): Promise<void> {
    await this.ensureInitialized();
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
    payload: QdrantPayload
  ): Promise<void> {
    await this.ensureInitialized();
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
    payload: QdrantPayload
  ): Promise<void> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
  async getCollectionInfo(): Promise<QdrantCollectionInfo> {
    await this.ensureInitialized();
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
  async getCollectionInfoForVectorType(vectorType: string): Promise<QdrantCollectionInfo> {
    await this.ensureInitialized();
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
  async getEnhancedCollectionInfo(): Promise<QdrantCollectionInfo> {
    await this.ensureInitialized();
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
  async getAllCollectionsInfo(): Promise<{ [collectionType: string]: QdrantCollectionInfo | { error: string } }> {
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const allInfo: { [collectionType: string]: QdrantCollectionInfo | { error: string } } = {};

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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
  async healthCheck(): Promise<{
    status: string;
    collections: {
      legacy: QdrantCollectionInfo;
      enhanced?: QdrantCollectionInfo | { error: string };
    };
  }> {
    await this.ensureInitialized();
    if (!this.client) {
      throw new Error("Qdrant client not initialized");
    }

    try {
      // Try to get collection info to verify connection
      const legacyInfo = await this.getCollectionInfo();
      const healthData: {
        status: string;
        collections: {
          legacy: QdrantCollectionInfo;
          enhanced?: QdrantCollectionInfo | { error: string };
        };
      } = {
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
    await this.ensureInitialized();
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
      } catch {
        collections[collectionName] = {
          name: collectionName,
          exists: false,
          pointsCount: 0,
          vectorSize: 0,
          distance: 'unknown',
          status: 'red',
          config: {
            params: {
              vectors: { size: 0, distance: 'Cosine' }
            }
          }
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
    await this.ensureInitialized();
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

      // Map optimizer_status to OptimizerStatus
      const optimizerStatus: OptimizerStatus | undefined = collection.optimizer_status
        ? (typeof collection.optimizer_status === 'object'
          ? collection.optimizer_status as OptimizerStatus
          : { ok: true, status: String(collection.optimizer_status) })
        : undefined;

      return {
        name: collectionName,
        exists: true,
        pointsCount: collection.points_count || 0,
        vectorSize: vectorSize,
        distance: distance,
        status: status as 'green' | 'yellow' | 'red',
        optimizerStatus,
        indexedVectorsCount: collection.indexed_vectors_count,
        config: collection.config as CollectionConfig | undefined
      };
    } catch (error) {
      // Handle collection not found errors (case-insensitive)
      if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
        return {
          name: collectionName,
          exists: false,
          pointsCount: 0,
          vectorSize: 0,
          distance: 'unknown',
          status: 'red'
        };
      }
      // Also check for 404 status codes from Qdrant API
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
      // Handle conflict error (collection already exists) - this can happen in race conditions
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes('conflict') || errorMessage.toLowerCase().includes('already exists')) {
        return {
          success: true,
          collection: collectionName,
          operation: 'create',
          message: 'Collection already exists'
        };
      }

      throw new Error(`Failed to create collection ${collectionName}: ${errorMessage}`);
    }
  }

  /**
   * Delete collections (use with caution!)
   */
  async deleteMultiCollections(collectionNames?: string[]): Promise<CollectionOperationResult[]> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
  async searchMultiCollection<T extends QdrantPayload = QdrantPayload>(
    embedding: number[],
    options: {
      collections?: string[];
      limit?: number;
      filter?: QdrantFilter;
      mergeStrategy?: 'weighted' | 'ranked' | 'best';
      timeout?: number;
    } = {}
  ): Promise<{
    results: Array<{
      id: string;
      score: number;
      payload: T;
      collection: string;
      rank: number;
    }>;
    collectionStats: Record<string, { resultCount: number; avgScore: number; searchTime: number }>;
    totalSearchTime: number;
  }> {
    await this.ensureInitialized();
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
        const searchPromise = this.searchByEmbedding<T>(embedding, limit, filter, vectorType);
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
      payload: T;
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
  private mergeSearchResults<T extends QdrantPayload>(
    results: Array<{
      id: string;
      score: number;
      payload: T;
      collection: string;
      rank: number;
    }>,
    strategy: 'weighted' | 'ranked' | 'best',
    limit: number
  ): Array<{
    id: string;
    score: number;
    payload: T;
    collection: string;
    rank: number;
  }> {
    // Remove duplicates (same toolId across collections)
    const uniqueResults = new Map<string, {
      id: string;
      score: number;
      payload: T;
      collection: string;
      rank: number;
    }>();

    for (const result of results) {
      const payload = result.payload;
      const toolId = (typeof payload === 'object' && payload !== null && 'toolId' in payload)
        ? (payload as { toolId?: string }).toolId
        : result.id;

      if (!uniqueResults.has(toolId || result.id)) {
        uniqueResults.set(toolId || result.id, result);
      } else {
        // Merge if tool appears in multiple collections
        const existing = uniqueResults.get(toolId || result.id);
        if (!existing) continue;

        if (strategy === 'best') {
          if (result.score > existing.score) {
            uniqueResults.set(toolId || result.id, result);
          }
        } else if (strategy === 'weighted') {
          // Weight by collection priority and combine scores
          const collectionPriority = this.getCollectionPriority(result.collection);
          const existingPriority = this.getCollectionPriority(existing.collection);

          if (result.score * collectionPriority > existing.score * existingPriority) {
            uniqueResults.set(toolId || result.id, result);
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
  getCollectionConfiguration(): QdrantCollectionConfigService {
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

  // ========================================
  // PAYLOAD-ONLY UPDATE METHODS
  // ========================================

  /**
   * Update only the payload for a tool in a specific collection (no embedding regeneration)
   *
   * This uses Qdrant's set_payload operation to update metadata without
   * affecting the vector embedding. Useful for metadata-only changes.
   *
   * @param toolId - Tool ID (slug-based)
   * @param payload - New payload data to set
   * @param collectionName - Target collection name
   * @returns Success status
   */
  async updatePayloadOnly(
    toolId: string,
    payload: Record<string, unknown>,
    collectionName: string
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const pointId = this.toPointId(toolId);

      // Add timestamp to payload
      const payloadWithTimestamp = {
        ...payload,
        lastPayloadUpdate: new Date().toISOString(),
      };

      // Type assertion needed as setPayload exists at runtime but not in TS definitions
      await (this.client as unknown as {
        setPayload: (collection: string, params: { points: string[]; payload: Record<string, unknown> }) => Promise<void>;
      }).setPayload(collectionName, {
        points: [pointId],
        payload: payloadWithTimestamp,
      });

      console.log(`✅ Updated payload for tool ${toolId} in collection ${collectionName}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to update payload for ${toolId} in ${collectionName}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update payload for a tool across all multi-collection architecture collections
   *
   * @param toolId - Tool ID (slug-based)
   * @param payload - New payload data to set
   * @param collections - Optional specific collections (defaults to all enabled)
   * @returns Results for each collection
   */
  async updatePayloadOnlyMultiCollection(
    toolId: string,
    payload: Record<string, unknown>,
    collections?: string[]
  ): Promise<{
    success: boolean;
    results: Record<string, { success: boolean; error?: string }>;
    successCount: number;
    failedCount: number;
  }> {
    const targetCollections = collections || this.collectionConfig.getEnabledCollectionNames();
    const results: Record<string, { success: boolean; error?: string }> = {};
    let successCount = 0;
    let failedCount = 0;

    console.log(`📝 Updating payload for tool ${toolId} across ${targetCollections.length} collections...`);

    for (const collectionName of targetCollections) {
      const result = await this.updatePayloadOnly(toolId, payload, collectionName);
      results[collectionName] = result;

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    console.log(`✅ Payload update completed: ${successCount} successful, ${failedCount} failed`);

    return {
      success: failedCount === 0,
      results,
      successCount,
      failedCount,
    };
  }

  /**
   * Overwrite entire payload for a tool in a specific collection
   *
   * Unlike updatePayloadOnly which merges, this replaces the entire payload.
   *
   * @param toolId - Tool ID (slug-based)
   * @param payload - Complete new payload
   * @param collectionName - Target collection name
   */
  async overwritePayload(
    toolId: string,
    payload: Record<string, unknown>,
    collectionName: string
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const pointId = this.toPointId(toolId);

      // Type assertion needed as overwritePayload exists at runtime but not in TS definitions
      await (this.client as unknown as {
        overwritePayload: (collection: string, params: { points: string[]; payload: Record<string, unknown> }) => Promise<void>;
      }).overwritePayload(collectionName, {
        points: [pointId],
        payload: {
          ...payload,
          lastPayloadOverwrite: new Date().toISOString(),
        },
      });

      console.log(`✅ Overwrote payload for tool ${toolId} in collection ${collectionName}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to overwrite payload for ${toolId} in ${collectionName}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete specific payload fields for a tool
   *
   * @param toolId - Tool ID (slug-based)
   * @param fields - Array of field names to delete
   * @param collectionName - Target collection name
   */
  async deletePayloadFields(
    toolId: string,
    fields: string[],
    collectionName: string
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const pointId = this.toPointId(toolId);

      // Type assertion needed as deletePayload exists at runtime but not in TS definitions
      await (this.client as unknown as {
        deletePayload: (collection: string, params: { points: string[]; keys: string[] }) => Promise<void>;
      }).deletePayload(collectionName, {
        points: [pointId],
        keys: fields,
      });

      console.log(`✅ Deleted ${fields.length} payload fields for tool ${toolId} in collection ${collectionName}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to delete payload fields for ${toolId} in ${collectionName}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get the current payload for a tool from a specific collection
   *
   * Useful for checking current state before updates.
   *
   * @param toolId - Tool ID (slug-based)
   * @param collectionName - Target collection name
   */
  async getToolPayload(
    toolId: string,
    collectionName: string
  ): Promise<{ success: boolean; payload?: Record<string, unknown>; error?: string }> {
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const pointId = this.toPointId(toolId);

      const result = await this.client.retrieve(collectionName, {
        ids: [pointId],
        with_payload: true,
        with_vector: false,
      });

      if (result.length === 0) {
        return { success: false, error: 'Point not found' };
      }

      return {
        success: true,
        payload: result[0].payload as Record<string, unknown>,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to get payload for ${toolId} in ${collectionName}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if a tool exists in a collection
   *
   * @param toolId - Tool ID (slug-based)
   * @param collectionName - Target collection name
   */
  async toolExistsInCollection(toolId: string, collectionName: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      const pointId = this.toPointId(toolId);

      const result = await this.client.retrieve(collectionName, {
        ids: [pointId],
        with_payload: false,
        with_vector: false,
      });

      return result.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get tool existence status across all collections
   *
   * @param toolId - Tool ID (slug-based)
   */
  async getToolSyncStatus(toolId: string): Promise<Record<string, boolean>> {
    const collections = this.collectionConfig.getEnabledCollectionNames();
    const status: Record<string, boolean> = {};

    for (const collectionName of collections) {
      status[collectionName] = await this.toolExistsInCollection(toolId, collectionName);
    }

    return status;
  }
}

// Export singleton instance
export const qdrantService = new QdrantService();

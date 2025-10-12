import { QdrantClient } from "@qdrant/js-client-rest";
import { connectToQdrant, qdrantConfig } from "@/config/database";
import { embeddingService } from "./embedding.service";
import { createHash } from "crypto";

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
    filter?: Record<string, any>
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      console.log("🔍 Qdrant searchByEmbedding called with:");
      console.log("   - limit:", limit);
      console.log("   - filter:");

      const searchResult = await this.client.search(qdrantConfig.collectionName, {
        vector: embedding,
        limit: limit,
        filter: filter,
        with_payload: true,
      });

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
      throw error;
    }
  }

  /**
   * Search for similar tools based on text query
   */
  async searchByText(
    query: string,
    limit: number = 10,
    filter?: Record<string, any>
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    // Generate embedding for the query
    const embedding = await embeddingService.generateEmbedding(query);

    // Search using the embedding
    return this.searchByEmbedding(embedding, limit, filter);
  }

  /**
   * Find tools similar to a reference tool
   */
  async findSimilarTools(
    toolId: string,
    limit: number = 10,
    filter?: Record<string, any>
  ): Promise<Array<{ id: string; score: number; payload: any }>> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Get the reference tool's embedding
      const pointId = this.toPointId(toolId);
      const retrieveResult = await this.client.retrieve(qdrantConfig.collectionName, {
        ids: [pointId],
        with_payload: false,
        with_vector: true,
      });

      if (retrieveResult.length === 0) {
        throw new Error(`Tool with ID ${toolId} not found`);
      }

      const referenceEmbedding = retrieveResult[0].vector;
      if (!referenceEmbedding || Array.isArray(referenceEmbedding[0])) {
        throw new Error(`No embedding found for tool with ID ${toolId}`);
      }
      const embeddingVector = referenceEmbedding as number[];

      // Search for similar tools, excluding the reference tool (by payload id)
      const searchFilter = {
        ...filter,
        must_not: [
          ...(filter?.must_not || []),
          { key: "id", match: { value: toolId } },
        ],
      };

      return this.searchByEmbedding(embeddingVector, limit, searchFilter);
    } catch (error) {
      console.error("Error finding similar tools:", error);
      throw error;
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
   * Clear all points from the collection (for force re-indexing)
   */
  async clearAllPoints(): Promise<void> {
    if (!this.client) throw new Error("Qdrant client not connected");

    try {
      // Delete all points by using an empty filter (matches all)
      await this.client.delete(qdrantConfig.collectionName, {
        filter: {},
      });
      console.log("Successfully cleared all points from collection");
    } catch (error) {
      console.error("Error clearing all points:", error);
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
   * Health check for Qdrant service
   * Verifies connection and collection availability
   */
  async healthCheck(): Promise<void> {
    if (!this.client) {
      throw new Error("Qdrant client not initialized");
    }

    try {
      // Try to get collection info to verify connection
      await this.getCollectionInfo();
    } catch (error) {
      throw new Error(`Qdrant health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export singleton instance
export const qdrantService = new QdrantService();

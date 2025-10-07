import { QdrantClient } from "@qdrant/js-client-rest";
import { connectToQdrant, qdrantConfig } from "@/config/database";
import { embeddingService } from "./embedding.service";

export class QdrantService {
  private client: QdrantClient | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.client = await connectToQdrant();
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
      const searchResult = await this.client.search(qdrantConfig.collectionName, {
        vector: embedding,
        limit: limit,
        filter: filter,
        with_payload: true,
      });

      return searchResult.map(result => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload,
      }));
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
      const retrieveResult = await this.client.retrieve(qdrantConfig.collectionName, {
        ids: [toolId],
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

      // Search for similar tools, excluding the reference tool
      const searchFilter = {
        ...filter,
        must: [
          ...(filter?.must || []),
          { key: "_id", match: { except: [toolId] } },
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
      await this.client.upsert(qdrantConfig.collectionName, {
        points: [
          {
            id: toolId,
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
      await this.client.delete(qdrantConfig.collectionName, {
        points: [toolId],
      });
    } catch (error) {
      console.error("Error deleting tool:", error);
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
}

// Export singleton instance
export const qdrantService = new QdrantService();
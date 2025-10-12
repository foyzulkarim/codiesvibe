import { ollamaClient, modelConfigs } from "@/config/models";
import { embeddingConfig } from "@/config/constants";
import { connectToQdrant } from "@/config/database";
import { QdrantClient } from "@qdrant/js-client-rest";

// Simple in-memory cache for embeddings
const embeddingCache = new Map<string, number[]>();

export class EmbeddingService {
  private qdrantClient: QdrantClient | null = null;

  constructor() {
    this.initQdrant();
  }

  private async initQdrant(): Promise<void> {
    this.qdrantClient = await connectToQdrant();
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (embeddingConfig.cacheEnabled && embeddingCache.has(text)) {
      return embeddingCache.get(text)!;
    }

    try {
      const response = await ollamaClient.embeddings({
        model: modelConfigs.embedding.model || 'mxbai-embed-large',
        prompt: text,
      });

      const embedding = response.embedding;

      // Cache the result
      if (embeddingConfig.cacheEnabled) {
        embeddingCache.set(text, embedding);

        // Simple cache size management
        if (embeddingCache.size > 1000) {
          const firstKey = embeddingCache.keys().next().value;
          if (firstKey) {
            embeddingCache.delete(firstKey);
          }
        }
      }

      return embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += embeddingConfig.batchSize) {
      const batch = texts.slice(i, i + embeddingConfig.batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);
    }

    return embeddings;
  }

  /**
   * Pre-compute and cache embeddings for enum values
   */
  async precomputeEnumEmbeddings(): Promise<void> {
    if (!this.qdrantClient) {
      throw new Error("Qdrant client not initialized");
    }

    const { enumValues } = await import("@/config/constants");
    const allEnumValues = [
      ...enumValues.categories,
      ...enumValues.functionality,
      ...enumValues.userTypes,
      ...enumValues.interface,
      ...enumValues.deployment,
      ...enumValues.pricingModel,
    ];

    // Generate embeddings for all enum values
    const enumEmbeddings = await this.generateEmbeddings(allEnumValues);

    // Store in a structured format for easy lookup
    const enumEmbeddingMap: Record<string, number[]> = {};
    allEnumValues.forEach((value, index) => {
      enumEmbeddingMap[value] = enumEmbeddings[index];
    });

    // Store in Qdrant for efficient similarity search
    const points = allEnumValues.map((value, index) => ({
      id: value,
      vector: enumEmbeddings[index],
      payload: { type: "enum", value },
    }));

    try {
      await this.qdrantClient.upsert("enum_embeddings", { points });
      console.log("Pre-computed enum embeddings stored in Qdrant");
    } catch (error) {
      console.error("Error storing enum embeddings:", error);
      throw error;
    }
  }

  /**
   * Find similar enum values for a given text
   */
  async findSimilarEnumValues(
    text: string,
    enumType: string,
    limit: number = 5
  ): Promise<Array<{ value: string; score: number }>> {
    if (!this.qdrantClient) {
      throw new Error("Qdrant client not initialized");
    }

    const { enumValues } = await import("@/config/constants");
    const validEnumValues = enumValues[enumType as keyof typeof enumValues];

    if (!validEnumValues) {
      throw new Error(`Unknown enum type: ${enumType}`);
    }

    try {
      // Generate embedding for the input text
      const embedding = await this.generateEmbedding(text);

      // Search for similar enum values
      const searchResult = await this.qdrantClient.search("enum_embeddings", {
        vector: embedding,
        filter: {
          must: [
            { key: "type", match: { value: "enum" } },
            { key: "value", match: { any: validEnumValues } },
          ],
        },
        limit: limit,
        with_payload: true,
      });

      return searchResult.map(result => ({
        value: result.payload?.value as string,
        score: result.score,
      }));
    } catch (error) {
      console.error("Error finding similar enum values:", error);
      throw error;
    }
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    embeddingCache.clear();
  }

  /**
   * Initialize the embedding service
   * Ensures Qdrant client is ready and can generate embeddings
   */
  async initialize(): Promise<void> {
    try {
      // Ensure Qdrant client is initialized
      if (!this.qdrantClient) {
        await this.initQdrant();
      }

      // Test embedding generation with a simple text
      await this.generateEmbedding("test");
    } catch (error) {
      throw new Error(`Embedding service initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();

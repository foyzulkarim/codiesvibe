import { Together } from 'together-ai';
import { embeddingConfig as embeddingConstants } from "#config/constants.js";
import { CONFIG } from '#config/env.config.js';

// Model configuration
const MODEL_CONFIG = {
  model: "togethercomputer/m2-bert-80M-32k-retrieval",
  dimensions: 768,
  provider: "Together AI",
  description: "80M checkpoint of M2-BERT, pretrained with sequence length 32768, fine-tuned for long-context retrieval"
} as const;

// Simple in-memory cache for embeddings
const embeddingCache = new Map<string, number[]>();

export class EmbeddingService {
  private togetherClient: Together;

  constructor() {
    const apiKey = CONFIG.ai.TOGETHER_API_KEY;

    if (!apiKey) {
      console.error('[EmbeddingService] WARNING: TOGETHER_API_KEY is not set! Embedding generation will fail.');
    }

    this.togetherClient = new Together({
      apiKey: apiKey,
    });
  }

  /**
   * Generate embedding for a single text (with caching)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (embeddingConstants.cacheEnabled && embeddingCache.has(text)) {
      return embeddingCache.get(text)!;
    }

    try {
      const response = await this.togetherClient.embeddings.create({
        model: MODEL_CONFIG.model,
        input: text,
      });

      const embedding = response.data[0].embedding;

      // Cache the result
      if (embeddingConstants.cacheEnabled) {
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
      console.error("Error generating embedding with Together AI:", error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts using native batch API
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    const batchSize = embeddingConstants.batchSize || 10;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      // Check cache for each text in batch
      const uncachedTexts: string[] = [];
      const uncachedIndices: number[] = [];
      const batchResults: (number[] | null)[] = new Array(batch.length).fill(null);

      if (embeddingConstants.cacheEnabled) {
        batch.forEach((text, idx) => {
          const cached = embeddingCache.get(text);
          if (cached) {
            batchResults[idx] = cached;
          } else {
            uncachedTexts.push(text);
            uncachedIndices.push(idx);
          }
        });
      } else {
        uncachedTexts.push(...batch);
        uncachedIndices.push(...batch.map((_, idx) => idx));
      }

      // Fetch uncached embeddings
      if (uncachedTexts.length > 0) {
        try {
          const response = await this.togetherClient.embeddings.create({
            model: MODEL_CONFIG.model,
            input: uncachedTexts,
          });

          response.data.forEach((item, idx) => {
            const originalIdx = uncachedIndices[idx];
            batchResults[originalIdx] = item.embedding;

            // Cache the result
            if (embeddingConstants.cacheEnabled) {
              embeddingCache.set(uncachedTexts[idx], item.embedding);
            }
          });
        } catch (error) {
          console.error(`Error processing batch ${i}-${i + batchSize}:`, error);

          // Fallback to individual processing if batch fails
          for (let j = 0; j < uncachedTexts.length; j++) {
            const embedding = await this.generateEmbedding(uncachedTexts[j]);
            batchResults[uncachedIndices[j]] = embedding;
          }
        }
      }

      embeddings.push(...(batchResults as number[][]));
    }

    return embeddings;
  }

  /**
   * Get embedding model information
   */
  getModelInfo() {
    return { ...MODEL_CONFIG };
  }

  /**
   * Test the embedding service
   */
  async test(): Promise<boolean> {
    try {
      const testText = "test embedding generation";
      const embedding = await this.generateEmbedding(testText);

      if (embedding.length !== MODEL_CONFIG.dimensions) {
        throw new Error(`Expected ${MODEL_CONFIG.dimensions} dimensions, got ${embedding.length}`);
      }

      console.log(`✅ Embedding service test passed. Model: ${MODEL_CONFIG.model}, Dimensions: ${embedding.length}`);
      return true;
    } catch (error) {
      console.error("❌ Embedding service test failed:", error);
      return false;
    }
  }

  /**
   * Initialize the embedding service
   */
  async initialize(): Promise<void> {
    const testResult = await this.test();
    if (!testResult) {
      throw new Error("Embedding service initialization failed");
    }
    console.log("✅ Embedding service initialized successfully");
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    embeddingCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: embeddingCache.size,
      enabled: embeddingConstants.cacheEnabled,
    };
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();

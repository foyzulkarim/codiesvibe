import { ChatOpenAI } from '@langchain/openai';
import { Together } from 'together-ai';

/**
 * Production embedding service using Together AI instead of local Ollama
 * This provides better reliability and consistency for production deployment
 */
export class ProductionEmbeddingService {
  private togetherClient: Together;
  private fallbackClient: ChatOpenAI;

  constructor() {
    // Initialize Together AI client
    this.togetherClient = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    });

    // Fallback using OpenAI client for LangChain compatibility
    this.fallbackClient = new ChatOpenAI({
      configuration: {
        baseURL: 'https://api.together.xyz/v1',
        apiKey: process.env.TOGETHER_API_KEY,
      },
      modelName: 'togethercomputer/m2-bert-80M-32k-retrieval',
      temperature: 0,
    });
  }

  /**
   * Generate embedding using Together AI API directly
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.togetherClient.embeddings.create({
        model: "togethercomputer/m2-bert-80M-32k-retrieval",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding with Together AI:", error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await this.togetherClient.embeddings.create({
          model: "togethercomputer/m2-bert-80M-32k-retrieval",
          input: batch,
        });

        const batchEmbeddings = response.data.map(item => item.embedding);
        embeddings.push(...batchEmbeddings);
      } catch (error) {
        console.error(`Error processing batch ${i}-${i + batchSize}:`, error);

        // Fallback to individual processing if batch fails
        for (const text of batch) {
          const embedding = await this.generateEmbedding(text);
          embeddings.push(embedding);
        }
      }
    }

    return embeddings;
  }

  /**
   * Get embedding model information
   */
  getModelInfo() {
    return {
      model: "togethercomputer/m2-bert-80M-32k-retrieval",
      dimensions: 768,
      provider: "Together AI",
      description: "80M checkpoint of M2-BERT, pretrained with sequence length 32768, fine-tuned for long-context retrieval"
    };
  }

  /**
   * Test the embedding service
   */
  async test(): Promise<boolean> {
    try {
      const testText = "test embedding generation";
      const embedding = await this.generateEmbedding(testText);

      // Verify embedding dimensions
      const modelInfo = this.getModelInfo();
      if (embedding.length !== modelInfo.dimensions) {
        throw new Error(`Expected ${modelInfo.dimensions} dimensions, got ${embedding.length}`);
      }

      console.log(`✅ Embedding service test passed. Model: ${modelInfo.model}, Dimensions: ${embedding.length}`);
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
    // Test the connection and model availability
    const testResult = await this.test();
    if (!testResult) {
      throw new Error("Production embedding service initialization failed");
    }

    console.log("✅ Production embedding service initialized successfully");
  }
}

// Export singleton instance
export const productionEmbeddingService = new ProductionEmbeddingService();
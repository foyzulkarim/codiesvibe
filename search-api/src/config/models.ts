import { Ollama } from "ollama";

// Ollama Configuration
export const ollamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  model: process.env.OLLAMA_MODEL || "llama2",
  embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "mxbai-embed-large",
  options: {
    temperature: 0.1,
    topP: 0.9,
    maxTokens: 2048,
  }
};

// Ollama client
export const ollamaClient = new Ollama({
  host: ollamaConfig.baseUrl,
});

// Model-specific configurations
export const modelConfigs = {
  // For intent extraction and synthesis
  intentExtraction: {
    model: ollamaConfig.model,
    options: {
      temperature: 0.1,
      topP: 0.9,
      maxTokens: 1024,
    }
  },

  // For semantic search
  embedding: {
    model: ollamaConfig.embeddingModel,
  },

  // For query planning
  planning: {
    model: ollamaConfig.model,
    options: {
      temperature: 0.2,
      topP: 0.9,
      maxTokens: 1536,
    }
  },

  // For result refinement
  refinement: {
    model: ollamaConfig.model,
    options: {
      temperature: 0.3,
      topP: 0.9,
      maxTokens: 1024,
    }
  }
};
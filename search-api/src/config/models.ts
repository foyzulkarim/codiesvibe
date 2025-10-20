import { Ollama } from "ollama";

// Ollama Configuration
export const ollamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  model: process.env.OLLAMA_MODEL || "qwen3:4b",
  embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "mxbai-embed-large:latest",
  options: {
    temperature: 0.1,
    topP: 0.9,
    maxTokens: 2048,
  }
};

// Ollama client (legacy)
export const ollamaClient = new Ollama({
  host: ollamaConfig.baseUrl,
});

// Embedding configuration (kept for embedding service)
export const embeddingConfig = {
  model: "mxbai-embed-large:latest",
};

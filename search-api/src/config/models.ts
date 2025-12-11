import { Ollama } from "ollama";
import { CONFIG } from './env.config.js';

// Ollama Configuration
export const ollamaConfig = {
  baseUrl: CONFIG.ai.OLLAMA_BASE_URL,
  model: CONFIG.ai.OLLAMA_MODEL,
  embeddingModel: CONFIG.ai.OLLAMA_EMBEDDING_MODEL,
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

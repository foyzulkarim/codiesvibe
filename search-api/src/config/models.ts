import { Ollama } from "ollama";
import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";

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

// LangChain ChatOllama client
export const chatOllamaClient = new ChatOllama({
  baseUrl: ollamaConfig.baseUrl,
  model: ollamaConfig.model,
  temperature: ollamaConfig.options.temperature,
});

// vLLM Configuration
export const vllmConfig = {
  baseUrl: process.env.VLLM_BASE_URL || "http://192.168.4.28:8000",
  model: process.env.VLLM_MODEL || "Qwen/Qwen3-0.6B",
  options: {
    temperature: 0.1,
    top_p: 0.9,
    max_tokens: 2048,
  }
};

// LangChain ChatOpenAI client for vLLM
export const chatVllmClient = new ChatOpenAI({
  apiKey: "not-needed", // vLLM doesn't require an API key
  configuration: {
    baseURL: vllmConfig.baseUrl + "/v1", // vLLM uses OpenAI-compatible API at /v1 endpoint
  },
  modelName: vllmConfig.model,
  temperature: vllmConfig.options.temperature,
  maxTokens: vllmConfig.options.max_tokens,
});

// Model-specific configurations
export const modelConfigs = {
  // For intent extraction and synthesis
  intentExtraction: {
    model: vllmConfig.model,
    options: {
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 1024,
    }
  },
  nerExtraction: {
    model: vllmConfig.model,
    options: {
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 1024,
    }
  },
  referenceExtraction: {
    model: vllmConfig.model,
    options: {
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 1024,
    }
  },

  // For semantic search
  embedding: {
    model: ollamaConfig.embeddingModel,
  },

  // For query planning
  planning: {
    model: vllmConfig.model,
    options: {
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 1536,
    }
  },

  // For result refinement
  refinement: {
    model: vllmConfig.model,
    options: {
      temperature: 0.3,
      top_p: 0.9,
      max_tokens: 1024,
    }
  }
};

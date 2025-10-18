"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelConfigs = exports.chatVllmClient = exports.vllmConfig = exports.ollamaClient = exports.ollamaConfig = void 0;
const ollama_1 = require("ollama");
// import { ChatOllama } from "@langchain/ollama"; // Temporarily commented for build
const openai_1 = require("@langchain/openai");
// Ollama Configuration
exports.ollamaConfig = {
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
exports.ollamaClient = new ollama_1.Ollama({
    host: exports.ollamaConfig.baseUrl,
});
// LangChain ChatOllama client
// export const chatOllamaClient = new ChatOllama({
//   baseUrl: ollamaConfig.baseUrl,
//   model: ollamaConfig.model,
//   temperature: ollamaConfig.options.temperature,
// });
// vLLM Configuration
exports.vllmConfig = {
    baseUrl: process.env.VLLM_BASE_URL || "http://192.168.4.28:8000",
    model: process.env.VLLM_MODEL || "Qwen/Qwen3-0.6B",
    options: {
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 2048,
    }
};
// LangChain ChatOpenAI client for vLLM
exports.chatVllmClient = new openai_1.ChatOpenAI({
    apiKey: "not-needed", // vLLM doesn't require an API key
    configuration: {
        baseURL: exports.vllmConfig.baseUrl + "/v1", // vLLM uses OpenAI-compatible API at /v1 endpoint
    },
    modelName: exports.vllmConfig.model,
    temperature: exports.vllmConfig.options.temperature,
    maxTokens: exports.vllmConfig.options.max_tokens,
});
// Model-specific configurations
exports.modelConfigs = {
    // For intent extraction and synthesis
    intentExtraction: {
        model: exports.vllmConfig.model,
        options: {
            temperature: 0.1,
            top_p: 0.9,
            max_tokens: 1024,
        }
    },
    nerExtraction: {
        model: exports.vllmConfig.model,
        options: {
            temperature: 0.1,
            top_p: 0.9,
            max_tokens: 1024,
        }
    },
    referenceExtraction: {
        model: exports.vllmConfig.model,
        options: {
            temperature: 0.1,
            top_p: 0.9,
            max_tokens: 1024,
        }
    },
    // For semantic search
    embedding: {
        model: exports.ollamaConfig.embeddingModel,
    },
    // For query planning
    planning: {
        model: exports.vllmConfig.model,
        options: {
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 1536,
        }
    },
    // For result refinement
    refinement: {
        model: exports.vllmConfig.model,
        options: {
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: 1024,
        }
    }
};

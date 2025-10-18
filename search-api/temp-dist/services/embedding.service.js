"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.embeddingService = exports.EmbeddingService = void 0;
const models_1 = require("@/config/models");
const constants_1 = require("@/config/constants");
const database_1 = require("@/config/database");
// Simple in-memory cache for embeddings
const embeddingCache = new Map();
class EmbeddingService {
    constructor() {
        this.qdrantClient = null;
        this.initQdrant();
    }
    async initQdrant() {
        this.qdrantClient = await (0, database_1.connectToQdrant)();
    }
    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(text) {
        // Check cache first
        if (constants_1.embeddingConfig.cacheEnabled && embeddingCache.has(text)) {
            return embeddingCache.get(text);
        }
        try {
            const response = await models_1.ollamaClient.embeddings({
                model: models_1.modelConfigs.embedding.model || 'mxbai-embed-large',
                prompt: text,
            });
            const embedding = response.embedding;
            // Cache the result
            if (constants_1.embeddingConfig.cacheEnabled) {
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
        }
        catch (error) {
            console.error("Error generating embedding:", error);
            throw error;
        }
    }
    /**
     * Generate embeddings for multiple texts in batches
     */
    async generateEmbeddings(texts) {
        const embeddings = [];
        // Process in batches
        for (let i = 0; i < texts.length; i += constants_1.embeddingConfig.batchSize) {
            const batch = texts.slice(i, i + constants_1.embeddingConfig.batchSize);
            const batchPromises = batch.map(text => this.generateEmbedding(text));
            const batchResults = await Promise.all(batchPromises);
            embeddings.push(...batchResults);
        }
        return embeddings;
    }
    /**
     * Pre-compute and cache embeddings for enum values
     */
    async precomputeEnumEmbeddings() {
        if (!this.qdrantClient) {
            throw new Error("Qdrant client not initialized");
        }
        const { enumValues } = await Promise.resolve().then(() => __importStar(require("@/config/constants")));
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
        const enumEmbeddingMap = {};
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
        }
        catch (error) {
            console.error("Error storing enum embeddings:", error);
            throw error;
        }
    }
    /**
     * Find similar enum values for a given text
     */
    async findSimilarEnumValues(text, enumType, limit = 5) {
        if (!this.qdrantClient) {
            throw new Error("Qdrant client not initialized");
        }
        const { enumValues } = await Promise.resolve().then(() => __importStar(require("@/config/constants")));
        const validEnumValues = enumValues[enumType];
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
                value: result.payload?.value,
                score: result.score,
            }));
        }
        catch (error) {
            console.error("Error finding similar enum values:", error);
            throw error;
        }
    }
    /**
     * Clear the embedding cache
     */
    clearCache() {
        embeddingCache.clear();
    }
    /**
     * Initialize the embedding service
     * Ensures Qdrant client is ready and can generate embeddings
     */
    async initialize() {
        try {
            // Ensure Qdrant client is initialized
            if (!this.qdrantClient) {
                await this.initQdrant();
            }
            // Test embedding generation with a simple text
            await this.generateEmbedding("test");
        }
        catch (error) {
            throw new Error(`Embedding service initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.EmbeddingService = EmbeddingService;
// Export singleton instance
exports.embeddingService = new EmbeddingService();

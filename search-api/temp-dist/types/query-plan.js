"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryPlanSchema = void 0;
const zod_1 = require("zod");
/**
 * Structured retrieval plan generated from IntentState, guiding how to query hybrid data sources (Qdrant, MongoDB, APIs)
 */
exports.QueryPlanSchema = zod_1.z.object({
    strategy: zod_1.z.enum([
        "hybrid",
        "multi-vector",
        "vector-only",
        "metadata-only",
        "semantic-kg"
    ]).describe("High-level retrieval mode to use based on intent complexity and filters"),
    vectorSources: zod_1.z.array(zod_1.z.object({
        collection: zod_1.z.string().describe("Vector collection name"),
        embeddingType: zod_1.z.string().describe("Type of embedding to use"),
        queryVectorSource: zod_1.z.enum([
            "query_text",
            "reference_tool_embedding",
            "semantic_variant"
        ]).describe("Source for the query vector"),
        topK: zod_1.z.number().min(1).max(200).describe("Number of results to retrieve")
    })).optional().describe("List of vector collections and embedding types to query"),
    structuredSources: zod_1.z.array(zod_1.z.object({
        source: zod_1.z.string().describe("Data source name"),
        filters: zod_1.z.array(zod_1.z.object({
            field: zod_1.z.string(),
            operator: zod_1.z.string(),
            value: zod_1.z.any()
        })).optional().describe("Filters to apply"),
        limit: zod_1.z.number().min(1).max(200).optional().describe("Maximum results to return")
    })).optional().describe("Structured databases or APIs with filters to apply"),
    reranker: zod_1.z.object({
        type: zod_1.z.enum(["cross-encoder", "LTR", "none"]).describe("Reranking strategy"),
        model: zod_1.z.string().optional().describe("Reranker model name"),
        maxCandidates: zod_1.z.number().optional().describe("Maximum candidates for reranking")
    }).optional().describe("Optional reranking strategy configuration"),
    fusion: zod_1.z.enum([
        "rrf",
        "weighted_sum",
        "concat",
        "none"
    ]).optional().describe("Fusion method for combining scores across sources"),
    maxRefinementCycles: zod_1.z.number().min(0).max(5).optional().describe("How many refinement iterations to allow if low confidence"),
    explanation: zod_1.z.string().optional().describe("Natural-language rationale for why this plan is suitable"),
    confidence: zod_1.z.number().min(0).max(1).describe("Confidence in this query plan's effectiveness")
}).describe("Structured retrieval plan for hybrid search");

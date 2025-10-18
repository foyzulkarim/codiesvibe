"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryExecutorOutputSchema = exports.CandidateSchema = void 0;
const zod_1 = require("zod");
/**
 * Represents a single retrieval result (AI tool or entity) with normalized scoring
 */
exports.CandidateSchema = zod_1.z.object({
    id: zod_1.z.string().describe("Canonical tool ID"),
    source: zod_1.z.enum([
        "qdrant",
        "mongodb",
        "api",
        "fusion"
    ]).describe("Source where this candidate was retrieved from"),
    score: zod_1.z.number().min(0).max(1).describe("Normalized relevance score"),
    metadata: zod_1.z.object({
        name: zod_1.z.string().describe("Tool name"),
        category: zod_1.z.string().optional().describe("Tool category"),
        pricing: zod_1.z.string().optional().describe("Pricing model"),
        platform: zod_1.z.string().optional().describe("Platform/interface"),
        features: zod_1.z.array(zod_1.z.string()).optional().describe("Key features"),
        description: zod_1.z.string().optional().describe("Tool description")
    }).describe("Key metadata about the tool"),
    embeddingVector: zod_1.z.array(zod_1.z.number()).nullable().optional().describe("Optional embedding vector returned by Qdrant"),
    provenance: zod_1.z.object({
        collection: zod_1.z.string().optional().describe("Source collection"),
        queryVectorSource: zod_1.z.string().optional().describe("Query vector source used"),
        filtersApplied: zod_1.z.array(zod_1.z.string()).optional().describe("Filters that were applied")
    }).optional().describe("Provenance tracking information")
}).describe("Search result candidate with normalized scoring");
/**
 * Output from QueryExecutor node containing candidates and execution statistics
 */
exports.QueryExecutorOutputSchema = zod_1.z.object({
    candidates: zod_1.z.array(exports.CandidateSchema).describe("Array of search result candidates"),
    executionStats: zod_1.z.object({
        vectorQueriesExecuted: zod_1.z.number().describe("Number of vector queries executed"),
        structuredQueriesExecuted: zod_1.z.number().describe("Number of structured queries executed"),
        fusionMethod: zod_1.z.string().optional().describe("Fusion method used"),
        latencyMs: zod_1.z.number().describe("Total execution time in milliseconds")
    }).describe("Execution performance statistics"),
    confidence: zod_1.z.number().min(0).max(1).optional().describe("Overall confidence in results")
}).describe("QueryExecutor node output");

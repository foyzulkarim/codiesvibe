import { z } from "zod";

/**
 * Represents a single retrieval result (AI tool or entity) with normalized scoring
 */
export const CandidateSchema = z.object({
  id: z.string().describe("Canonical tool ID"),

  source: z.enum([
    "qdrant",
    "mongodb",
    "api",
    "fusion"
  ]).describe("Source where this candidate was retrieved from"),

  score: z.number().min(0).max(1).describe("Normalized relevance score"),

  metadata: z.object({
    name: z.string().describe("Tool name"),
    category: z.string().optional().describe("Tool category"),
    pricing: z.string().optional().describe("Pricing model"),
    platform: z.string().optional().describe("Platform/interface"),
    features: z.array(z.string()).optional().describe("Key features"),
    description: z.string().optional().describe("Tool description")
  }).describe("Key metadata about the tool"),

  embeddingVector: z.array(z.number()).nullable().optional().describe(
    "Optional embedding vector returned by Qdrant"
  ),

  provenance: z.object({
    collection: z.string().optional().describe("Source collection"),
    queryVectorSource: z.string().optional().describe("Query vector source used"),
    filtersApplied: z.array(z.string()).optional().describe("Filters that were applied")
  }).optional().describe("Provenance tracking information")
}).describe("Search result candidate with normalized scoring");

export type Candidate = z.infer<typeof CandidateSchema>;

/**
 * Output from QueryExecutor node containing candidates and execution statistics
 */
export const QueryExecutorOutputSchema = z.object({
  candidates: z.array(CandidateSchema).describe("Array of search result candidates"),
  executionStats: z.object({
    vectorQueriesExecuted: z.number().describe("Number of vector queries executed"),
    structuredQueriesExecuted: z.number().describe("Number of structured queries executed"),
    fusionMethod: z.string().optional().describe("Fusion method used"),
    latencyMs: z.number().describe("Total execution time in milliseconds")
  }).describe("Execution performance statistics"),
  confidence: z.number().min(0).max(1).optional().describe("Overall confidence in results")
}).describe("QueryExecutor node output");

export type QueryExecutorOutput = z.infer<typeof QueryExecutorOutputSchema>;

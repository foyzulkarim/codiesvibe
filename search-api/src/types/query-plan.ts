import { z } from "zod";

/**
 * Structured retrieval plan generated from IntentState, guiding how to query hybrid data sources (Qdrant, MongoDB, APIs)
 */
export const QueryPlanSchema = z.object({
  strategy: z.enum([
    "hybrid",
    "multi-vector",
    "vector-only",
    "metadata-only",
    "semantic-kg"
  ]).describe(
    "High-level retrieval mode to use based on intent complexity and filters"
  ),

  vectorSources: z.array(z.object({
    collection: z.string().describe("Vector collection name"),
    embeddingType: z.string().describe("Type of embedding to use"),
    queryVectorSource: z.enum([
      "query_text",
      "reference_tool_embedding",
      "semantic_variant"
    ]).describe("Source for the query vector"),
    topK: z.number().min(1).max(200).describe("Number of results to retrieve")
  })).optional().describe(
    "List of vector collections and embedding types to query"
  ),

  structuredSources: z.array(z.object({
    source: z.string().describe("Data source name"),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.any()
    })).optional().describe("Filters to apply"),
    limit: z.number().min(1).max(200).optional().describe("Maximum results to return")
  })).optional().describe(
    "Structured databases or APIs with filters to apply"
  ),

  reranker: z.object({
    type: z.enum(["cross-encoder", "LTR", "none"]).describe("Reranking strategy"),
    model: z.string().optional().describe("Reranker model name"),
    maxCandidates: z.number().optional().describe("Maximum candidates for reranking")
  }).optional().describe(
    "Optional reranking strategy configuration"
  ),

  fusion: z.enum([
    "rrf",
    "weighted_sum",
    "concat",
    "none"
  ]).optional().describe(
    "Fusion method for combining scores across sources"
  ),

  maxRefinementCycles: z.number().min(0).max(5).optional().describe(
    "How many refinement iterations to allow if low confidence"
  ),

  explanation: z.string().optional().describe(
    "Natural-language rationale for why this plan is suitable"
  ),

  confidence: z.number().min(0).max(1).describe(
    "Confidence in this query plan's effectiveness"
  )
}).describe("Structured retrieval plan for hybrid search");

export type QueryPlan = z.infer<typeof QueryPlanSchema>;
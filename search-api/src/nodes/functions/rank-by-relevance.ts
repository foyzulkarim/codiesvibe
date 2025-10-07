import { State } from "@/types/state";
import { embeddingService } from "@/services/embedding.service";
import { cosineSimilarity } from "@/utils/cosine-similarity";

interface RankByRelevanceParams {
  tools: any[];
  query: string;
  strategy?: "semantic" | "hybrid" | "popularity";
  semanticWeight?: number; // For hybrid strategy
  popularityWeight?: number; // For hybrid strategy
}

interface RankByRelevanceResult {
  tools: any[];
  rankingStrategy: string;
  originalCount: number;
}

/**
 * Rank tools by relevance to the query
 */
export async function rankByRelevance(
  params: RankByRelevanceParams
): Promise<RankByRelevanceResult> {
  const {
    tools,
    query,
    strategy = "semantic",
    semanticWeight = 0.7,
    popularityWeight = 0.3
  } = params;

  if (!tools || tools.length === 0 || !query) {
    return {
      tools: tools || [],
      rankingStrategy: strategy,
      originalCount: tools?.length || 0
    };
  }

  const originalCount = tools.length;

  try {
    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Calculate relevance scores for each tool
    const toolsWithScores = await Promise.all(
      tools.map(async (tool) => {
        let relevanceScore = 0;

        if (strategy === "semantic" || strategy === "hybrid") {
          // Calculate semantic similarity
          let semanticScore = 0;

          // If tool already has a similarity score, use it
          if (tool.similarityScore !== undefined) {
            semanticScore = tool.similarityScore;
          } else {
            // Generate embedding for tool description and calculate similarity
            const toolText = `${tool.name} ${tool.description || ""} ${tool.tagline || ""}`;
            const toolEmbedding = await embeddingService.generateEmbedding(toolText);
            semanticScore = cosineSimilarity(queryEmbedding, toolEmbedding);
          }

          if (strategy === "semantic") {
            relevanceScore = semanticScore;
          } else {
            // Hybrid strategy combines semantic and popularity
            const popularityScore = tool.popularity || tool.rating || tool.reviewCount || 0;
            // Normalize popularity score (assuming max value of 100 for rating)
            const normalizedPopularity = Math.min((popularityScore as number) / 100, 1);

            relevanceScore = semanticScore * semanticWeight + normalizedPopularity * popularityWeight;
          }
        } else if (strategy === "popularity") {
          // Use only popularity metrics
          const popularityScore = tool.popularity || tool.rating || tool.reviewCount || 0;
          // Normalize popularity score (assuming max value of 100 for rating)
          relevanceScore = Math.min((popularityScore as number) / 100, 1);
        }

        return {
          ...tool,
          relevanceScore
        };
      })
    );

    // Sort by relevance score (descending)
    toolsWithScores.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      tools: toolsWithScores,
      rankingStrategy: strategy,
      originalCount
    };
  } catch (error) {
    console.error("Error in rankByRelevance:", error);
    throw error;
  }
}

/**
 * LangGraph node function for rankByRelevance
 */
export async function rankByRelevanceNode(state: State): Promise<Partial<State>> {
  const { query, preprocessedQuery, queryResults, intent } = state;

  // Use semantic query from intent or fall back to preprocessed query
  const rankingQuery = intent.semanticQuery || preprocessedQuery || query;

  // Get tools to rank
  const toolsToRank = queryResults || [];

  if (toolsToRank.length === 0) {
    return {
      queryResults: []
    };
  }

  // Determine ranking strategy based on intent
  let strategy: "semantic" | "hybrid" | "popularity" = "semantic";

  // If user is looking for popular tools, use hybrid or popularity strategy
  if (intent.keywords?.some(keyword =>
    ["popular", "trending", "best", "top"].includes(keyword.toLowerCase())
  )) {
    strategy = "hybrid";
  }

  const result = await rankByRelevance({
    tools: toolsToRank,
    query: rankingQuery,
    strategy
  });

  return {
    queryResults: result.tools
  };
}
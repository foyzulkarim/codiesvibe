import { State } from "@/types/state";
import { qdrantService } from "@/services/qdrant.service";
import { mongoDBService } from "@/services/mongodb.service";

interface SemanticSearchParams {
  query: string;
  limit?: number;
  filters?: Record<string, any>;
  includePayload?: boolean;
}

interface SemanticSearchResult {
  tools: any[];
  similarities: Array<{ id: string; score: number }>;
}

/**
 * Perform semantic search using embeddings
 */
export async function semanticSearch(
  params: SemanticSearchParams
): Promise<SemanticSearchResult> {
  const { query, limit = 10, filters = {}, includePayload = true } = params;

  if (!query) {
    return { tools: [], similarities: [] };
  }

  try {
    // Search for similar tools using Qdrant
    const searchResults = await qdrantService.searchByText(
      query,
      limit,
      filters
    );

    // Extract tool IDs and similarities
    const toolIds = searchResults.map(result => result.id);
    const similarities = searchResults.map(result => ({
      id: result.id,
      score: result.score,
    }));

    // If we don't need full payload, return early
    if (!includePayload) {
      return { tools: [], similarities };
    }

    // Get full tool details from MongoDB
    const tools = await mongoDBService.getToolsByIds(toolIds);

    // Merge similarity scores into tool objects
    const toolsWithScores = tools.map(tool => {
      const similarity = similarities.find(s => s.id === tool._id.toString());
      return {
        ...tool,
        similarityScore: similarity?.score || 0,
      };
    });

    // Sort by similarity score (descending)
    toolsWithScores.sort((a, b) => b.similarityScore - a.similarityScore);

    return {
      tools: toolsWithScores,
      similarities
    };
  } catch (error) {
    console.error("Error in semanticSearch:", error);
    throw error;
  }
}

/**
 * LangGraph node function for semanticSearch
 */
export async function semanticSearchNode(state: State): Promise<Partial<State>> {
  const { intent, preprocessedQuery } = state;

  // Use semantic query from intent or fall back to preprocessed query
  const query = intent.semanticQuery || preprocessedQuery || state.query;

  // Build filters from intent
  const filters: Record<string, any> = {};

  if (intent.categories && intent.categories.length > 0) {
    filters.must = [
      ...(filters.must || []),
      { key: "categories", match: { any: intent.categories } }
    ];
  }

  if (intent.interface && intent.interface.length > 0) {
    filters.must = [
      ...(filters.must || []),
      { key: "interface", match: { any: intent.interface } }
    ];
  }

  if (intent.deployment && intent.deployment.length > 0) {
    filters.must = [
      ...(filters.must || []),
      { key: "deployment", match: { any: intent.deployment } }
    ];
  }

  if (intent.functionality && intent.functionality.length > 0) {
    filters.must = [
      ...(filters.must || []),
      { key: "functionality", match: { any: intent.functionality } }
    ];
  }

  if (intent.userTypes && intent.userTypes.length > 0) {
    filters.must = [
      ...(filters.must || []),
      { key: "userTypes", match: { any: intent.userTypes } }
    ];
  }

  const result = await semanticSearch({
    query,
    limit: 10,
    filters,
    includePayload: true
  });

  return {
    queryResults: result.tools,
    executionResults: [...(state.executionResults || []), result]
  };
}
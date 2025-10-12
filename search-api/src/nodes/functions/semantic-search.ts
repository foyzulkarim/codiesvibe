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
    console.log(`🔍 Semantic search starting with query: "${query}", filters:`);
    
    // Search for similar tools using Qdrant
    const primaryResults = await qdrantService.searchByText(
      query,
      limit,
      filters
    );
    
    console.log(`📊 Primary search results count: ${primaryResults.length}`);

    // Fallback: if filtered results are empty, retry without filters
    const shouldFallback = primaryResults.length === 0 && filters && Object.keys(filters).length > 0;
    console.log(`🔄 Should fallback to unfiltered search: ${shouldFallback}`);
    
    const searchResults = shouldFallback
      ? await qdrantService.searchByText(query, limit)
      : primaryResults;
      
    if (shouldFallback) {
      console.log(`🆘 Fallback search results count: ${searchResults.length}`);
    }

    // Extract tool IDs and similarities
    // Debug: Log the first search result to understand the payload structure
    if (searchResults.length > 0) {
      console.log(`🔍 First search result structure:`);
    }
    
    // Use payload.id (original MongoDB ObjectId) instead of result.id (Qdrant point UUID)
    console.log(`🔍 Debug: Extracting tool IDs from ${searchResults.length} results`);
    const toolIds = searchResults.map((result, index) => {
      const payloadId = result.payload?.id;
      const fallbackId = result.id;
      console.log(`🔍 Result ${index}: payload.id = ${payloadId}, result.id = ${fallbackId}`);
      return payloadId || fallbackId;
    });
    const similarities = searchResults.map(result => ({
      id: result.payload?.id,
      score: result.score,
    })).filter(similarity => similarity.id);

    console.log(`🔍 Tool IDs from Qdrant (from payload):`, toolIds);

    // If we don't need full payload, return early
    if (!includePayload) {
      return { tools: [], similarities };
    }

    // Get full tool details from MongoDB
    const tools = await mongoDBService.getToolsByIds(toolIds);
    console.log(`🗄️ Tools retrieved from MongoDB: ${tools.length}`);

    // Merge similarity scores into tool objects
    const toolsWithScores = tools.map(tool => {
      const similarity = similarities.find(s => s.id === tool._id.toString() || s.id === tool.id);
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

  // Build filters from intent - use "should" for flexible matching to allow tools that match ANY criteria
  const filters: Record<string, any> = {};
  const shouldFilters: any[] = [];

  if (intent.categories && intent.categories.length > 0) {
    shouldFilters.push({ key: "categories", match: { any: intent.categories } });
  }

  if (intent.interface && intent.interface.length > 0) {
    shouldFilters.push({ key: "interface", match: { any: intent.interface } });
  }

  if (intent.deployment && intent.deployment.length > 0) {
    shouldFilters.push({ key: "deployment", match: { any: intent.deployment } });
  }

  if (intent.functionality && intent.functionality.length > 0) {
    shouldFilters.push({ key: "functionality", match: { any: intent.functionality } });
  }

  if (intent.userTypes && intent.userTypes.length > 0) {
    shouldFilters.push({ key: "userTypes", match: { any: intent.userTypes } });
  }

  // Use "should" for flexible matching - tools that match ANY of the specified criteria will be returned
  if (shouldFilters.length > 0) {
    filters.should = shouldFilters;
  }

  console.log("🔍 Semantic search filters (using 'should' for flexible matching):");

  const result = await semanticSearch({
    query,
    limit: 10,
    filters,
    includePayload: true
  });

  console.log(`🔍 Semantic search node returning ${result.tools.length} tools to state`);

  return {
    queryResults: result.tools,
    executionResults: [...(state.executionResults || []), result]
  };
}
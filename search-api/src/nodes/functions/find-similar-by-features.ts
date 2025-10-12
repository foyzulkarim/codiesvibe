import { State } from "@/types/state";
import { qdrantService } from "@/services/qdrant.service";
import { mongoDBService } from "@/services/mongodb.service";

interface FindSimilarByFeaturesParams {
  referenceToolId: string;
  limit?: number;
  filters?: Record<string, any>;
}

interface FindSimilarByFeaturesResult {
  tools: any[];
  similarities: Array<{ id: string; score: number }>;
  referenceTool: any;
}

/**
 * Find tools similar to a reference tool based on features
 */
export async function findSimilarByFeatures(
  params: FindSimilarByFeaturesParams
): Promise<FindSimilarByFeaturesResult> {
  const { referenceToolId, limit = 10, filters = {} } = params;

  if (!referenceToolId) {
    return { tools: [], similarities: [], referenceTool: undefined };
  }

  try {
    // Get the reference tool details
    const referenceTools = await mongoDBService.getToolsByIds([referenceToolId]);

    if (referenceTools.length === 0) {
      throw new Error(`Reference tool with ID ${referenceToolId} not found`);
    }

    const referenceTool = referenceTools[0];

    // Find similar tools using Qdrant
    const similarTools = await qdrantService.findSimilarTools(
      referenceToolId,
      limit,
      filters
    );

    // Extract tool IDs and similarities
    const toolIds = similarTools.map(result => result.id);
    const similarities = similarTools.map(result => ({
      id: result.id,
      score: result.score,
    }));

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
      similarities,
      referenceTool
    };
  } catch (error) {
    console.error("Error in findSimilarByFeatures:", error);
    throw error;
  }
}

/**
 * LangGraph node function for findSimilarByFeatures
 */
export async function findSimilarByFeaturesNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;

  // For comparative queries, use the reference tool
  if (intent.isComparative && intent.referenceTool) {
    // First, try to find the reference tool by name
    const referenceTools = await mongoDBService.searchToolsByName(intent.referenceTool, 1);

    if (referenceTools.length > 0) {
      const referenceToolId = referenceTools[0]._id.toString();

      // Build filters from intent (excluding the reference tool)
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

      const result = await findSimilarByFeatures({
        referenceToolId,
        limit: 10,
        filters
      });

      return {
        queryResults: result.tools,
        executionResults: [...(state.executionResults || []), result]
      };
    }
  }

  // If no reference tool found or not a comparative query, return empty results
  return {
    queryResults: [],
    executionResults: [...(state.executionResults || []), {
      tools: [],
      similarities: [],
      referenceTool: undefined
    }]
  };
}
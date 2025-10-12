import { State } from "@/types/state";
import { mongoDBService } from "@/services/mongodb.service";
import Fuse from "fuse.js";

interface LookupByNameParams {
  toolNames: string[];
  fuzzy?: boolean;
  limit?: number;
}

interface LookupByNameResult {
  tools: any[];
  exactMatches: any[];
  fuzzyMatches: any[];
}

/**
 * Find tools by name using exact and fuzzy matching
 */
export async function lookupByName(
  params: LookupByNameParams
): Promise<LookupByNameResult> {
  const { toolNames, fuzzy = true, limit = 10 } = params;

  if (!toolNames || toolNames.length === 0) {
    return { tools: [], exactMatches: [], fuzzyMatches: [] };
  }

  try {
    // First, try exact matches
    const exactMatches = await mongoDBService.getToolsByName(toolNames);

    // If we have enough exact matches or fuzzy matching is disabled, return early
    if (exactMatches.length >= limit || !fuzzy) {
      return {
        tools: exactMatches.slice(0, limit),
        exactMatches,
        fuzzyMatches: []
      };
    }

    // For fuzzy matching, get all tools and use Fuse.js
    const allTools = await mongoDBService.getAllTools();

    // Configure Fuse.js for fuzzy searching
    const fuseOptions = {
      keys: ["name", "tagline", "description"],
      threshold: 0.4, // Lower threshold = more strict matching
      includeScore: true,
      minMatchCharLength: 2,
    };

    const fuse = new Fuse(allTools, fuseOptions);

    // Search for each tool name
    const fuzzyResults: any[] = [];
    const remainingLimit = limit - exactMatches.length;

    for (const toolName of toolNames) {
      if (fuzzyResults.length >= remainingLimit) break;

      const results = fuse.search(toolName);

      // Add results that aren't already in exact matches
      for (const result of results) {
        if (fuzzyResults.length >= remainingLimit) break;

        const isAlreadyFound = exactMatches.some(
          exact => exact._id.toString() === result.item._id.toString()
        );

        const isAlreadyInFuzzy = fuzzyResults.some(
          fuzzy => fuzzy._id.toString() === result.item._id.toString()
        );

        if (!isAlreadyFound && !isAlreadyInFuzzy) {
          fuzzyResults.push({
            ...result.item,
            fuzzyScore: result.score,
          });
        }
      }
    }

    // Combine results
    const allResults = [...exactMatches, ...fuzzyResults].slice(0, limit);

    return {
      tools: allResults,
      exactMatches,
      fuzzyMatches: fuzzyResults
    };
  } catch (error) {
    console.error("Error in lookupByName:", error);
    throw error;
  }
}

/**
 * LangGraph node function for lookupByName
 */
export async function lookupByNameNode(state: State): Promise<Partial<State>> {
  const { intent } = state;

  if (!intent.toolNames || intent.toolNames.length === 0) {
    return {
      queryResults: [],
      executionResults: [...(state.executionResults || []), { tools: [] }]
    };
  }

  const result = await lookupByName({
    toolNames: intent.toolNames,
    fuzzy: true,
    limit: 10
  });

  return {
    queryResults: result.tools,
    executionResults: [...(state.executionResults || []), result]
  };
}
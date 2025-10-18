import { StateAnnotation } from "@/types/state";
import { mongoDBService } from "@/services/mongodb.service";

interface Tool {
  _id: string;
  name: string;
  [key: string]: any;
}

/**
 * Match query terms to known tool names using fuzzy matching
 */
export async function fuzzyMatcherNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;

  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        fuzzyMatches: []
      }
    };
  }

  try {
    // Get all tools from the database
    const allTools = await getAllTools();

    // Configure Fuse.js for fuzzy searching
    const fuseOptions = {
      keys: ["name"],
      threshold: 0.4, // Lower threshold = more strict matching
      includeScore: true,
      minMatchCharLength: 2,
    };

    // Create a Fuse instance with tool names
    const fuse = new Fuse(allTools, fuseOptions);

    // Split the query into terms and search for each
    const queryTerms = preprocessedQuery.split(/\s+/).filter(term => term.length > 2);
    const fuzzyMatches: Array<{ name: string; score: number; toolId: string }> = [];

    for (const term of queryTerms) {
      const results = fuse.search(term);

      // Add top results
      for (const result of results.slice(0, 2)) {
        // Check if we already have this tool
        const existingMatch = fuzzyMatches.find(
          match => match.toolId === result.item._id.toString()
        );

        if (!existingMatch) {
          fuzzyMatches.push({
            name: result.item.name,
            score: result.score || 0,
            toolId: result.item._id.toString()
          });
        }
      }
    }

    // Sort by score (lower is better in Fuse.js)
    fuzzyMatches.sort((a, b) => a.score - b.score);

    return {
      extractionSignals: {
        ...state.extractionSignals,
        fuzzyMatches
      }
    };
  } catch (error) {
    console.error("Error in fuzzyMatcherNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        fuzzyMatches: []
      }
    };
  }
}

// Implement actual MongoDB service
async function getAllTools(): Promise<Tool[]> {
  return await mongoDBService.getAllTools();
}

// Mock Fuse class - in real implementation this would be from fuse.js
class Fuse<T> {
  private items: T[];
  private options: any;

  constructor(items: T[], options: any) {
    this.items = items;
    this.options = options;
  }

  search(query: string): Array<{ item: T; score: number }> {
    // Simple mock fuzzy matching
    const results: Array<{ item: T; score: number }> = [];

    for (const item of this.items) {
      const name = (item as any).name.toLowerCase();
      const q = query.toLowerCase();

      if (name.includes(q) || q.includes(name)) {
        results.push({
          item,
          score: 0.1 // Perfect match
        });
      } else if (this.levenshteinDistance(name, q) <= 2) {
        results.push({
          item,
          score: 0.3 // Fuzzy match
        });
      }
    }

    return results.sort((a, b) => a.score - b.score);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}
import { State } from "@/types/state";

interface MergeAndDedupeParams {
  resultSets: Array<{
    tools: any[];
    weight?: number;
  }>;
  strategy?: "weighted" | "best" | "diverse";
  limit?: number;
}

interface MergeAndDedupeResult {
  tools: any[];
  mergeStrategy: string;
  originalTotalCount: number;
  finalCount: number;
}

/**
 * Merge and deduplicate multiple result sets
 */
export async function mergeAndDedupe(
  params: MergeAndDedupeParams
): Promise<MergeAndDedupeResult> {
  const { resultSets, strategy = "weighted", limit = 20 } = params;

  if (!resultSets || resultSets.length === 0) {
    return {
      tools: [],
      mergeStrategy: strategy,
      originalTotalCount: 0,
      finalCount: 0
    };
  }

  // Calculate original total count
  const originalTotalCount = resultSets.reduce(
    (total, resultSet) => total + (resultSet.tools?.length || 0),
    0
  );

  try {
    // Create a map to deduplicate by tool ID
    const toolMap = new Map();

    // Process each result set
    resultSets.forEach((resultSet, resultSetIndex) => {
      const weight = resultSet.weight || 1;

      resultSet.tools.forEach(tool => {
        const toolId = tool._id.toString();

        if (toolMap.has(toolId)) {
          // Tool already exists, merge properties
          const existingTool = toolMap.get(toolId);

          // Merge similarity scores if available
          if (tool.similarityScore !== undefined) {
            if (existingTool.similarityScore === undefined) {
              existingTool.similarityScore = tool.similarityScore;
            } else {
              // Weighted average of similarity scores
              existingTool.similarityScore = (
                existingTool.similarityScore + tool.similarityScore * weight
              ) / (1 + weight);
            }
          }

          // Update result set information
          if (!existingTool.foundInResultSets) {
            existingTool.foundInResultSets = [];
          }
          existingTool.foundInResultSets.push(resultSetIndex);
        } else {
          // New tool, add to map
          const newTool = { ...tool };

          // Apply weight to similarity score if available
          if (newTool.similarityScore !== undefined) {
            newTool.similarityScore *= weight;
          }

          // Track which result set it came from
          newTool.foundInResultSets = [resultSetIndex];

          toolMap.set(toolId, newTool);
        }
      });
    });

    // Convert map back to array
    let mergedTools = Array.from(toolMap.values());

    // Apply merge strategy
    if (strategy === "best") {
      // Sort by similarity score (descending)
      mergedTools.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
    } else if (strategy === "diverse") {
      // Sort by similarity score but try to ensure diversity
      mergedTools.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));

      // Simple diversity: if multiple tools from same category, space them out
      const diverseTools: any[] = [];
      const categoryMap = new Map();

      // First pass: add one tool from each category
      mergedTools.forEach(tool => {
        const category = tool.categories?.[0] || "other";

        if (!categoryMap.has(category)) {
          categoryMap.set(category, true);
          diverseTools.push(tool);
        }
      });

      // Second pass: add remaining tools
      mergedTools.forEach(tool => {
        const category = tool.categories?.[0] || "other";

        if (!categoryMap.has(category) || diverseTools.length < limit) {
          if (!diverseTools.includes(tool)) {
            diverseTools.push(tool);
          }
        }
      });

      mergedTools = diverseTools;
    }

    // Apply limit
    const finalTools = mergedTools.slice(0, limit);

    return {
      tools: finalTools,
      mergeStrategy: strategy,
      originalTotalCount,
      finalCount: finalTools.length
    };
  } catch (error) {
    console.error("Error in mergeAndDedupe:", error);
    throw error;
  }
}

/**
 * LangGraph node function for mergeAndDedupe
 */
export async function mergeAndDedupeNode(state: State): Promise<Partial<State>> {
  const { executionResults, plan } = state;

  if (!executionResults || executionResults.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: [] }]
    };
  }

  // Determine merge strategy from plan if available
  let strategy: "weighted" | "best" | "diverse" = "weighted";

  if (plan && plan.mergeStrategy) {
    strategy = plan.mergeStrategy;
  }

  // Extract result sets from execution results
  const resultSets = executionResults.map(result => ({
    tools: result.tools || [],
    weight: result.weight || 1
  }));

  const result = await mergeAndDedupe({
    resultSets,
    strategy,
    limit: 20
  });

  return {
    executionResults: [...(state.executionResults || []), result],
    queryResults: result.tools
  };
}
import { State } from "@/types/state";

interface FilterByCategoryParams {
  tools: any[];
  categories: string[];
}

interface FilterByCategoryResult {
  tools: any[];
  filteredCount: number;
  originalCount: number;
}

/**
 * Filter tools by categories
 */
export async function filterByCategory(
  params: FilterByCategoryParams
): Promise<FilterByCategoryResult> {
  const { tools, categories } = params;

  if (!tools || tools.length === 0 || !categories || categories.length === 0) {
    return {
      tools: tools || [],
      filteredCount: tools?.length || 0,
      originalCount: tools?.length || 0
    };
  }

  const originalCount = tools.length;

  try {
    // Filter tools that match any of the specified categories
    const filteredTools = tools.filter(tool => {
      // Handle different ways categories might be represented
      let toolCategories: string[] = [];
      
      if (Array.isArray(tool.categories)) {
        // Flat array structure (tools-sample.json format)
        toolCategories = tool.categories;
      } else if (tool.categories && typeof tool.categories === 'object') {
        // Nested structure (tools-v1.0.json format)
        toolCategories = [
          ...(tool.categories.primary || []),
          ...(tool.categories.secondary || [])
        ];
      }

      // Normalize categories to lowercase for comparison
      const normalizedToolCategories = toolCategories.map((cat: string) =>
        cat.toLowerCase().trim()
      );
      const normalizedRequestedCategories = categories.map(cat =>
        cat.toLowerCase().trim()
      );

      // Check if any of the tool's categories match any of the requested categories
      return normalizedRequestedCategories.some(requestedCategory =>
        normalizedToolCategories.some((toolCategory: string) =>
          toolCategory.includes(requestedCategory) ||
          requestedCategory.includes(toolCategory)
        )
      );
    });

    return {
      tools: filteredTools,
      filteredCount: filteredTools.length,
      originalCount
    };
  } catch (error) {
    console.error("Error in filterByCategory:", error);
    throw error;
  }
}

/**
 * LangGraph node function for filterByCategory
 */
export async function filterByCategoryNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;

  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0
    ? executionResults[executionResults.length - 1].tools || []
    : [];

  if (latestResults.length === 0 || !intent.categories || intent.categories.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }

  const result = await filterByCategory({
    tools: latestResults,
    categories: intent.categories,
  });

  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
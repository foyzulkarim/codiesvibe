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

  console.log(`🏷️ Filter by category: ${tools?.length || 0} tools, categories:`, categories);

  if (!tools || tools.length === 0 || !categories || categories.length === 0) {
    console.log(`🏷️ Early return: tools=${tools?.length || 0}, categories=${categories?.length || 0}`);
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
      } 

      // Normalize categories to lowercase for comparison
      const normalizedToolCategories = toolCategories.map((cat: string) =>
        cat.toLowerCase().trim()
      );
      const normalizedRequestedCategories = categories.map(cat =>
        cat.toLowerCase().trim()
      );

      // Check if any of the tool's categories match any of the requested categories
      const matches = normalizedRequestedCategories.some(requestedCategory =>
        normalizedToolCategories.some((toolCategory: string) =>
          toolCategory.includes(requestedCategory) ||
          requestedCategory.includes(toolCategory)
        )
      );

      if (!matches) {
        console.log(`🏷️ Tool "${tool.name}" filtered out. Tool categories:`, toolCategories, "Requested:", categories);
      }

      return matches;
    });

    console.log(`🏷️ Filter result: ${filteredTools.length}/${originalCount} tools passed category filter`);

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

  console.log(`🏷️ FilterByCategoryNode: intent categories:`, intent.categories, executionResults[0].queryResults.length);

  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0
    ? executionResults[executionResults.length - 1].queryResults || []
    : [];

  console.log(`🏷️ FilterByCategoryNode: ${latestResults.length} tools from previous step, intent categories:`, intent.categories);

  if (latestResults.length === 0 || !intent.categories || intent.categories.length === 0) {
    console.log(`🏷️ FilterByCategoryNode: Skipping filter - no tools or categories`);
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }

  const result = await filterByCategory({
    tools: latestResults,
    categories: intent.categories,
  });

  console.log(`🏷️ FilterByCategoryNode: Filter result:`, { result });

  return {
    queryResults: result.tools,
    executionResults: [...(state.executionResults || []), result]
  };
}
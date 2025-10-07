import { State } from "@/types/state";

interface FilterByFunctionalityParams {
  tools: any[];
  functionality: string[];
}

interface FilterByFunctionalityResult {
  tools: any[];
  filteredCount: number;
  originalCount: number;
}

/**
 * Filter tools by functionality types
 */
export async function filterByFunctionality(
  params: FilterByFunctionalityParams
): Promise<FilterByFunctionalityResult> {
  const { tools, functionality } = params;

  if (!tools || tools.length === 0 || !functionality || functionality.length === 0) {
    return {
      tools: tools || [],
      filteredCount: tools?.length || 0,
      originalCount: tools?.length || 0
    };
  }

  const originalCount = tools.length;

  try {
    // Filter tools that match any of the specified functionality
    const filteredTools = tools.filter(tool => {
      // Handle different ways functionality might be represented
      const toolFunctionality = tool.functionality || [];

      // Normalize functionality to lowercase for comparison
      const normalizedToolFunctionality = toolFunctionality.map((func: string) =>
        func.toLowerCase().trim()
      );
      const normalizedRequestedFunctionality = functionality.map(func =>
        func.toLowerCase().trim()
      );

      // Check if any of the tool's functionality match any of the requested functionality
      return normalizedRequestedFunctionality.some(requestedFunctionality =>
        normalizedToolFunctionality.some((toolFunctionality: string) =>
          toolFunctionality.includes(requestedFunctionality) ||
          requestedFunctionality.includes(toolFunctionality)
        )
      );
    });

    return {
      tools: filteredTools,
      filteredCount: filteredTools.length,
      originalCount
    };
  } catch (error) {
    console.error("Error in filterByFunctionality:", error);
    throw error;
  }
}

/**
 * LangGraph node function for filterByFunctionality
 */
export async function filterByFunctionalityNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;

  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0
    ? executionResults[executionResults.length - 1].tools || []
    : [];

  if (latestResults.length === 0 || !intent.functionality || intent.functionality.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }

  const result = await filterByFunctionality({
    tools: latestResults,
    functionality: intent.functionality,
  });

  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
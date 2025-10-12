import { State } from "@/types/state";

interface FilterByUserTypeParams {
  tools: any[];
  userTypes: string[];
}

interface FilterByUserTypeResult {
  tools: any[];
  filteredCount: number;
  originalCount: number;
}

/**
 * Filter tools by user types
 */
export async function filterByUserType(
  params: FilterByUserTypeParams
): Promise<FilterByUserTypeResult> {
  const { tools, userTypes } = params;

  if (!tools || tools.length === 0 || !userTypes || userTypes.length === 0) {
    return {
      tools: tools || [],
      filteredCount: tools?.length || 0,
      originalCount: tools?.length || 0
    };
  }

  const originalCount = tools.length;

  try {
    // Filter tools that match any of the specified user types
    const filteredTools = tools.filter(tool => {
      // Handle different ways user types might be represented
      let toolUserTypes: string[] = [];
      
      if (Array.isArray(tool.userTypes)) {
        // Flat array structure (tools-sample.json format)
        toolUserTypes = tool.userTypes;
      } else if (tool.categories && tool.categories.userTypes) {
        // Nested structure (tools-v1.0.json format)
        toolUserTypes = tool.categories.userTypes || [];
      }

      // Normalize user types to lowercase for comparison
      const normalizedToolUserTypes = toolUserTypes.map((userType: string) =>
        userType.toLowerCase().trim()
      );
      const normalizedRequestedUserTypes = userTypes.map(userType =>
        userType.toLowerCase().trim()
      );

      // Check if any of the tool's user types match any of the requested user types
      return normalizedRequestedUserTypes.some(requestedUserType =>
        normalizedToolUserTypes.some((toolUserType: string) =>
          toolUserType.includes(requestedUserType) ||
          requestedUserType.includes(toolUserType)
        )
      );
    });

    return {
      tools: filteredTools,
      filteredCount: filteredTools.length,
      originalCount
    };
  } catch (error) {
    console.error("Error in filterByUserType:", error);
    throw error;
  }
}

/**
 * LangGraph node function for filterByUserType
 */
export async function filterByUserTypeNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;

  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0
    ? executionResults[executionResults.length - 1].queryResults || []
    : [];

  if (latestResults.length === 0 || !intent.userTypes || intent.userTypes.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }

  const result = await filterByUserType({
    tools: latestResults,
    userTypes: intent.userTypes,
  });

  return {
    queryResults: result.tools,
    executionResults: [...(state.executionResults || []), result]
  };
}
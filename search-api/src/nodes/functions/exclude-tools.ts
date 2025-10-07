import { State } from "@/types/state";

interface ExcludeToolsParams {
  tools: any[];
  excludeToolIds: string[];
  excludeToolNames?: string[];
}

interface ExcludeToolsResult {
  tools: any[];
  excludedCount: number;
  originalCount: number;
}

/**
 * Exclude specified tools from results
 */
export async function excludeTools(
  params: ExcludeToolsParams
): Promise<ExcludeToolsResult> {
  const { tools, excludeToolIds, excludeToolNames = [] } = params;

  if (!tools || tools.length === 0) {
    return { tools: [], excludedCount: 0, originalCount: 0 };
  }

  const originalCount = tools.length;

  if (excludeToolIds.length === 0 && excludeToolNames.length === 0) {
    return { tools, excludedCount: 0, originalCount };
  }

  try {
    // Filter out tools by ID
    let filteredTools = tools.filter(tool => {
      const toolId = tool._id.toString();
      return !excludeToolIds.includes(toolId);
    });

    // Filter out tools by name
    if (excludeToolNames.length > 0) {
      filteredTools = filteredTools.filter(tool => {
        const toolName = tool.name.toLowerCase();
        return !excludeToolNames.some(excludeName =>
          toolName.includes(excludeName.toLowerCase()) ||
          excludeName.toLowerCase().includes(toolName)
        );
      });
    }

    const excludedCount = originalCount - filteredTools.length;

    return {
      tools: filteredTools,
      excludedCount,
      originalCount
    };
  } catch (error) {
    console.error("Error in excludeTools:", error);
    throw error;
  }
}

/**
 * LangGraph node function for excludeTools
 */
export async function excludeToolsNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;

  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0
    ? executionResults[executionResults.length - 1].tools || []
    : [];

  if (latestResults.length === 0 || (!intent.excludeTools || intent.excludeTools.length === 0)) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }

  // Try to find tool IDs for the names to exclude
  const { mongoDBService } = await import("@/services/mongodb.service");
  const excludeToolIds: string[] = [];

  for (const toolName of intent.excludeTools) {
    try {
      const tools = await mongoDBService.searchToolsByName(toolName, 1);
      if (tools.length > 0) {
        excludeToolIds.push(tools[0]._id.toString());
      }
    } catch (error) {
      console.error(`Error finding tool ID for "${toolName}":`, error);
    }
  }

  const result = await excludeTools({
    tools: latestResults,
    excludeToolIds,
    excludeToolNames: intent.excludeTools
  });

  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
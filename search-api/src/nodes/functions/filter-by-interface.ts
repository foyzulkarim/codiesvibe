import { State } from "@/types/state";

interface FilterByInterfaceParams {
  tools: any[];
  interfaces: string[];
}

interface FilterByInterfaceResult {
  tools: any[];
  filteredCount: number;
  originalCount: number;
}

/**
 * Filter tools by interface types
 */
export async function filterByInterface(
  params: FilterByInterfaceParams
): Promise<FilterByInterfaceResult> {
  const { tools, interfaces } = params;

  if (!tools || tools.length === 0 || !interfaces || interfaces.length === 0) {
    return {
      tools: tools || [],
      filteredCount: tools?.length || 0,
      originalCount: tools?.length || 0
    };
  }

  const originalCount = tools.length;

  try {
    // Filter tools that match any of the specified interfaces
    const filteredTools = tools.filter(tool => {
      // Handle different ways interfaces might be represented
      const toolInterfaces = tool.interface || [];

      // Normalize interfaces to lowercase for comparison
      const normalizedToolInterfaces = toolInterfaces.map((intf: string) =>
        intf.toLowerCase().trim()
      );
      const normalizedRequestedInterfaces = interfaces.map(intf =>
        intf.toLowerCase().trim()
      );

      // Check if any of the tool's interfaces match any of the requested interfaces
      return normalizedRequestedInterfaces.some(requestedInterface =>
        normalizedToolInterfaces.some((toolInterface: string) =>
          toolInterface.includes(requestedInterface) ||
          requestedInterface.includes(toolInterface)
        )
      );
    });

    return {
      tools: filteredTools,
      filteredCount: filteredTools.length,
      originalCount
    };
  } catch (error) {
    console.error("Error in filterByInterface:", error);
    throw error;
  }
}

/**
 * LangGraph node function for filterByInterface
 */
export async function filterByInterfaceNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;

  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0
    ? executionResults[executionResults.length - 1].tools || []
    : [];

  if (latestResults.length === 0 || !intent.interface || intent.interface.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }

  const result = await filterByInterface({
    tools: latestResults,
    interfaces: intent.interface,
  });

  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
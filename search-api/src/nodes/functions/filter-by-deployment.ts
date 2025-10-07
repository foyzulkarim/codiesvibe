import { State } from "@/types/state";

interface FilterByDeploymentParams {
  tools: any[];
  deployment: string[];
}

interface FilterByDeploymentResult {
  tools: any[];
  filteredCount: number;
  originalCount: number;
}

/**
 * Filter tools by deployment types
 */
export async function filterByDeployment(
  params: FilterByDeploymentParams
): Promise<FilterByDeploymentResult> {
  const { tools, deployment } = params;

  if (!tools || tools.length === 0 || !deployment || deployment.length === 0) {
    return {
      tools: tools || [],
      filteredCount: tools?.length || 0,
      originalCount: tools?.length || 0
    };
  }

  const originalCount = tools.length;

  try {
    // Filter tools that match any of the specified deployment types
    const filteredTools = tools.filter(tool => {
      // Handle different ways deployment might be represented
      const toolDeployment = tool.deployment || [];

      // Normalize deployment to lowercase for comparison
      const normalizedToolDeployment = toolDeployment.map((dep: string) =>
        dep.toLowerCase().trim()
      );
      const normalizedRequestedDeployment = deployment.map(dep =>
        dep.toLowerCase().trim()
      );

      // Check if any of the tool's deployment types match any of the requested deployment types
      return normalizedRequestedDeployment.some(requestedDeployment =>
        normalizedToolDeployment.some((toolDeployment: string) =>
          toolDeployment.includes(requestedDeployment) ||
          requestedDeployment.includes(toolDeployment)
        )
      );
    });

    return {
      tools: filteredTools,
      filteredCount: filteredTools.length,
      originalCount
    };
  } catch (error) {
    console.error("Error in filterByDeployment:", error);
    throw error;
  }
}

/**
 * LangGraph node function for filterByDeployment
 */
export async function filterByDeploymentNode(state: State): Promise<Partial<State>> {
  const { intent, executionResults } = state;

  // Get the latest results from execution
  const latestResults = executionResults && executionResults.length > 0
    ? executionResults[executionResults.length - 1].tools || []
    : [];

  if (latestResults.length === 0 || !intent.deployment || intent.deployment.length === 0) {
    return {
      executionResults: [...(state.executionResults || []), { tools: latestResults }]
    };
  }

  const result = await filterByDeployment({
    tools: latestResults,
    deployment: intent.deployment,
  });

  return {
    executionResults: [...(state.executionResults || []), result]
  };
}
import { StateAnnotation } from "@/types/state";

/**
 * Merge results from multiple strategies using different merging strategies
 */
export async function resultMergerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { executionResults, plan } = state;
  
  console.log('resultMergerNode(): Called with:', {
    hasExecutionResults: !!executionResults,
    executionResultsLength: executionResults?.length || 0,
    plan: plan ? 'present' : 'missing'
  });
  
  if (!executionResults || executionResults.length === 0) {
    console.log('resultMergerNode(): No execution results, returning empty array');
    return {
      queryResults: [],
      metadata: {
        ...state.metadata
      }
    };
  }
  
  // Check if this is multi-strategy execution
  const isMultiStrategy = plan && "strategies" in plan;
  
  console.log('resultMergerNode(): isMultiStrategy:', isMultiStrategy);
  
  if (!isMultiStrategy) {
    // For single strategy execution, just return the results
    const lastResult = executionResults[executionResults.length - 1];
    
    console.log('resultMergerNode(): Last result structure:', {
      hasResults: !!lastResult.results,
      hasQueryResults: !!lastResult.queryResults,
      resultsLength: lastResult.results?.length || 0,
      queryResultsLength: lastResult.queryResults?.length || 0,
      lastResultKeys: Object.keys(lastResult)
    });
    
    // Try to get results from either results or queryResults field
    const results = lastResult.queryResults || lastResult.results || [];
    
    console.log('resultMergerNode(): Single strategy, returning results:', {
      resultsLength: results.length,
      resultsPreview: results.slice(0, 2).map(r => ({ name: r?.name, id: r?._id }))
    });
    
    return {
      queryResults: results,
      metadata: {
        ...state.metadata
      }
    };
  }
  
  try {
    const multiStrategyPlan = plan as any; // MultiStrategyPlan
    const mergeStrategy = multiStrategyPlan.mergeStrategy || "weighted";
    const weights = multiStrategyPlan.weights || [];
    
    let mergedResults: any[] = [];
    
    switch (mergeStrategy) {
      case "weighted":
        mergedResults = mergeWithWeighted(executionResults, weights);
        break;
      case "best":
        mergedResults = mergeWithBest(executionResults, weights);
        break;
      case "diverse":
        mergedResults = mergeWithDiverse(executionResults);
        break;
      default:
        mergedResults = mergeWithWeighted(executionResults, weights);
    }
    
    return {
      queryResults: mergedResults,
      metadata: {
        ...state.metadata
      }
    };
  } catch (error) {
    console.error("Error in resultMergerNode:", error);
    
    // Fallback: just concatenate all results
    const allResults = executionResults.flatMap(result => result.results || []);
    
    return {
      queryResults: allResults,
      metadata: {
        ...state.metadata
      }
    };
  }
}

/**
 * Weighted merging: combine results with weights applied to relevance scores
 */
function mergeWithWeighted(executionResults: any[], weights: number[]): any[] {
  const toolScores = new Map<string, { tool: any; totalScore: number; count: number }>();
  
  executionResults.forEach((result, index) => {
    const weight = weights[index] || (1 / executionResults.length);
    const results = result.results || [];
    
    results.forEach((tool: any) => {
      const toolId = tool._id?.toString() || tool.name;
      const relevanceScore = tool.relevanceScore || 0.5;
      const weightedScore = relevanceScore * weight;
      
      if (toolScores.has(toolId)) {
        const existing = toolScores.get(toolId)!;
        existing.totalScore += weightedScore;
        existing.count += 1;
        
        // Update tool with better data if available
        if (relevanceScore > existing.tool.relevanceScore) {
          existing.tool = { ...existing.tool, ...tool };
        }
      } else {
        toolScores.set(toolId, {
          tool: { ...tool, relevanceScore: weightedScore },
          totalScore: weightedScore,
          count: 1
        });
      }
    });
  });
  
  // Convert back to array and sort by average weighted score
  return Array.from(toolScores.values())
    .map(({ tool, totalScore, count }) => ({
      ...tool,
      relevanceScore: totalScore / count,
      mergeSources: count
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Best merging: take the best results from each strategy
 */
function mergeWithBest(executionResults: any[], weights: number[]): any[] {
  const allResults: any[] = [];
  
  executionResults.forEach((result, index) => {
    const weight = weights[index] || (1 / executionResults.length);
    const results = result.results || [];
    
    results.forEach((tool: any) => ({
      ...tool,
      relevanceScore: (tool.relevanceScore || 0.5) * weight,
      sourceStrategy: index
    }));
    
    allResults.push(...results);
  });
  
  // Deduplicate and sort by relevance
  const uniqueTools = new Map<string, any>();
  
  allResults.forEach(tool => {
    const toolId = tool._id?.toString() || tool.name;
    if (!uniqueTools.has(toolId) || tool.relevanceScore > uniqueTools.get(toolId).relevanceScore) {
      uniqueTools.set(toolId, tool);
    }
  });
  
  return Array.from(uniqueTools.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Diverse merging: ensure diversity in categories and functionality
 */
function mergeWithDiverse(executionResults: any[]): any[] {
  const allResults: any[] = [];
  
  // Collect all results
  executionResults.forEach(result => {
    allResults.push(...(result.results || []));
  });
  
  // Sort by relevance score
  allResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  
  // Select diverse results
  const selected: any[] = [];
  const categories = new Set<string>();
  const functionality = new Set<string>();
  
  allResults.forEach(tool => {
    const toolCategory = tool.category || 'other';
    const toolFunctionality = tool.functionality?.[0] || 'other';
    
    // Add tool if it adds diversity or we don't have many results yet
    if (selected.length < 5 || 
        !categories.has(toolCategory) || 
        !functionality.has(toolFunctionality)) {
      selected.push(tool);
      categories.add(toolCategory);
      functionality.add(toolFunctionality);
    }
  });
  
  return selected;
}
import { StateAnnotation } from "@/types/state";

/**
 * Format final results and add explanations about the search strategy used
 */
export async function completionNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { queryResults, metadata, routingDecision, plan, qualityAssessment } = state;
  
  try {
    // Log the input state for debugging
    console.log('completionNode(): Input state:', {
      hasQueryResults: !!queryResults,
      queryResultsLength: queryResults?.length || 0,
      queryResultsPreview: queryResults?.slice(0, 2).map(r => ({ name: r?.name, id: r?._id })) || []
    });
    
    const endTime = new Date();
    const executionTime = metadata.startTime ? endTime.getTime() - metadata.startTime.getTime() : 0;
    
    // Format results for user consumption
    const formattedResults = queryResults?.map(tool => ({
      id: tool._id?.toString() || tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      categories: tool.categories,
      functionality: tool.functionality,
      userTypes: tool.userTypes,
      interface: tool.interface,
      deployment: tool.deployment,
      pricing: tool.pricing,
      relevanceScore: tool.relevanceScore,
      website: tool.website,
      github: tool.github,
      tags: tool.tags,
      mergeSources: tool.mergeSources,
      sourceStrategy: tool.sourceStrategy
    })) || [];
    
    // Generate explanation about the search strategy
    let explanation = "";
    let strategy = "";
    
    if (routingDecision === "optimal") {
      strategy = "Optimal Search";
      explanation = `I used an optimal search strategy based on high confidence in understanding your query. `;
    } else if (routingDecision === "multi-strategy") {
      strategy = "Multi-Strategy Search";
      explanation = `I used multiple search approaches to find the best results. `;
      // Note: strategiesSuccessful property not available in current metadata type
    } else {
      strategy = "Broad Search";
      explanation = `I used a broad search approach to find relevant tools. `;
    }
    
    // Add details about the execution plan
    if (plan?.description) {
      explanation += `Execution plan: ${plan.description}. `;
    }
    
    // Add quality assessment information
    if (qualityAssessment) {
      if (qualityAssessment.decision === "refine") {
        explanation += `Results were refined to improve quality. `;
      } else if (qualityAssessment.decision === "expand") {
        explanation += `Search was expanded to find more results. `;
      }
      
      explanation += `Found ${qualityAssessment.resultCount} results with average relevance of ${(qualityAssessment.averageRelevance * 100).toFixed(1)}%. `;
    }
    
    // Note: suggestedRefinements property not available in current state type
    
    // Create completion response
    const completion = {
      query: state.query,
      strategy,
      results: formattedResults,
      explanation: explanation.trim(),
      metadata: {
        executionTime: `${executionTime}ms`,
        resultsCount: formattedResults.length,
        confidence: state.confidence?.overall || 0,
        routingDecision,
        qualityMetrics: qualityAssessment ? {
          resultCount: qualityAssessment.resultCount,
          averageRelevance: qualityAssessment.averageRelevance,
          categoryDiversity: qualityAssessment.categoryDiversity,
          decision: qualityAssessment.decision
        } : undefined,
        executionPath: metadata.executionPath || [],
        nodeExecutionTimes: metadata.nodeExecutionTimes || {}
      }
    };
    
    return {
      completion,
      metadata: {
        ...metadata,
        endTime,
        originalQuery: metadata.originalQuery || state.query
        // Note: totalExecutionTime and finalResultsCount not in metadata type
      }
    };
  } catch (error) {
    console.error("Error in completionNode:", error);
    
    // Fallback completion
    const fallbackCompletion = {
      query: state.query || "",
      strategy: "Error Recovery",
      results: [],
      explanation: "An error occurred during search completion. Please try again.",
      metadata: {
        executionTime: "0ms",
        resultsCount: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    };
    
    return {
      completion: fallbackCompletion,
      metadata: {
        ...state.metadata,
        endTime: new Date(),
        originalQuery: state.metadata?.originalQuery || state.query
        // Note: completionError not in metadata type
      }
    };
  }
}

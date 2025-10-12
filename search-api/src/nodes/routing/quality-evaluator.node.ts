import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { qualityThresholds } from "@/config/constants";

/**
 * Evaluate result quality and determine if refinement or expansion is needed
 */
export async function qualityEvaluatorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { queryResults, iterations } = state;
  
  if (!queryResults || queryResults.length === 0) {
    return {
      qualityAssessment: {
        resultCount: 0,
        averageRelevance: 0,
        categoryDiversity: 0,
        decision: "expand"
      },
      metadata: {
        ...state.metadata
      }
    };
  }
  
  try {
    const resultCount = queryResults.length;
    
    // Calculate average relevance score
    const relevanceScores = queryResults
      .filter(tool => tool.relevanceScore !== undefined)
      .map(tool => tool.relevanceScore);
    
    const averageRelevance = relevanceScores.length > 0
      ? relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length
      : 0;
    
    // Calculate category diversity
    const categories = new Set();
    queryResults.forEach(tool => {
      if (tool.category) {
        categories.add(tool.category);
      } else if (tool.categories && Array.isArray(tool.categories) && tool.categories.length > 0) {
        categories.add(tool.categories[0]);
      }
    });
    const categoryDiversity = categories.size / Math.max(resultCount, 1);
    
    // Determine quality decision
    let decision: "accept" | "refine" | "expand" = "accept";
    let qualityReason = "";
    
    // Check if we need to expand (too few results)
    if (resultCount < qualityThresholds.minResults) {
      decision = "expand";
      qualityReason = `Too few results (${resultCount} < ${qualityThresholds.minResults})`;
    }
    // Check if we need to refine (too many results)
    else if (resultCount > qualityThresholds.maxResults) {
      decision = "refine";
      qualityReason = `Too many results (${resultCount} > ${qualityThresholds.maxResults})`;
    }
    // Check if relevance is too low
    else if (averageRelevance < qualityThresholds.minRelevance) {
      decision = "refine";
      qualityReason = `Low relevance score (${averageRelevance.toFixed(2)} < ${qualityThresholds.minRelevance})`;
    }
    // Check if category diversity is too low
    else if (categoryDiversity < qualityThresholds.minCategoryDiversity) {
      decision = "expand";
      qualityReason = `Low category diversity (${categoryDiversity.toFixed(2)} < ${qualityThresholds.minCategoryDiversity})`;
    }
    // Results are acceptable
    else {
      qualityReason = `Results meet quality thresholds (count: ${resultCount}, relevance: ${averageRelevance.toFixed(2)}, diversity: ${categoryDiversity.toFixed(2)})`;
    }
    
    // Check if we've exceeded maximum iterations
    const currentIterations = iterations || { refinementAttempts: 0, expansionAttempts: 0, maxAttempts: 2 };
    if (
      (decision === "refine" && currentIterations.refinementAttempts >= currentIterations.maxAttempts) ||
      (decision === "expand" && currentIterations.expansionAttempts >= currentIterations.maxAttempts)
    ) {
      decision = "accept";
      qualityReason += ` (Max iterations reached, accepting results)`;
    }
    
    return {
      qualityAssessment: {
        resultCount,
        averageRelevance,
        categoryDiversity,
        decision
      },
      metadata: {
        ...state.metadata
      }
    };
  } catch (error) {
    console.error("Error in qualityEvaluatorNode:", error);
    return {
      qualityAssessment: {
        resultCount: queryResults?.length || 0,
        averageRelevance: 0,
        categoryDiversity: 0,
        decision: "accept"
      },
      metadata: {
        ...state.metadata
      }
    };
  }
}
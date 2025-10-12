import { StateAnnotation } from "@/types/state";
import { qualityThresholds } from "@/config/constants";

/**
 * Route based on result quality assessment to determine next action
 */
export async function qualityRouter(state: typeof StateAnnotation.State): Promise<"refinement-planner" | "expansion-planner" | "execution-completion"> {
  const { qualityAssessment, iterations } = state;
  
  // Fallback routing if no quality assessment
  if (!qualityAssessment) {
    console.log("Quality router: No quality assessment, routing to execution-completion");
    return "execution-completion";
  }
  
  try {
    const { decision, resultCount, averageRelevance, categoryDiversity } = qualityAssessment;
    const currentIterations = iterations || { refinementAttempts: 0, expansionAttempts: 0, maxAttempts: 2 };
    
    console.log(`Quality router: Quality decision is "${decision}" with ${resultCount} results, ${currentIterations.refinementAttempts} refinement attempts, ${currentIterations.expansionAttempts} expansion attempts`);
    
    // Check if we've exceeded maximum iterations
    if (decision === "refine" && currentIterations.refinementAttempts >= currentIterations.maxAttempts) {
      console.log(`Quality router: Max refinement attempts reached (${currentIterations.maxAttempts}), routing to execution-completion`);
      return "execution-completion";
    }
    
    if (decision === "expand" && currentIterations.expansionAttempts >= currentIterations.maxAttempts) {
      console.log(`Quality router: Max expansion attempts reached (${currentIterations.maxAttempts}), routing to execution-completion`);
      return "execution-completion";
    }
    
    // Route based on quality decision
    switch (decision) {
      case "refine":
        console.log("Quality router: Results need refinement, routing to refinement-planner");
        return "refinement-planner";
        
      case "expand":
        console.log("Quality router: Results need expansion, routing to expansion-planner");
        return "expansion-planner";
        
      case "accept":
      default:
        console.log("Quality router: Results are acceptable, routing to execution-completion");
        return "execution-completion";
    }
  } catch (error) {
    console.error("Error in qualityRouter:", error);
    console.log("Quality router: Error occurred, routing to execution-completion");
    return "execution-completion";
  }
}

/**
 * Pre-quality router to determine if quality assessment is needed
 */
export async function preQualityRouter(state: typeof StateAnnotation.State): Promise<"quality-evaluator" | "execution-completion"> {
  const { queryResults } = state;
  
  if (!queryResults || queryResults.length === 0) {
    console.log("Pre-quality router: No results to evaluate, routing to execution-completion");
    return "execution-completion";
  }
  
  // If we have results, we should evaluate their quality
  console.log(`Pre-quality router: Have ${queryResults.length} results, routing to quality-evaluator`);
  return "quality-evaluator";
}

/**
 * Adaptive quality router that considers context and user preferences
 */
export async function adaptiveQualityRouter(state: typeof StateAnnotation.State): Promise<"refinement-planner" | "expansion-planner" | "execution-completion"> {
  const { qualityAssessment, iterations, query, metadata } = state;
  
  // Get base routing decision from standard quality router
  const baseRoute = await qualityRouter(state);
  
  // If base route is execution-completion, respect that decision
  if (baseRoute === "execution-completion") {
    return "execution-completion";
  }
  
  // Consider query complexity and user experience
  const queryComplexity = (query?.length || 0) > 50 ? "complex" : "simple";
  const executionTime = metadata.startTime ? Date.now() - metadata.startTime.getTime() : 0;
  
  // For complex queries, allow more refinement attempts
  if (queryComplexity === "complex" && baseRoute === "refinement-planner") {
    const maxAttempts = Math.min((iterations?.maxAttempts || 2) + 1, 4); // Max 4 attempts for complex queries
    
    if ((iterations?.refinementAttempts || 0) < maxAttempts) {
      console.log("Adaptive quality router: Complex query detected, allowing additional refinement");
      return "refinement-planner";
    }
  }
  
  // For fast execution, prioritize completion over further processing
  if (executionTime < 500) {
    console.log("Adaptive quality router: Fast execution detected, prioritizing completion");
    return "execution-completion";
  }
  
  // For slow execution, be more aggressive about expansion
  if (executionTime > 5000 && baseRoute === "refinement-planner" && qualityAssessment?.resultCount < qualityThresholds.minResults) {
    console.log("Adaptive quality router: Slow execution with few results, switching to expansion");
    return "expansion-planner";
  }
  
  // Return the base routing decision
  return baseRoute;
}

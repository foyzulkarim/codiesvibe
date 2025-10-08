import { StateAnnotation } from "@/types/state";
import { Plan, Function } from "@/types/plan";

/**
 * Generate a single, optimal execution plan for high-confidence queries
 * This node creates a comprehensive plan with tool lookup, semantic search, filtering, and ranking
 */
export async function optimalPlannerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { intent, query } = state;
  
  if (!intent) {
    throw new Error("Intent is required for optimal planning");
  }
  
  try {
    const steps: Function[] = [];
    let description = "Optimal plan: ";
    
    // Step 1: Tool name lookup if we have specific tool names
    if (intent.toolNames && intent.toolNames.length > 0) {
      steps.push({
        name: "lookup-by-name",
        parameters: {
          toolNames: intent.toolNames,
          fuzzyMatch: true,
          threshold: 0.8
        }
      });
      description += `lookup tools by name (${intent.toolNames.join(", ")}), `;
    }
    
    // Step 2: Semantic search for broader coverage
    if (intent.semanticQuery) {
      steps.push({
        name: "semantic-search",
        parameters: {
          query: intent.semanticQuery,
          limit: 50, // Higher limit for comprehensive search
          threshold: 0.7
        }
      });
      description += `semantic search for "${intent.semanticQuery}", `;
    }
    
    // Step 3: Find similar tools if we have a reference tool
    if (intent.isComparative && intent.referenceTool) {
      steps.push({
        name: "find-similar-by-features",
        parameters: {
          referenceTool: intent.referenceTool,
          limit: 30,
          threshold: 0.6
        }
      });
      description += `find tools similar to ${intent.referenceTool}, `;
    }
    
    // Step 4: Merge and deduplicate results from multiple sources
    if (steps.length > 1) {
      steps.push({
        name: "merge-and-dedupe",
        parameters: {
          strategy: "weighted",
          weights: steps.length === 3 ? [0.4, 0.4, 0.2] : [0.6, 0.4], // Prioritize name lookup and semantic search
          limit: 100
        },
        inputFromStep: steps.length - 1 // Use all previous steps
      });
      description += "merge and deduplicate results, ";
    }
    
    // Step 5: Apply price filters if specified
    if (intent.priceConstraints) {
      steps.push({
        name: "filter-by-price",
        parameters: {
          minPrice: intent.priceConstraints.minPrice,
          maxPrice: intent.priceConstraints.maxPrice,
          includeFree: intent.priceConstraints.hasFreeTier || false,
          pricingModel: intent.priceConstraints.pricingModel
        },
        inputFromStep: steps.length > 0 ? steps.length - 1 : 0
      });
      description += `filter by price constraints, `;
    }
    
    // Step 6: Apply category filters if specified
    if (intent.categories && intent.categories.length > 0) {
      steps.push({
        name: "filter-by-category",
        parameters: {
          categories: intent.categories,
          strict: true // Default to strict matching for optimal planner
        },
        inputFromStep: steps.length > 0 ? steps.length - 1 : 0
      });
      description += `filter by categories (${intent.categories.join(", ")}), `;
    }
    
    // Step 7: Apply interface filters if specified
    if (intent.interface && intent.interface.length > 0) {
      steps.push({
        name: "filter-by-interface",
        parameters: {
          interfaces: intent.interface,
          strict: true
        },
        inputFromStep: steps.length > 0 ? steps.length - 1 : 0
      });
      description += `filter by interfaces (${intent.interface.join(", ")}), `;
    }
    
    // Step 8: Apply functionality filters if specified
    if (intent.functionality && intent.functionality.length > 0) {
      steps.push({
        name: "filter-by-functionality",
        parameters: {
          functionality: intent.functionality,
          strict: true
        },
        inputFromStep: steps.length > 0 ? steps.length - 1 : 0
      });
      description += `filter by functionality (${intent.functionality.join(", ")}), `;
    }
    
    // Step 9: Apply user type filters if specified
    if (intent.userTypes && intent.userTypes.length > 0) {
      steps.push({
        name: "filter-by-user-type",
        parameters: {
          userTypes: intent.userTypes,
          strict: true
        },
        inputFromStep: steps.length > 0 ? steps.length - 1 : 0
      });
      description += `filter by user types (${intent.userTypes.join(", ")}), `;
    }
    
    // Step 10: Apply deployment filters if specified
    if (intent.deployment && intent.deployment.length > 0) {
      steps.push({
        name: "filter-by-deployment",
        parameters: {
          deployment: intent.deployment,
          strict: true
        },
        inputFromStep: steps.length > 0 ? steps.length - 1 : 0
      });
      description += `filter by deployment (${intent.deployment.join(", ")}), `;
    }
    
    // Step 11: Exclude specific tools if specified
    if (intent.excludeTools && intent.excludeTools.length > 0) {
      steps.push({
        name: "exclude-tools",
        parameters: {
          toolNames: intent.excludeTools
        },
        inputFromStep: steps.length > 0 ? steps.length - 1 : 0
      });
      description += `exclude tools (${intent.excludeTools.join(", ")}), `;
    }
    
    // Step 12: Final ranking by relevance
    steps.push({
      name: "rank-by-relevance",
      parameters: {
        strategy: intent.isComparative ? "comparative" : "semantic",
        query: intent.semanticQuery || query || "",
        limit: 20 // Final result limit
      },
      inputFromStep: steps.length > 0 ? steps.length - 1 : 0
    });
    description += "rank by relevance";
    
    // If no steps were added (shouldn't happen with high confidence), add a fallback
    if (steps.length === 0) {
      steps.push({
        name: "semantic-search",
        parameters: {
          query: query || "",
          limit: 20
        }
      });
      description = "Fallback semantic search";
    }
    
    const plan: Plan = {
      steps,
      description: description.replace(/, $/, "") // Remove trailing comma
    };
    
    return {
      plan,
      metadata: {
        ...state.metadata,
        plannerType: "optimal",
        planConfidence: 0.9, // High confidence for optimal planner
        stepCount: steps.length
      }
    };
  } catch (error) {
    console.error("Error in optimalPlannerNode:", error);
    
    // Emergency fallback plan
    const fallbackPlan: Plan = {
      steps: [
        {
          name: "semantic-search",
          parameters: {
            query: query || "",
            limit: 20
          }
        }
      ],
      description: "Emergency fallback plan due to planning error"
    };
    
    return {
      plan: fallbackPlan,
      metadata: {
        ...state.metadata,
        plannerType: "optimal",
        planError: error instanceof Error ? error.message : String(error)
      }
    };
  }
}
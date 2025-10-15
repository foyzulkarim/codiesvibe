import { StateAnnotation } from "@/types/state";
import { Plan, Function } from "@/types/plan";
import { EntityStatisticsSchema, MetadataContextSchema } from "@/types/enhanced-state";

interface PlanReasoning {
  stage: string;
  decision: string;
  confidence: number;
  supportingEvidence: string[];
}

interface PlanContext {
  complexity: "simple" | "moderate" | "complex";
  confidenceLevel: number;
  entityStatsAvailable: boolean;
  metadataConfidence: number;
  suggestedStrategies: string[];
}

/**
 * Generate a single, optimal execution plan for high-confidence queries
 * This node creates a comprehensive plan with tool lookup, semantic search, filtering, and ranking
 * Enhanced to use context and entity statistics for better planning decisions
 */
export async function optimalPlannerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { intent, query, entityStatistics, metadataContext } = state;
  
  if (!intent) {
    throw new Error("Intent is required for optimal planning");
  }
  
  try {
    // Analyze context and determine plan strategy
    const planContext = analyzePlanContext(state);
    const planReasoning: PlanReasoning[] = [];
    
    const steps: Function[] = [];
    let description = "Optimal plan: ";
    
    // Add reasoning for initial strategy selection
    planReasoning.push({
      stage: "strategy_selection",
      decision: `Using optimal strategy for ${planContext.complexity} query`,
      confidence: planContext.confidenceLevel,
      supportingEvidence: [
        `Overall confidence: ${planContext.confidenceLevel}`,
        `Entity statistics available: ${planContext.entityStatsAvailable}`,
        `Metadata confidence: ${planContext.metadataConfidence}`,
        `Suggested strategies: ${planContext.suggestedStrategies.join(", ")}`
      ]
    });
    
    // Step 1: Tool name lookup if we have specific tool names
    if (intent.toolNames && intent.toolNames.length > 0) {
      // Use	entity statistics to optimize lookup parameters
      const lookupThreshold = getOptimizedLookupThreshold(planContext, entityStatistics);
      
      steps.push({
        name: "lookup-by-name",
        parameters: {
          toolNames: intent.toolNames,
          fuzzyMatch: true,
          threshold: lookupThreshold
        }
      });
      
      planReasoning.push({
        stage: "tool_lookup",
        decision: `Tool name lookup with threshold ${lookupThreshold}`,
        confidence: 0.9,
        supportingEvidence: [
          `Tool names provided: ${intent.toolNames.join(", ")}`,
          `Optimized threshold based on context: ${lookupThreshold}`,
          `Expected precision: ${lookupThreshold > 0.7 ? 'high' : 'medium'}`
        ]
      });
      
      description += `lookup tools by name (${intent.toolNames.join(", ")}) with optimized threshold ${lookupThreshold}, `;
    }
    
    // Step 2: Semantic search for broader coverage
    if (intent.semanticQuery) {
      // Use entity statistics to optimize search parameters
      const searchParams = getOptimizedSearchParams(planContext, entityStatistics, intent.semanticQuery);
      
      steps.push({
        name: "semantic-search",
        parameters: searchParams
      });
      
      planReasoning.push({
        stage: "semantic_search",
        decision: `Semantic search with adaptive parameters`,
        confidence: searchParams.threshold / 0.8, // Normalized confidence
        supportingEvidence: [
          `Semantic query: "${intent.semanticQuery}"`,
          `Adaptive limit: ${searchParams.limit}`,
          `Adaptive threshold: ${searchParams.threshold}`,
          `Context-based optimization: ${planContext.entityStatsAvailable ? 'enabled' : 'disabled'}`
        ]
      });
      
      description += `semantic search for "${intent.semanticQuery}" (limit: ${searchParams.limit}, threshold: ${searchParams.threshold}), `;
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
      description: description.replace(/, $/, ""), // Remove trailing comma
      reasoning: planReasoning,
      context: planContext,
      strategy: "optimal",
      adaptive: true,
      validationPassed: true
    };
    
    return {
      plan,
      metadata: {
        ...state.metadata,
        planReasoning,
        planContext,
        planningStrategy: "optimal",
        adaptivePlanning: true
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
      description: "Emergency fallback plan due to planning error",
      reasoning: [{
        stage: "error_recovery",
        decision: "Using emergency fallback",
        confidence: 0.3,
        supportingEvidence: ["Planning error occurred", "Using basic semantic search"]
      }],
      strategy: "fallback",
      adaptive: false,
      validationPassed: false
    };
    
    return {
      plan: fallbackPlan,
      metadata: {
        ...state.metadata,
        planningStrategy: "fallback",
        adaptivePlanning: false
      }
    };
  }
}

/**
 * Analyze the context to determine optimal planning strategy
 */
function analyzePlanContext(state: typeof StateAnnotation.State): PlanContext {
  const { entityStatistics, metadataContext, confidence, intent } = state;
  
  // Determine complexity based on intent and confidence
  let complexity: "simple" | "moderate" | "complex" = "simple";
  let suggestedStrategies: string[] = ["optimal"];
  
  if (intent) {
    const factorCount = [
      intent.toolNames?.length || 0,
      intent.categories?.length || 0,
      intent.functionality?.length || 0,
      intent.interface?.length || 0,
      intent.userTypes?.length || 0,
      intent.deployment?.length || 0
    ].reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0);
    
    if (factorCount >= 4 || intent.isComparative) {
      complexity = "complex";
      suggestedStrategies = ["optimal", "multi-strategy"];
    } else if (factorCount >= 2) {
      complexity = "moderate";
      suggestedStrategies = ["optimal"];
    }
  }
  
  const entityStatsAvailable = !!(entityStatistics && Object.keys(entityStatistics).length > 0);
  const metadataConfidence = metadataContext?.metadataConfidence || 0;
  const confidenceLevel = confidence?.overall || 0.5;
  
  return {
    complexity,
    confidenceLevel,
    entityStatsAvailable,
    metadataConfidence,
    suggestedStrategies
  };
}

/**
 * Get optimized lookup threshold based on context and statistics
 */
function getOptimizedLookupThreshold(
  planContext: PlanContext,
  entityStatistics?: Record<string, any>
): number {
  // Base threshold depends on confidence level
  let threshold = 0.8;
  
  // Adjust based on context
  if (planContext.confidenceLevel > 0.8) {
    threshold = 0.9; // Higher threshold for high confidence
  } else if (planContext.confidenceLevel < 0.5) {
    threshold = 0.7; // Lower threshold for low confidence
  }
  
  // Adjust based on entity statistics
  if (entityStatistics && Object.keys(entityStatistics).length > 0) {
    const avgConfidence = Object.values(entityStatistics)
      .reduce((sum: number, stats: any) => sum + (stats.confidence || 0), 0) / Object.keys(entityStatistics).length;
    
    if (avgConfidence > 0.8) {
      threshold = Math.min(threshold + 0.05, 0.95);
    } else if (avgConfidence < 0.5) {
      threshold = Math.max(threshold - 0.1, 0.6);
    }
  }
  
  return threshold;
}

/**
 * Get optimized search parameters based on context and statistics
 */
function getOptimizedSearchParams(
  planContext: PlanContext,
  entityStatistics?: Record<string, any>,
  query?: string
): { query: string; limit: number; threshold: number } {
  // Base parameters
  let limit = 50;
  let threshold = 0.7;
  
  // Adjust based on complexity
  switch (planContext.complexity) {
    case "simple":
      limit = 30;
      threshold = 0.8;
      break;
    case "moderate":
      limit = 50;
      threshold = 0.7;
      break;
    case "complex":
      limit = 80;
      threshold = 0.6;
      break;
  }
  
  // Adjust based on entity statistics
  if (entityStatistics && Object.keys(entityStatistics).length > 0) {
    const totalCount = Object.values(entityStatistics)
      .reduce((sum: number, stats: any) => sum + (stats.totalCount || 0), 0);
    
    if (totalCount > 1000) {
      limit = Math.min(limit * 1.2, 100);
      threshold = Math.max(threshold - 0.05, 0.5);
    } else if (totalCount < 100) {
      limit = Math.max(limit * 0.8, 20);
      threshold = Math.min(threshold + 0.05, 0.9);
    }
  }
  
  return {
    query: query || "",
    limit: Math.round(limit),
    threshold: Math.round(threshold * 100) / 100
  };
}

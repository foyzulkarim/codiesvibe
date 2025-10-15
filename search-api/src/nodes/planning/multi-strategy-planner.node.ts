import { StateAnnotation } from "@/types/state";
import { Plan, Function, PlanReasoning, PlanContext } from "@/types/plan";
import { EntityStatisticsSchema, MetadataContextSchema } from "@/types/enhanced-state";

interface Strategy {
  name: string;
  steps: Function[];
  weight: number;
  description: string;
  reasoning?: PlanReasoning[];
  context?: PlanContext;
}

/**
 * Generate multiple alternative execution plans for medium-confidence queries
 * This node creates several strategies and combines them with weighted merging
 * Enhanced to use context and entity statistics for better strategy selection
 */
export async function multiStrategyPlannerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { intent, query, entityStatistics, metadataContext } = state;
  
  if (!intent) {
    throw new Error("Intent is required for multi-strategy planning");
  }
  
  try {
    // Analyze context for strategy optimization
    const planContext = analyzePlanContext(state);
    const planReasoning: PlanReasoning[] = [];
    
    const strategies: Strategy[] = [];
    
    // Add reasoning for multi-strategy selection
    planReasoning.push({
      stage: "strategy_selection",
      decision: `Using multi-strategy approach for ${planContext.complexity} query`,
      confidence: planContext.confidenceLevel,
      supportingEvidence: [
        `Overall confidence: ${planContext.confidenceLevel}`,
        `Entity statistics available: ${planContext.entityStatsAvailable}`,
        `Metadata confidence: ${planContext.metadataConfidence}`,
        `Complexity requires multiple strategies: ${planContext.complexity}`
      ]
    });
    
    // Strategy 1: Tool name lookup (if we have tool names)
    if (intent.toolNames && intent.toolNames.length > 0) {
      // Use entity statistics to optimize lookup parameters
      const lookupThreshold = getOptimizedLookupThreshold(planContext, entityStatistics, 0.7);
      const strategyReasoning: PlanReasoning[] = [];
      
      const steps: Function[] = [
        {
          name: "lookup-by-name",
          parameters: {
            toolNames: intent.toolNames,
            fuzzyMatch: true,
            threshold: lookupThreshold
          }
        }
      ];
      
      strategyReasoning.push({
        stage: "tool_lookup_strategy",
        decision: `Tool name lookup with adaptive threshold ${lookupThreshold}`,
        confidence: 0.8,
        supportingEvidence: [
          `Tool names: ${intent.toolNames.join(", ")}`,
          `Adaptive threshold: ${lookupThreshold}`,
          `Entity statistics used: ${planContext.entityStatsAvailable}`
        ]
      });
      
      // Add price filter if available
      if (intent.priceConstraints) {
        steps.push({
          name: "filter-by-price",
          parameters: {
            minPrice: intent.priceConstraints.minPrice,
            maxPrice: intent.priceConstraints.maxPrice,
            includeFree: intent.priceConstraints.hasFreeTier || false,
            pricingModel: intent.priceConstraints.pricingModel
          },
          inputFromStep: 0
        });
      }
      
      // Add category filter if available
      if (intent.categories && intent.categories.length > 0) {
        steps.push({
          name: "filter-by-category",
          parameters: {
            categories: intent.categories,
            strict: false // Relaxed matching for medium confidence
          },
          inputFromStep: steps.length - 1
        });
      }
      
      strategies.push({
        name: "tool-name-lookup",
        steps,
        weight: 0.4, // High weight for name-based search
        description: `Tool name lookup for ${intent.toolNames.join(", ")} with threshold ${lookupThreshold}`,
        reasoning: strategyReasoning,
        context: planContext
      });
    }
    
    // Strategy 2: Semantic search (if we have semantic query)
    if (intent.semanticQuery) {
      // Use entity statistics to optimize search parameters
      const searchParams = getOptimizedSearchParams(planContext, entityStatistics, intent.semanticQuery, 40, 0.6);
      const strategyReasoning: PlanReasoning[] = [];
      
      const steps: Function[] = [
        {
          name: "semantic-search",
          parameters: searchParams
        }
      ];
      
      strategyReasoning.push({
        stage: "semantic_search_strategy",
        decision: `Semantic search with adaptive parameters`,
        confidence: searchParams.threshold / 0.8,
        supportingEvidence: [
          `Query: "${intent.semanticQuery}"`,
          `Adaptive limit: ${searchParams.limit}`,
          `Adaptive threshold: ${searchParams.threshold}`,
          `Context optimization: ${planContext.entityStatsAvailable ? 'enabled' : 'disabled'}`
        ]
      });
      
      // Add category filter if available and confident
      if (intent.categories && intent.categories.length > 0) {
        steps.push({
          name: "filter-by-category",
          parameters: {
            categories: intent.categories,
            strict: false
          },
          inputFromStep: 0
        });
      }
      
      // Add interface filter if available
      if (intent.interface && intent.interface.length > 0) {
        steps.push({
          name: "filter-by-interface",
          parameters: {
            interfaces: intent.interface,
            strict: false
          },
          inputFromStep: steps.length - 1
        });
      }
      
      // Add deployment filter if available
      if (intent.deployment && intent.deployment.length > 0) {
        steps.push({
          name: "filter-by-deployment",
          parameters: {
            deployment: intent.deployment,
            strict: false
          },
          inputFromStep: steps.length - 1
        });
      }
      
      strategies.push({
        name: "semantic-search",
        steps,
        weight: 0.35, // High weight for semantic search
        description: `Semantic search for "${intent.semanticQuery}" (limit: ${searchParams.limit}, threshold: ${searchParams.threshold})`,
        reasoning: strategyReasoning,
        context: planContext
      });
    }
    
    // Strategy 3: Category-focused search (if high confidence in categories)
    if (intent.categories && intent.categories.length > 0) {
      const steps: Function[] = [
        {
          name: "semantic-search",
          parameters: {
            query: intent.semanticQuery || query || "",
            limit: 30,
            threshold: 0.5
          }
        },
        {
          name: "filter-by-category",
          parameters: {
            categories: intent.categories,
            strict: true // Strict for category-focused strategy
          },
          inputFromStep: 0
        }
      ];
      
      strategies.push({
        name: "category-focused",
        steps,
        weight: 0.15,
        description: `Category-focused search for ${intent.categories.join(", ")}`
      });
    }
    
    // Strategy 4: Functionality-focused search (if high confidence in functionality)
    if (intent.functionality && intent.functionality.length > 0) {
      const steps: Function[] = [
        {
          name: "semantic-search",
          parameters: {
            query: intent.semanticQuery || query || "",
            limit: 30,
            threshold: 0.5
          }
        },
        {
          name: "filter-by-functionality",
          parameters: {
            functionality: intent.functionality,
            strict: false
          },
          inputFromStep: 0
        }
      ];
      
      strategies.push({
        name: "functionality-focused",
        steps,
        weight: 0.1,
        description: `Functionality-focused search for ${intent.functionality.join(", ")}`
      });
    }
    
    // Strategy 5: Comparative search (if comparative intent)
    if (intent.isComparative && intent.referenceTool) {
      const steps: Function[] = [
        {
          name: "find-similar-by-features",
          parameters: {
            referenceTool: intent.referenceTool,
            limit: 25,
            threshold: 0.5 // Lower threshold for broader comparison
          }
        }
      ];
      
      strategies.push({
        name: "comparative-search",
        steps,
        weight: 0.2,
        description: `Find tools similar to ${intent.referenceTool}`
      });
    }
    
    // Fallback strategy: Basic semantic search if no other strategies
    if (strategies.length === 0) {
      strategies.push({
        name: "fallback-semantic",
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: query || "",
              limit: 20,
              threshold: 0.4
            }
          }
        ],
        weight: 1.0,
        description: "Fallback semantic search"
      });
    }
    
    // Normalize weights to sum to 1.0
    const totalWeight = strategies.reduce((sum, strategy) => sum + strategy.weight, 0);
    const normalizedStrategies = strategies.map(strategy => ({
      ...strategy,
      weight: strategy.weight / totalWeight
    }));
    
    // Determine merge strategy based on number of strategies
    let mergeStrategy: "weighted" | "best" | "diverse";
    if (normalizedStrategies.length === 1) {
      mergeStrategy = "best";
    } else if (normalizedStrategies.length <= 3) {
      mergeStrategy = "weighted";
    } else {
      mergeStrategy = "diverse";
    }
    
    // Create the multi-strategy plan
    const allSteps: Function[] = [];
    let stepIndex = 0;
    
    // Add all strategy steps
    normalizedStrategies.forEach((strategy, strategyIndex) => {
      strategy.steps.forEach((step, localStepIndex) => {
        // Adjust inputFromStep to be relative to the global step index
        const adjustedStep = { ...step };
        if (step.inputFromStep !== undefined && localStepIndex > 0) {
          adjustedStep.inputFromStep = stepIndex + step.inputFromStep;
        }
        allSteps.push(adjustedStep);
        stepIndex++;
      });
    });
    
    // Add merge step
    allSteps.push({
      name: "merge-and-dedupe",
      parameters: {
        strategy: mergeStrategy,
        weights: normalizedStrategies.map(s => s.weight),
        limit: 25
      },
      inputFromStep: allSteps.length - 1 // Use all previous steps
    });
    
    // Add final ranking step
    allSteps.push({
      name: "rank-by-relevance",
      parameters: {
        strategy: intent.isComparative ? "comparative" : "hybrid",
        query: intent.semanticQuery || query || "",
        limit: 20
      },
      inputFromStep: allSteps.length - 1
    });
    
    const plan: Plan = {
      steps: allSteps,
      description: `Multi-strategy plan: ${normalizedStrategies.map(s => s.description).join(", ")} with ${mergeStrategy} merge`,
      reasoning: planReasoning,
      context: planContext,
      strategy: "multi-strategy",
      adaptive: true,
      validationPassed: true
    };
    
    return {
      plan,
      metadata: {
        ...state.metadata,
        planReasoning,
        planContext,
        planningStrategy: "multi-strategy",
        adaptivePlanning: true,
        strategyWeights: normalizedStrategies.map(s => ({ name: s.name, weight: s.weight }))
      }
    };
  } catch (error) {
    console.error("Error in multiStrategyPlannerNode:", error);
    
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
      description: "Emergency fallback plan due to multi-strategy planning error",
      reasoning: [{
        stage: "error_recovery",
        decision: "Using emergency fallback",
        confidence: 0.3,
        supportingEvidence: ["Multi-strategy planning error", "Using basic semantic search"]
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
  let suggestedStrategies: string[] = ["multi-strategy"];
  
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
      suggestedStrategies = ["multi-strategy", "optimal"];
    } else if (factorCount >= 2) {
      complexity = "moderate";
      suggestedStrategies = ["multi-strategy"];
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
  entityStatistics?: Record<string, any>,
  baseThreshold: number = 0.7
): number {
  let threshold = baseThreshold;
  
  // Adjust based on confidence level
  if (planContext.confidenceLevel > 0.7) {
    threshold = baseThreshold + 0.1;
  } else if (planContext.confidenceLevel < 0.4) {
    threshold = baseThreshold - 0.1;
  }
  
  // Adjust based on entity statistics
  if (entityStatistics && Object.keys(entityStatistics).length > 0) {
    const avgConfidence = Object.values(entityStatistics)
      .reduce((sum: number, stats: any) => sum + (stats.confidence || 0), 0) / Object.keys(entityStatistics).length;
    
    if (avgConfidence > 0.8) {
      threshold = Math.min(threshold + 0.05, 0.95);
    } else if (avgConfidence < 0.5) {
      threshold = Math.max(threshold - 0.1, 0.5);
    }
  }
  
  return Math.max(0.5, Math.min(0.95, threshold));
}

/**
 * Get optimized search parameters based on context and statistics
 */
function getOptimizedSearchParams(
  planContext: PlanContext,
  entityStatistics?: Record<string, any>,
  query?: string,
  baseLimit: number = 40,
  baseThreshold: number = 0.6
): { query: string; limit: number; threshold: number } {
  let limit = baseLimit;
  let threshold = baseThreshold;
  
  // Adjust based on complexity
  switch (planContext.complexity) {
    case "simple":
      limit = Math.max(baseLimit * 0.8, 20);
      threshold = Math.min(baseThreshold + 0.1, 0.8);
      break;
    case "moderate":
      limit = baseLimit;
      threshold = baseThreshold;
      break;
    case "complex":
      limit = Math.min(baseLimit * 1.2, 60);
      threshold = Math.max(baseThreshold - 0.1, 0.5);
      break;
  }
  
  // Adjust based on entity statistics
  if (entityStatistics && Object.keys(entityStatistics).length > 0) {
    const totalCount = Object.values(entityStatistics)
      .reduce((sum: number, stats: any) => sum + (stats.totalCount || 0), 0);
    
    if (totalCount > 1000) {
      limit = Math.min(limit * 1.1, 80);
      threshold = Math.max(threshold - 0.05, 0.4);
    } else if (totalCount < 100) {
      limit = Math.max(limit * 0.9, 15);
      threshold = Math.min(threshold + 0.05, 0.85);
    }
  }
  
  return {
    query: query || "",
    limit: Math.round(limit),
    threshold: Math.round(threshold * 100) / 100
  };
}

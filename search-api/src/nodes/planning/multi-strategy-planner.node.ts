import { StateAnnotation } from "@/types/state";
import { Plan, Function } from "@/types/plan";

interface Strategy {
  name: string;
  steps: Function[];
  weight: number;
  description: string;
}

/**
 * Generate multiple alternative execution plans for medium-confidence queries
 * This node creates several strategies and combines them with weighted merging
 */
export async function multiStrategyPlannerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { intent, query } = state;
  
  if (!intent) {
    throw new Error("Intent is required for multi-strategy planning");
  }
  
  try {
    const strategies: Strategy[] = [];
    
    // Strategy 1: Tool name lookup (if we have tool names)
    if (intent.toolNames && intent.toolNames.length > 0) {
      const steps: Function[] = [
        {
          name: "lookup-by-name",
          parameters: {
            toolNames: intent.toolNames,
            fuzzyMatch: true,
            threshold: 0.7 // Lower threshold for medium confidence
          }
        }
      ];
      
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
        description: `Tool name lookup for ${intent.toolNames.join(", ")}`
      });
    }
    
    // Strategy 2: Semantic search (if we have semantic query)
    if (intent.semanticQuery) {
      const steps: Function[] = [
        {
          name: "semantic-search",
          parameters: {
            query: intent.semanticQuery,
            limit: 40, // Medium limit for balanced coverage
            threshold: 0.6 // Lower threshold for broader results
          }
        }
      ];
      
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
        description: `Semantic search for "${intent.semanticQuery}"`
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
      description: `Multi-strategy plan: ${normalizedStrategies.map(s => s.description).join(", ")} with ${mergeStrategy} merge`
    };
    
    return {
      plan,
      metadata: {
        ...state.metadata
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
      description: "Emergency fallback plan due to multi-strategy planning error"
    };
    
    return {
      plan: fallbackPlan,
      metadata: {
        ...state.metadata
      }
    };
  }
}
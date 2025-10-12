# Phase 5: Planning Nodes - Detailed Implementation Tasks

## Task 5.1: Optimal Planner

### Implementation Details:

**nodes/planning/optimal-planner.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { Plan, Function } from "@/types/plan";
import { functionMappings } from "@/config/constants";

/**
 * Generate a single execution plan for high-confidence queries
 */
export async function optimalPlannerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { intent } = state;
  
  if (!intent) {
    return {
      plan: {
        steps: [],
        description: "No intent available for planning"
      }
    };
  }
  
  try {
    const steps: Function[] = [];
    let description = "Optimal execution plan: ";
    
    // Step 1: Tool name lookup if tool names are specified
    if (intent.toolNames && intent.toolNames.length > 0) {
      steps.push({
        name: "lookup-by-name",
        parameters: {
          toolNames: intent.toolNames,
          fuzzy: true,
          limit: 10
        }
      });
      description += `Lookup tools by name (${intent.toolNames.join(", ")}), `;
    }
    
    // Step 2: Semantic search if we have a semantic query
    if (intent.semanticQuery) {
      const semanticSearchParams: any = {
        query: intent.semanticQuery,
        limit: 10
      };
      
      // Add filters if available
      const filters: any = {};
      if (intent.categories && intent.categories.length > 0) {
        filters.category = { match: { any: intent.categories } };
      }
      if (intent.interface && intent.interface.length > 0) {
        filters.interface = { match: { any: intent.interface } };
      }
      if (intent.deployment && intent.deployment.length > 0) {
        filters.deployment = { match: { any: intent.deployment } };
      }
      
      if (Object.keys(filters).length > 0) {
        semanticSearchParams.filters = filters;
      }
      
      steps.push({
        name: "semantic-search",
        parameters: semanticSearchParams
      });
      description += `Semantic search for "${intent.semanticQuery}", `;
    }
    
    // Step 3: Find similar tools if comparative query
    if (intent.isComparative && intent.referenceTool) {
      steps.push({
        name: "find-similar-by-features",
        parameters: {
          referenceToolId: intent.referenceTool,
          limit: 10
        }
      });
      description += `Find tools similar to ${intent.referenceTool}, `;
    }
    
    // Step 4: Merge results if we have multiple search steps
    if (steps.length > 1) {
      steps.push({
        name: "merge-and-dedupe",
        parameters: {
          strategy: "weighted",
          limit: 20
        },
        inputFromStep: steps.length - 1 // Use results from all previous steps
      });
      description += "merge and deduplicate results, ";
    }
    
    // Step 5: Apply filters
    let lastStepIndex = steps.length - 1;
    
    if (intent.priceConstraints && Object.keys(intent.priceConstraints).length > 0) {
      steps.push({
        name: "filter-by-price",
        parameters: intent.priceConstraints,
        inputFromStep: lastStepIndex
      });
      description += "filter by price, ";
      lastStepIndex++;
    }
    
    if (intent.categories && intent.categories.length > 0 && !steps.some(s => s.name === "semantic-search")) {
      steps.push({
        name: "filter-by-category",
        parameters: { categories: intent.categories },
        inputFromStep: lastStepIndex
      });
      description += `filter by categories (${intent.categories.join(", ")}), `;
      lastStepIndex++;
    }
    
    if (intent.interface && intent.interface.length > 0 && !steps.some(s => s.name === "semantic-search")) {
      steps.push({
        name: "filter-by-interface",
        parameters: { interfaces: intent.interface },
        inputFromStep: lastStepIndex
      });
      description += `filter by interface (${intent.interface.join(", ")}), `;
      lastStepIndex++;
    }
    
    if (intent.functionality && intent.functionality.length > 0) {
      steps.push({
        name: "filter-by-functionality",
        parameters: { functionality: intent.functionality },
        inputFromStep: lastStepIndex
      });
      description += `filter by functionality (${intent.functionality.join(", ")}), `;
      lastStepIndex++;
    }
    
    if (intent.userTypes && intent.userTypes.length > 0) {
      steps.push({
        name: "filter-by-user-type",
        parameters: { userTypes: intent.userTypes },
        inputFromStep: lastStepIndex
      });
      description += `filter by user types (${intent.userTypes.join(", ")}), `;
      lastStepIndex++;
    }
    
    if (intent.deployment && intent.deployment.length > 0 && !steps.some(s => s.name === "semantic-search")) {
      steps.push({
        name: "filter-by-deployment",
        parameters: { deployment: intent.deployment },
        inputFromStep: lastStepIndex
      });
      description += `filter by deployment (${intent.deployment.join(", ")}), `;
      lastStepIndex++;
    }
    
    // Step 6: Exclude tools if specified
    if (intent.excludeTools && intent.excludeTools.length > 0) {
      steps.push({
        name: "exclude-tools",
        parameters: { excludeToolNames: intent.excludeTools },
        inputFromStep: lastStepIndex
      });
      description += `exclude tools (${intent.excludeTools.join(", ")}), `;
      lastStepIndex++;
    }
    
    // Step 7: Rank by relevance
    steps.push({
      name: "rank-by-relevance",
      parameters: {
        strategy: "semantic"
      },
      inputFromStep: lastStepIndex
    });
    description += "rank by relevance";
    
    return {
      plan: {
        steps,
        description: description.replace(/, $/, "") // Remove trailing comma
      }
    };
  } catch (error) {
    console.error("Error in optimalPlannerNode:", error);
    return {
      plan: {
        steps: [{
          name: "semantic-search",
          parameters: {
            query: state.query || "",
            limit: 10
          }
        }],
        description: "Fallback plan due to error: " + (error instanceof Error ? error.message : String(error))
      }
    };
  }
}
```

## Task 5.2: Multi-Strategy Planner

### Implementation Details:

**nodes/planning/multi-strategy-planner.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { MultiStrategyPlan, Plan, Function } from "@/types/plan";
import { functionMappings } from "@/config/constants";

/**
 * Generate multiple alternative execution plans for medium-confidence queries
 */
export async function multiStrategyPlannerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { intent, confidence } = state;
  
  if (!intent) {
    return {
      plan: {
        strategies: [{
          steps: [{
            name: "semantic-search",
            parameters: {
              query: state.query || "",
              limit: 10
            }
          }],
          description: "Fallback strategy: No intent available"
        }],
        weights: [1.0],
        mergeStrategy: "weighted"
      }
    };
  }
  
  try {
    const strategies: Plan[] = [];
    const weights: number[] = [];
    
    // Strategy 1: Focus on tool names if we have high confidence in them
    if (intent.toolNames && intent.toolNames.length > 0 && confidence.breakdown.toolNames >= 0.7) {
      const toolNameStrategy: Plan = {
        steps: [
          {
            name: "lookup-by-name",
            parameters: {
              toolNames: intent.toolNames,
              fuzzy: true,
              limit: 10
            }
          }
        ],
        description: "Tool name lookup strategy"
      };
      
      // Add filters if available
      let lastStepIndex = 0;
      
      if (intent.priceConstraints && Object.keys(intent.priceConstraints).length > 0) {
        toolNameStrategy.steps.push({
          name: "filter-by-price",
          parameters: intent.priceConstraints,
          inputFromStep: lastStepIndex
        });
        lastStepIndex++;
      }
      
      if (intent.categories && intent.categories.length > 0) {
        toolNameStrategy.steps.push({
          name: "filter-by-category",
          parameters: { categories: intent.categories },
          inputFromStep: lastStepIndex
        });
        lastStepIndex++;
      }
      
      strategies.push(toolNameStrategy);
      weights.push(confidence.breakdown.toolNames);
    }
    
    // Strategy 2: Focus on semantic search if we have a semantic query
    if (intent.semanticQuery) {
      const semanticStrategy: Plan = {
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: intent.semanticQuery,
              limit: 10
            }
          }
        ],
        description: "Semantic search strategy"
      };
      
      // Add filters if available
      const filters: any = {};
      if (intent.categories && intent.categories.length > 0) {
        filters.category = { match: { any: intent.categories } };
      }
      if (intent.interface && intent.interface.length > 0) {
        filters.interface = { match: { any: intent.interface } };
      }
      if (intent.deployment && intent.deployment.length > 0) {
        filters.deployment = { match: { any: intent.deployment } };
      }
      
      if (Object.keys(filters).length > 0) {
        semanticStrategy.steps[0].parameters.filters = filters;
      }
      
      strategies.push(semanticStrategy);
      weights.push(0.8); // High weight for semantic search
    }
    
    // Strategy 3: Focus on categories if we have high confidence in them
    if (intent.categories && intent.categories.length > 0 && confidence.breakdown.categories >= 0.6) {
      const categoryStrategy: Plan = {
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: intent.semanticQuery || state.query || "",
              limit: 10,
              filters: {
                category: { match: { any: intent.categories } }
              }
            }
          }
        ],
        description: "Category-focused strategy"
      };
      
      strategies.push(categoryStrategy);
      weights.push(confidence.breakdown.categories);
    }
    
    // Strategy 4: Focus on functionality if we have high confidence in it
    if (intent.functionality && intent.functionality.length > 0 && confidence.breakdown.functionality >= 0.6) {
      const functionalityStrategy: Plan = {
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: intent.semanticQuery || state.query || "",
              limit: 10,
              filters: {
                functionality: { match: { any: intent.functionality } }
              }
            }
          }
        ],
        description: "Functionality-focused strategy"
      };
      
      strategies.push(functionalityStrategy);
      weights.push(confidence.breakdown.functionality);
    }
    
    // Strategy 5: Comparative approach if it's a comparative query
    if (intent.isComparative && intent.referenceTool) {
      const comparativeStrategy: Plan = {
        steps: [
          {
            name: "find-similar-by-features",
            parameters: {
              referenceToolId: intent.referenceTool,
              limit: 10
            }
          }
        ],
        description: "Comparative strategy"
      };
      
      strategies.push(comparativeStrategy);
      weights.push(confidence.breakdown.comparative || 0.7);
    }
    
    // If we don't have any strategies, create a fallback
    if (strategies.length === 0) {
      strategies.push({
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: state.query || "",
              limit: 10
            }
          }
        ],
        description: "Fallback strategy: No specific intent elements with high confidence"
      });
      weights.push(1.0);
    }
    
    // Normalize weights
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights = weights.map(weight => weight / totalWeight);
    
    // Determine merge strategy based on the number of strategies
    let mergeStrategy: "weighted" | "best" | "diverse" = "weighted";
    if (strategies.length >= 3) {
      mergeStrategy = "diverse"; // Use diverse strategy for more than 2 approaches
    } else if (strategies.length === 2 && Math.max(...normalizedWeights) > 0.7) {
      mergeStrategy = "best"; // Use best strategy if one is much better than the other
    }
    
    return {
      plan: {
        strategies,
        weights: normalizedWeights,
        mergeStrategy,
        description: `Multi-strategy plan with ${strategies.length} approaches using ${mergeStrategy} merge strategy`
      }
    };
  } catch (error) {
    console.error("Error in multiStrategyPlannerNode:", error);
    return {
      plan: {
        strategies: [{
          steps: [{
            name: "semantic-search",
            parameters: {
              query: state.query || "",
              limit: 10
            }
          }],
          description: "Fallback strategy due to error"
        }],
        weights: [1.0],
        mergeStrategy: "weighted"
      }
    };
  }
}
```

## Task 5.3: Fallback Planner

### Implementation Details:

**nodes/planning/fallback-planner.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { Plan, Function } from "@/types/plan";

/**
 * Generate a simple semantic search plan for low-confidence queries
 */
export async function fallbackPlannerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { intent, query, preprocessedQuery } = state;
  
  try {
    // Use the most reliable query we have
    const fallbackQuery = intent.semanticQuery || preprocessedQuery || query || "";
    
    const steps: Function[] = [
      {
        name: "semantic-search",
        parameters: {
          query: fallbackQuery,
          limit: 20 // Use a higher limit for fallback to get more results
        }
      }
    ];
    
    let description = "Fallback plan: Broad semantic search";
    
    // Add any high-confidence filters we might have
    const filters: any = {};
    
    // Only add filters if we have relatively high confidence in them
    if (intent.categories && intent.categories.length > 0 && state.confidence.breakdown.categories >= 0.6) {
      filters.category = { match: { any: intent.categories } };
      description += ` with category filter (${intent.categories.join(", ")})`;
    }
    
    if (intent.interface && intent.interface.length > 0 && state.confidence.breakdown.interface >= 0.7) {
      filters.interface = { match: { any: intent.interface } };
      description += ` with interface filter (${intent.interface.join(", ")})`;
    }
    
    if (Object.keys(filters).length > 0) {
      steps[0].parameters.filters = filters;
    }
    
    // Add ranking step
    steps.push({
      name: "rank-by-relevance",
      parameters: {
        strategy: "semantic"
      },
      inputFromStep: 0
    });
    
    // Generate suggested refinements based on low-confidence elements
    const suggestedRefinements: string[] = [];
    
    if (state.confidence.breakdown.toolNames < 0.5 && !intent.toolNames) {
      suggestedRefinements.push("Specify tool names you're interested in");
    }
    
    if (state.confidence.breakdown.categories < 0.5 && !intent.categories) {
      suggestedRefinements.push("Specify categories of tools you're looking for");
    }
    
    if (state.confidence.breakdown.functionality < 0.5 && !intent.functionality) {
      suggestedRefinements.push("Specify functionality you need");
    }
    
    if (state.confidence.breakdown.userTypes < 0.5 && !intent.userTypes) {
      suggestedRefinements.push("Specify who will be using the tools");
    }
    
    if (state.confidence.breakdown.interface < 0.5 && !intent.interface) {
      suggestedRefinements.push("Specify interface preferences (web, desktop, mobile, etc.)");
    }
    
    if (state.confidence.breakdown.deployment < 0.5 && !intent.deployment) {
      suggestedRefinements.push("Specify deployment preferences (cloud, self-hosted, etc.)");
    }
    
    if (state.confidence.breakdown.comparative < 0.5 && intent.isComparative && !intent.referenceTool) {
      suggestedRefinements.push("Specify the reference tool for comparison");
    }
    
    return {
      plan: {
        steps,
        description
      },
      suggestedRefinements
    };
  } catch (error) {
    console.error("Error in fallbackPlannerNode:", error);
    return {
      plan: {
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: state.query || "",
              limit: 20
            }
          }
        ],
        description: "Emergency fallback plan due to error"
      },
      suggestedRefinements: ["Try a more specific query"]
    };
  }
}
```

## Task 5.4: Plan Validator

### Implementation Details:

**nodes/planning/plan-validator.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { Plan, MultiStrategyPlan, Function } from "@/types/plan";
import { functionMappings } from "@/config/constants";

/**
 * Validate plan structure and referenced functions
 */
export async function planValidatorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { plan } = state;
  
  if (!plan) {
    return {
      plan: {
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: state.query || "",
              limit: 10
            }
          }
        ],
        description: "Default plan: No plan provided for validation"
      },
      metadata: {
        ...state.metadata,
        planValidation: {
          isValid: false,
          errors: ["No plan provided"],
          warnings: []
        }
      }
    };
  }
  
  try {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;
    
    // Check if it's a multi-strategy plan
    const isMultiStrategy = "strategies" in plan;
    
    if (isMultiStrategy) {
      const multiStrategyPlan = plan as MultiStrategyPlan;
      
      // Validate each strategy
      multiStrategyPlan.strategies.forEach((strategy, index) => {
        if (!strategy.steps || strategy.steps.length === 0) {
          errors.push(`Strategy ${index + 1} has no steps`);
          isValid = false;
        }
        
        strategy.steps.forEach((step, stepIndex) => {
          if (!step.name) {
            errors.push(`Strategy ${index + 1}, Step ${stepIndex + 1}: Missing function name`);
            isValid = false;
          } else if (!functionMappings[step.name as keyof typeof functionMappings]) {
            errors.push(`Strategy ${index + 1}, Step ${stepIndex + 1}: Unknown function "${step.name}"`);
            isValid = false;
          }
          
          if (step.inputFromStep !== undefined && (step.inputFromStep < 0 || step.inputFromStep >= stepIndex)) {
            errors.push(`Strategy ${index + 1}, Step ${stepIndex + 1}: Invalid inputFromStep ${step.inputFromStep}`);
            isValid = false;
          }
        });
      });
      
      // Validate weights
      if (!multiStrategyPlan.weights || multiStrategyPlan.weights.length !== multiStrategyPlan.strategies.length) {
        errors.push("Weights array length doesn't match strategies count");
        isValid = false;
      } else {
        const totalWeight = multiStrategyPlan.weights.reduce((sum, weight) => sum + weight, 0);
        if (Math.abs(totalWeight - 1.0) > 0.01) {
          warnings.push(`Weights don't sum to 1.0 (sum: ${totalWeight.toFixed(2)})`);
        }
      }
      
      // Validate merge strategy
      if (!["weighted", "best", "diverse"].includes(multiStrategyPlan.mergeStrategy)) {
        errors.push(`Invalid merge strategy: ${multiStrategyPlan.mergeStrategy}`);
        isValid = false;
      }
    } else {
      // Validate single plan
      const singlePlan = plan as Plan;
      
      if (!singlePlan.steps || singlePlan.steps.length === 0) {
        errors.push("Plan has no steps");
        isValid = false;
      }
      
      singlePlan.steps.forEach((step, index) => {
        if (!step.name) {
          errors.push(`Step ${index + 1}: Missing function name`);
          isValid = false;
        } else if (!functionMappings[step.name as keyof typeof functionMappings]) {
          errors.push(`Step ${index + 1}: Unknown function "${step.name}"`);
          isValid = false;
        }
        
        if (step.inputFromStep !== undefined && (step.inputFromStep < 0 || step.inputFromStep >= index)) {
          errors.push(`Step ${index + 1}: Invalid inputFromStep ${step.inputFromStep}`);
          isValid = false;
        }
      });
    }
    
    // Add fallback steps if the plan seems fragile
    if (isValid && errors.length === 0) {
      const validatedPlan = JSON.parse(JSON.stringify(plan)); // Deep clone
      
      if (isMultiStrategy) {
        const multiStrategyPlan = validatedPlan as MultiStrategyPlan;
        
        // Check if all strategies are too similar
        if (multiStrategyPlan.strategies.length > 1) {
          const strategyTypes = multiStrategyPlan.strategies.map(s => 
            s.steps[0]?.name || "unknown"
          );
          
          const uniqueTypes = new Set(strategyTypes);
          if (uniqueTypes.size === 1) {
            warnings.push("All strategies use the same primary function");
            
            // Add a diverse strategy
            multiStrategyPlan.strategies.push({
              steps: [
                {
                  name: "semantic-search",
                  parameters: {
                    query: state.query || "",
                    limit: 15
                  }
                }
              ],
              description: "Added diverse strategy"
            });
            
            // Adjust weights
            const equalWeight = 1 / multiStrategyPlan.strategies.length;
            multiStrategyPlan.weights = Array(multiStrategyPlan.strategies.length).fill(equalWeight);
          }
        }
      } else {
        // For single plans, check if we should add a fallback
        const singlePlan = validatedPlan as Plan;
        const hasSearchStep = singlePlan.steps.some(step => 
          ["semantic-search", "lookup-by-name"].includes(step.name)
        );
        
        if (!hasSearchStep) {
          warnings.push("Plan doesn't include a search step, adding semantic search");
          
          singlePlan.steps.unshift({
            name: "semantic-search",
            parameters: {
              query: state.query || "",
              limit: 10
            }
          });
          
          // Update inputFromStep for existing steps
          singlePlan.steps.forEach((step, index) => {
            if (index > 0 && step.inputFromStep !== undefined) {
              step.inputFromStep += 1;
            }
          });
        }
      }
      
      return {
        plan: validatedPlan,
        metadata: {
          ...state.metadata,
          planValidation: {
            isValid,
            errors,
            warnings
          }
        }
      };
    }
    
    // If there are errors, return a fallback plan
    return {
      plan: {
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: state.query || "",
              limit: 10
            }
          }
        ],
        description: "Fallback plan due to validation errors"
      },
      metadata: {
        ...state.metadata,
        planValidation: {
          isValid: false,
          errors,
          warnings
        }
      }
    };
  } catch (error) {
    console.error("Error in planValidatorNode:", error);
    return {
      plan: {
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: state.query || "",
              limit: 10
            }
          }
        ],
        description: "Emergency fallback plan due to validation error"
      },
      metadata: {
        ...state.metadata,
        planValidation: {
          isValid: false,
          errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
          warnings: []
        }
      }
    };
  }
}
```

## Task 5.5: Refinement Planner

### Implementation Details:

**nodes/planning/refinement-planner.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { Plan, Function } from "@/types/plan";

/**
 * Generate a plan to refine results when too many are found
 */
export async function refinementPlannerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { queryResults, plan, iterations } = state;
  
  if (!queryResults || queryResults.length === 0) {
    return {
      plan: {
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: state.query || "",
              limit: 10
            }
          }
        ],
        description: "Refinement fallback: No results to refine"
      }
    };
  }
  
  try {
    const refinementSteps: Function[] = [];
    let description = "Refinement plan: ";
    
    // Analyze the current results to determine what to refine
    const categories = new Map<string, number>();
    const interfaces = new Map<string, number>();
    const deployments = new Map<string, number>();
    
    queryResults.forEach(tool => {
      if (tool.category) {
        categories.set(tool.category, (categories.get(tool.category) || 0) + 1);
      }
      
      if (tool.interface) {
        const interfaceTypes = Array.isArray(tool.interface) ? tool.interface : [tool.interface];
        interfaceTypes.forEach((iface: string) => {
          interfaces.set(iface, (interfaces.get(iface) || 0) + 1);
        });
      }
      
      if (tool.deployment) {
        const deploymentTypes = Array.isArray(tool.deployment) ? tool.deployment : [tool.deployment];
        deploymentTypes.forEach((dep: string) => {
          deployments.set(dep, (deployments.get(dep) || 0) + 1);
        });
      }
    });
    
    // Step 1: Filter by the most common category if there are multiple categories
    if (categories.size > 1) {
      const topCategory = Array.from(categories.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
      
      refinementSteps.push({
        name: "filter-by-category",
        parameters: {
          categories: [topCategory]
        },
        inputFromStep: 0 // Use current results
      });
      
      description += `filter by most common category (${topCategory}), `;
    }
    
    // Step 2: Filter by interface if there are multiple interfaces
    if (interfaces.size > 1) {
      const topInterface = Array.from(interfaces.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
      
      refinementSteps.push({
        name: "filter-by-interface",
        parameters: {
          interfaces: [topInterface]
        },
        inputFromStep: 0 // Use current results
      });
      
      description += `filter by most common interface (${topInterface}), `;
    }
    
    // Step 3: Filter by deployment if there are multiple deployments
    if (deployments.size > 1) {
      const topDeployment = Array.from(deployments.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
      
      refinementSteps.push({
        name: "filter-by-deployment",
        parameters: {
          deployment: [topDeployment]
        },
        inputFromStep: 0 // Use current results
      });
      
      description += `filter by most common deployment (${topDeployment}), `;
    }
    
    // Step 4: If we still don't have enough filters, add a relevance filter
    if (refinementSteps.length === 0) {
      // Calculate average relevance score
      const relevanceScores = queryResults
        .filter(tool => tool.relevanceScore !== undefined)
        .map(tool => tool.relevanceScore);
      
      if (relevanceScores.length > 0) {
        const averageRelevance = relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length;
        
        // Filter for tools above average relevance
        refinementSteps.push({
          name: "filter-by-relevance",
          parameters: {
            minRelevance: averageRelevance + 0.1 // Slightly above average
          },
          inputFromStep: 0 // Use current results
        });
        
        description += `filter by relevance (>${(averageRelevance + 0.1).toFixed(2)}), `;
      }
    }
    
    // Step 5: Re-rank the refined results
    refinementSteps.push({
      name: "rank-by-relevance",
      parameters: {
        strategy: "semantic"
      },
      inputFromStep: refinementSteps.length > 0 ? refinementSteps.length - 1 : 0
    });
    
    description += "re-rank by relevance";
    
    // Update iteration count
    const newIterations = {
      refinementAttempts: (iterations?.refinementAttempts || 0) + 1,
      expansionAttempts: iterations?.expansionAttempts || 0,
      maxAttempts: iterations?.maxAttempts || 2
    };
    
    return {
      plan: {
        steps: refinementSteps,
        description: description.replace(/, $/, "") // Remove trailing comma
      },
      iterations: newIterations,
      metadata: {
        ...state.metadata,
        refinementReason: `Too many results (${queryResults.length}), applying filters to narrow down`
      }
    };
  } catch (error) {
    console.error("Error in refinementPlannerNode:", error);
    return {
      plan: {
        steps: [
          {
            name: "rank-by-relevance",
            parameters: {
              strategy: "semantic"
            },
            inputFromStep: 0
          }
        ],
        description: "Emergency refinement plan due to error"
      },
      metadata: {
        ...state.metadata,
        refinementReason: "Error during refinement planning",
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}
```

## Task 5.6: Expansion Planner

### Implementation Details:

**nodes/planning/expansion-planner.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { Plan, Function } from "@/types/plan";

/**
 * Generate a plan to expand search when too few results are found
 */
export async function expansionPlannerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { queryResults, plan, intent, iterations } = state;
  
  if (!queryResults || queryResults.length === 0) {
    return {
      plan: {
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: state.query || "",
              limit: 20 // Higher limit for expansion
            }
          }
        ],
        description: "Expansion fallback: No results to expand from"
      }
    };
  }
  
  try {
    const expansionSteps: Function[] = [];
    let description = "Expansion plan: ";
    
    // Step 1: Relax category filters if they exist
    if (intent.categories && intent.categories.length > 0) {
      // Find related categories to the current ones
      expansionSteps.push({
        name: "expand-by-category",
        parameters: {
          categories: intent.categories,
          includeRelated: true,
          limit: 20
        }
      });
      
      description += `expand categories (${intent.categories.join(", ")}), `;
    }
    
    // Step 2: Relax functionality filters if they exist
    if (intent.functionality && intent.functionality.length > 0) {
      expansionSteps.push({
        name: "expand-by-functionality",
        parameters: {
          functionality: intent.functionality,
          includeRelated: true,
          limit: 20
        }
      });
      
      description += `expand functionality (${intent.functionality.join(", ")}), `;
    }
    
    // Step 3: Perform a broader semantic search with relaxed filters
    expansionSteps.push({
      name: "semantic-search",
      parameters: {
        query: intent.semanticQuery || state.query || "",
        limit: 20, // Higher limit for expansion
        // No filters for broader search
      }
    });
    
    description += "broader semantic search, ";
    
    // Step 4: Merge current results with expanded results
    expansionSteps.push({
      name: "merge-and-dedupe",
      parameters: {
        strategy: "diverse", // Use diverse strategy to get varied results
        limit: 20
      },
      inputFromStep: expansionSteps.length - 1 // Use results from all previous steps
    });
    
    description += "merge and deduplicate, ";
    
    // Step 5: Re-rank the expanded results
    expansionSteps.push({
      name: "rank-by-relevance",
      parameters: {
        strategy: "hybrid" // Use hybrid strategy to balance relevance and popularity
      },
      inputFromStep: expansionSteps.length - 1
    });
    
    description += "re-rank with hybrid strategy";
    
    // Update iteration count
    const newIterations = {
      refinementAttempts: iterations?.refinementAttempts || 0,
      expansionAttempts: (iterations?.expansionAttempts || 0) + 1,
      maxAttempts: iterations?.maxAttempts || 2
    };
    
    return {
      plan: {
        steps: expansionSteps,
        description: description.replace(/, $/, "") // Remove trailing comma
      },
      iterations: newIterations,
      metadata: {
        ...state.metadata,
        expansionReason: `Too few results (${queryResults.length}), expanding search criteria`
      }
    };
  } catch (error) {
    console.error("Error in expansionPlannerNode:", error);
    return {
      plan: {
        steps: [
          {
            name: "semantic-search",
            parameters: {
              query: state.query || "",
              limit: 20
            }
          }
        ],
        description: "Emergency expansion plan due to error"
      },
      metadata: {
        ...state.metadata,
        expansionReason: "Error during expansion planning",
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}
```

**nodes/planning/index.ts**
```typescript
// Export all planning nodes for easy importing
export { optimalPlannerNode } from "./optimal-planner.node";
export { multiStrategyPlannerNode } from "./multi-strategy-planner.node";
export { fallbackPlannerNode } from "./fallback-planner.node";
export { planValidatorNode } from "./plan-validator.node";
export { refinementPlannerNode } from "./refinement-planner.node";
export { expansionPlannerNode } from "./expansion-planner.node";
```

With these detailed implementations, you'll have a comprehensive set of routing and planning nodes that can determine the appropriate execution strategy based on confidence levels and result quality. These nodes work together to create adaptive execution plans that can refine or expand searches as needed, ensuring the best possible results for the user's query.
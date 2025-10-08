import { State } from "../../types/state";
import { Plan, Function } from "../../types/plan";

/**
 * Refinement Planner Node
 * 
 * Generates a plan to refine results when too many are found.
 * Analyzes categories, interfaces, and deployments of current results
 * to apply filters and includes a fallback to filter by relevance.
 */
export const refinementPlannerNode = (state: State): Partial<State> => {
  try {
    const { queryResults, intent, query, preprocessedQuery } = state;
    
    if (!queryResults || queryResults.length === 0) {
      throw new Error("No query results to refine");
    }
    
    const searchQuery = preprocessedQuery || query;
    const steps: Function[] = [];
    let stepIndex = 0;
    
    // Start with current results (passed as input)
    // Step 1: Analyze current results to determine best refinement strategy
    const refinementStrategy = analyzeResultsForRefinement(queryResults, intent);
    
    // Apply refinement filters based on analysis
    if (refinementStrategy.categoryFilter && refinementStrategy.categoryFilter.length > 0) {
      steps.push({
        name: "filter-by-category",
        parameters: {
          categories: refinementStrategy.categoryFilter,
          strict: true // Strict filtering for refinement
        },
        inputFromStep: stepIndex > 0 ? stepIndex - 1 : undefined
      });
      stepIndex++;
    }
    
    if (refinementStrategy.interfaceFilter && refinementStrategy.interfaceFilter.length > 0) {
      steps.push({
        name: "filter-by-interface",
        parameters: {
          interfaces: refinementStrategy.interfaceFilter,
          strict: true // Strict filtering for refinement
        },
        inputFromStep: stepIndex > 0 ? stepIndex - 1 : undefined
      });
      stepIndex++;
    }
    
    if (refinementStrategy.deploymentFilter && refinementStrategy.deploymentFilter.length > 0) {
      steps.push({
        name: "filter-by-deployment",
        parameters: {
          deployments: refinementStrategy.deploymentFilter,
          strict: true // Strict filtering for refinement
        },
        inputFromStep: stepIndex > 0 ? stepIndex - 1 : undefined
      });
      stepIndex++;
    }
    
    if (refinementStrategy.functionalityFilter && refinementStrategy.functionalityFilter.length > 0) {
      steps.push({
        name: "filter-by-functionality",
        parameters: {
          functionalities: refinementStrategy.functionalityFilter,
          strict: true // Strict filtering for refinement
        },
        inputFromStep: stepIndex > 0 ? stepIndex - 1 : undefined
      });
      stepIndex++;
    }
    
    if (refinementStrategy.userTypeFilter && refinementStrategy.userTypeFilter.length > 0) {
      steps.push({
        name: "filter-by-user-types",
        parameters: {
          userTypes: refinementStrategy.userTypeFilter,
          strict: true // Strict filtering for refinement
        },
        inputFromStep: stepIndex > 0 ? stepIndex - 1 : undefined
      });
      stepIndex++;
    }
    
    // Apply price filter if specified in intent
    if (intent?.priceConstraints) {
      const priceParams: any = {};
      
      if (intent.priceConstraints.hasFreeTier !== undefined) {
        priceParams.hasFreeTier = intent.priceConstraints.hasFreeTier;
      }
      
      if (intent.priceConstraints.maxPrice !== undefined) {
        priceParams.maxPrice = intent.priceConstraints.maxPrice;
      }
      
      if (intent.priceConstraints.minPrice !== undefined) {
        priceParams.minPrice = intent.priceConstraints.minPrice;
      }
      
      if (intent.priceConstraints.pricingModel && intent.priceConstraints.pricingModel.length > 0) {
        priceParams.pricingModel = intent.priceConstraints.pricingModel;
      }
      
      if (Object.keys(priceParams).length > 0) {
        steps.push({
          name: "filter-by-price",
          parameters: {
            ...priceParams,
            strict: true
          },
          inputFromStep: stepIndex > 0 ? stepIndex - 1 : undefined
        });
        stepIndex++;
      }
    }
    
    // Exclude tools if specified
    if (intent?.excludeTools && intent.excludeTools.length > 0) {
      steps.push({
        name: "exclude-tools",
        parameters: {
          toolNames: intent.excludeTools
        },
        inputFromStep: stepIndex > 0 ? stepIndex - 1 : undefined
      });
      stepIndex++;
    }
    
    // If no specific filters were applied, fall back to relevance filtering
    if (steps.length === 0) {
      steps.push({
        name: "rank-by-relevance",
        parameters: {
          query: searchQuery,
          strategy: "strict", // Use strict relevance for refinement
          limit: Math.min(20, Math.floor(queryResults.length * 0.5)) // Reduce by half
        },
        inputFromStep: undefined
      });
      stepIndex++;
    }
    
    // Final re-ranking with hybrid strategy for best results
    steps.push({
      name: "rank-by-relevance",
      parameters: {
        query: searchQuery,
        strategy: "hybrid", // Hybrid ranking for final refinement
        limit: 15 // Limit to reasonable number for refined results
      },
      inputFromStep: stepIndex > 0 ? stepIndex - 1 : undefined
    });
    
    const plan: Plan = {
      steps,
      description: `Refinement plan to narrow ${queryResults.length} results using ${refinementStrategy.appliedFilters.join(", ")} filters`
    };
    
    return {
      plan,
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "refinement-planner"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "refinement-planner": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
    
  } catch (error) {
    console.error("Error in refinement planner:", error);
    
    // Emergency fallback - just apply strict relevance ranking
    const emergencyPlan: Plan = {
      steps: [
        {
          name: "rank-by-relevance",
          parameters: {
            query: state.preprocessedQuery || state.query,
            strategy: "strict",
            limit: 15
          },
          inputFromStep: undefined
        }
      ],
      description: `Emergency refinement plan: strict relevance ranking`
    };
    
    return {
      plan: emergencyPlan,
      errors: [
        ...(state.errors || []),
        {
          node: "refinement-planner",
          error: error instanceof Error ? error : new Error("Unknown error in refinement planner"),
          timestamp: new Date()
        }
      ],
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "refinement-planner"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "refinement-planner": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
  }
};

/**
 * Analyzes current results to determine the best refinement strategy
 */
function analyzeResultsForRefinement(results: any[], intent: any): {
  categoryFilter: string[];
  interfaceFilter: string[];
  deploymentFilter: string[];
  functionalityFilter: string[];
  userTypeFilter: string[];
  appliedFilters: string[];
} {
  const strategy = {
    categoryFilter: [],
    interfaceFilter: [],
    deploymentFilter: [],
    functionalityFilter: [],
    userTypeFilter: [],
    appliedFilters: []
  };
  
  // Analyze result distribution to find most common attributes
  const categoryCount: Record<string, number> = {};
  const interfaceCount: Record<string, number> = {};
  const deploymentCount: Record<string, number> = {};
  const functionalityCount: Record<string, number> = {};
  const userTypeCount: Record<string, number> = {};
  
  // Count occurrences of each attribute in results
  results.forEach(result => {
    // Count categories
    if (result.categories && Array.isArray(result.categories)) {
      result.categories.forEach((cat: string) => {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
    }
    
    // Count interfaces
    if (result.interfaces && Array.isArray(result.interfaces)) {
      result.interfaces.forEach((iface: string) => {
        interfaceCount[iface] = (interfaceCount[iface] || 0) + 1;
      });
    }
    
    // Count deployments
    if (result.deployment && Array.isArray(result.deployment)) {
      result.deployment.forEach((deploy: string) => {
        deploymentCount[deploy] = (deploymentCount[deploy] || 0) + 1;
      });
    }
    
    // Count functionality
    if (result.functionality && Array.isArray(result.functionality)) {
      result.functionality.forEach((func: string) => {
        functionalityCount[func] = (functionalityCount[func] || 0) + 1;
      });
    }
    
    // Count user types
    if (result.userTypes && Array.isArray(result.userTypes)) {
      result.userTypes.forEach((userType: string) => {
        userTypeCount[userType] = (userTypeCount[userType] || 0) + 1;
      });
    }
  });
  
  // Determine filters based on intent preferences and result distribution
  const resultCount = results.length;
  const threshold = Math.max(2, Math.floor(resultCount * 0.3)); // At least 30% of results
  
  // Use intent categories if available, otherwise use most common categories
  if (intent?.categories && intent.categories.length > 0) {
    strategy.categoryFilter = intent.categories;
    strategy.appliedFilters.push("category");
  } else {
    const topCategories = Object.entries(categoryCount)
      .filter(([_, count]) => count >= threshold)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 2)
      .map(([cat, _]) => cat);
    
    if (topCategories.length > 0) {
      strategy.categoryFilter = topCategories;
      strategy.appliedFilters.push("category");
    }
  }
  
  // Use intent interface if available, otherwise use most common interfaces
  if (intent?.interface && intent.interface.length > 0) {
    strategy.interfaceFilter = intent.interface;
    strategy.appliedFilters.push("interface");
  } else {
    const topInterfaces = Object.entries(interfaceCount)
      .filter(([_, count]) => count >= threshold)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 2)
      .map(([iface, _]) => iface);
    
    if (topInterfaces.length > 0) {
      strategy.interfaceFilter = topInterfaces;
      strategy.appliedFilters.push("interface");
    }
  }
  
  // Use intent deployment if available, otherwise use most common deployments
  if (intent?.deployment && intent.deployment.length > 0) {
    strategy.deploymentFilter = intent.deployment;
    strategy.appliedFilters.push("deployment");
  } else {
    const topDeployments = Object.entries(deploymentCount)
      .filter(([_, count]) => count >= threshold)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 2)
      .map(([deploy, _]) => deploy);
    
    if (topDeployments.length > 0) {
      strategy.deploymentFilter = topDeployments;
      strategy.appliedFilters.push("deployment");
    }
  }
  
  // Use intent functionality if available, otherwise use most common functionality
  if (intent?.functionality && intent.functionality.length > 0) {
    strategy.functionalityFilter = intent.functionality;
    strategy.appliedFilters.push("functionality");
  } else {
    const topFunctionality = Object.entries(functionalityCount)
      .filter(([_, count]) => count >= threshold)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 2)
      .map(([func, _]) => func);
    
    if (topFunctionality.length > 0) {
      strategy.functionalityFilter = topFunctionality;
      strategy.appliedFilters.push("functionality");
    }
  }
  
  // Use intent user types if available, otherwise use most common user types
  if (intent?.userTypes && intent.userTypes.length > 0) {
    strategy.userTypeFilter = intent.userTypes;
    strategy.appliedFilters.push("user-types");
  } else {
    const topUserTypes = Object.entries(userTypeCount)
      .filter(([_, count]) => count >= threshold)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 2)
      .map(([userType, _]) => userType);
    
    if (topUserTypes.length > 0) {
      strategy.userTypeFilter = topUserTypes;
      strategy.appliedFilters.push("user-types");
    }
  }
  
  // If no filters were determined, fall back to relevance
  if (strategy.appliedFilters.length === 0) {
    strategy.appliedFilters.push("relevance");
  }
  
  return strategy;
}
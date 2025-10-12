import { State } from "../../types/state";
import { Plan, Function } from "../../types/plan";

/**
 * Expansion Planner Node
 * 
 * Generates a plan to expand search when too few results are found.
 * Relaxes category and functionality filters, performs broader semantic search,
 * merges and deduplicates results, and re-ranks with hybrid strategy.
 */
export const expansionPlannerNode = (state: State): Partial<State> => {
  try {
    const { queryResults, intent, query, preprocessedQuery } = state;
    
    const searchQuery = preprocessedQuery || query;
    const steps: Function[] = [];
    let stepIndex = 0;
    
    // Determine expansion strategy based on current results and intent
    const expansionStrategy = determineExpansionStrategy(queryResults, intent);
    
    // Step 1: Perform broader semantic search with relaxed parameters
    steps.push({
      name: "semantic-search",
      parameters: {
        query: searchQuery,
        limit: 50, // Increased limit for expansion
        threshold: 0.3, // Lower threshold for broader results
        includeDescription: true,
        includeTags: true,
        includeCategories: true
      },
      inputFromStep: undefined
    });
    stepIndex++;
    
    // Step 2: If we have existing results, merge them with new results
    if (queryResults && queryResults.length > 0) {
      steps.push({
        name: "merge-results",
        parameters: {
          strategy: "union", // Union merge for expansion
          deduplicateBy: "name" // Remove duplicates by tool name
        },
        inputFromStep: stepIndex - 1
      });
      stepIndex++;
    }
    
    // Step 3: Apply relaxed category filters if intent has categories
    if (expansionStrategy.relaxedCategories && expansionStrategy.relaxedCategories.length > 0) {
      steps.push({
        name: "filter-by-category",
        parameters: {
          categories: expansionStrategy.relaxedCategories,
          strict: false // Non-strict filtering for expansion
        },
        inputFromStep: stepIndex - 1
      });
      stepIndex++;
    }
    
    // Step 4: Apply relaxed functionality filters if intent has functionality
    if (expansionStrategy.relaxedFunctionality && expansionStrategy.relaxedFunctionality.length > 0) {
      steps.push({
        name: "filter-by-functionality",
        parameters: {
          functionalities: expansionStrategy.relaxedFunctionality,
          strict: false // Non-strict filtering for expansion
        },
        inputFromStep: stepIndex - 1
      });
      stepIndex++;
    }
    
    // Step 5: Apply relaxed interface filters if intent has interface preferences
    if (expansionStrategy.relaxedInterfaces && expansionStrategy.relaxedInterfaces.length > 0) {
      steps.push({
        name: "filter-by-interface",
        parameters: {
          interfaces: expansionStrategy.relaxedInterfaces,
          strict: false // Non-strict filtering for expansion
        },
        inputFromStep: stepIndex - 1
      });
      stepIndex++;
    }
    
    // Step 6: Apply relaxed deployment filters if intent has deployment preferences
    if (expansionStrategy.relaxedDeployments && expansionStrategy.relaxedDeployments.length > 0) {
      steps.push({
        name: "filter-by-deployment",
        parameters: {
          deployments: expansionStrategy.relaxedDeployments,
          strict: false // Non-strict filtering for expansion
        },
        inputFromStep: stepIndex - 1
      });
      stepIndex++;
    }
    
    // Step 7: Apply relaxed user type filters if intent has user type preferences
    if (expansionStrategy.relaxedUserTypes && expansionStrategy.relaxedUserTypes.length > 0) {
      steps.push({
        name: "filter-by-user-types",
        parameters: {
          userTypes: expansionStrategy.relaxedUserTypes,
          strict: false // Non-strict filtering for expansion
        },
        inputFromStep: stepIndex - 1
      });
      stepIndex++;
    }
    
    // Step 8: Apply relaxed price constraints if specified
    if (intent?.priceConstraints && expansionStrategy.applyPriceFilter) {
      const priceParams: any = {};
      
      // For expansion, be more lenient with price constraints
      if (intent.priceConstraints.hasFreeTier !== undefined) {
        priceParams.hasFreeTier = intent.priceConstraints.hasFreeTier;
      }
      
      // Only apply max price if it's reasonable for expansion
      if (intent.priceConstraints.maxPrice !== undefined && intent.priceConstraints.maxPrice > 0) {
        priceParams.maxPrice = intent.priceConstraints.maxPrice * 1.5; // Increase by 50% for expansion
      }
      
      // Don't apply min price for expansion to get more results
      
      if (intent.priceConstraints.pricingModel && intent.priceConstraints.pricingModel.length > 0) {
        priceParams.pricingModel = intent.priceConstraints.pricingModel;
      }
      
      if (Object.keys(priceParams).length > 0) {
        steps.push({
          name: "filter-by-price",
          parameters: {
            ...priceParams,
            strict: false // Non-strict for expansion
          },
          inputFromStep: stepIndex - 1
        });
        stepIndex++;
      }
    }
    
    // Step 9: Exclude tools if specified (still apply exclusions even in expansion)
    if (intent?.excludeTools && intent.excludeTools.length > 0) {
      steps.push({
        name: "exclude-tools",
        parameters: {
          toolNames: intent.excludeTools
        },
        inputFromStep: stepIndex - 1
      });
      stepIndex++;
    }
    
    // Step 10: Find similar tools to expand the result set
    steps.push({
      name: "find-similar-tools",
      parameters: {
        limit: 20, // Find more similar tools for expansion
        threshold: 0.4, // Lower threshold for broader similarity
        includeCategories: true,
        includeFunctionality: true
      },
      inputFromStep: stepIndex - 1
    });
    stepIndex++;
    
    // Step 11: Merge similar tools with current results
    steps.push({
      name: "merge-results",
      parameters: {
        strategy: "union",
        deduplicateBy: "name"
      },
      inputFromStep: stepIndex - 1
    });
    stepIndex++;
    
    // Step 12: Final ranking with hybrid strategy for best expanded results
    steps.push({
      name: "rank-by-relevance",
      parameters: {
        query: searchQuery,
        strategy: "hybrid", // Hybrid ranking balances relevance and diversity
        limit: 30 // Reasonable limit for expanded results
      },
      inputFromStep: stepIndex - 1
    });
    
    const plan: Plan = {
      steps,
      description: `Expansion plan to broaden search using ${expansionStrategy.appliedStrategies.join(", ")} strategies`
    };
    
    return {
      plan,
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "expansion-planner"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "expansion-planner": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
    
  } catch (error) {
    console.error("Error in expansion planner:", error);
    
    // Emergency fallback - broad semantic search with basic ranking
    const emergencyPlan: Plan = {
      steps: [
        {
          name: "semantic-search",
          parameters: {
            query: state.preprocessedQuery || state.query,
            limit: 40,
            threshold: 0.2, // Very low threshold for maximum expansion
            includeDescription: true,
            includeTags: true,
            includeCategories: true
          },
          inputFromStep: undefined
        },
        {
          name: "rank-by-relevance",
          parameters: {
            query: state.preprocessedQuery || state.query,
            strategy: "semantic",
            limit: 25
          },
          inputFromStep: 0
        }
      ],
      description: `Emergency expansion plan: broad semantic search`
    };
    
    return {
      plan: emergencyPlan,
      errors: [
        ...(state.errors || []),
        {
          node: "expansion-planner",
          error: error instanceof Error ? error : new Error("Unknown error in expansion planner"),
          timestamp: new Date()
        }
      ],
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "expansion-planner"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "expansion-planner": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
  }
};

/**
 * Determines the expansion strategy based on current results and intent
 */
function determineExpansionStrategy(results: any[], intent: any): {
  relaxedCategories: string[];
  relaxedFunctionality: string[];
  relaxedInterfaces: string[];
  relaxedDeployments: string[];
  relaxedUserTypes: string[];
  applyPriceFilter: boolean;
  appliedStrategies: string[];
} {
  const strategy = {
    relaxedCategories: [],
    relaxedFunctionality: [],
    relaxedInterfaces: [],
    relaxedDeployments: [],
    relaxedUserTypes: [],
    applyPriceFilter: false,
    appliedStrategies: []
  };
  
  // Expand categories - include related categories
  if (intent?.categories && intent.categories.length > 0) {
    strategy.relaxedCategories = [...intent.categories];
    
    // Add related categories for expansion
    const categoryExpansions: Record<string, string[]> = {
      "AI": ["Machine Learning", "Data Science", "Analytics"],
      "Development": ["DevOps", "Testing", "Deployment"],
      "Design": ["UI/UX", "Graphics", "Prototyping"],
      "Marketing": ["Social Media", "Analytics", "SEO"],
      "Productivity": ["Project Management", "Collaboration", "Automation"],
      "Business": ["CRM", "Finance", "HR"],
      "Communication": ["Video Conferencing", "Messaging", "Email"],
      "Security": ["Authentication", "Monitoring", "Compliance"]
    };
    
    intent.categories.forEach((category: string) => {
      const expansions = categoryExpansions[category];
      if (expansions) {
        strategy.relaxedCategories.push(...expansions);
      }
    });
    
    // Remove duplicates
    strategy.relaxedCategories = [...new Set(strategy.relaxedCategories)];
    strategy.appliedStrategies.push("category-expansion");
  }
  
  // Expand functionality - include related functionality
  if (intent?.functionality && intent.functionality.length > 0) {
    strategy.relaxedFunctionality = [...intent.functionality];
    
    // Add related functionality for expansion
    const functionalityExpansions: Record<string, string[]> = {
      "Data Analysis": ["Reporting", "Visualization", "Statistics"],
      "Content Creation": ["Writing", "Editing", "Publishing"],
      "Project Management": ["Task Management", "Team Collaboration", "Planning"],
      "Customer Support": ["Help Desk", "Live Chat", "Knowledge Base"],
      "E-commerce": ["Payment Processing", "Inventory", "Shipping"],
      "Social Media": ["Content Scheduling", "Analytics", "Engagement"]
    };
    
    intent.functionality.forEach((func: string) => {
      const expansions = functionalityExpansions[func];
      if (expansions) {
        strategy.relaxedFunctionality.push(...expansions);
      }
    });
    
    // Remove duplicates
    strategy.relaxedFunctionality = [...new Set(strategy.relaxedFunctionality)];
    strategy.appliedStrategies.push("functionality-expansion");
  }
  
  // Expand interfaces - include compatible interfaces
  if (intent?.interface && intent.interface.length > 0) {
    strategy.relaxedInterfaces = [...intent.interface];
    
    // Add compatible interfaces for expansion
    const interfaceExpansions: Record<string, string[]> = {
      "Web App": ["Browser Extension", "PWA"],
      "Mobile App": ["Cross-platform", "Native"],
      "Desktop App": ["Cross-platform", "Native"],
      "API": ["REST API", "GraphQL", "Webhook"],
      "CLI": ["Terminal", "Command Line"]
    };
    
    intent.interface.forEach((iface: string) => {
      const expansions = interfaceExpansions[iface];
      if (expansions) {
        strategy.relaxedInterfaces.push(...expansions);
      }
    });
    
    // Remove duplicates
    strategy.relaxedInterfaces = [...new Set(strategy.relaxedInterfaces)];
    strategy.appliedStrategies.push("interface-expansion");
  }
  
  // Expand deployments - include compatible deployments
  if (intent?.deployment && intent.deployment.length > 0) {
    strategy.relaxedDeployments = [...intent.deployment];
    
    // Add compatible deployments for expansion
    const deploymentExpansions: Record<string, string[]> = {
      "Cloud": ["SaaS", "Multi-cloud"],
      "On-Premise": ["Self-hosted", "Private Cloud"],
      "Hybrid": ["Cloud", "On-Premise"],
      "SaaS": ["Cloud", "Multi-tenant"]
    };
    
    intent.deployment.forEach((deploy: string) => {
      const expansions = deploymentExpansions[deploy];
      if (expansions) {
        strategy.relaxedDeployments.push(...expansions);
      }
    });
    
    // Remove duplicates
    strategy.relaxedDeployments = [...new Set(strategy.relaxedDeployments)];
    strategy.appliedStrategies.push("deployment-expansion");
  }
  
  // Expand user types - include related user types
  if (intent?.userTypes && intent.userTypes.length > 0) {
    strategy.relaxedUserTypes = [...intent.userTypes];
    
    // Add related user types for expansion
    const userTypeExpansions: Record<string, string[]> = {
      "Developer": ["Technical", "IT Professional"],
      "Designer": ["Creative", "Visual"],
      "Business": ["Enterprise", "Professional"],
      "Individual": ["Personal", "Freelancer"],
      "Team": ["Collaboration", "Group"],
      "Enterprise": ["Business", "Corporate"]
    };
    
    intent.userTypes.forEach((userType: string) => {
      const expansions = userTypeExpansions[userType];
      if (expansions) {
        strategy.relaxedUserTypes.push(...expansions);
      }
    });
    
    // Remove duplicates
    strategy.relaxedUserTypes = [...new Set(strategy.relaxedUserTypes)];
    strategy.appliedStrategies.push("user-type-expansion");
  }
  
  // Apply price filter only if it's not too restrictive
  if (intent?.priceConstraints) {
    const hasReasonableConstraints = 
      intent.priceConstraints.hasFreeTier === true ||
      (intent.priceConstraints.maxPrice && intent.priceConstraints.maxPrice > 50) ||
      !intent.priceConstraints.maxPrice; // No max price limit
    
    if (hasReasonableConstraints) {
      strategy.applyPriceFilter = true;
      strategy.appliedStrategies.push("relaxed-pricing");
    }
  }
  
  // Default strategies if no specific intent filters
  if (strategy.appliedStrategies.length === 0) {
    strategy.appliedStrategies.push("broad-semantic-search", "similarity-expansion");
  }
  
  return strategy;
}
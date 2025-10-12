import { StateAnnotation } from "@/types/state";
import { Plan, Function } from "../../types/plan";

/**
 * Fallback Planner Node
 * 
 * Generates a simple semantic search plan for low-confidence queries.
 * Uses the most reliable available query and optionally adds high-confidence
 * category or interface filters.
 */
export const fallbackPlannerNode = (state: typeof StateAnnotation.State): Partial<typeof StateAnnotation.State> => {
  try {
    const { intent, query, preprocessedQuery } = state;
    
    // Determine the best query to use
    let searchQuery = preprocessedQuery || query;
    
    // If we have a semantic query from intent, use it
    if (intent?.semanticQuery) {
      searchQuery = intent.semanticQuery;
    }
    
    // If we have keywords, use them as fallback
    if (!searchQuery && intent?.keywords && intent.keywords.length > 0) {
      searchQuery = intent.keywords.join(" ");
    }
    
    // Final fallback to original query
    if (!searchQuery) {
      searchQuery = query;
    }
    
    const steps: Function[] = [];
    let stepIndex = 0;
    
    // Step 1: Semantic search with the best available query
    steps.push({
      name: "semantic-search",
      parameters: {
        query: searchQuery,
        limit: 50 // Higher limit for fallback to ensure we get results
      },
      inputFromStep: undefined
    });
    
    // Step 2: Apply high-confidence category filter if available
    if (intent?.categories && intent.categories.length > 0) {
      stepIndex++;
      steps.push({
        name: "filter-by-category",
        parameters: {
          categories: intent.categories,
          strict: false // Less strict for fallback
        },
        inputFromStep: stepIndex - 1
      });
    }
    
    // Step 3: Apply high-confidence interface filter if available
    if (intent?.interface && intent.interface.length > 0) {
      stepIndex++;
      steps.push({
        name: "filter-by-interface",
        parameters: {
          interfaces: intent.interface,
          strict: false // Less strict for fallback
        },
        inputFromStep: stepIndex - 1
      });
    }
    
    // Step 4: Apply deployment filter if available
    if (intent?.deployment && intent.deployment.length > 0) {
      stepIndex++;
      steps.push({
        name: "filter-by-deployment",
        parameters: {
          deployments: intent.deployment,
          strict: false // Less strict for fallback
        },
        inputFromStep: stepIndex - 1
      });
    }
    
    // Step 5: Final ranking
    stepIndex++;
    steps.push({
      name: "rank-by-relevance",
      parameters: {
        query: searchQuery,
        strategy: "semantic" // Simple semantic ranking for fallback
      },
      inputFromStep: stepIndex - 1
    });
    
    // Generate suggested refinements based on low-confidence elements
    const suggestedRefinements: string[] = [];
    
    if (!intent?.categories || intent.categories.length === 0) {
      suggestedRefinements.push("Try specifying a category (e.g., 'development tools', 'analytics', 'communication')");
    }
    
    if (!intent?.functionality || intent.functionality.length === 0) {
      suggestedRefinements.push("Try describing what you want the tool to do more specifically");
    }
    
    if (!intent?.interface || intent.interface.length === 0) {
      suggestedRefinements.push("Try specifying how you want to use it (e.g., 'web app', 'API', 'desktop app')");
    }
    
    if (!intent?.userTypes || intent.userTypes.length === 0) {
      suggestedRefinements.push("Try specifying who will use it (e.g., 'developers', 'marketers', 'small business')");
    }
    
    const plan: Plan = {
      steps,
      description: `Fallback semantic search plan using query: "${searchQuery}" with ${steps.length - 2} filters applied`
    };
    
    return {
      plan,
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "fallback-planner"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "fallback-planner": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
    
  } catch (error) {
    console.error("Error in fallback planner:", error);
    
    // Emergency fallback plan - just semantic search with original query
    const emergencyPlan: Plan = {
      steps: [
        {
          name: "semantic-search",
          parameters: {
            query: state.query,
            limit: 20
          },
          inputFromStep: undefined
        },
        {
          name: "rank-by-relevance",
          parameters: {
            query: state.query,
            strategy: "semantic"
          },
          inputFromStep: 0
        }
      ],
      description: `Emergency fallback semantic search with query: "${state.query}"`
    };
    
    return {
      plan: emergencyPlan,
      errors: [
        ...(state.errors || []),
        {
          node: "fallback-planner",
          error: error instanceof Error ? error : new Error("Unknown error in fallback planner"),
          timestamp: new Date()
        }
      ],
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "fallback-planner"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "fallback-planner": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
  }
};
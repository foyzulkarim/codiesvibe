import { StateAnnotation } from "@/types/state";
import { Plan, Function, PlanReasoning, PlanContext } from "../../types/plan";
import { EntityStatisticsSchema, MetadataContextSchema } from "@/types/enhanced-state";

/**
 * Fallback Planner Node
 *
 * Generates a simple semantic search plan for low-confidence queries.
 * Uses the most reliable available query and optionally adds high-confidence
 * category or interface filters.
 * Enhanced to use context and entity statistics for better fallback decisions.
 */
export const fallbackPlannerNode = (state: typeof StateAnnotation.State): Partial<typeof StateAnnotation.State> => {
  try {
    const { intent, query, preprocessedQuery, entityStatistics, metadataContext } = state;
    
    // Analyze context for fallback optimization
    const planContext = analyzePlanContext(state);
    const planReasoning: PlanReasoning[] = [];
    
    // Add reasoning for fallback selection
    planReasoning.push({
      stage: "fallback_selection",
      decision: `Using fallback strategy for ${planContext.complexity} query`,
      confidence: Math.max(0.3, planContext.confidenceLevel),
      supportingEvidence: [
        `Low confidence or error conditions detected`,
        `Entity statistics available: ${planContext.entityStatsAvailable}`,
        `Metadata confidence: ${planContext.metadataConfidence}`,
        `Using adaptive fallback approach`
      ]
    });
    
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
    // Use entity statistics to optimize search parameters even in fallback
    const searchParams = getOptimizedSearchParams(planContext, entityStatistics, searchQuery, 50, 0.4);
    
    steps.push({
      name: "semantic-search",
      parameters: searchParams,
      inputFromStep: undefined
    });
    
    planReasoning.push({
      stage: "fallback_semantic_search",
      decision: `Fallback semantic search with adaptive parameters`,
      confidence: 0.6,
      supportingEvidence: [
        `Query: "${searchQuery}"`,
        `Adaptive limit: ${searchParams.limit}`,
        `Adaptive threshold: ${searchParams.threshold}`,
        `Fallback optimization enabled`
      ]
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
        strategy: planContext.entityStatsAvailable ? "hybrid" : "semantic" // Use hybrid if stats available
      },
      inputFromStep: stepIndex - 1
    });
    
    planReasoning.push({
      stage: "fallback_ranking",
      decision: `Fallback ranking with ${planContext.entityStatsAvailable ? 'hybrid' : 'semantic'} strategy`,
      confidence: 0.7,
      supportingEvidence: [
        `Ranking strategy: ${planContext.entityStatsAvailable ? 'hybrid' : 'semantic'}`,
        `Entity statistics used: ${planContext.entityStatsAvailable}`,
        `Optimized for fallback scenario`
      ]
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
      description: `Fallback semantic search plan using query: "${searchQuery}" with ${steps.length - 2} filters applied`,
      reasoning: planReasoning,
      context: planContext,
      strategy: "fallback",
      adaptive: true,
      validationPassed: true
    };
    
    return {
      plan,
      metadata: {
        ...state.metadata,
        planReasoning,
        planContext,
        planningStrategy: "fallback",
        adaptivePlanning: true,
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
      description: `Emergency fallback semantic search with query: "${state.query}"`,
      reasoning: [{
        stage: "emergency_fallback",
        decision: "Emergency fallback due to planner error",
        confidence: 0.2,
        supportingEvidence: ["Fallback planner error", "Using basic semantic search"]
      }],
      strategy: "emergency",
      adaptive: false,
      validationPassed: false
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
        planningStrategy: "emergency",
        adaptivePlanning: false,
        executionPath: [...(state.metadata?.executionPath || []), "fallback-planner"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "fallback-planner": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
  }
};

/**
 * Analyze the context to determine optimal fallback strategy
 */
function analyzePlanContext(state: typeof StateAnnotation.State): PlanContext {
  const { entityStatistics, metadataContext, confidence, intent } = state;
  
  // Determine complexity based on intent and confidence
  let complexity: "simple" | "moderate" | "complex" = "simple";
  let suggestedStrategies: string[] = ["fallback"];
  
  if (intent) {
    const factorCount = [
      intent.toolNames?.length || 0,
      intent.categories?.length || 0,
      intent.functionality?.length || 0,
      intent.interface?.length || 0,
      intent.userTypes?.length || 0,
      intent.deployment?.length || 0
    ].reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0);
    
    if (factorCount >= 3) {
      complexity = "moderate";
      suggestedStrategies = ["fallback", "multi-strategy"];
    } else if (factorCount >= 2) {
      complexity = "simple";
      suggestedStrategies = ["fallback"];
    }
  }
  
  const entityStatsAvailable = !!(entityStatistics && Object.keys(entityStatistics).length > 0);
  const metadataConfidence = metadataContext?.metadataConfidence || 0;
  const confidenceLevel = confidence?.overall || 0.3; // Lower confidence for fallback
  
  return {
    complexity,
    confidenceLevel,
    entityStatsAvailable,
    metadataConfidence,
    suggestedStrategies
  };
}

/**
 * Get optimized search parameters for fallback scenario
 */
function getOptimizedSearchParams(
  planContext: PlanContext,
  entityStatistics?: Record<string, any>,
  query?: string,
  baseLimit: number = 50,
  baseThreshold: number = 0.4
): { query: string; limit: number; threshold: number } {
  let limit = baseLimit;
  let threshold = baseThreshold;
  
  // Adjust based on complexity (fallback is more conservative)
  switch (planContext.complexity) {
    case "simple":
      limit = Math.max(baseLimit * 0.7, 25);
      threshold = Math.min(baseThreshold + 0.1, 0.6);
      break;
    case "moderate":
      limit = baseLimit;
      threshold = baseThreshold;
      break;
    case "complex":
      limit = Math.min(baseLimit * 1.1, 60);
      threshold = Math.max(baseThreshold - 0.05, 0.3);
      break;
  }
  
  // Adjust based on entity statistics (even in fallback)
  if (entityStatistics && Object.keys(entityStatistics).length > 0) {
    const totalCount = Object.values(entityStatistics)
      .reduce((sum: number, stats: any) => sum + (stats.totalCount || 0), 0);
    
    if (totalCount > 500) {
      limit = Math.min(limit * 1.1, 70);
      threshold = Math.max(threshold - 0.05, 0.3);
    } else if (totalCount < 50) {
      limit = Math.max(limit * 0.9, 20);
      threshold = Math.min(threshold + 0.05, 0.65);
    }
  }
  
  return {
    query: query || "",
    limit: Math.round(limit),
    threshold: Math.round(threshold * 100) / 100
  };
}

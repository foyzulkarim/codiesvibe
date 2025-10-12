# Phase 7: Routers - Detailed Implementation Tasks

## Task 7.1: Confidence Router

### Implementation Details:

**routers/confidence.router.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { confidenceThresholds } from "@/config/constants";

/**
 * Route execution based on confidence scores to appropriate planning strategy
 */
export async function confidenceRouter(state: typeof StateAnnotation.State): Promise<"optimal" | "multi-strategy" | "fallback"> {
  const { confidence } = state;
  
  // Fallback routing if no confidence data
  if (!confidence || confidence.overall === undefined) {
    console.log("Confidence router: No confidence data, routing to fallback");
    return "fallback";
  }
  
  try {
    const { overall, breakdown } = confidence;
    
    // Primary routing based on overall confidence
    if (overall >= confidenceThresholds.high) {
      console.log(`Confidence router: High confidence (${overall.toFixed(2)}), routing to optimal`);
      return "optimal";
    } else if (overall >= confidenceThresholds.medium) {
      console.log(`Confidence router: Medium confidence (${overall.toFixed(2)}), routing to multi-strategy`);
      return "multi-strategy";
    } else {
      console.log(`Confidence router: Low confidence (${overall.toFixed(2)}), routing to fallback`);
      return "fallback";
    }
  } catch (error) {
    console.error("Error in confidenceRouter:", error);
    console.log("Confidence router: Error occurred, routing to fallback");
    return "fallback";
  }
}

/**
 * Enhanced confidence router with contextual overrides
 */
export async function enhancedConfidenceRouter(state: typeof StateAnnotation.State): Promise<"optimal" | "multi-strategy" | "fallback"> {
  const { confidence, routingDecision } = state;
  
  // If we already have a routing decision from Phase 4, use it
  if (routingDecision) {
    console.log(`Confidence router: Using existing routing decision: ${routingDecision}`);
    return routingDecision;
  }
  
  // Otherwise, make the routing decision
  return await confidenceRouter(state);
}
```

## Task 7.2: Execution Router

### Implementation Details:

**routers/execution.router.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { Plan, MultiStrategyPlan } from "@/types/plan";

/**
 * Route to appropriate executor based on plan structure
 */
export async function executionRouter(state: typeof StateAnnotation.State): Promise<"single-plan-executor" | "multi-strategy-executor"> {
  const { plan } = state;
  
  if (!plan) {
    console.log("Execution router: No plan available, routing to single-plan-executor with fallback");
    return "single-plan-executor";
  }
  
  try {
    // Check if it's a multi-strategy plan
    const isMultiStrategy = "strategies" in plan;
    
    if (isMultiStrategy) {
      const multiStrategyPlan = plan as MultiStrategyPlan;
      
      // Validate multi-strategy plan
      if (!multiStrategyPlan.strategies || multiStrategyPlan.strategies.length === 0) {
        console.log("Execution router: Invalid multi-strategy plan, routing to single-plan-executor");
        return "single-plan-executor";
      }
      
      if (!multiStrategyPlan.weights || multiStrategyPlan.weights.length !== multiStrategyPlan.strategies.length) {
        console.log("Execution router: Invalid weights in multi-strategy plan, routing to single-plan-executor");
        return "single-plan-executor";
      }
      
      console.log(`Execution router: Valid multi-strategy plan with ${multiStrategyPlan.strategies.length} strategies, routing to multi-strategy-executor`);
      return "multi-strategy-executor";
    } else {
      // Single plan execution
      const singlePlan = plan as Plan;
      
      if (!singlePlan.steps || singlePlan.steps.length === 0) {
        console.log("Execution router: Invalid single plan, but routing to single-plan-executor for fallback handling");
      } else {
        console.log(`Execution router: Valid single plan with ${singlePlan.steps.length} steps, routing to single-plan-executor`);
      }
      
      return "single-plan-executor";
    }
  } catch (error) {
    console.error("Error in executionRouter:", error);
    console.log("Execution router: Error occurred, routing to single-plan-executor");
    return "single-plan-executor";
  }
}

/**
 * Post-execution router to determine if result merging is needed
 */
export async function postExecutionRouter(state: typeof StateAnnotation.State): Promise<"result-merger" | "completion"> {
  const { executionResults, plan } = state;
  
  if (!executionResults || executionResults.length === 0) {
    console.log("Post-execution router: No execution results, routing to completion");
    return "completion";
  }
  
  // Check if this was a multi-strategy execution
  const isMultiStrategy = plan && "strategies" in plan;
  
  if (isMultiStrategy) {
    console.log("Post-execution router: Multi-strategy execution detected, routing to result-merger");
    return "result-merger";
  } else {
    console.log("Post-execution router: Single strategy execution, routing to completion");
    return "completion";
  }
}
```

## Task 7.3: Quality Router

### Implementation Details:

**routers/quality.router.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { qualityThresholds } from "@/config/constants";

/**
 * Route based on result quality assessment to determine next action
 */
export async function qualityRouter(state: typeof StateAnnotation.State): Promise<"refinement-planner" | "expansion-planner" | "completion"> {
  const { qualityAssessment, iterations } = state;
  
  // Fallback routing if no quality assessment
  if (!qualityAssessment) {
    console.log("Quality router: No quality assessment, routing to completion");
    return "completion";
  }
  
  try {
    const { decision, resultCount, averageRelevance, categoryDiversity } = qualityAssessment;
    const currentIterations = iterations || { refinementAttempts: 0, expansionAttempts: 0, maxAttempts: 2 };
    
    console.log(`Quality router: Quality decision is "${decision}" with ${resultCount} results, ${currentIterations.refinementAttempts} refinement attempts, ${currentIterations.expansionAttempts} expansion attempts`);
    
    // Check if we've exceeded maximum iterations
    if (decision === "refine" && currentIterations.refinementAttempts >= currentIterations.maxAttempts) {
      console.log(`Quality router: Max refinement attempts reached (${currentIterations.maxAttempts}), routing to completion`);
      return "completion";
    }
    
    if (decision === "expand" && currentIterations.expansionAttempts >= currentIterations.maxAttempts) {
      console.log(`Quality router: Max expansion attempts reached (${currentIterations.maxAttempts}), routing to completion`);
      return "completion";
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
        console.log("Quality router: Results are acceptable, routing to completion");
        return "completion";
    }
  } catch (error) {
    console.error("Error in qualityRouter:", error);
    console.log("Quality router: Error occurred, routing to completion");
    return "completion";
  }
}

/**
 * Pre-quality router to determine if quality assessment is needed
 */
export async function preQualityRouter(state: typeof StateAnnotation.State): Promise<"quality-evaluator" | "completion"> {
  const { queryResults } = state;
  
  if (!queryResults || queryResults.length === 0) {
    console.log("Pre-quality router: No results to evaluate, routing to completion");
    return "completion";
  }
  
  // If we have results, we should evaluate their quality
  console.log(`Pre-quality router: Have ${queryResults.length} results, routing to quality-evaluator`);
  return "quality-evaluator";
}

/**
 * Adaptive quality router that considers context and user preferences
 */
export async function adaptiveQualityRouter(state: typeof StateAnnotation.State): Promise<"refinement-planner" | "expansion-planner" | "completion"> {
  const { qualityAssessment, iterations, query, metadata } = state;
  
  // First, do standard quality routing
  const baseRoute = await qualityRouter(state);
  
  // Adaptive considerations based on context
  if (baseRoute === "completion") {
    return "completion";
  }
  
  // Consider query complexity and user experience
  const queryComplexity = (query?.length || 0) > 50 ? "complex" : "simple";
  const executionTime = metadata.startTime ? Date.now() - metadata.startTime.getTime() : 0;
  
  // For complex queries, allow more refinement attempts
  if (queryComplexity === "complex" && baseRoute === "refine") {
    const maxAttempts = Math.min((iterations?.maxAttempts || 2) + 1, 4); // Max 4 attempts for complex queries
    
    if ((iterations?.refinementAttempts || 0) < maxAttempts) {
      console.log("Adaptive quality router: Complex query detected, allowing additional refinement");
      return "refinement-planner";
    }
  }
  
  // For fast execution, prioritize completion over further processing
  if (executionTime < 500 && baseRoute !== "completion") {
    console.log("Adaptive quality router: Fast execution detected, prioritizing completion");
    return "completion";
  }
  
  // For slow execution, be more aggressive about expansion
  if (executionTime > 5000 && baseRoute === "refine" && qualityAssessment?.resultCount < qualityThresholds.minResults) {
    console.log("Adaptive quality router: Slow execution with few results, switching to expansion");
    return "expansion-planner";
  }
  
  return baseRoute;
}
```

**routers/index.ts**
```typescript
// Export all routers for easy importing
export { 
  confidenceRouter, 
  enhancedConfidenceRouter 
} from "./confidence.router";

export { 
  executionRouter, 
  postExecutionRouter 
} from "./execution.router";

export { 
  qualityRouter, 
  preQualityRouter, 
  adaptiveQualityRouter 
} from "./quality.router";

// Router registry for dynamic execution
export const routerRegistry = {
  "confidence": confidenceRouter,
  "enhanced-confidence": enhancedConfidenceRouter,
  "execution": executionRouter,
  "post-execution": postExecutionRouter,
  "quality": qualityRouter,
  "pre-quality": preQualityRouter,
  "adaptive-quality": adaptiveQualityRouter
};

// Helper function to get router by name
export function getRouter(name: keyof typeof routerRegistry) {
  return routerRegistry[name];
}
```

---

## Phase 7 Summary

**Total: 3 tasks, 3 main files + 1 index file = 4 files**

**Key Features Implemented:**

1. **Confidence Router**: 
   - Routes based on confidence scores to optimal/multi-strategy/fallback planning
   - Supports contextual overrides and enhanced routing logic
   - Handles edge cases with graceful fallbacks

2. **Execution Router**:
   - Routes to single-plan or multi-strategy executor based on plan structure
   - Validates plan integrity before routing
   - Includes post-execution routing for result merging decisions

3. **Quality Router**:
   - Routes based on quality assessment to refine/expand/complete
   - Considers iteration limits to prevent infinite loops
   - Adaptive routing with context-aware decision making

**Additional Features:**
- **Router Registry**: Centralized registry for dynamic router execution
- **Comprehensive Logging**: Detailed logging for debugging and monitoring
- **Error Handling**: Graceful fallbacks for all routing decisions
- **Performance Considerations**: Adaptive routing based on execution time and query complexity
- **Iteration Management**: Prevents infinite refinement/expansion loops

**Router Integration Points:**
- **Confidence Router**: Between Phase 4 (Intent Extraction) and Phase 5 (Planning)
- **Execution Router**: Between Phase 5 (Planning) and Phase 6 (Execution)
- **Quality Router**: Between Phase 6 (Execution) and refinement/expansion cycles

**Estimated complexity:** 1-2 days for complete implementation

These routers provide the critical decision-making logic that enables the adaptive behavior of the search system, ensuring that queries are routed through the most appropriate execution path based on confidence levels, plan structure, and result quality assessments.
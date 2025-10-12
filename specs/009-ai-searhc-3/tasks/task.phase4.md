# Phase 4: Routing Nodes - Detailed Implementation Tasks

## Task 4.1: Confidence Evaluator

### Implementation Details:

**nodes/routing/confidence-evaluator.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { confidenceThresholds } from "@/config/constants";

/**
 * Evaluate overall confidence and determine routing strategy
 */
export async function confidenceEvaluatorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { confidence } = state;
  
  if (!confidence || confidence.overall === undefined) {
    return {
      routingDecision: "fallback",
      metadata: {
        ...state.metadata,
        routingReason: "No confidence data available"
      }
    };
  }
  
  try {
    const { overall, breakdown } = confidence;
    let routingDecision: "optimal" | "multi-strategy" | "fallback" = "fallback";
    let routingReason = "";
    
    // Determine routing based on overall confidence
    if (overall >= confidenceThresholds.high) {
      routingDecision = "optimal";
      routingReason = `High overall confidence (${overall.toFixed(2)})`;
    } else if (overall >= confidenceThresholds.medium) {
      routingDecision = "multi-strategy";
      routingReason = `Medium overall confidence (${overall.toFixed(2)})`;
    } else {
      routingDecision = "fallback";
      routingReason = `Low overall confidence (${overall.toFixed(2)})`;
    }
    
    // Check for specific confidence patterns that might override the decision
    if (breakdown.toolNames >= 0.9 && breakdown.comparative >= 0.8) {
      // High confidence in tool names and comparative intent
      routingDecision = "optimal";
      routingReason = `High confidence in tool names (${breakdown.toolNames.toFixed(2)}) and comparative intent (${breakdown.comparative.toFixed(2)})`;
    } else if (breakdown.toolNames < 0.3 && breakdown.categories < 0.3 && breakdown.functionality < 0.3) {
      // Low confidence across the board
      routingDecision = "fallback";
      routingReason = `Low confidence across all dimensions`;
    }
    
    return {
      routingDecision,
      metadata: {
        ...state.metadata,
        routingReason,
        confidenceEvaluation: {
          overall,
          breakdown,
          thresholds: confidenceThresholds
        }
      }
    };
  } catch (error) {
    console.error("Error in confidenceEvaluatorNode:", error);
    return {
      routingDecision: "fallback",
      metadata: {
        ...state.metadata,
        routingReason: "Error evaluating confidence",
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}
```

## Task 4.2: Quality Evaluator

### Implementation Details:

**nodes/routing/quality-evaluator.node.ts**
```typescript
import { State } from "@/types/state";
import { StateAnnotation } from "@/types/state";
import { qualityThresholds } from "@/config/constants";

/**
 * Evaluate result quality and determine if refinement or expansion is needed
 */
export async function qualityEvaluatorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { queryResults, iterations } = state;
  
  if (!queryResults || queryResults.length === 0) {
    return {
      qualityAssessment: {
        resultCount: 0,
        averageRelevance: 0,
        categoryDiversity: 0,
        decision: "expand"
      },
      metadata: {
        ...state.metadata,
        qualityReason: "No results found"
      }
    };
  }
  
  try {
    const resultCount = queryResults.length;
    
    // Calculate average relevance score
    const relevanceScores = queryResults
      .filter(tool => tool.relevanceScore !== undefined)
      .map(tool => tool.relevanceScore);
    
    const averageRelevance = relevanceScores.length > 0
      ? relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length
      : 0;
    
    // Calculate category diversity
    const categories = new Set();
    queryResults.forEach(tool => {
      if (tool.category) {
        categories.add(tool.category);
      } else if (tool.categories && Array.isArray(tool.categories) && tool.categories.length > 0) {
        categories.add(tool.categories[0]);
      }
    });
    const categoryDiversity = categories.size / Math.max(resultCount, 1);
    
    // Determine quality decision
    let decision: "accept" | "refine" | "expand" = "accept";
    let qualityReason = "";
    
    // Check if we need to expand (too few results)
    if (resultCount < qualityThresholds.minResults) {
      decision = "expand";
      qualityReason = `Too few results (${resultCount} < ${qualityThresholds.minResults})`;
    }
    // Check if we need to refine (too many results)
    else if (resultCount > qualityThresholds.maxResults) {
      decision = "refine";
      qualityReason = `Too many results (${resultCount} > ${qualityThresholds.maxResults})`;
    }
    // Check if relevance is too low
    else if (averageRelevance < qualityThresholds.minRelevance) {
      decision = "refine";
      qualityReason = `Low relevance score (${averageRelevance.toFixed(2)} < ${qualityThresholds.minRelevance})`;
    }
    // Check if category diversity is too low
    else if (categoryDiversity < qualityThresholds.minCategoryDiversity) {
      decision = "expand";
      qualityReason = `Low category diversity (${categoryDiversity.toFixed(2)} < ${qualityThresholds.minCategoryDiversity})`;
    }
    // Results are acceptable
    else {
      qualityReason = `Results meet quality thresholds (count: ${resultCount}, relevance: ${averageRelevance.toFixed(2)}, diversity: ${categoryDiversity.toFixed(2)})`;
    }
    
    // Check if we've exceeded maximum iterations
    const currentIterations = iterations || { refinementAttempts: 0, expansionAttempts: 0, maxAttempts: 2 };
    if (
      (decision === "refine" && currentIterations.refinementAttempts >= currentIterations.maxAttempts) ||
      (decision === "expand" && currentIterations.expansionAttempts >= currentIterations.maxAttempts)
    ) {
      decision = "accept";
      qualityReason += ` (Max iterations reached, accepting results)`;
    }
    
    return {
      qualityAssessment: {
        resultCount,
        averageRelevance,
        categoryDiversity,
        decision
      },
      metadata: {
        ...state.metadata,
        qualityReason,
        qualityMetrics: {
          thresholds: qualityThresholds,
          iterations: currentIterations
        }
      }
    };
  } catch (error) {
    console.error("Error in qualityEvaluatorNode:", error);
    return {
      qualityAssessment: {
        resultCount: queryResults?.length || 0,
        averageRelevance: 0,
        categoryDiversity: 0,
        decision: "accept"
      },
      metadata: {
        ...state.metadata,
        qualityReason: "Error evaluating quality, accepting results",
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}
```

**nodes/routing/index.ts**
```typescript
// Export all routing nodes for easy importing
export { confidenceEvaluatorNode } from "./confidence-evaluator.node";
export { qualityEvaluatorNode } from "./quality-evaluator.node";
```


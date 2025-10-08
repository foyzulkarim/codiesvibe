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
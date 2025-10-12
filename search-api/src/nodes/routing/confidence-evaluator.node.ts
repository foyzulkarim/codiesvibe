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
        ...state.metadata
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
        ...state.metadata
      }
    };
  } catch (error) {
    console.error("Error in confidenceEvaluatorNode:", error);
    return {
      routingDecision: "fallback",
      metadata: {
        ...state.metadata
      }
    };
  }
}
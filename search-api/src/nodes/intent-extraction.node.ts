import { StateAnnotation } from "../types/state";
import { queryPreprocessorNode } from "./preprocessing/query-preprocessor.node";
import { semanticPrefilterNode } from "./extraction/semantic-prefilter.node";
import { zeroShotClassifierNode } from "./extraction/zero-shot-classifier.node";
import { nerExtractorNode } from "./extraction/ner-extractor.node";
import { fuzzyMatcherNode } from "./extraction/fuzzy-matcher.node";
import { nameResolverNode } from "./extraction/name-resolver.node";
import { comparativeDetectorNode } from "./extraction/comparative-detector.node";
import { referenceExtractorNode } from "./extraction/reference-extractor.node";
import { priceExtractorNode } from "./extraction/price-extractor.node";
import { interfaceDetectorNode } from "./extraction/interface-detector.node";
import { deploymentDetectorNode } from "./extraction/deployment-detector.node";
import { intentSynthesizerNode } from "./extraction/intent-synthesizer.node";
import { scoreCombinerNode } from "./extraction/score-combiner.node";

/**
 * Intent Extraction Node
 * 
 * Orchestrates the complete intent extraction pipeline by running
 * all extraction nodes in sequence to build comprehensive intent understanding.
 */
export async function intentExtractionNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  try {
    let currentState = state;
    
    // Step 1: Preprocess the query
    currentState = { ...currentState, ...await queryPreprocessorNode(currentState) };
    
    // Step 2: Semantic prefiltering
    currentState = { ...currentState, ...await semanticPrefilterNode(currentState) };
    
    // Step 3: Zero-shot classification
    currentState = { ...currentState, ...await zeroShotClassifierNode(currentState) };
    
    // Step 4: Named Entity Recognition
    currentState = { ...currentState, ...await nerExtractorNode(currentState) };
    
    // Step 5: Fuzzy matching
    currentState = { ...currentState, ...await fuzzyMatcherNode(currentState) };
    
    // Step 6: Name resolution
    currentState = { ...currentState, ...await nameResolverNode(currentState) };
    
    // Step 7: Comparative detection
    currentState = { ...currentState, ...await comparativeDetectorNode(currentState) };
    
    // Step 8: Reference extraction
    currentState = { ...currentState, ...await referenceExtractorNode(currentState) };
    
    // Step 9: Price extraction
    currentState = { ...currentState, ...await priceExtractorNode(currentState) };
    
    // Step 10: Interface detection
    currentState = { ...currentState, ...await interfaceDetectorNode(currentState) };
    
    // Step 11: Deployment detection
    currentState = { ...currentState, ...await deploymentDetectorNode(currentState) };
    
    // Step 12: Score combination
    currentState = { ...currentState, ...await scoreCombinerNode(currentState) };
    
    // Step 13: Intent synthesis (final step)
    currentState = { ...currentState, ...await intentSynthesizerNode(currentState) };
    
    return {
      ...currentState,
      metadata: {
        ...currentState.metadata,
        executionPath: [...(currentState.metadata?.executionPath || []), "intent-extraction"],
        nodeExecutionTimes: {
          ...(currentState.metadata?.nodeExecutionTimes || {}),
          "intent-extraction": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };    
  } catch (error) {
    console.error("Error in intent extraction:", error);
    return {
      errors: [
        ...(state.errors || []),
        {
          node: "intent-extraction",
          error: error instanceof Error ? error : new Error("Unknown error in intent extraction"),
          timestamp: new Date()
        }
      ],
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "intent-extraction"],
        nodeExecutionTimes: {
          ...(state.metadata?.nodeExecutionTimes || {}),
          "intent-extraction": Date.now() - (state.metadata?.startTime?.getTime() || Date.now())
        }
      }
    };
  }
}

import { StateGraph, END } from "@langchain/langgraph";
import { StateAnnotation } from "@/types/state";

// Import all extraction nodes
import { queryPreprocessorNode } from "@/nodes/preprocessing/query-preprocessor.node";
import { semanticPrefilterNode } from "@/nodes/extraction/semantic-prefilter.node";
import { zeroShotClassifierNode } from "@/nodes/extraction/zero-shot-classifier.node";
import { scoreCombinerNode } from "@/nodes/extraction/score-combiner.node";
import { nerExtractorNode } from "@/nodes/extraction/ner-extractor.node";
import { fuzzyMatcherNode } from "@/nodes/extraction/fuzzy-matcher.node";
import { nameResolverNode } from "@/nodes/extraction/name-resolver.node";
import { comparativeDetectorNode } from "@/nodes/extraction/comparative-detector.node";
import { referenceExtractorNode } from "@/nodes/extraction/reference-extractor.node";
import { priceExtractorNode } from "@/nodes/extraction/price-extractor.node";
import { interfaceDetectorNode } from "@/nodes/extraction/interface-detector.node";
import { deploymentDetectorNode } from "@/nodes/extraction/deployment-detector.node";
import { intentSynthesizerNode } from "@/nodes/extraction/intent-synthesizer.node";
import { confidenceEvaluatorNode } from "@/nodes/routing/confidence-evaluator.node";

/**
 * Creates the intent extraction subgraph with parallel execution
 */
export function createIntentExtractionGraph(): StateGraph<typeof StateAnnotation.State> {
  const workflow = new StateGraph(StateAnnotation)
    // Start with query preprocessing
    .addNode("query-preprocessor", queryPreprocessorNode)
    
    // Parallel extraction branches
    .addNode("semantic-prefilter", semanticPrefilterNode)
    .addNode("zero-shot-classifier", zeroShotClassifierNode)
    .addNode("score-combiner", scoreCombinerNode)
    
    .addNode("ner-extractor", nerExtractorNode)
    .addNode("fuzzy-matcher", fuzzyMatcherNode)
    .addNode("name-resolver", nameResolverNode)
    
    .addNode("comparative-detector", comparativeDetectorNode)
    .addNode("reference-extractor", referenceExtractorNode)
    
    .addNode("price-extractor", priceExtractorNode)
    .addNode("interface-detector", interfaceDetectorNode)
    .addNode("deployment-detector", deploymentDetectorNode)
    
    // Convergence and synthesis
    .addNode("intent-synthesizer", intentSynthesizerNode)
    .addNode("confidence-evaluator", confidenceEvaluatorNode)
    
    // Define edges
    .addEdge("__start__", "query-preprocessor")
    
    // Fan out to parallel branches after preprocessing
    .addEdge("query-preprocessor", "semantic-prefilter")
    .addEdge("query-preprocessor", "ner-extractor")
    .addEdge("query-preprocessor", "comparative-detector")
    .addEdge("query-preprocessor", "price-extractor")
    .addEdge("query-preprocessor", "interface-detector")
    .addEdge("query-preprocessor", "deployment-detector")
    
    // Semantic branch (sequential)
    .addEdge("semantic-prefilter", "zero-shot-classifier")
    .addEdge("zero-shot-classifier", "score-combiner")
    
    // Tool name branch (sequential)
    .addEdge("ner-extractor", "fuzzy-matcher")
    .addEdge("fuzzy-matcher", "name-resolver")
    
    // Comparative branch (conditional)
    .addEdge("comparative-detector", "reference-extractor")
    
    // Convergence point - all branches lead to intent synthesizer
    .addEdge("score-combiner", "intent-synthesizer")
    .addEdge("name-resolver", "intent-synthesizer")
    .addEdge("reference-extractor", "intent-synthesizer")
    .addEdge("price-extractor", "intent-synthesizer")
    .addEdge("interface-detector", "intent-synthesizer")
    .addEdge("deployment-detector", "intent-synthesizer")
    
    // Final evaluation
    .addEdge("intent-synthesizer", "confidence-evaluator")
    .addEdge("confidence-evaluator", END);
    
  return workflow;
}

/**
 * Conditional edge for comparative detection
 */
async function shouldExtractReference(state: typeof StateAnnotation.State): Promise<boolean> {
  return state.extractionSignals?.comparativeFlag || false;
}

/**
 * Entry point for intent extraction
 */
export async function extractIntent(query: string): Promise<Partial<typeof StateAnnotation.State>> {
  const graph = createIntentExtractionGraph();
  const compiledGraph = graph.compile();
  
  const initialState = {
    query,
    metadata: {
      startTime: new Date(),
      executionPath: ["intent-extraction"],
      nodeExecutionTimes: {}
    }
  };
  
  return await compiledGraph.invoke(initialState);
}
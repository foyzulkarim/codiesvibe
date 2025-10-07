import { StateAnnotation } from "@/types/state";

/**
 * Resolve conflicts between NER and fuzzy matching results
 */
export async function nameResolverNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { extractionSignals } = state;

  if (!extractionSignals.nerResults && !extractionSignals.fuzzyMatches) {
    return {
      extractionSignals: {
        ...extractionSignals,
        resolvedToolNames: []
      }
    };
  }

  try {
    const nerResults = extractionSignals.nerResults || [];
    const fuzzyMatches = extractionSignals.fuzzyMatches || [];

    // Create a map of tool names to confidence scores
    const toolNameMap = new Map<string, number>();

    // Add NER results with high confidence
    nerResults.forEach(name => {
      toolNameMap.set(name, 0.9);
    });

    // Add fuzzy matches with confidence based on score
    fuzzyMatches.forEach(match => {
      // Convert Fuse.js score to confidence (lower score = higher confidence)
      const confidence = 1 - Math.min(match.score, 1);

      // Only add if confidence is reasonable
      if (confidence > 0.5) {
        const existingConfidence = toolNameMap.get(match.name) || 0;
        // Use the higher confidence
        toolNameMap.set(match.name, Math.max(existingConfidence, confidence));
      }
    });

    // Convert to array and sort by confidence
    const resolvedToolNames = Array.from(toolNameMap.entries())
      .map(([name, confidence]) => ({ name, confidence }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5) // Keep top 5
      .map(item => item.name);

    return {
      extractionSignals: {
        ...extractionSignals,
        resolvedToolNames
      }
    };
  } catch (error) {
    console.error("Error in nameResolverNode:", error);
    return {
      extractionSignals: {
        ...extractionSignals,
        resolvedToolNames: []
      }
    };
  }
}
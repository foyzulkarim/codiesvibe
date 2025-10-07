import { StateAnnotation } from "@/types/state";

const comparativePatterns: Record<string, RegExp> = {
  direct: /\b(compare|vs|versus|or)\b/gi,
  difference: /\b(difference|different from|instead of|alternative)\b/gi,
  similarity: /\b(similar|like|same as|replacement for)\b/gi
};

/**
 * Detect comparative intent in the query
 */
export async function comparativeDetectorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;

  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        comparativeFlag: false,
        comparativeConfidence: 0
      }
    };
  }

  try {
    // First, check for explicit comparative patterns
    let comparativeFlag = false;
    let comparativeConfidence = 0;

    for (const [patternType, pattern] of Object.entries(comparativePatterns)) {
      if (pattern.test(preprocessedQuery)) {
        comparativeFlag = true;

        // Set confidence based on pattern type
        switch (patternType) {
          case "direct":
            comparativeConfidence = 0.9;
            break;
          case "difference":
            comparativeConfidence = 0.8;
            break;
          case "similarity":
            comparativeConfidence = 0.7;
            break;
        }
        break;
      }
    }

    // If no explicit pattern found, use semantic similarity
    if (!comparativeFlag) {
      // Generate embedding for the query
      // TODO: Implement embedding service integration
      const queryEmbedding = await generateEmbedding(preprocessedQuery);

      // Get embeddings for comparative patterns
      const comparativePatterns = [
        "compare tools",
        "alternative to",
        "vs",
        "instead of",
        "similar to",
        "better than",
        "replacement for"
      ];

      const patternEmbeddings = await Promise.all(
        comparativePatterns.map(pattern => generateEmbedding(pattern))
      );

      // Calculate similarities
      const similarities = patternEmbeddings.map(embedding =>
        cosineSimilarity(queryEmbedding, embedding)
      );

      // Find the highest similarity
      const maxSimilarity = Math.max(...similarities);

      // If similarity is above threshold, consider it comparative
      if (maxSimilarity > 0.7) {
        comparativeFlag = true;
        comparativeConfidence = maxSimilarity * 0.8; // Slightly lower confidence for semantic detection
      }
    }

    return {
      extractionSignals: {
        ...state.extractionSignals,
        comparativeFlag,
        comparativeConfidence
      }
    };
  } catch (error) {
    console.error("Error in comparativeDetectorNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        comparativeFlag: false,
        comparativeConfidence: 0
      }
    };
  }
}

// TODO: Implement embedding service
async function generateEmbedding(text: string): Promise<number[]> {
  // Mock implementation
  return Array.from({ length: 384 }, () => Math.random());
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}
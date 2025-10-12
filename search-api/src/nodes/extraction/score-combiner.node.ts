import { StateAnnotation } from "@/types/state";

/**
 * Combine semantic similarity and classification scores
 */
export async function scoreCombinerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { extractionSignals } = state;

  if (!extractionSignals.semanticCandidates || !extractionSignals.classificationScores) {
    return {
      extractionSignals: {
        ...extractionSignals,
        combinedScores: {
          categories: [],
          functionality: [],
          userTypes: [],
          interface: [],
          deployment: [],
          pricingModel: []
        }
      }
    };
  }

  try {
    const combinedScores: Record<string, Array<{ value: string; score: number }>> = {};

    // For each enum type, combine semantic and classification scores
    for (const enumType of Object.keys(extractionSignals.semanticCandidates)) {
      const semanticCandidates = extractionSignals.semanticCandidates[enumType] || [];
      const classificationScores = extractionSignals.classificationScores[enumType] || [];

      // Create a map of value to combined score
      const scoreMap = new Map<string, number>();

      // Add semantic scores (weighted by 0.6)
      semanticCandidates.forEach(candidate => {
        scoreMap.set(candidate.value, candidate.score * 0.6);
      });

      // Add classification scores (weighted by 0.4)
      classificationScores.forEach(score => {
        const existingScore = scoreMap.get(score.value) || 0;
        scoreMap.set(score.value, existingScore + score.score * 0.4);
      });

      // Convert back to array and sort by score
      combinedScores[enumType] = Array.from(scoreMap.entries())
        .map(([value, score]) => ({ value, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // Keep top 3 candidates
    }

    return {
      extractionSignals: {
        ...extractionSignals,
        combinedScores
      }
    };
  } catch (error) {
    console.error("Error in scoreCombinerNode:", error);
    return {
      extractionSignals: {
        ...extractionSignals,
        combinedScores: {
          categories: [],
          functionality: [],
          userTypes: [],
          interface: [],
          deployment: [],
          pricingModel: []
        }
      }
    };
  }
}
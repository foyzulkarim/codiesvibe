import { StateAnnotation } from '@/types/state';
import { modelConfigs, chatVllmClient } from '@/config/models';
import { extractCleanContent } from '@/utils/llm-response-handler';

/**
 * Classify query against filtered candidates using zero-shot classification
 */
export async function zeroShotClassifierNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery, extractionSignals } = state;

  if (!preprocessedQuery || !extractionSignals.semanticCandidates) {
    return {
      extractionSignals: {
        ...extractionSignals,
        classificationScores: {
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
    const classificationScores: Record<string, Array<{ value: string; score: number }>> = {};

    // For each enum type, perform zero-shot classification
    for (const [enumType, candidates] of Object.entries(extractionSignals.semanticCandidates)) {
      if (candidates.length === 0) {
        classificationScores[enumType] = [];
        continue;
      }

      // Create a prompt for zero-shot classification
      const candidateLabels = candidates.map(c => c.value).join(", ");
      const prompt = `
Classify the following query into one of these categories: ${candidateLabels}

Query: "${preprocessedQuery}"

Respond with only the category name that best matches the query.
`;

      // Call the LLM for classification using LangChain
      const response = await chatVllmClient.invoke(prompt);

      const classifiedValue = extractCleanContent(response).trim().toLowerCase();

      // Find the classified value in our candidates and assign a high score
      const matchedCandidate = candidates.find(c =>
        c.value && c.value.toLowerCase() === classifiedValue
      );

      if (matchedCandidate) {
        classificationScores[enumType] = [{
          value: matchedCandidate.value,
          score: 0.9 // High confidence for LLM classification
        }];
      } else {
        // If no match, use the top semantic candidate with lower confidence
        classificationScores[enumType] = [{
          value: candidates[0].value,
          score: 0.5
        }];
      }
    }

    return {
      extractionSignals: {
        ...extractionSignals,
        classificationScores
      }
    };
  } catch (error) {
    console.error("Error in zeroShotClassifierNode:", error);
    return {
      extractionSignals: {
        ...extractionSignals,
        classificationScores: {
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

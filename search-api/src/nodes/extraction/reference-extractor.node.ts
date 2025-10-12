import { StateAnnotation } from '@/types/state';
import { modelConfigs, chatVllmClient } from '@/config/models';
import { extractCleanContent } from '@/utils/llm-response-handler';

function extractReferenceTool(query: string): string | null {
  // Pattern-based extraction for common comparative structures
  const patterns = [
    /alternative to (\w+)/gi,
    /instead of (\w+)/gi,
    /like (\w+)/gi,
    /similar to (\w+)/gi,
    /replacement for (\w+)/gi,
    /(\w+) alternative/gi,
    /(\w+) replacement/gi,
    /(\w+) vs \w+/gi,
    /\w+ vs (\w+)/gi,
    /compare (\w+)/gi
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(query);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract reference tool name from comparative query
 */
export async function referenceExtractorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery, extractionSignals } = state;

  if (!preprocessedQuery || !extractionSignals.comparativeFlag) {
    return {
      extractionSignals: {
        ...extractionSignals,
        referenceTool: undefined
      }
    };
  }

  try {
    // First, try pattern-based extraction
    let referenceTool = extractReferenceTool(preprocessedQuery);

    // If pattern-based extraction fails, use LLM
    if (!referenceTool) {
      const prompt = `
Extract the reference tool name from the following comparative query. The reference tool is the one being compared against.

Query: "${preprocessedQuery}"

Respond with only the name of the reference tool. If no reference tool is found, respond with "none".
`;

      // Call the LLM for reference extraction using LangChain
      const response = await chatVllmClient.invoke(prompt);

      const extractedTool = extractCleanContent(response).trim();

      if (extractedTool.toLowerCase() !== "none") {
        referenceTool = extractedTool;
      }
    }

    return {
      extractionSignals: {
        ...extractionSignals,
        referenceTool
      }
    };
  } catch (error) {
    console.error("Error in referenceExtractorNode:", error);
    return {
      extractionSignals: {
        ...extractionSignals,
        referenceTool: undefined
      }
    };
  }
}

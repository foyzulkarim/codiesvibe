import { StateAnnotation } from "@/types/state";

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
        referenceTool: null
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

      // Call the LLM for reference extraction
      // TODO: Implement actual LLM integration
      const response = await callLLM({
        prompt,
        model: "llama3.1", // TODO: Use model config
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      });

      const extractedTool = response.response.trim();

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
        referenceTool: null
      }
    };
  }
}

// TODO: Implement actual LLM service
async function callLLM(params: { prompt: string; model: string; options: any }): Promise<{ response: string }> {
  // Mock implementation for now
  const words = params.prompt.split(" ");
  return { response: words[0] || "none" };
}
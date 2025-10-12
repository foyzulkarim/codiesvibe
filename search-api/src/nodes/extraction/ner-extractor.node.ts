import { StateAnnotation } from '@/types/state';
import { modelConfigs, chatVllmClient } from '@/config/models';
import { extractJsonFromResponse } from '@/utils/llm-response-handler';

/**
 * Extract tool names using Named Entity Recognition
 */
export async function nerExtractorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;

  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        nerResults: []
      }
    };
  }

  try {
    // Create a prompt for NER
    const prompt = `
Extract tool names from the following query. A tool name is typically a proper noun that refers to a software application, framework, or platform.

Query: "${preprocessedQuery}"

Respond with a JSON array of tool names found in the query. If no tool names are found, return an empty array.
Example response: ["GitHub", "VS Code", "React"]
`;

    // Call the LLM for NER using LangChain
    const response = await chatVllmClient.invoke(prompt);

    console.log("nerExtractorNode(): Raw NER response");

    let nerResults: string[] = [];

    try {
      // Use the utility to extract clean JSON from the response
      const jsonText = extractJsonFromResponse(response);
      console.log("nerExtractorNode(): Extracted JSON text:", jsonText);

      nerResults = JSON.parse(jsonText);

      // Ensure it's an array
      if (!Array.isArray(nerResults)) {
        nerResults = [];
      }

      // Filter out common non-tool words
      nerResults = nerResults.filter((name: string) => {
        const lowerName = name.toLowerCase();
        const nonToolWords = [
          "software", "app", "application", "tool", "platform", "service",
          "system", "program", "website", "online", "free", "paid", "best",
          "top", "new", "latest", "version", "update", "release"
        ];
        return !nonToolWords.includes(lowerName) && name.length > 1;
      });
    } catch (parseError) {
      console.error("Error parsing NER response:", parseError);
      // If parsing fails, return empty array
      nerResults = [];
    }

    return {
      extractionSignals: {
        ...state.extractionSignals,
        nerResults
      }
    };
  } catch (error) {
    console.error("Error in nerExtractorNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        nerResults: []
      }
    };
  }
}

import { StateAnnotation } from "@/types/state";

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

    // Call the LLM for NER
    // TODO: Implement actual LLM integration
    const response = await callLLM({
      prompt,
      model: "llama3.1", // TODO: Use model config
      options: {
        temperature: 0.1,
        top_p: 0.9
      },
      format: "json"
    });

    let nerResults: string[] = [];

    try {
      // Parse the JSON response
      nerResults = JSON.parse(response.response);

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

// TODO: Implement actual LLM service
async function callLLM(params: { prompt: string; model: string; options: any; format?: string }): Promise<{ response: string }> {
  // Mock implementation for now
  // In real implementation, this would use Ollama or another LLM service
  const words = params.prompt.split(" ").filter((word: string) =>
    word.length > 2 && /^[A-Z]/.test(word)
  );
  return { response: JSON.stringify(words) };
}
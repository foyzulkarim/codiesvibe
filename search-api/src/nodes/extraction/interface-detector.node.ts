import { StateAnnotation } from "@/types/state";

function extractInterfacePreferences(query: string): string[] {
  const preferences: string[] = [];

  const interfacePatterns: Record<string, RegExp> = {
    "Web App": /\b(web app|web application|browser|online|cloud)\b/gi,
    "Desktop": /\b(desktop|native|standalone|offline)\b/gi,
    "Mobile": /\b(mobile|phone|tablet|ios|android)\b/gi,
    "CLI": /\b(cli|command line|terminal|console|shell)\b/gi,
    "API": /\b(api|rest|graphql|sdk|library)\b/gi
  };

  for (const [interfaceType, pattern] of Object.entries(interfacePatterns)) {
    if (pattern.test(query)) {
      preferences.push(interfaceType);
    }
  }

  return preferences;
}

/**
 * Detect interface preferences from the query
 */
export async function interfaceDetectorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;

  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        interfacePreferences: []
      }
    };
  }

  try {
    // Use pattern matching to extract interface preferences
    const interfacePreferences = extractInterfacePreferences(preprocessedQuery);

    return {
      extractionSignals: {
        ...state.extractionSignals,
        interfacePreferences
      }
    };
  } catch (error) {
    console.error("Error in interfaceDetectorNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        interfacePreferences: []
      }
    };
  }
}
import { StateAnnotation } from "@/types/state";

function extractDeploymentPreferences(query: string): string[] {
  const preferences: string[] = [];

  const deploymentPatterns: Record<string, RegExp> = {
    "Cloud": /\b(cloud|saas|online|hosted|aws|azure|gcp)\b/gi,
    "Self-Hosted": /\b(on.?premise|self.?hosted|local|in.?house|internal)\b/gi,
    "Hybrid": /\b(hybrid|mixed|both|partial)\b/gi,
    "Docker": /\b(docker|container|kubernetes|k8s)\b/gi
  };

  for (const [deploymentType, pattern] of Object.entries(deploymentPatterns)) {
    if (pattern.test(query)) {
      preferences.push(deploymentType);
    }
  }

  return preferences;
}

/**
 * Detect deployment preferences from the query
 */
export async function deploymentDetectorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;

  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        deploymentPreferences: []
      }
    };
  }

  try {
    // Use pattern matching to extract deployment preferences
    const deploymentPreferences = extractDeploymentPreferences(preprocessedQuery);

    return {
      extractionSignals: {
        ...state.extractionSignals,
        deploymentPreferences
      }
    };
  } catch (error) {
    console.error("Error in deploymentDetectorNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        deploymentPreferences: []
      }
    };
  }
}
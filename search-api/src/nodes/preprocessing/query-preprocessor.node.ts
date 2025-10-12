import { StateAnnotation } from "@/types/state";

/**
 * Normalize and preprocess the user query
 */
export async function queryPreprocessorNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { query } = state;

  if (!query) {
    return { preprocessedQuery: "" };
  }

  try {
    // Convert to lowercase and trim
    let preprocessed = query.toLowerCase().trim();

    // Replace common abbreviations
    const abbreviations: Record<string, string> = {
      "ui": "user interface",
      "ux": "user experience",
      "api": "application programming interface",
      "saas": "software as a service",
      "ci/cd": "continuous integration continuous deployment",
      "ide": "integrated development environment",
      "crm": "customer relationship management",
      "cms": "content management system",
      "ai": "artificial intelligence",
      "ml": "machine learning",
      "cli": "command line interface"
    };

    for (const [abbr, expansion] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${abbr}\\b`, "gi");
      preprocessed = preprocessed.replace(regex, expansion);
    }

    // Normalize punctuation
    preprocessed = preprocessed.replace(/[^\w\s]/g, " ");

    // Remove extra whitespace
    preprocessed = preprocessed.replace(/\s+/g, " ").trim();

    return { preprocessedQuery: preprocessed };
  } catch (error) {
    console.error("Error in queryPreprocessorNode:", error);
    // If preprocessing fails, use the original query
    return { preprocessedQuery: query };
  }
}

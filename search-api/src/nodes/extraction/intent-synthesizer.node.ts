import { StateAnnotation } from "@/types/state";

interface Intent {
  toolNames: string[];
  priceConstraints: {
    hasFreeTier?: boolean;
    maxPrice?: number;
    minPrice?: number;
    pricingModel?: string;
  };
  categories: string[];
  functionality: string[];
  userTypes: string[];
  interface: string[];
  deployment: string[];
  isComparative: boolean;
  referenceTool: string | null;
  semanticQuery: string;
  keywords: string[];
  excludeTools: string[];
}

interface Confidence {
  overall: number;
  breakdown: Record<string, number>;
}

/**
 * Synthesize all extraction signals into a unified intent
 */
export async function intentSynthesizerNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const {
    query,
    preprocessedQuery,
    extractionSignals
  } = state;

  if (!preprocessedQuery) {
    return {
      intent: {
        toolNames: [],
        categories: [],
        functionality: [],
        userTypes: [],
        interface: [],
        deployment: [],
        isComparative: false,
        semanticQuery: "",
        keywords: [],
        excludeTools: []
      },
      confidence: {
        overall: 0,
        breakdown: {}
      }
    };
  }

  try {
    // Create a prompt for intent synthesis
    const prompt = `
Synthesize the following extraction signals into a unified intent object for the query: "${query}"

Extraction signals:
- Tool names: ${JSON.stringify(extractionSignals.resolvedToolNames || [])}
- Categories: ${JSON.stringify(extractionSignals.combinedScores?.categories?.map(c => c.value) || [])}
- Functionality: ${JSON.stringify(extractionSignals.combinedScores?.functionality?.map(c => c.value) || [])}
- User types: ${JSON.stringify(extractionSignals.combinedScores?.userTypes?.map(c => c.value) || [])}
- Interface: ${JSON.stringify(extractionSignals.interfacePreferences || [])}
- Deployment: ${JSON.stringify(extractionSignals.deploymentPreferences || [])}
- Comparative: ${extractionSignals.comparativeFlag ? "Yes" : "No"}
- Reference tool: ${extractionSignals.referenceTool || "None"}
- Price constraints: ${JSON.stringify(extractionSignals.priceConstraints || {})}

Respond with a JSON object representing the intent, following this schema:
{
  "toolNames": ["array of tool names"],
  "priceConstraints": {
    "hasFreeTier": boolean,
    "maxPrice": number,
    "minPrice": number,
    "pricingModel": string
  },
  "categories": ["array of categories"],
  "functionality": ["array of functionality"],
  "userTypes": ["array of user types"],
  "interface": ["array of interface types"],
  "deployment": ["array of deployment types"],
  "isComparative": boolean,
  "referenceTool": "string or null",
  "semanticQuery": "string representing the semantic intent",
  "keywords": ["array of keywords"],
  "excludeTools": ["array of tools to exclude"]
}
`;

    // Call the LLM for intent synthesis
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

    let intent: any;

    try {
      // Parse the JSON response
      intent = JSON.parse(response.response);

      // Apply defaults for missing fields
      intent = {
        toolNames: intent.toolNames || extractionSignals.resolvedToolNames || [],
        categories: intent.categories || extractionSignals.combinedScores?.categories?.map((c: any) => c.value) || [],
        functionality: intent.functionality || extractionSignals.combinedScores?.functionality?.map((c: any) => c.value) || [],
        userTypes: intent.userTypes || extractionSignals.combinedScores?.userTypes?.map((c: any) => c.value) || [],
        interface: intent.interface || extractionSignals.interfacePreferences || [],
        deployment: intent.deployment || extractionSignals.deploymentPreferences || [],
        isComparative: intent.isComparative || extractionSignals.comparativeFlag || false,
        referenceTool: intent.referenceTool || extractionSignals.referenceTool || null,
        semanticQuery: intent.semanticQuery || preprocessedQuery,
        keywords: intent.keywords || preprocessedQuery.split(/\s+/).filter((w: string) => w.length > 2),
        excludeTools: intent.excludeTools || [],
        priceConstraints: intent.priceConstraints || extractionSignals.priceConstraints || {}
      };
    } catch (parseError) {
      console.error("Error parsing intent synthesis response:", parseError);

      // If parsing fails, create a minimal intent from extraction signals
      intent = {
        toolNames: extractionSignals.resolvedToolNames || [],
        categories: extractionSignals.combinedScores?.categories?.map((c: any) => c.value) || [],
        functionality: extractionSignals.combinedScores?.functionality?.map((c: any) => c.value) || [],
        userTypes: extractionSignals.combinedScores?.userTypes?.map((c: any) => c.value) || [],
        interface: extractionSignals.interfacePreferences || [],
        deployment: extractionSignals.deploymentPreferences || [],
        isComparative: extractionSignals.comparativeFlag || false,
        referenceTool: extractionSignals.referenceTool || null,
        semanticQuery: preprocessedQuery,
        keywords: preprocessedQuery.split(/\s+/).filter((w: string) => w.length > 2),
        excludeTools: [],
        priceConstraints: extractionSignals.priceConstraints || {}
      };
    }

    // Calculate confidence scores
    const confidenceBreakdown: Record<string, number> = {};

    // Tool names confidence
    if (intent.toolNames && intent.toolNames.length > 0) {
      confidenceBreakdown.toolNames = 0.9;
    } else {
      confidenceBreakdown.toolNames = 0;
    }

    // Categories confidence
    if (intent.categories && intent.categories.length > 0) {
      const categoryScores = extractionSignals.combinedScores?.categories || [];
      confidenceBreakdown.categories = categoryScores.length > 0
        ? categoryScores[0].score
        : 0.5;
    } else {
      confidenceBreakdown.categories = 0;
    }

    // Functionality confidence
    if (intent.functionality && intent.functionality.length > 0) {
      const functionalityScores = extractionSignals.combinedScores?.functionality || [];
      confidenceBreakdown.functionality = functionalityScores.length > 0
        ? functionalityScores[0].score
        : 0.5;
    } else {
      confidenceBreakdown.functionality = 0;
    }

    // User types confidence
    if (intent.userTypes && intent.userTypes.length > 0) {
      const userTypeScores = extractionSignals.combinedScores?.userTypes || [];
      confidenceBreakdown.userTypes = userTypeScores.length > 0
        ? userTypeScores[0].score
        : 0.5;
    } else {
      confidenceBreakdown.userTypes = 0;
    }

    // Interface confidence
    if (intent.interface && intent.interface.length > 0) {
      confidenceBreakdown.interface = 0.8; // High confidence for pattern matching
    } else {
      confidenceBreakdown.interface = 0;
    }

    // Deployment confidence
    if (intent.deployment && intent.deployment.length > 0) {
      confidenceBreakdown.deployment = 0.8; // High confidence for pattern matching
    } else {
      confidenceBreakdown.deployment = 0;
    }

    // Comparative confidence
    confidenceBreakdown.comparative = extractionSignals.comparativeConfidence || 0;

    // Calculate overall confidence as weighted average
    const weights = {
      toolNames: 0.2,
      categories: 0.15,
      functionality: 0.15,
      userTypes: 0.1,
      interface: 0.1,
      deployment: 0.1,
      comparative: 0.2
    };

    let overallConfidence = 0;
    let totalWeight = 0;

    for (const [key, weight] of Object.entries(weights)) {
      if (confidenceBreakdown[key] !== undefined) {
        overallConfidence += confidenceBreakdown[key] * weight;
        totalWeight += weight;
      }
    }

    overallConfidence = totalWeight > 0 ? overallConfidence / totalWeight : 0;

    return {
      intent,
      confidence: {
        overall: overallConfidence,
        breakdown: confidenceBreakdown
      }
    };
  } catch (error) {
    console.error("Error in intentSynthesizerNode:", error);
    return {
      intent: {
        toolNames: [],
        categories: [],
        functionality: [],
        userTypes: [],
        interface: [],
        deployment: [],
        isComparative: false,
        semanticQuery: preprocessedQuery || "",
        keywords: (preprocessedQuery || "").split(/\s+/).filter((w: string) => w.length > 2),
        excludeTools: []
      },
      confidence: {
        overall: 0,
        breakdown: {}
      }
    };
  }
}

// TODO: Implement actual LLM service
async function callLLM(params: { prompt: string; model: string; options: any; format?: string }): Promise<{ response: string }> {
  // Mock implementation for now
  const mockIntent = {
    toolNames: [],
    categories: [],
    functionality: [],
    userTypes: [],
    interface: [],
    deployment: [],
    isComparative: false,
    referenceTool: null,
    semanticQuery: "",
    keywords: [],
    excludeTools: [],
    priceConstraints: {}
  };

  return { response: JSON.stringify(mockIntent) };
}
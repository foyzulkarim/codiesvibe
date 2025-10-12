import { StateAnnotation } from '@/types/state';
import { modelConfigs, chatVllmClient } from '@/config/models';
import {
  CONTROLLED_VOCABULARIES,
  VOCABULARY_MAPPINGS,
} from '@/shared/constants/controlled-vocabularies';
import { Intent, IntentSchema } from '@/types/intent';
import { z } from 'zod';
import { extractJsonFromResponse as utilExtractJsonFromResponse } from '@/utils/llm-response-handler';

// Simplified type for LLM response
interface LLMResponse {
  content: string | any[] | any;
}

// Configuration for logging
const LOG_CONFIG = {
  enabled: process.env.NODE_ENV !== 'production',
  prefix: '🧠 Intent Synthesizer:',
};

// Helper function for conditional logging
const log = (message: string, data?: any) => {
  if (LOG_CONFIG.enabled) {
    console.log(`${LOG_CONFIG.prefix} ${message}`, data ? data : '');
  }
};

const logError = (message: string, error?: any) => {
  console.error(`${LOG_CONFIG.prefix} ERROR: ${message}`, error ? error : '');
};

/**
 * Create a fallback intent from extraction signals when parsing fails
 */
function createFallbackIntent(
  extractionSignals: any,
  preprocessedQuery: string
): Partial<Intent> {
  return {
    toolNames: extractionSignals.resolvedToolNames || [],
    categories:
      extractionSignals.combinedScores?.categories?.map(
        (c: any) => c.value
      ) || [],
    functionality:
      extractionSignals.combinedScores?.functionality?.map(
        (c: any) => c.value
      ) || [],
    userTypes:
      extractionSignals.combinedScores?.userTypes?.map(
        (c: any) => c.value
      ) || [],
    interface: extractionSignals.interfacePreferences || [],
    deployment: extractionSignals.deploymentPreferences || [],
    isComparative: extractionSignals.comparativeFlag || false,
    referenceTool: extractionSignals.referenceTool || undefined,
    semanticQuery: preprocessedQuery,
    keywords: preprocessedQuery
      .split(/\s+/)
      .filter((w: string) => w.length > 2),
    excludeTools: [],
    priceConstraints: extractionSignals.priceConstraints || {},
  };
}

/**
 * Synthesize all extraction signals into a unified intent
 */
export async function intentSynthesizerNode(
  state: typeof StateAnnotation.State
): Promise<Partial<typeof StateAnnotation.State>> {
  const { query, preprocessedQuery, extractionSignals } = state;

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
        referenceTool: undefined,
        semanticQuery: '',
        keywords: [],
        excludeTools: [],
      },
      confidence: {
        overall: 0,
        breakdown: {},
      },
    };
  }

  try {
    // Create a prompt for intent synthesis with controlled vocabularies
    const VOCABULARY_CONTEXT = `
You must ONLY use terms from these predefined vocabularies:

CATEGORIES: ${CONTROLLED_VOCABULARIES.categories.join(', ')}
INTERFACES: ${CONTROLLED_VOCABULARIES.interface.join(', ')}
FUNCTIONALITY: ${CONTROLLED_VOCABULARIES.functionality.join(', ')}
DEPLOYMENT: ${CONTROLLED_VOCABULARIES.deployment.join(', ')}
INDUSTRIES: ${CONTROLLED_VOCABULARIES.industries.join(', ')}
USER_TYPES: ${CONTROLLED_VOCABULARIES.userTypes.join(', ')}

Rules:
1. Only select terms that EXACTLY match the vocabularies above
2. If no exact match exists, omit that filter
3. Use synonym mappings when available: ${JSON.stringify(VOCABULARY_MAPPINGS)}
4. Prefer broader terms over specific ones if uncertain
`;

    const prompt = `
Synthesize the following extraction signals into a unified intent object for the query: "${query}"

Extraction signals:
- Tool names: ${JSON.stringify(extractionSignals.resolvedToolNames || [])}
- Categories: ${JSON.stringify(
      extractionSignals.combinedScores?.categories?.map((c) => c.value) || []
    )}
- Functionality: ${JSON.stringify(
      extractionSignals.combinedScores?.functionality?.map((c) => c.value) || []
    )}
- User types: ${JSON.stringify(
      extractionSignals.combinedScores?.userTypes?.map((c) => c.value) || []
    )}
- Interface: ${JSON.stringify(extractionSignals.interfacePreferences || [])}
- Deployment: ${JSON.stringify(extractionSignals.deploymentPreferences || [])}
- Comparative: ${extractionSignals.comparativeFlag ? 'Yes' : 'No'}
- Reference tool: ${extractionSignals.referenceTool || 'None'}
- Price constraints: ${JSON.stringify(extractionSignals.priceConstraints || {})}

${VOCABULARY_CONTEXT}

Respond with a JSON object representing the intent, following this schema:
{
  "toolNames": ["array of tool names"],
  "priceConstraints": {
    "hasFreeTier": boolean,
    "maxPrice": number,
    "minPrice": number,
    "pricingModel": string
  },
  "categories": ["array of categories from CONTROLLED_VOCABULARIES.categories"],
  "functionality": ["array of functionality from CONTROLLED_VOCABULARIES.functionality"],
  "userTypes": ["array of user types from CONTROLLED_VOCABULARIES.userTypes"],
  "interface": ["array of interface types from CONTROLLED_VOCABULARIES.interface"],
  "deployment": ["array of deployment types from CONTROLLED_VOCABULARIES.deployment"],
  "isComparative": boolean,
  "referenceTool": "string or null",
  "semanticQuery": "string representing the semantic intent",
  "keywords": ["array of keywords"],
  "excludeTools": ["array of tools to exclude"]
}
`;

    log('Intent synthesis prompt created', { promptLength: prompt.length });

    // Call the LLM for intent synthesis using LangChain
    const response = await chatVllmClient.invoke(prompt);

    log('LLM response received', {
      contentType: typeof response.content,
      isArray: Array.isArray(response.content),
      hasContent: !!response.content
    });

    let intent: any;

    try {
      // Log the raw response for debugging
      log('intentSynthesizerNode(): Raw LLM response');

      // Extract JSON from the response using our helper function
      const jsonText = utilExtractJsonFromResponse(response);

      // Log the extracted JSON text for debugging
      log('intentSynthesizerNode(): Extracted JSON text:', { jsonText });
      
      if (!jsonText || jsonText.trim().length === 0) {
        throw new Error('Empty JSON text to parse');
      }

      log('intentSynthesizerNode(): Final JSON text to parse', { jsonLength: jsonText.length });

      // Parse the JSON response with simple error handling
      let parsedIntent: any;
      try {
        parsedIntent = JSON.parse(jsonText);

        // Log the parsed intent for debugging
        log('intentSynthesizerNode(): Parsed intent:', { parsedIntent });
      } catch (jsonError) {
        // Try to fix common JSON issues (trailing commas)
        const fixedJsonText = jsonText.replace(/,\s*([}\]])/g, '$1');
        
        try {
          parsedIntent = JSON.parse(fixedJsonText);
          log('Fixed JSON parsing issues', { originalLength: jsonText.length, fixedLength: fixedJsonText.length });
        } catch (secondError) {
          throw new Error(`Failed to parse JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
        }
      }

      // Validate the parsed intent using Zod schema
      try {
        const validationResult = IntentSchema.safeParse(parsedIntent);
        if (!validationResult.success) {
          logError('Intent validation failed', {
            errors: validationResult.error.issues,
            intent: parsedIntent
          });
          // Continue with fallback handling instead of throwing
          throw new Error(`Intent validation failed: ${validationResult.error.issues.map(i => i.path.join('.')).join(', ')}`);
        }
        intent = validationResult.data;
      } catch (validationError) {
        logError('Intent validation error', { error: validationError });
        // Continue with the parsed intent but with defaults applied
        intent = parsedIntent;
      }

      // Apply defaults for missing fields with proper type safety
      intent = {
        toolNames:
          intent.toolNames || extractionSignals.resolvedToolNames || [],
        categories: Array.isArray(intent.categories)
          ? intent.categories
          : extractionSignals.combinedScores?.categories?.map(
              (c: any) => c.value
            ) || [],
        functionality: Array.isArray(intent.functionality)
          ? intent.functionality
          : extractionSignals.combinedScores?.functionality?.map(
              (c: any) => c.value
            ) || [],
        userTypes: Array.isArray(intent.userTypes)
          ? intent.userTypes
          : extractionSignals.combinedScores?.userTypes?.map(
              (c: any) => c.value
            ) || [],
        interface: Array.isArray(intent.interface)
          ? intent.interface
          : extractionSignals.interfacePreferences || [],
        deployment: Array.isArray(intent.deployment)
          ? intent.deployment
          : extractionSignals.deploymentPreferences || [],
        isComparative:
          intent.isComparative || extractionSignals.comparativeFlag || false,
        referenceTool:
          intent.referenceTool || extractionSignals.referenceTool || undefined,
        semanticQuery: intent.semanticQuery || preprocessedQuery,
        keywords: Array.isArray(intent.keywords)
          ? intent.keywords
          : preprocessedQuery.split(/\s+/).filter((w: string) => w.length > 2),
        excludeTools: Array.isArray(intent.excludeTools)
          ? intent.excludeTools
          : [],
        priceConstraints:
          intent.priceConstraints || extractionSignals.priceConstraints || {},
      };

      log('Intent synthesis completed successfully', {
        hasToolNames: !!(intent.toolNames && intent.toolNames.length > 0),
        categoriesCount: intent.categories?.length || 0,
        functionalityCount: intent.functionality?.length || 0
      });
    } catch (parseError) {
      logError('Failed to parse intent synthesis response', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responseType: typeof response.content,
        responsePreview: typeof response.content === 'string'
          ? response.content.substring(0, 200) + '...'
          : JSON.stringify(response.content).substring(0, 200) + '...'
      });

      // If parsing fails, create a fallback intent from extraction signals
      intent = createFallbackIntent(extractionSignals, preprocessedQuery);
    }

    // Calculate confidence scores with better error handling
    const confidenceBreakdown: Record<string, number> = {};

    // Helper function to safely get score value
    const getScore = (scores: any[] | undefined, defaultValue: number = 0.5): number => {
      if (!scores || !Array.isArray(scores) || scores.length === 0) {
        return defaultValue;
      }
      const score = scores[0]?.score;
      return typeof score === 'number' && !isNaN(score) ? score : defaultValue;
    };

    // Tool names confidence
    if (Array.isArray(intent.toolNames) && intent.toolNames.length > 0) {
      confidenceBreakdown.toolNames = 0.9;
    } else {
      confidenceBreakdown.toolNames = 0;
    }

    // Categories confidence
    if (Array.isArray(intent.categories) && intent.categories.length > 0) {
      confidenceBreakdown.categories = getScore(extractionSignals.combinedScores?.categories);
    } else {
      confidenceBreakdown.categories = 0;
    }

    // Functionality confidence
    if (Array.isArray(intent.functionality) && intent.functionality.length > 0) {
      confidenceBreakdown.functionality = getScore(extractionSignals.combinedScores?.functionality);
    } else {
      confidenceBreakdown.functionality = 0;
    }

    // User types confidence
    if (Array.isArray(intent.userTypes) && intent.userTypes.length > 0) {
      confidenceBreakdown.userTypes = getScore(extractionSignals.combinedScores?.userTypes);
    } else {
      confidenceBreakdown.userTypes = 0;
    }

    // Interface confidence
    if (Array.isArray(intent.interface) && intent.interface.length > 0) {
      confidenceBreakdown.interface = 0.8; // High confidence for pattern matching
    } else {
      confidenceBreakdown.interface = 0;
    }

    // Deployment confidence
    if (Array.isArray(intent.deployment) && intent.deployment.length > 0) {
      confidenceBreakdown.deployment = 0.8; // High confidence for pattern matching
    } else {
      confidenceBreakdown.deployment = 0;
    }

    // Comparative confidence
    const comparativeConfidence = extractionSignals?.comparativeConfidence;
    confidenceBreakdown.comparative =
      typeof comparativeConfidence === 'number' && !isNaN(comparativeConfidence)
        ? comparativeConfidence
        : 0;

    // Calculate overall confidence as weighted average
    const weights = {
      toolNames: 0.2,
      categories: 0.15,
      functionality: 0.15,
      userTypes: 0.1,
      interface: 0.1,
      deployment: 0.1,
      comparative: 0.2,
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

    // Ensure confidence is within valid range [0, 1]
    overallConfidence = Math.max(0, Math.min(1, overallConfidence));

    return {
      intent,
      confidence: {
        overall: overallConfidence,
        breakdown: confidenceBreakdown,
      },
    };
  } catch (error) {
    logError('Unexpected error in intentSynthesizerNode', {
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      intent: {
        toolNames: [],
        categories: [],
        functionality: [],
        userTypes: [],
        interface: [],
        deployment: [],
        isComparative: false,
        referenceTool: undefined,
        semanticQuery: preprocessedQuery || '',
        keywords: (preprocessedQuery || '')
          .split(/\s+/)
          .filter((w: string) => w.length > 2),
        excludeTools: [],
      },
      confidence: {
        overall: 0,
        breakdown: {},
      },
    };
  }
}

import { StateAnnotation } from '../../types/state';
import { llmService } from '../../services/llm.service';
import { CONTROLLED_VOCABULARIES } from '../../shared/constants/controlled-vocabularies';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// Configuration for logging
const LOG_CONFIG = {
  enabled: process.env.NODE_ENV !== 'production',
  prefix: '🎯 Intent Extractor:',
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
 * System prompt for intent extraction
 */
const INTENT_EXTRACTION_SYSTEM_PROMPT = `
You are an AI intent extractor. Your ONLY job is to return a valid JSON object. Do not provide explanations, do not engage in conversation, do not say "let me think about this" or any other conversational text.

Return ONLY a JSON object with this structure:
{
  "primaryGoal": "find" | "compare" | "recommend" | "explore" | "analyze" | "explain" | null,
  "referenceTool": string | null,
  "comparisonMode": "similar_to" | "vs" | "alternative_to" | null,
  "filters": [],
  "pricingModel": string | null,
  "billingPeriod": string | null,
  "priceRange": {
    "min": number | null,
    "max": number | null,
    "currency": "USD",
    "billingPeriod": string | null
  } | null,
  "priceComparison": {
    "operator": "less_than" | "greater_than" | "equal_to" | "around" | "between",
    "value": number,
    "currency": "USD",
    "billingPeriod": string | null
  } | null,
  "category": string | null,
  "interface": string | null,
  "functionality": string,
  "deployment": string | null,
  "industry": string | null,
  "userType": string | null,
  "semanticVariants": string[],
  "constraints": string[],
  "confidence": number
}

IMPORTANT GUIDELINES:
- "category" can be one of: ${CONTROLLED_VOCABULARIES.categories.map((c) => `"${c}"`).join(', ')}
- "interface" can be one of: ${CONTROLLED_VOCABULARIES.interface.map((i) => `"${i}"`).join(', ')}
- "functionality" can include: ${CONTROLLED_VOCABULARIES.functionality.map((f) => `"${f}"`).join(', ')}
- "deployment" can be one of: ${CONTROLLED_VOCABULARIES.deployment.map((d) => `"${d}"`).join(', ')}
- "industry" can be one of: ${CONTROLLED_VOCABULARIES.industries.map((i) => `"${i}"`).join(', ')}
- "userType" can be one of: ${CONTROLLED_VOCABULARIES.userTypes.map((u) => `"${u}"`).join(', ')}
- "pricingModel" can be one of: ${CONTROLLED_VOCABULARIES.pricingModels.map((p) => `"${p}"`).join(', ')}
- "billingPeriod" can be one of: ${CONTROLLED_VOCABULARIES.billingPeriods.map((b) => `"${b}"`).join(', ')}
- Use exact values from the controlled vocabularies - do not make up new values

PRICE EXTRACTION RULES:
- Extract specific price values, ranges, and comparisons from user queries
- For "priceRange": Extract when user mentions price ranges like "between $10-50", "$20 to $100"
- For "priceComparison": Extract when user mentions price constraints like "under $50", "less than $20/month", "around $30"
- Always normalize currency to USD if not specified
- Detect billing periods from context: "per month", "/mo", "monthly", "yearly", "annual", "one-time"
- Price operators:
  * "less_than": "under", "below", "less than", "cheaper than"
  * "greater_than": "over", "above", "more than", "expensive than"
  * "equal_to": "exactly", "costs", "priced at"
  * "around": "about", "approximately", "roughly", "around"
  * "between": "between X and Y", "from X to Y"

Examples:
Query: "free cli" → {"primaryGoal": "find", "pricingModel": "Free", "interface": "CLI", "priceRange": null, "priceComparison": null, "referenceTool": null, "comparisonMode": null, "functionality": [], "filters": [], "semanticVariants": [], "constraints": [], "confidence": 0.9}

Query: "AI tools under $50 per month" → {"primaryGoal": "find", "pricingModel": null, "priceComparison": {"operator": "less_than", "value": 50, "currency": "USD", "billingPeriod": "Monthly"}, "priceRange": null, "functionality": ["AI Integration"], "filters": [], "semanticVariants": [], "constraints": [], "confidence": 0.9}

Query: "code editor between $20-100 monthly" → {"primaryGoal": "find", "category": "Code Editor", "priceRange": {"min": 20, "max": 100, "currency": "USD", "billingPeriod": "Monthly"}, "priceComparison": null, "functionality": [], "filters": [], "semanticVariants": [], "constraints": [], "confidence": 0.8}

Query: "Cursor alternative but cheaper" → {"primaryGoal": "find", "referenceTool": "Cursor IDE", "comparisonMode": "alternative_to", "constraints": ["cheaper"], "priceComparison": {"operator": "less_than", "value": 20, "currency": "USD", "billingPeriod": "Monthly"}, "pricingModel": null, "category": "Code Editor", "functionality": ["Code Generation"], "filters": [], "semanticVariants": [], "confidence": 0.8}

Query: "free offline AI code generator" → {"primaryGoal": "find", "pricingModel": "Free", "priceRange": null, "priceComparison": null, "interface": null, "referenceTool": null, "comparisonMode": null, "functionality": ["Code Generation", "Local Inference"], "filters": [], "semanticVariants": [], "constraints": ["offline"], "confidence": 0.9}

Query: "API tools around $30 per month" → {"primaryGoal": "find", "category": "API", "priceComparison": {"operator": "around", "value": 30, "currency": "USD", "billingPeriod": "Monthly"}, "priceRange": null, "functionality": [], "filters": [], "semanticVariants": [], "constraints": [], "confidence": 0.85}

DO NOT include any text before or after the JSON. Return ONLY the JSON object.
`;

/**
 * Intent Extractor Node - Uses LangChain's structured output for reliable intent extraction
 */
export async function intentExtractorNode(
  state: typeof StateAnnotation.State
): Promise<Partial<typeof StateAnnotation.State>> {
  const { query } = state;

  if (!query || query.trim().length === 0) {
    logError('No query provided for intent extraction');
    return {
      intentState: null,
      errors: [
        ...(state.errors || []),
        {
          node: 'intent-extractor',
          error: new Error('No query provided for intent extraction'),
          timestamp: new Date(),
          recovered: false,
        },
      ],
    };
  }

  const startTime = Date.now();
  log('Starting intent extraction with LangChain structured output', {
    query: query.substring(0, 100),
  });

  try {
    // Create structured output model using LLM service
    log('Creating Together AI client for intent extraction', {
      taskType: 'intent-extraction',
      usingTogetherAPI: true
    });
    const llmClient = llmService.createTogetherAILangchainClient();

    log('Sending request to Together AI for intent extraction', {
      taskType: 'intent-extraction',
      model: 'openai/gpt-oss-20b via Together API'
    });

    // Extract intent using structured output
    const userPrompt = `Extract the intent from this query: "${query}"`;

    const parser = new JsonOutputParser();
    const intentState = await llmClient.invoke({
      system_prompt: INTENT_EXTRACTION_SYSTEM_PROMPT,
      format_instructions: parser.getFormatInstructions(),
      query: userPrompt,
    });

    const executionTime = Date.now() - startTime;

    log('Together AI intent extraction completed successfully', {
      intentState,
      executionTime,
      confidence: intentState.confidence
    });

    return {
      intentState,
      executionStats: {
        ...state.executionStats,
        nodeTimings: {
          ...state.executionStats?.nodeTimings,
          'intent-extractor': executionTime,
        },
      },
      metadata: {
        ...state.metadata,
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'intent-extractor',
        ],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'intent-extractor': executionTime,
        },
      },
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logError('Intent extraction failed', {
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    });

    return {
      intentState: null,
      errors: [
        ...(state.errors || []),
        {
          node: 'intent-extractor',
          error:
            error instanceof Error
              ? error
              : new Error('Unknown error in intent extraction'),
          timestamp: new Date(),
          recovered: false,
          recoveryStrategy:
            'Failed to extract intent - pipeline cannot continue',
        },
      ],
      executionStats: {
        ...state.executionStats,
        nodeTimings: {
          ...state.executionStats?.nodeTimings,
          'intent-extractor': executionTime,
        },
      },
      metadata: {
        ...state.metadata,
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'intent-extractor',
        ],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'intent-extractor': executionTime,
        },
      },
    };
  }
}

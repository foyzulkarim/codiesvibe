import { StateAnnotation } from '../../types/state';
import { IntentState, IntentStateSchema } from '../../types/intent-state';
import { vllmConfig } from '../../config/models';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

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
  "desiredFeatures": string[],
  "filters": [],
  "pricing": "free" | "freemium" | "paid" | "enterprise" | null,
  "category": "IDE" | "API" | "CLI" | "Framework" | "Agent" | "Plugin" | null,
  "platform": "web" | "desktop" | "cli" | "api" | null,
  "semanticVariants": string[],
  "constraints": string[],
  "confidence": number
}

IMPORTANT GUIDELINES:
- "desiredFeatures" can ONLY be: "AI code assist", "local inference", "RAG support", "multi-agent orchestration", "LLM integration", "context awareness", "CLI mode", "open-source"
- Put general constraints like "offline", "python support", "cheaper" in "constraints" array
- Do not make up features - only use the exact allowed values

Examples:
Query: "free cli" → {"primaryGoal": "find", "pricing": "free", "platform": "cli", "referenceTool": null, "comparisonMode": null, "desiredFeatures": ["CLI mode"], "filters": [], "semanticVariants": [], "constraints": [], "confidence": 0.9}

Query: "Cursor alternative but cheaper" → {"primaryGoal": "find", "referenceTool": "Cursor IDE", "comparisonMode": "alternative_to", "constraints": ["cheaper"], "pricing": "freemium", "platform": null, "category": "IDE", "desiredFeatures": ["AI code assist"], "filters": [], "semanticVariants": [], "confidence": 0.8}

Query: "AI code generator that works offline and supports Python" → {"primaryGoal": "find", "pricing": "free", "platform": null, "referenceTool": null, "comparisonMode": null, "desiredFeatures": ["AI code assist", "local inference"], "filters": [], "semanticVariants": [], "constraints": ["supports Python"], "confidence": 0.9}

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
          node: "intent-extractor",
          error: new Error("No query provided for intent extraction"),
          timestamp: new Date(),
          recovered: false
        }
      ]
    };
  }

  const startTime = Date.now();
  log('Starting intent extraction with LangChain structured output', { query: query.substring(0, 100) });

  try {
    // Initialize LangChain VLLM client
    const chatVllmClient = new ChatOpenAI({
      apiKey: "not-needed",
      configuration: {
        baseURL: `${vllmConfig.baseUrl}/v1`,
      },
      modelName: vllmConfig.model,
      temperature: 0.1,
      maxTokens: 500,
    });

    // Create structured output model with explicit type annotation
    const structuredModel = chatVllmClient.withStructuredOutput<z.infer<typeof IntentStateSchema>>(
      IntentStateSchema,
      {
        name: "intent_extraction",
      }
    );

    log('Sending request to LLM with structured output', {
      model: vllmConfig.model,
      baseUrl: vllmConfig.baseUrl
    });

    // Extract intent using structured output
    const userPrompt = `Extract the intent from this query: "${query}"`;
    const intentState = await structuredModel.invoke([
      { role: 'system', content: INTENT_EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]);

    const executionTime = Date.now() - startTime;

    log('Intent extraction completed successfully with LangChain', {
      primaryGoal: intentState.primaryGoal,
      hasReferenceTool: !!intentState.referenceTool,
      confidence: intentState.confidence,
      executionTime
    });

    return {
      intentState,
      executionStats: {
        ...state.executionStats,
        nodeTimings: {
          ...state.executionStats?.nodeTimings,
          "intent-extractor": executionTime
        }
      },
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "intent-extractor"],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          "intent-extractor": executionTime
        }
      }
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logError('Intent extraction failed', {
      error: error instanceof Error ? error.message : String(error),
      executionTime
    });

    return {
      intentState: null,
      errors: [
        ...(state.errors || []),
        {
          node: "intent-extractor",
          error: error instanceof Error ? error : new Error("Unknown error in intent extraction"),
          timestamp: new Date(),
          recovered: false,
          recoveryStrategy: "Failed to extract intent - pipeline cannot continue"
        }
      ],
      executionStats: {
        ...state.executionStats,
        nodeTimings: {
          ...state.executionStats?.nodeTimings,
          "intent-extractor": executionTime
        }
      },
      metadata: {
        ...state.metadata,
        executionPath: [...(state.metadata?.executionPath || []), "intent-extractor"],
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          "intent-extractor": executionTime
        }
      }
    };
  }
}
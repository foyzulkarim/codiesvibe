import { StateAnnotation } from '../../types/state.js';
import { llmService } from '../../services/llm.service.js';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { generateIntentExtractionPrompt } from '../../core/prompts/prompt.generator.js';
import { CONFIG } from '#config/env.config';
import type { LogMetadata } from '#types/logger.types.js';

// Configuration for logging
const LOG_CONFIG = {
  enabled: !CONFIG.env.IS_PRODUCTION,
  prefix: '🎯 Intent Extractor:',
};

// Helper function for conditional logging
const log = (message: string, data?: LogMetadata) => {
  if (LOG_CONFIG.enabled) {
    console.log(`${LOG_CONFIG.prefix} ${message}`, data ? data : '');
  }
};

const logError = (message: string, error?: LogMetadata) => {
  console.error(`${LOG_CONFIG.prefix} ERROR: ${message}`, error ? error : '');
};

/**
 * Intent Extractor Node - Uses LangChain's structured output for reliable intent extraction
 * Now schema-driven: generates prompts dynamically from domain schema
 */
export async function intentExtractorNode(
  state: typeof StateAnnotation.State
): Promise<Partial<typeof StateAnnotation.State>> {
  const { query, schema } = state;

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
  log('Starting intent extraction with schema-driven prompts', {
    query: query.substring(0, 100),
    schemaName: schema.name,
    schemaVersion: schema.version,
  });

  try {
    // Generate prompt dynamically from schema
    const systemPrompt = generateIntentExtractionPrompt(schema);
    log('Generated intent extraction prompt from schema', {
      promptLength: systemPrompt.length,
      vocabulariesCount: Object.keys(schema.vocabularies).length,
    });

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
      system_prompt: systemPrompt,
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

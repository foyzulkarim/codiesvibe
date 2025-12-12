import { ChatOpenAI } from '@langchain/openai';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { CONFIG } from '#config/env.config.js';

interface LLMTaskConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
}

// const MODEL = 'Qwen/Qwen3-1.7B-MLX-bf16';
const MODEL = 'Qwen/Qwen3-1.7B';

const taskConfigs: Record<string, LLMTaskConfig> = {
  'intent-extraction': {
    model: MODEL,
    temperature: 0.1,
    maxTokens: 1024,
    topP: 0.9,
  },
  'query-planning': {
    model: MODEL,
    temperature: 0.2,
    maxTokens: 1536,
    topP: 0.9,
  },
  refinement: {
    model: MODEL,
    temperature: 0.3,
    maxTokens: 1024,
    topP: 0.9,
  },
  'ner-extraction': {
    model: MODEL,
    temperature: 0.1,
    maxTokens: 1024,
    topP: 0.9,
  },
  'reference-extraction': {
    model: MODEL,
    temperature: 0.1,
    maxTokens: 1024,
    topP: 0.9,
  },
};

const LOG_CONFIG = {
  enabled: !CONFIG.env.IS_PRODUCTION,
  prefix: '🎯 LLM service:',
};

const log = (message: string, data?: unknown) => {
  if (LOG_CONFIG.enabled) {
    console.log(`${LOG_CONFIG.prefix} ${message}`, data ? data : '');
  }
};

export class LLMService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = CONFIG.ai.VLLM_BASE_URL;
  }

  createStructuredClient<T>(taskType: string, schema: z.ZodSchema<T>) {
    const config = taskConfigs[taskType];
    if (!config) {
      throw new Error(`No configuration found for task type: ${taskType}`);
    }

    log(`Creating structured client for task: ${taskType}`, {
      config,
      baseUrl: this.baseUrl,
    });

    const client = new ChatOpenAI({
      apiKey: 'not-needed',
      configuration: {
        baseURL: this.baseUrl,
      },
      model: config.model,
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
    });

    log(`Structured client created for task: ${taskType}`);

    return client.withStructuredOutput<T>(schema, {
      name: taskType.replace('-', '_'),
    });
  }

  createClient(taskType: string) {
    const config = taskConfigs[taskType];
    if (!config) {
      throw new Error(`No configuration found for task type: ${taskType}`);
    }

    return new ChatOpenAI({
      apiKey: 'not-needed',
      configuration: {
        baseURL: this.baseUrl,
      },
      model: config.model,
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
    });
  }

  createTogetherAILangchainClient() {
    // Define your parser
    const parser = new JsonOutputParser();

    // Create a prompt template with format instructions
    const prompt = PromptTemplate.fromTemplate(
      `{system_prompt}\n\n{format_instructions}\n\nUser query: {query}`
    );

    // Use with LangChain
    const model = new ChatOpenAI({
      configuration: {
        baseURL: 'https://api.together.xyz/v1',
        apiKey: CONFIG.ai.TOGETHER_API_KEY,
      },
      modelName: 'openai/gpt-oss-20b',
    });

    const chain = prompt.pipe(model).pipe(parser);
    return chain;
  }

  createTogetherAIClient(taskType: string) {
    // This method can be implemented if needed for direct Together API calls
    // For now, we focus on the LangChain integration
    log(`Together AI client creation requested for task: ${taskType}`);
    throw new Error('Direct Together AI client not implemented. Use createTogetherAIStructuredClient instead.');
  }
}

export const llmService = new LLMService();

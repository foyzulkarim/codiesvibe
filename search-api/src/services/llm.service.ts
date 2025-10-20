import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

interface LLMTaskConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
}

const taskConfigs: Record<string, LLMTaskConfig> = {
  'intent-extraction': {
    model: 'Qwen/Qwen3-0.6B',
    temperature: 0.1,
    maxTokens: 1024,
    topP: 0.9
  },
  'query-planning': {
    model: 'Qwen/Qwen3-0.6B',
    temperature: 0.2,
    maxTokens: 1536,
    topP: 0.9
  },
  'refinement': {
    model: 'Qwen/Qwen3-0.6B',
    temperature: 0.3,
    maxTokens: 1024,
    topP: 0.9
  },
  'ner-extraction': {
    model: 'Qwen/Qwen3-0.6B',
    temperature: 0.1,
    maxTokens: 1024,
    topP: 0.9
  },
  'reference-extraction': {
    model: 'Qwen/Qwen3-0.6B',
    temperature: 0.1,
    maxTokens: 1024,
    topP: 0.9
  }
};

export class LLMService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VLLM_BASE_URL || 'http://192.168.4.28:8000/v1';
  }

  createStructuredClient<T>(taskType: string, schema: z.ZodSchema<T>) {
    const config = taskConfigs[taskType];
    if (!config) {
      throw new Error(`No configuration found for task type: ${taskType}`);
    }

    const client = new ChatOpenAI({
      apiKey: 'not-needed',
      configuration: {
        baseURL: this.baseUrl,
      },
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
    });

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
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
    });
  }
}

export const llmService = new LLMService();
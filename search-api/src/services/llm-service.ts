import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import config from '../config/agentic';

/**
 * Real LLM Service using Ollama
 */
export class LLMService {
  private static model: ChatOllama | null = null;

  /**
   * Initialize the Ollama model
   */
  private static getModel(): ChatOllama {
    if (!this.model) {
      this.model = new ChatOllama({
        baseUrl: config.OLLAMA_URL,
        model: config.OLLAMA_MODEL,
        temperature: config.TEMPERATURE,
        // Additional configuration for better responses
        maxRetries: 3,
      });
    }
    return this.model;
  }

  /**
   * Call LLM with retry logic
   */
  static async callLLM(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      console.log(`🤖 Calling LLM at ${config.OLLAMA_URL} with model ${config.OLLAMA_MODEL}`);
      console.log(`📝 Prompt length: ${prompt.length} characters`);

      const model = this.getModel();

      // Prepare messages
      const messages: any[] = [];

      if (systemPrompt) {
        messages.push(new SystemMessage(systemPrompt));
      }

      messages.push(new HumanMessage(prompt));

      // Call the model
      const startTime = Date.now();
      const response = await model.invoke(messages);
      const responseTime = Date.now() - startTime;

      console.log(`✅ LLM response received in ${responseTime}ms`);
      console.log(`📄 Response length: ${response.content.length} characters`);

      return response.content as string;

    } catch (error) {
      console.error('❌ LLM call failed:', error);

      // Provide more detailed error information
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          throw new Error(`Cannot connect to Ollama at ${config.OLLAMA_URL}. Make sure Ollama is running.`);
        } else if (error.message.includes('model')) {
          throw new Error(`Model "${config.OLLAMA_MODEL}" not found. Available models: ${await this.getAvailableModels()}`);
        } else {
          throw new Error(`LLM call failed: ${error.message}`);
        }
      }

      throw new Error('Unknown LLM error occurred');
    }
  }

  /**
   * Get available models from Ollama
   */
  static async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${config.OLLAMA_URL}/api/tags`);
      const data = await response.json() as { models?: { name: string }[] };
      return data.models?.map((model: { name: string }) => model.name) || [];
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      return [];
    }
  }

  /**
   * Test connection to Ollama
   */
  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${config.OLLAMA_URL}/api/version`);
      return response.ok;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  /**
   * Health check for LLM service
   */
  static async healthCheck(): Promise<{
    connected: boolean;
    model: string;
    availableModels: string[];
    responseTime?: number;
  }> {
    try {
      const startTime = Date.now();
      const connected = await this.testConnection();
      const responseTime = connected ? Date.now() - startTime : undefined;
      const availableModels = await this.getAvailableModels();

      const result: {
        connected: boolean;
        model: string;
        availableModels: string[];
        responseTime?: number;
      } = {
        connected,
        model: config.OLLAMA_MODEL,
        availableModels
      };

      if (responseTime !== undefined) {
        result.responseTime = responseTime;
      }

      return result;
    } catch (error) {
      return {
        connected: false,
        model: config.OLLAMA_MODEL,
        availableModels: []
      };
    }
  }

  /**
   * Call LLM with structured output format
   */
  static async callLLMWithFormat(
    prompt: string,
    outputSchema?: string,
    systemPrompt?: string
  ): Promise<any> {
    const formattedPrompt = outputSchema
      ? `${prompt}\n\nPlease respond in valid JSON format with the following schema:\n${outputSchema}`
      : prompt;

    const response = await this.callLLM(formattedPrompt, systemPrompt);

    // Try to parse JSON response
    try {
      return JSON.parse(response);
    } catch (error) {
      console.warn('⚠️ Failed to parse JSON response, returning raw text:', response);
      // Return raw response if JSON parsing fails
      return {
        raw: response,
        error: 'Failed to parse JSON response'
      };
    }
  }

  /**
   * Reset model instance (useful for configuration changes)
   */
  static resetModel(): void {
    this.model = null;
  }
}

export default LLMService;
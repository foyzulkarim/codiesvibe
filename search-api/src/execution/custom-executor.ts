/**
 * Custom Tool Executor that works with the tool registry format
 */

import { getOriginalDataset } from '../data/loader';
import { TOOL_REGISTRY } from '../tools';

/**
 * Custom tool executor that works with the tool registry format
 */
export class CustomToolExecutor {
  private static initialized = false;

  /**
   * Initialize the tool registry with all available tools
   */
  static initializeTools(): void {
    if (this.initialized) return;

    console.log('🔧 Initializing tool registry with available tools...');

    // Register all tools from the TOOL_REGISTRY
    Object.entries(TOOL_REGISTRY).forEach(([toolName, toolEntry]) => {
      console.log(`📝 Registering tool: ${toolName}`);
      this.toolRegistry.set(toolName, toolEntry);
    });

    this.initialized = true;
    console.log(`✅ Registered ${this.toolRegistry.size} tools`);
  }

  /**
   * Get registered tools
   */
  static getRegisteredTools(): string[] {
    this.initializeTools();
    return Array.from(this.toolRegistry.keys());
  }

  private static toolRegistry: Map<string, any> = new Map();

  /**
   * Register a tool for execution (backward compatibility)
   */
  static registerTool(name: string, func: any, metadata: any): void {
    this.toolRegistry.set(name, { func, metadata });
  }

  /**
   * Execute tool with confidence tracking
   */
  static async execute(request: any): Promise<any> {
    const { toolName, parameters, context, state } = request;

    this.initializeTools();
    const tool = this.toolRegistry.get(toolName);
    if (!tool) {
      console.error(`❌ Tool not found: ${toolName}. Available tools:`, Array.from(this.toolRegistry.keys()));
      throw new Error(`Tool not found: ${toolName}. Available tools: ${Array.from(this.toolRegistry.keys()).join(', ')}`);
    }

    try {
      console.log(`🔧 Executing tool: ${toolName} with parameters:`, JSON.stringify(parameters, null, 2));

      // Get the dataset from the state
      // console.log(`🔥[${sessionId}] Dataset size:`, require('../data/loader').getOriginalDataset().length);
      // const dataset = state.currentResults || getOriginalDataset();
      const dataset = require('../data/loader').getOriginalDataset();
      console.log(`📊 Dataset size: ${dataset.length} items`);

      // Execute the tool function
      const result = await tool.func(dataset, parameters);

      console.log(`✅ Tool execution successful. Results: ${result.result?.length || 0} items`);

      // Return the result in the expected format
      return {
        success: true,
        data: result.result,
        confidence: {
          score: result.confidence,
          reasoning: result.reasoning,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`❌ Tool execution failed for ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Execution failed'),
        confidence: {
          score: 0.1,
          reasoning: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }
      };
    }
  }
}

export default CustomToolExecutor;

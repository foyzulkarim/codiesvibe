import { DynamicStructuredTool } from "@langchain/core/tools";
import { mcpClient } from "../mcp";
import { MCPToolConverter } from "./tool-converter";
import { logger, logError, logToolExecution } from "../utils/logger";
import { AgentError, withRetry } from "../utils/error-handler";

// Agent state interface
interface AgentState {
  messages: any[];
  query: string;
  result?: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
    result: string;
  }>;
  error?: string;
}

export class SimpleLangGraphAgent {
  private tools: DynamicStructuredTool[] = [];
  private initialized: boolean = false;

  constructor() {
    logger.info("[LangGraph Agent] Initialized agent");
  }

  /**
   * Initialize the agent with MCP tools
   */
  async initialize(): Promise<void> {
    try {
      logger.info("[LangGraph Agent] Initializing agent...");

      // Get tools from MCP client
      if (!mcpClient.isClientConnected()) {
        throw new AgentError("MCP client is not connected");
      }

      const mcpTools = await mcpClient.getAvailableTools();
      logger.info(`[LangGraph Agent] Found ${mcpTools.length} MCP tools`);

      // Convert MCP tools to LangChain tools
      this.tools = mcpTools.map((tool) => MCPToolConverter.convertTool(tool));

      logger.info(
        `[LangGraph Agent] Converted ${this.tools.length} tools successfully`,
      );

      this.initialized = true;
      logger.info("[LangGraph Agent] Agent initialized successfully");
    } catch (error) {
      logError("Failed to initialize agent", error);
      throw new AgentError(
        `Agent initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Process a query using the simplified agent
   */
  async processQuery(query: string, context?: any): Promise<{
    result: string;
    toolCalls?: Array<{
      name: string;
      arguments: Record<string, any>;
      result: string;
    }>;
    error?: string;
  }> {
    try {
      if (!this.initialized) {
        throw new AgentError("Agent not initialized");
      }

      logger.info(`[LangGraph Agent] Processing query: ${query}`);

      // Create initial state
      const state: AgentState = {
        messages: [{ role: "user", content: query }],
        query,
        toolCalls: [],
      };

      // Simple processing flow
      const result = await this.processWithTools(state);

      return {
        result: result.result || "No response generated",
        toolCalls: result.toolCalls,
        error: result.error,
      };
    } catch (error) {
      logError("Query processing failed", error);
      return {
        result: "An error occurred while processing your query.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async processWithTools(state: AgentState): Promise<AgentState> {
    try {
      // Simple response for now - just return a basic message
      const needsTools = this.shouldUseTool(state.query);

      if (needsTools && this.tools.length > 0) {
        // Execute relevant tools
        const toolResults = await this.executeRelevantTools(state.query);
        state.toolCalls = toolResults;

        // Generate final response with tool results
        const toolContext = toolResults
          .map((t) => `Tool ${t.name}: ${t.result}`)
          .join("\n");

        state.result = `Based on the tool results:\n${toolContext}\n\nI've processed your query: ${state.query}`;
      } else {
        state.result = `I've processed your query: ${state.query}`;
      }

      return state;
    } catch (error) {
      logError("Tool processing failed", error);
      state.error = error instanceof Error ? error.message : "Unknown error";
      state.result = "I encountered an error while processing your request.";
      return state;
    }
  }

  private shouldUseTool(query: string): boolean {
    const toolKeywords = [
      "search",
      "find",
      "database",
      "query",
      "data",
      "information",
      "lookup",
      "retrieve",
    ];

    return toolKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword),
    );
  }

  private async executeRelevantTools(
    query: string,
  ): Promise<
    Array<{
      name: string;
      arguments: Record<string, any>;
      result: string;
    }>
  > {
    const results: Array<{
      name: string;
      arguments: Record<string, any>;
      result: string;
    }> = [];

    // Simple tool selection - use first available tool for now
    if (this.tools.length > 0) {
      try {
        const tool = this.tools[0];
        const toolArgs = { query }; // Simple argument passing

        logToolExecution(tool.name, true, 0);
        const result = await tool.invoke(toolArgs);

        results.push({
          name: tool.name,
          arguments: toolArgs,
          result: JSON.stringify(result),
        });
      } catch (error) {
        logError(`Tool execution failed for ${this.tools[0].name}`, error);
      }
    }

    return results;
  }

  getStatus(): {
    initialized: boolean;
    toolCount: number;
    tools: Array<{ name: string; description: string }>;
  } {
    return {
      initialized: this.initialized,
      toolCount: this.tools.length,
      tools: this.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
      })),
    };
  }

  getAvailableTools(): Array<{
    name: string;
    description: string;
    schema: any;
  }> {
    return this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
    }));
  }
}

import { ChatOllama } from '@langchain/ollama';
import { StateGraph, END } from '@langchain/langgraph';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { mcpClient } from '../mcp';
import { MCPToolConverter } from './tool-converter';
import { logger, logError, logToolExecution } from '../utils/logger';
import { AgentError, withRetry } from '../utils/error-handler';

// Agent state interface
interface AgentState {
  messages: BaseMessage[];
  query: string;
  result?: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, any>; result: string }>;
  error?: string;
}

export class SimpleLangGraphAgent {
  private llm: ChatOllama;
  private tools: DynamicStructuredTool[] = [];
  private graph: any = null;
  
  constructor() {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2';
    
    this.llm = new ChatOllama({
      baseUrl,
      model,
      temperature: 0.1,
      maxRetries: 3,
      timeout: 30000
    });
    
    logger.info(`[LangGraph Agent] Initialized with Ollama model: ${model} at ${baseUrl}`);
  }

  /**
   * Initialize the agent with MCP tools
   */
  async initialize(): Promise<void> {
    try {
      logger.info('[LangGraph Agent] Initializing agent...');
      
      // Convert MCP tools to LangChain format
      this.tools = await withRetry(
        () => MCPToolConverter.convertAllTools(),
        3,
        1000
      );
      
      logger.info(`[LangGraph Agent] Converted ${this.tools.length} MCP tools to LangChain format`);
      
      // Build the LangGraph workflow
      this.buildGraph();
      
      logger.info('[LangGraph Agent] Agent initialized successfully');
    } catch (error) {
      const errorInfo = logError(error, 'LangGraph Agent Initialization');
      throw new AgentError(`Failed to initialize agent: ${errorInfo.message}`);
    }
  }  /**
   * Build the LangGraph workflow
   */
  private buildGraph(): void {
    try {
      logger.debug('[LangGraph Agent] Building workflow graph...');
      
      const workflow = new StateGraph({
        channels: {
          messages: { value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y), default: () => [] },
          query: { value: null },
          result: { value: null },
          error: { value: null },
          toolCalls: { value: (x: any[], y: any[]) => x.concat(y), default: () => [] }
        }
      });
      
      // Add nodes
      workflow.addNode('analyze', this.analyzeQuery.bind(this));
      workflow.addNode('execute_tools', this.executeTools.bind(this));
      workflow.addNode('generate_response', this.generateResponse.bind(this));
      
      // Add edges
      workflow.addEdge('analyze', 'execute_tools');
      workflow.addConditionalEdges(
        'execute_tools',
        this.shouldUseTool.bind(this),
        {
          'continue': 'generate_response',
          'end': END
        }
      );
      workflow.addEdge('generate_response', END);
      
      // Set entry point
      workflow.setEntryPoint('analyze');
      
      this.graph = workflow.compile();
      logger.info('[LangGraph Agent] Workflow graph built successfully');
    } catch (error) {
      const errorInfo = logError(error, 'LangGraph Graph Building');
      throw new AgentError(`Failed to build workflow graph: ${errorInfo.message}`);
    }
  }

  /**
   * Analyze user query to determine if tools are needed
   */
  private async analyzeQuery(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const { query } = state;
      logger.debug(`[LangGraph Agent] Analyzing query: ${query}`);
      
      const toolDescriptions = this.tools.map(t => `- ${t.name}: ${t.description}`).join('\n');
      
      const analysisPrompt = `
You are an AI assistant with access to database tools. Analyze this user query and determine if you need to use any tools.

Available tools:
${toolDescriptions}

User query: "${query}"

If you need to use a tool, respond with: "USE_TOOL: [tool_name]"
If you can answer directly without tools, respond with: "DIRECT_RESPONSE"

Choose wisely based on whether the query requires database operations or can be answered with general knowledge.
`;

      const response = await withRetry(
        () => this.llm.invoke([new HumanMessage(analysisPrompt)]),
        2,
        1000
      );
      
      const analysis = response.content.toString().trim();
      logger.info(`[LangGraph Agent] Query analysis result: ${analysis}`);
      
      return {
        messages: [response],
        result: analysis
      };
    } catch (error) {
      const errorInfo = logError(error, 'LangGraph Query Analysis');
      return {
        error: `Analysis failed: ${errorInfo.message}`,
        messages: [new AIMessage(`Error during analysis: ${errorInfo.message}`)]
      };
    }
  }  /**
   * Determine if tool should be used based on analysis
   */
  private shouldUseTool(state: AgentState): string {
    const { result } = state;
    
    if (result && result.includes('USE_TOOL:')) {
      logger.debug('[LangGraph Agent] Tool usage required');
      return 'continue';
    }
    
    logger.debug('[LangGraph Agent] Direct response mode');
    return 'end';
  }

  /**
   * Execute tools based on analysis result
   */
  private async executeTools(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const { query, result } = state;
      
      if (!result || !result.includes('USE_TOOL:')) {
        return { toolCalls: [] };
      }
      
      // Extract tool name from analysis
      const toolMatch = result.match(/USE_TOOL:\s*(\w+)/);
      if (!toolMatch) {
        throw new AgentError('Could not extract tool name from analysis');
      }
      
      const toolName = toolMatch[1];
      const tool = this.tools.find(t => t.name === toolName);
      
      if (!tool) {
        throw new AgentError(`Tool not found: ${toolName}`);
      }
      
      logger.info(`[LangGraph Agent] Executing tool: ${toolName}`);
      
      // Generate arguments for the tool
      const argsPrompt = `
Based on the user query and tool schema, generate the appropriate arguments for the ${toolName} tool.

User query: "${query}"
Tool description: ${tool.description}
Tool schema: ${JSON.stringify(tool.schema, null, 2)}

Respond with ONLY a valid JSON object containing the arguments. No explanation or additional text.
`;

      const argsResponse = await withRetry(
        () => this.llm.invoke([new HumanMessage(argsPrompt)]),
        2,
        1000
      );
      
      let toolArgs: Record<string, any>;
      try {
        const argsText = argsResponse.content.toString().trim();
        // Extract JSON from response (handle cases where LLM adds extra text)
        const jsonMatch = argsText.match(/\{.*\}/s);
        toolArgs = JSON.parse(jsonMatch ? jsonMatch[0] : argsText);
      } catch (parseError) {
        throw new AgentError(`Failed to parse tool arguments: ${parseError}`);
      }
      
      logger.debug(`[LangGraph Agent] Tool arguments generated:`, toolArgs);
      
      // Execute the tool
      const startTime = Date.now();
      const toolResult = await tool.invoke(toolArgs);
      const duration = Date.now() - startTime;
      
      logToolExecution(toolName, true, duration);
      
      const toolCall = {
        name: toolName,
        arguments: toolArgs,
        result: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
      };
      
      logger.info(`[LangGraph Agent] Tool executed successfully: ${toolName}`, {
        duration,
        resultLength: toolCall.result.length
      });
      
      return {
        toolCalls: [toolCall]
      };
    } catch (error) {
      const errorInfo = logError(error, 'LangGraph Tool Execution');
      logToolExecution('unknown', false, 0, errorInfo.message);
      
      return {
        error: `Tool execution failed: ${errorInfo.message}`,
        toolCalls: []
      };
    }
  }  /**
   * Generate final response based on tool results or direct query
   */
  private async generateResponse(state: AgentState): Promise<Partial<AgentState>> {
    const { query, toolCalls, error } = state;
    
    try {
      if (error) {
        logger.error(`[LangGraph Agent] Generating error response: ${error}`);
        return {
          result: `I encountered an error: ${error}`,
          messages: [new AIMessage(`Error: ${error}`)]
        };
      }
      
      let contextInfo = '';
      if (toolCalls && toolCalls.length > 0) {
        contextInfo = toolCalls.map(tc => 
          `Tool ${tc.name} executed with result: ${tc.result}`
        ).join('\n');
      }
      
      const responsePrompt = `
User query: "${query}"

${contextInfo ? `Tool execution results:\n${contextInfo}\n` : ''}

Based on the ${contextInfo ? 'tool results and ' : ''}user query, provide a helpful and comprehensive response.
Be clear, concise, and directly address what the user asked for.
${contextInfo ? 'Use the tool results to inform your response.' : 'Provide a direct answer based on your knowledge.'}
`;

      logger.debug('[LangGraph Agent] Generating final response...');
      
      const response = await withRetry(
        () => this.llm.invoke([new HumanMessage(responsePrompt)]),
        2,
        1000
      );
      
      const finalResult = response.content.toString();
      
      logger.info('[LangGraph Agent] Response generated successfully', {
        responseLength: finalResult.length,
        hadToolCalls: !!(toolCalls && toolCalls.length > 0)
      });
      
      return {
        result: finalResult,
        messages: [response]
      };
    } catch (error) {
      const errorInfo = logError(error, 'LangGraph Response Generation');
      return {
        result: `I apologize, but I encountered an error generating the response: ${errorInfo.message}`,
        error: errorInfo.message
      };
    }
  }  /**
   * Process a user query through the LangGraph workflow
   */
  async processQuery(query: string): Promise<{
    result: string;
    toolCalls?: Array<{ name: string; arguments: Record<string, any>; result: string }>;
    error?: string;
  }> {
    if (!this.graph) {
      throw new AgentError('Agent not initialized. Call initialize() first.');
    }
    
    try {
      logger.info(`[LangGraph Agent] Processing query: ${query}`);
      const startTime = Date.now();
      
      const initialState: AgentState = {
        messages: [],
        query,
        toolCalls: []
      };
      
      const result = await withRetry(
        () => this.graph.invoke(initialState),
        2,
        1000
      );
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`[LangGraph Agent] Query processed successfully`, {
        processingTime,
        hasResult: !!result.result,
        toolCallCount: result.toolCalls?.length || 0,
        hasError: !!result.error
      });
      
      return {
        result: result.result || 'No response generated',
        toolCalls: result.toolCalls,
        error: result.error
      };
    } catch (error) {
      const errorInfo = logError(error, 'LangGraph Query Processing');
      throw new AgentError(`Failed to process query: ${errorInfo.message}`);
    }
  }

  /**
   * Get agent status and available tools
   */
  getStatus(): {
    initialized: boolean;
    toolCount: number;
    tools: Array<{ name: string; description: string }>;
    llmConfig: { baseUrl: string; model: string };
  } {
    return {
      initialized: this.graph !== null,
      toolCount: this.tools.length,
      tools: this.tools.map(t => ({ name: t.name, description: t.description })),
      llmConfig: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama3.2'
      }
    };
  }

  /**
   * Get available tools information
   */
  getAvailableTools(): Array<{ name: string; description: string; schema: any }> {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      schema: tool.schema
    }));
  }
}
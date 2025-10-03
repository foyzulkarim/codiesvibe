import axios, { AxiosInstance } from "axios";
import { MCPTool, MCPToolCall, MCPToolResult, MCPResponse } from "./types";
import { logger, logError, logToolExecution } from "../utils/logger";
import { MCPError, withRetry, CircuitBreaker } from "../utils/error-handler";

export class MCPClient {
  private httpClient: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private connected: boolean = false;
  private availableTools: MCPTool[] = [];
  private sessionId?: string;
  private initialized: boolean = false;
  private baseURL: string;

  constructor(baseURL: string = process.env.MCP_SERVER_URL || "http://localhost:3001") {
    this.baseURL = baseURL;
    this.httpClient = axios.create({
      baseURL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
    });

    this.circuitBreaker = new CircuitBreaker();

    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug(
          `[MCP Client] Request: ${config.method?.toUpperCase()} ${config.url}`,
          {
            data: config.data,
            params: config.params,
          },
        );
        return config;
      },
      (error) => {
        logError(error, "MCP Client Request");
        return Promise.reject(error);
      },
    );

    // Response interceptor for logging and SSE parsing
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug(`[MCP Client] Response: ${response.status}`, {
          headers: response.headers,
          dataType: typeof response.data,
          dataPreview: typeof response.data === 'string' ? response.data.substring(0, 100) : response.data,
        });

        // Capture session ID from response headers
        const sessionId = response.headers['mcp-session-id'];
        if (sessionId && sessionId !== this.sessionId) {
          this.sessionId = sessionId;
          logger.info('[MCP Client] Captured session ID', { sessionId });
          
          // Update default headers to include session ID for future requests
          this.httpClient.defaults.headers.common['mcp-session-id'] = sessionId;
        }

        // Handle SSE responses
        if (response.headers['content-type']?.includes('text/event-stream')) {
          const data = response.data;
          logger.debug('[MCP Client] Processing SSE response', { 
            dataType: typeof data,
            dataLength: typeof data === 'string' ? data.length : 'N/A',
            dataPreview: typeof data === 'string' ? data.substring(0, 200) : data
          });
          
          if (typeof data === 'string') {
            try {
              // Parse SSE format: "event: message\ndata: {json}\n\n"
              const lines = data.split('\n');
              let jsonData = '';
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('data: ')) {
                  jsonData = line.substring(6); // Remove "data: " prefix
                  break;
                }
              }
              
              if (jsonData) {
                const parsedData = JSON.parse(jsonData);
                logger.debug('[MCP Client] Successfully parsed SSE data', { parsedData });
                response.data = parsedData;
              } else {
                logger.warn('[MCP Client] No data line found in SSE response', { lines });
              }
            } catch (error) {
              logger.error('[MCP Client] Failed to parse SSE response', { 
                data: data.substring(0, 200) + '...',
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
              });
              throw error; // Re-throw to trigger error interceptor
            }
          }
        }

        return response;
      },
      (error) => {
        logger.error('[MCP Client] HTTP Error Details', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
          }
        });
        
        const errorInfo = logError(error, "MCP Client Response");
        throw new MCPError(
          `MCP Server error: ${errorInfo.message}`,
          error.response?.status || 500,
        );
      },
    );
  }

  /**
   * Initialize connection to MCP server
   */
  async connect(): Promise<void> {
    if (this.connected && this.initialized) {
      logger.info("[MCP Client] Already connected and initialized");
      return;
    }

    try {
      logger.info("[MCP Client] Connecting to MCP server...");

      await this.circuitBreaker.execute(async () => {
        // Step 1: Initialize the MCP session
        const initResponse = await this.httpClient.post<MCPResponse<any>>("/mcp", {
          jsonrpc: "2.0",
          id: Date.now(),
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {
              roots: {
                listChanged: true,
              },
              sampling: {},
            },
            clientInfo: {
              name: "fastify-api-client",
              version: "1.0.0",
            },
          },
        });

        if (initResponse.data.error) {
          throw new MCPError(`Initialization failed: ${initResponse.data.error.message}`);
        }

        logger.info("[MCP Client] Successfully initialized MCP session", { 
          serverInfo: initResponse.data.result?.serverInfo,
          capabilities: initResponse.data.result?.capabilities 
        });
        this.initialized = true;

        // Step 2: Discover available tools directly from server capabilities
        const serverCapabilities = initResponse.data.result?.capabilities;
        if (serverCapabilities?.tools) {
          logger.info("[MCP Client] Server supports tools, attempting discovery...");
          await this.discoverTools();
        } else {
          logger.warn("[MCP Client] Server does not support tools");
          this.availableTools = [];
        }

        this.connected = true;
        logger.info(
          `[MCP Client] Successfully connected with ${this.availableTools.length} tools`,
        );
      });
    } catch (error) {
      const errorInfo = logError(error, "MCP Connection");
      this.connected = false;
      this.initialized = false;
      throw new MCPError(`Failed to connect to MCP server: ${errorInfo.message}`);
    }
  }

  /**
   * Discover available tools from MCP server
   */
  private async discoverTools(): Promise<void> {
    try {
      logger.debug("[MCP Client] Discovering tools...");

      const response = await this.httpClient.post<MCPResponse<{ tools?: MCPTool[] }>>(
        "/mcp",
        {
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/list",
          params: {},
        },
      );

      if (response.data.error) {
        logger.warn(`[MCP Client] Tools discovery failed: ${response.data.error.message}`);
        this.availableTools = [];
        return;
      }

      // Handle case where result might be undefined or not an array
      const result = response.data.result;
      let tools: MCPTool[] = [];
      
      if (result && typeof result === 'object') {
        if (Array.isArray(result)) {
          tools = result;
        } else if (result.tools && Array.isArray(result.tools)) {
          tools = result.tools;
        }
      }

      this.availableTools = tools;
      logger.info(`[MCP Client] Discovered ${this.availableTools.length} tools`);
      
      if (this.availableTools.length > 0) {
        logger.debug("[MCP Client] Available tools:", this.availableTools.map(t => t.name));
      }
    } catch (error) {
      const errorInfo = logError(error, "MCP Tools Discovery");
      logger.warn(`[MCP Client] Failed to discover tools: ${errorInfo.message}`);
      this.availableTools = [];
    }
  }
  /**
   * Get list of available tools
   */
  /**
   * Get available tools
   */
  getAvailableTools(): MCPTool[] {
    logger.debug(`[MCP Client] getAvailableTools called, availableTools length: ${this.availableTools?.length || 0}`);
    logger.debug(`[MCP Client] availableTools array:`, this.availableTools);
    
    // Ensure we always return an array to prevent 'not iterable' errors
    const tools = Array.isArray(this.availableTools) ? this.availableTools : [];
    logger.debug(`[MCP Client] Returning ${tools.length} tools`);
    return tools;
  }

  /**
   * Check if client is connected
   */
  isClientConnected(): boolean {
    return this.connected;
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    if (!this.connected) {
      throw new MCPError("MCP client is not connected", 503);
    }

    const startTime = Date.now();

    try {
      logger.info(`[MCP Client] Calling tool: ${toolCall.name}`, {
        arguments: toolCall.arguments,
      });

      const result = await this.circuitBreaker.execute(async () => {
        const response = await withRetry(
          () =>
            this.httpClient.post<MCPResponse<MCPToolResult>>("/mcp", {
              jsonrpc: "2.0",
              id: Date.now(),
              method: "tools/call",
              params: {
                name: toolCall.name,
                arguments: toolCall.arguments,
              },
            }),
          2, // Fewer retries for tool calls
          500,
        );

        if (response.data.error) {
          throw new MCPError(
            `Tool call failed: ${response.data.error.message}`,
          );
        }

        return response.data.result;
      });

      const duration = Date.now() - startTime;
      logToolExecution(toolCall.name, true, duration);

      logger.info(`[MCP Client] Tool call successful: ${toolCall.name}`, {
        duration,
        resultType: typeof result,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorInfo = logError(error, `MCP Tool Call: ${toolCall.name}`);
      logToolExecution(toolCall.name, false, duration, errorInfo.message);

      throw new MCPError(
        `Tool call failed for ${toolCall.name}: ${errorInfo.message}`,
        error instanceof MCPError ? error.statusCode : 500,
      );
    }
  }

  /**
   * Disconnect from MCP server
   */
  disconnect(): void {
    this.connected = false;
    this.availableTools = [];
    logger.info("[MCP Client] Disconnected from MCP server");
  }

  /**
   * Get client status and connection info
   */
  getStatus(): {
    connected: boolean;
    toolCount: number;
    baseUrl: string;
    circuitBreakerState: any;
  } {
    return {
      connected: this.connected,
      toolCount: this.availableTools.length,
      baseUrl: this.httpClient.defaults.baseURL || "",
      circuitBreakerState: this.circuitBreaker.getState(),
    };
  }
}

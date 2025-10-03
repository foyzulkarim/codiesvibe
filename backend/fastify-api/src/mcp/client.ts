import axios, { AxiosInstance } from 'axios';
import { MCPTool, MCPToolCall, MCPToolResult, MCPResponse } from './types';
import { logger, logError, logToolExecution } from '../utils/logger';
import { MCPError, withRetry, CircuitBreaker } from '../utils/error-handler';

export class MCPClient {
  private httpClient: AxiosInstance;
  private connected: boolean = false;
  private availableTools: MCPTool[] = [];
  private circuitBreaker: CircuitBreaker;
  
  constructor(private baseUrl: string = process.env.MCP_SERVER_URL || 'http://localhost:3001') {
    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute timeout
    
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug(`[MCP Client] Request: ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params
        });
        return config;
      },
      (error) => {
        logError(error, 'MCP Client Request');
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug(`[MCP Client] Response: ${response.status}`, {
          data: response.data
        });
        return response;
      },
      (error) => {
        const errorInfo = logError(error, 'MCP Client Response');
        
        if (error.response) {
          throw new MCPError(
            `MCP Server error: ${error.response.data?.message || error.message}`,
            error.response.status
          );
        } else if (error.request) {
          throw new MCPError('MCP Server is not responding', 503);
        } else {
          throw new MCPError(`MCP Client error: ${error.message}`, 500);
        }
      }
    );
  }  /**
   * Initialize connection to MCP server
   */
  async connect(): Promise<void> {
    try {
      logger.info('[MCP Client] Connecting to MCP server...');
      
      await this.circuitBreaker.execute(async () => {
        // Health check
        const healthResponse = await withRetry(
          () => this.httpClient.get('/health'),
          3,
          1000
        );
        
        if (healthResponse.status !== 200) {
          throw new MCPError('MCP Server health check failed', healthResponse.status);
        }
        
        logger.info('[MCP Client] Health check passed');
        
        // Discover available tools
        await this.discoverTools();
        
        this.connected = true;
        logger.info(`[MCP Client] Connected successfully with ${this.availableTools.length} tools`);
      });
    } catch (error) {
      const errorInfo = logError(error, 'MCP Client Connection');
      throw new MCPError(`Failed to connect to MCP server: ${errorInfo.message}`, 503);
    }
  }

  /**
   * Discover available tools from MCP server
   */
  private async discoverTools(): Promise<void> {
    try {
      logger.debug('[MCP Client] Discovering tools...');
      
      const response = await this.httpClient.post<MCPResponse<MCPTool[]>>('/rpc', {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
        params: {}
      });
      
      if (response.data.error) {
        throw new MCPError(`Tools discovery failed: ${response.data.error.message}`);
      }
      
      this.availableTools = response.data.result || [];
      logger.info(`[MCP Client] Discovered ${this.availableTools.length} tools`);
    } catch (error) {
      const errorInfo = logError(error, 'MCP Tools Discovery');
      throw new MCPError(`Failed to discover tools: ${errorInfo.message}`);
    }
  }  /**
   * Get list of available tools
   */
  getAvailableTools(): MCPTool[] {
    return [...this.availableTools];
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
      throw new MCPError('MCP client is not connected', 503);
    }
    
    const startTime = Date.now();
    
    try {
      logger.info(`[MCP Client] Calling tool: ${toolCall.name}`, {
        arguments: toolCall.arguments
      });
      
      const result = await this.circuitBreaker.execute(async () => {
        const response = await withRetry(
          () => this.httpClient.post<MCPResponse<MCPToolResult>>('/rpc', {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
              name: toolCall.name,
              arguments: toolCall.arguments
            }
          }),
          2, // Fewer retries for tool calls
          500
        );
        
        if (response.data.error) {
          throw new MCPError(`Tool call failed: ${response.data.error.message}`);
        }
        
        return response.data.result;
      });
      
      const duration = Date.now() - startTime;
      logToolExecution(toolCall.name, true, duration);
      
      logger.info(`[MCP Client] Tool call successful: ${toolCall.name}`, {
        duration,
        resultType: typeof result
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorInfo = logError(error, `MCP Tool Call: ${toolCall.name}`);
      logToolExecution(toolCall.name, false, duration, errorInfo.message);
      
      throw new MCPError(
        `Tool call failed for ${toolCall.name}: ${errorInfo.message}`,
        error instanceof MCPError ? error.statusCode : 500
      );
    }
  }

  /**
   * Disconnect from MCP server
   */
  disconnect(): void {
    this.connected = false;
    this.availableTools = [];
    logger.info('[MCP Client] Disconnected from MCP server');
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
      baseUrl: this.baseUrl,
      circuitBreakerState: this.circuitBreaker.getState()
    };
  }
}
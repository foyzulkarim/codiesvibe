/**
 * MCP (Model Context Protocol) Types
 * Defines interfaces for communicating with MCP servers
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPListToolsResponse {
  tools: MCPTool[];
}

export interface MCPCallToolRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface MCPCallToolResponse {
  content: MCPToolResult['content'];
  isError?: boolean;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPResponse<T = any> {
  result?: T;
  error?: MCPError;
}
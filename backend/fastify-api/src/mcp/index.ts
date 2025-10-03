/**
 * MCP Module Exports
 * Provides easy access to MCP client and types
 */

export { MCPClient } from './client';
export * from './types';

// Create and export a singleton instance
export const mcpClient = new MCPClient();
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { MCPTool, MCPToolCall, MCPToolResult, mcpClient } from "../mcp";

/**
 * Converts JSON Schema to Zod schema for LangChain tool validation
 */
export class SchemaConverter {
  /**
   * Convert JSON Schema property to Zod schema
   */
  private static convertProperty(property: any): z.ZodTypeAny {
    switch (property.type) {
      case "string":
        let stringSchema = z.string();
        if (property.description) {
          stringSchema = stringSchema.describe(property.description);
        }
        if (property.enum) {
          return z.enum(property.enum);
        }
        return stringSchema;

      case "number":
        let numberSchema = z.number();
        if (property.description) {
          numberSchema = numberSchema.describe(property.description);
        }
        return numberSchema;

      case "integer":
        let intSchema = z.number().int();
        if (property.description) {
          intSchema = intSchema.describe(property.description);
        }
        return intSchema;

      case "boolean":
        let boolSchema = z.boolean();
        if (property.description) {
          boolSchema = boolSchema.describe(property.description);
        }
        return boolSchema;

      case "array":
        if (property.items) {
          return z.array(this.convertProperty(property.items));
        }
        return z.array(z.any());

      case "object":
        if (property.properties) {
          return this.convertObjectSchema(property);
        }
        return z.record(z.any());

      default:
        return z.any();
    }
  } /**
   * Convert JSON Schema object to Zod object schema
   */
  private static convertObjectSchema(schema: any): z.ZodObject<any> {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const [key, property] of Object.entries(schema.properties || {})) {
      let zodProperty = this.convertProperty(property);

      // Make optional if not in required array
      if (!schema.required?.includes(key)) {
        zodProperty = zodProperty.optional();
      }

      shape[key] = zodProperty;
    }

    return z.object(shape);
  }

  /**
   * Convert MCP tool JSON Schema to Zod schema
   */
  static convertToZod(mcpTool: MCPTool): z.ZodObject<any> {
    return this.convertObjectSchema(mcpTool.inputSchema);
  }
}

/**
 * Converts MCP tools to LangChain DynamicStructuredTool format
 */
export class MCPToolConverter {
  /**
   * Convert a single MCP tool to LangChain tool
   */
  static convertTool(mcpTool: MCPTool): DynamicStructuredTool {
    const zodSchema = SchemaConverter.convertToZod(mcpTool);

    return new DynamicStructuredTool({
      name: mcpTool.name,
      description: mcpTool.description,
      schema: zodSchema,
      func: async (input: Record<string, any>) => {
        try {
          // Validate input against schema
          const validatedInput = zodSchema.parse(input);

          // Call MCP tool
          const result = await mcpClient.callTool({
            name: mcpTool.name,
            arguments: validatedInput,
          });

          // Convert result to string for LangChain
          return this.formatToolResult(result);
        } catch (error) {
          console.error(`Error executing MCP tool ${mcpTool.name}:`, error);
          return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
      },
    });
  } /**
   * Format MCP tool result for LangChain consumption
   */
  private static formatToolResult(result: MCPToolResult): string {
    if (result.isError) {
      return `Error: ${result.content.map((c) => c.text || c.data || "Unknown error").join("\n")}`;
    }

    return result.content
      .map((content) => {
        switch (content.type) {
          case "text":
            return content.text || "";
          case "image":
            return `[Image: ${content.mimeType || "unknown"}] ${content.data ? "Data available" : "No data"}`;
          case "resource":
            return `[Resource] ${content.text || content.data || "Resource data"}`;
          default:
            return content.text || content.data || "Unknown content";
        }
      })
      .join("\n");
  }

  /**
   * Convert all available MCP tools to LangChain tools
   */
  static async convertAllTools(): Promise<DynamicStructuredTool[]> {
    const mcpTools = mcpClient.getAvailableTools();

    if (mcpTools.length === 0) {
      console.warn(
        "[MCPToolConverter] No MCP tools available. Make sure MCP client is connected.",
      );
      return [];
    }

    console.log(
      `[MCPToolConverter] Converting ${mcpTools.length} MCP tools to LangChain format`,
    );

    const langchainTools = mcpTools
      .map((tool) => {
        try {
          return this.convertTool(tool);
        } catch (error) {
          console.error(
            `[MCPToolConverter] Failed to convert tool ${tool.name}:`,
            error,
          );
          return null;
        }
      })
      .filter((tool): tool is DynamicStructuredTool => tool !== null);

    console.log(
      `[MCPToolConverter] Successfully converted ${langchainTools.length} tools`,
    );
    return langchainTools;
  }

  /**
   * Get tool information for debugging/inspection
   */
  static getToolInfo(): Array<{
    name: string;
    description: string;
    schema: any;
  }> {
    const mcpTools = mcpClient.getAvailableTools();

    return mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      schema: tool.inputSchema,
    }));
  }
}

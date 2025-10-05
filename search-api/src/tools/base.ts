import { Tool } from '../types';

/**
 * Base interface for all tool responses with AI reasoning
 */
export interface ToolResponse<T = any> {
  /** The actual result data */
  result: T;
  /** AI reasoning explaining the operation performed */
  reasoning: string;
  /** Confidence score from 0-1 indicating certainty of the result */
  confidence: number;
  /** Number of items processed */
  processedCount: number;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Any warnings or notes about the operation */
  warnings?: string[];
}

/**
 * Base interface for tool parameters with validation
 */
export interface ToolParams {
  /** Optional context for better reasoning */
  context?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Tool execution metadata
 */
export interface ToolMetadata {
  /** Tool name */
  name: string;
  /** Tool category */
  category: 'filter' | 'sort' | 'search' | 'aggregate' | 'array' | 'utility';
  /** Tool description */
  description: string;
  /** Parameter schema */
  schema: Record<string, any>;
  /** Example usage scenarios */
  examples: string[];
  /** Performance characteristics */
  performance: {
    complexity: 'O(1)' | 'O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)';
    memoryUsage: 'low' | 'medium' | 'high';
  };
}

/**
 * Base tool function signature
 */
export type ToolFunction<P extends ToolParams, R = any> = (
  data: any[],
  params: P
) => ToolResponse<R>;

/**
 * Tool registry entry
 */
export interface ToolRegistryEntry<P extends ToolParams = ToolParams, R = Tool[]> {
  func: ToolFunction<P, R>;
  metadata: ToolMetadata;
}

/**
 * Utility function to create a standardized tool response
 */
export function createToolResponse<T>(
  result: T,
  reasoning: string,
  confidence: number,
  processedCount: number,
  startTime: number,
  warnings?: string[]
): ToolResponse<T> {
  return {
    result,
    reasoning,
    confidence: Math.max(0, Math.min(1, confidence)), // Clamp between 0-1
    processedCount,
    executionTime: Date.now() - startTime,
    ...(warnings?.length && { warnings })
  };
}

/**
 * Utility function to validate confidence score
 */
export function validateConfidence(confidence: number): number {
  if (typeof confidence !== 'number' || isNaN(confidence)) {
    return 0.5; // Default moderate confidence
  }
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Utility function to generate reasoning for common operations
 */
export class ReasoningGenerator {
  static filter(
    originalCount: number,
    filteredCount: number,
    criteria: string,
    field?: string
  ): string {
    const percentage = originalCount > 0 ? ((filteredCount / originalCount) * 100).toFixed(1) : '0';
    const fieldText = field ? ` on field '${field}'` : '';
    return `Filtered ${originalCount} items${fieldText} using criteria: ${criteria}. ` +
           `Result: ${filteredCount} items (${percentage}% of original dataset).`;
  }

  static sort(count: number, field: string, order: 'asc' | 'desc'): string {
    return `Sorted ${count} items by field '${field}' in ${order}ending order. ` +
           `Applied stable sorting algorithm to maintain consistent ordering.`;
  }

  static search(
    originalCount: number,
    foundCount: number,
    query: string,
    fields?: string[]
  ): string {
    const fieldsText = fields?.length ? ` across fields: ${fields.join(', ')}` : '';
    return `Searched ${originalCount} items for query: "${query}"${fieldsText}. ` +
           `Found ${foundCount} matching results using case-insensitive text matching.`;
  }

  static aggregate(count: number, operation: string, field?: string): string {
    const fieldText = field ? ` on field '${field}'` : '';
    return `Performed ${operation} operation${fieldText} on ${count} items. ` +
           `Aggregation completed with proper null/undefined handling.`;
  }

  static limit(originalCount: number, limit: number, offset: number = 0): string {
    const actualLimit = Math.min(limit, Math.max(0, originalCount - offset));
    return `Applied pagination: showing ${actualLimit} items starting from position ${offset}. ` +
           `Total available: ${originalCount} items.`;
  }
}

/**
 * Base validation utilities
 */
export class ToolValidator {
  static validateArray<T>(data: T[], name: string = 'data'): void {
    if (!Array.isArray(data)) {
      throw new Error(`${name} must be an array`);
    }
  }

  static validateField(field: string): void {
    if (!field || typeof field !== 'string') {
      throw new Error('Field name must be a non-empty string');
    }
  }

  static validateNumber(value: any, name: string): number {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`${name} must be a valid number`);
    }
    return num;
  }

  static validateBoolean(value: any, name: string): boolean {
    if (typeof value !== 'boolean') {
      throw new Error(`${name} must be a boolean`);
    }
    return value;
  }

  static validateString(value: any, name: string): string {
    if (typeof value !== 'string') {
      throw new Error(`${name} must be a string`);
    }
    return value;
  }
}

export default {
  createToolResponse,
  validateConfidence,
  ReasoningGenerator,
  ToolValidator
};
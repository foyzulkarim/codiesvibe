/**
 * Error Recovery Strategies for AI Reasoning Components
 * Comprehensive error handling and recovery mechanisms
 */

import { AgentState, QueryContext, Tool } from '../types';
import { ResponseParser, ParseResult } from '../parsing/parser';
import { ResponseValidator } from '../validation/schemas';

export interface ErrorContext {
  component: string;
  operation: string;
  error: Error;
  timestamp: Date;
  retryCount: number;
  data?: any;
  metadata?: Record<string, any>;
}

export interface RecoveryStrategy {
  name: string;
  canHandle: (error: ErrorContext) => boolean;
  execute: (error: ErrorContext) => Promise<RecoveryResult>;
  priority: number; // Higher numbers = higher priority
}

export interface RecoveryResult {
  success: boolean;
  recovered: boolean;
  data?: any;
  action: string;
  message: string;
  shouldRetry: boolean;
  nextStrategy?: string;
  confidence: number;
}

export interface RecoveryMetrics {
  totalErrors: number;
  recoveredErrors: number;
  failedRecoveries: number;
  averageRecoveryTime: number;
  strategyUsage: Record<string, number>;
  lastError?: ErrorContext;
  lastRecovery?: RecoveryResult;
}

export class ErrorRecoveryManager {
  private static strategies: RecoveryStrategy[] = [];
  private static metrics: RecoveryMetrics = {
    totalErrors: 0,
    recoveredErrors: 0,
    failedRecoveries: 0,
    averageRecoveryTime: 0,
    strategyUsage: {}
  };

  /**
   * Register a recovery strategy
   */
  static registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    // Sort by priority (highest first)
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Handle an error with recovery strategies
   */
  static async handleError(errorContext: ErrorContext): Promise<RecoveryResult> {
    const startTime = Date.now();
    this.metrics.totalErrors++;
    this.metrics.lastError = errorContext;

    // Log the error for debugging
    console.error(`[Error Recovery] ${errorContext.component}.${errorContext.operation}:`, errorContext.error.message);

    // Try each applicable strategy
    for (const strategy of this.strategies) {
      if (strategy.canHandle(errorContext)) {
        try {
          const result = await strategy.execute(errorContext);

          // Update metrics
          const recoveryTime = Date.now() - startTime;
          this.updateMetrics(strategy.name, result.recovered, recoveryTime);

          if (result.recovered) {
            console.log(`[Error Recovery] Strategy '${strategy.name}' recovered error successfully`);
            return result;
          } else {
            console.warn(`[Error Recovery] Strategy '${strategy.name}' failed to recover error`);
          }
        } catch (recoveryError) {
          console.error(`[Error Recovery] Strategy '${strategy.name}' threw error:`, recoveryError);
        }
      }
    }

    // No strategy could recover the error
    this.metrics.failedRecoveries++;
    const recoveryTime = Date.now() - startTime;
    this.updateMetrics('none', false, recoveryTime);

    return {
      success: false,
      recovered: false,
      action: 'fail',
      message: `No recovery strategy could handle error: ${errorContext.error.message}`,
      shouldRetry: false,
      confidence: 0
    };
  }

  /**
   * Get recovery metrics
   */
  static getMetrics(): RecoveryMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalErrors: 0,
      recoveredErrors: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0,
      strategyUsage: {}
    };
  }

  /**
   * Update metrics after recovery attempt
   */
  private static updateMetrics(strategyName: string, recovered: boolean, recoveryTime: number): void {
    if (recovered) {
      this.metrics.recoveredErrors++;
    }

    // Update strategy usage
    this.metrics.strategyUsage[strategyName] = (this.metrics.strategyUsage[strategyName] || 0) + 1;

    // Update average recovery time
    const totalRecoveries = this.metrics.recoveredErrors + this.metrics.failedRecoveries;
    this.metrics.averageRecoveryTime =
      (this.metrics.averageRecoveryTime * (totalRecoveries - 1) + recoveryTime) / totalRecoveries;
  }
}

// Built-in recovery strategies
class ParseErrorRecoveryStrategy implements RecoveryStrategy {
  name = 'parse-error-recovery';
  priority = 100;

  canHandle(error: ErrorContext): boolean {
    return error.component === 'parser' &&
           (error.error.message.includes('parse') ||
            error.error.message.includes('JSON'));
  }

  async execute(error: ErrorContext): Promise<RecoveryResult> {
    if (!error.data?.response) {
      return {
        success: false,
        recovered: false,
        action: 'skip',
        message: 'No response data available for recovery',
        shouldRetry: false,
        confidence: 0
      };
    }

    try {
      // Try to extract partial information
      const partial = this.extractPartialData(error.data.response);
      if (partial) {
        return {
          success: true,
          recovered: true,
          data: partial,
          action: 'partial-extraction',
          message: 'Recovered partial data from malformed response',
          shouldRetry: false,
          confidence: 0.4
        };
      }

      // Try to fix common JSON issues
      const fixed = this.fixJSONIssues(error.data.response);
      if (fixed) {
        return {
          success: true,
          recovered: true,
          data: fixed,
          action: 'json-fix',
          message: 'Fixed common JSON syntax issues',
          shouldRetry: false,
          confidence: 0.6
        };
      }

      return {
        success: false,
        recovered: false,
        action: 'skip',
        message: 'Could not recover from parse error',
        shouldRetry: error.retryCount < 2,
        confidence: 0
      };
    } catch (recoveryError) {
      return {
        success: false,
        recovered: false,
        action: 'error',
        message: `Recovery attempt failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown'}`,
        shouldRetry: false,
        confidence: 0
      };
    }
  }

  private extractPartialData(response: string): any {
    const lines = response.split('\n');
    const data: Record<string, any> = {};

    for (const line of lines) {
      const match = line.match(/(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (key && value) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value.replace(/^["']|["']$/g, '');
          }
        }
      }
    }

    return Object.keys(data).length > 0 ? data : null;
  }

  private fixJSONIssues(jsonStr: string): any {
    try {
      let fixed = jsonStr
        .replace(/,\s*([}\]])/g, '$1') // trailing commas
        .replace(/(\w+):/g, '"$1":') // unquoted keys
        .replace(/'/g, '"'); // single quotes to double

      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

class ValidationErrorRecoveryStrategy implements RecoveryStrategy {
  name = 'validation-error-recovery';
  priority = 90;

  canHandle(error: ErrorContext): boolean {
    return error.component === 'validator' ||
           error.error.message.includes('validation');
  }

  async execute(error: ErrorContext): Promise<RecoveryResult> {
    if (!error.data?.data || !error.data?.schemaName) {
      return {
        success: false,
        recovered: false,
        action: 'skip',
        message: 'Missing validation data for recovery',
        shouldRetry: false,
        confidence: 0
      };
    }

    try {
      // Try to sanitize and re-validate
      const result = ResponseValidator.sanitizeAndValidate(error.data.data, error.data.schemaName);

      if (result.isValid) {
        return {
          success: true,
          recovered: true,
          data: result.sanitizedData,
          action: 'sanitize-and-validate',
          message: 'Sanitized data and passed validation',
          shouldRetry: false,
          confidence: 0.7
        };
      } else if (result.score > 0.5) {
        return {
          success: true,
          recovered: true,
          data: result.sanitizedData,
          action: 'partial-validation',
          message: `Partially validated data (score: ${result.score})`,
          shouldRetry: false,
          confidence: result.score
        };
      }

      return {
        success: false,
        recovered: false,
        action: 'validation-failed',
        message: `Validation errors: ${result.errors.join(', ')}`,
        shouldRetry: false,
        confidence: 0
      };
    } catch (recoveryError) {
      return {
        success: false,
        recovered: false,
        action: 'recovery-error',
        message: `Recovery validation failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown'}`,
        shouldRetry: false,
        confidence: 0
      };
    }
  }
}

class ToolExecutionErrorRecoveryStrategy implements RecoveryStrategy {
  name = 'tool-execution-error-recovery';
  priority = 80;

  canHandle(error: ErrorContext): boolean {
    return error.component === 'executor' ||
           error.component === 'tool' ||
           error.error.message.includes('tool execution');
  }

  async execute(error: ErrorContext): Promise<RecoveryResult> {
    const { toolName, parameters, error: executionError } = error.data || {};

    if (!toolName) {
      return {
        success: false,
        recovered: false,
        action: 'skip',
        message: 'Missing tool name for recovery',
        shouldRetry: false,
        confidence: 0
      };
    }

    // Strategy 1: Try to fix common parameter issues
    if (parameters && typeof parameters === 'object') {
      const fixedParams = this.fixParameters(parameters);
      if (fixedParams !== parameters) {
        return {
          success: true,
          recovered: true,
          data: { toolName, parameters: fixedParams },
          action: 'fix-parameters',
          message: 'Fixed tool parameters',
          shouldRetry: true,
          confidence: 0.8
        };
      }
    }

    // Strategy 2: Suggest alternative tool
    const alternativeTool = this.suggestAlternativeTool(toolName, executionError);
    if (alternativeTool) {
      return {
        success: true,
        recovered: true,
        data: { toolName: alternativeTool, parameters },
        action: 'alternative-tool',
        message: `Suggested alternative tool: ${alternativeTool}`,
        shouldRetry: true,
        confidence: 0.6
      };
    }

    // Strategy 3: Provide safe fallback
    const fallbackResult = this.createFallbackResult(toolName);
    if (fallbackResult) {
      return {
        success: true,
        recovered: true,
        data: fallbackResult,
        action: 'fallback-result',
        message: 'Provided safe fallback result',
        shouldRetry: false,
        confidence: 0.3
      };
    }

    return {
      success: false,
      recovered: false,
      action: 'tool-failed',
      message: `Tool execution failed: ${executionError?.message || error.error.message}`,
      shouldRetry: error.retryCount < 2,
      confidence: 0
    };
  }

  private fixParameters(params: any): any {
    if (typeof params !== 'object' || params === null) {
      return params;
    }

    const fixed = { ...params };

    // Fix undefined values
    for (const [key, value] of Object.entries(fixed)) {
      if (value === undefined) {
        delete fixed[key];
      } else if (typeof value === 'string' && value.trim() === '') {
        fixed[key] = null;
      }
    }

    return fixed;
  }

  private suggestAlternativeTool(toolName: string, error: any): string | null {
    // Simple mapping based on common error patterns
    const errorMessage = error?.message?.toLowerCase() || '';

    if (errorMessage.includes('field not found')) {
      return 'searchByText'; // Fall back to text search
    }

    if (errorMessage.includes('array expected')) {
      return 'limitResults'; // Add array operation
    }

    if (errorMessage.includes('invalid price')) {
      return 'filterByPriceRange'; // Use proper price filter
    }

    return null;
  }

  private createFallbackResult(toolName: string): any {
    // Provide safe fallback results for common tools
    switch (toolName) {
      case 'searchByText':
      case 'searchByKeywords':
        return { results: [], message: 'Search completed with no results' };

      case 'filterByPriceRange':
        return { results: [], message: 'No items found in price range' };

      case 'sortByField':
        return { results: [], message: 'Sorting completed' };

      default:
        return { results: [], message: `Tool ${toolName} completed with fallback` };
    }
  }
}

class NetworkErrorRecoveryStrategy implements RecoveryStrategy {
  name = 'network-error-recovery';
  priority = 70;

  canHandle(error: ErrorContext): boolean {
    return error.error.message.includes('network') ||
           error.error.message.includes('timeout') ||
           error.error.message.includes('connection') ||
           error.error.message.includes('ECONNREFUSED');
  }

  async execute(error: ErrorContext): Promise<RecoveryResult> {
    return {
      success: false,
      recovered: false,
      action: 'retry-later',
      message: 'Network error detected, suggest retry with exponential backoff',
      shouldRetry: error.retryCount < 3,
      nextStrategy: 'exponential-backoff',
      confidence: 0.5
    };
  }
}

class MemoryErrorRecoveryStrategy implements RecoveryStrategy {
  name = 'memory-error-recovery';
  priority = 60;

  canHandle(error: ErrorContext): boolean {
    return error.error.message.includes('memory') ||
           error.error.message.includes('heap') ||
           error.error.message.includes('out of memory');
  }

  async execute(error: ErrorContext): Promise<RecoveryResult> {
    // Try to free memory and continue with reduced operations
    if (global.gc) {
      global.gc(); // Force garbage collection if available
    }

    return {
      success: true,
      recovered: true,
      action: 'reduce-memory-usage',
      message: 'Reduced memory usage and attempting to continue',
      shouldRetry: true,
      data: { reduceDataset: true, limitResults: 100 },
      confidence: 0.6
    };
  }
}

// Register all built-in strategies
ErrorRecoveryManager.registerStrategy(new ParseErrorRecoveryStrategy());
ErrorRecoveryManager.registerStrategy(new ValidationErrorRecoveryStrategy());
ErrorRecoveryManager.registerStrategy(new ToolExecutionErrorRecoveryStrategy());
ErrorRecoveryManager.registerStrategy(new NetworkErrorRecoveryStrategy());
ErrorRecoveryManager.registerStrategy(new MemoryErrorRecoveryStrategy());

export default ErrorRecoveryManager;
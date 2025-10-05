/**
 * Executor with Confidence Tracking
 * Executes tools with comprehensive confidence monitoring and error handling
 */

import { Tool, AgentState, QueryContext, ConfidenceScore } from '../types';
import { ConfidenceScorer } from '../confidence/scoring';
import { RetryManager } from '../retry/backoff';
import { ErrorRecoveryManager, ErrorContext } from '../recovery/strategies';
import { StateManager } from '../state/helpers';

export interface ExecutionRequest {
  toolName: string;
  parameters: Record<string, any>;
  context: QueryContext;
  state: AgentState;
  priority: 'low' | 'medium' | 'high';
  timeout?: number;
}

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: Error;
  executionTime: number;
  confidence: ConfidenceScore;
  metadata: {
    toolName: string;
    parameters: Record<string, any>;
    attempts: number;
    fallbackUsed: boolean;
    memoryUsage?: number;
    resultCount: number;
  };
}

export interface ExecutionMetrics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  averageConfidence: number;
  toolUsage: Record<string, number>;
  errorDistribution: Record<string, number>;
  fallbackUsage: number;
  memoryEfficiency: Record<string, number>;
  lastExecution?: ExecutionResult;
}

export class ToolExecutor {
  private static toolRegistry: Map<string, Tool> = new Map();
  private static metrics: ExecutionMetrics = {
    totalExecutions: 0,
    successRate: 0,
    averageExecutionTime: 0,
    averageConfidence: 0,
    toolUsage: {},
    errorDistribution: {},
    fallbackUsage: 0,
    memoryEfficiency: {}
  };

  /**
   * Register a tool for execution
   */
  static registerTool(tool: Tool): void {
    this.toolRegistry.set(tool.name, tool);
  }

  /**
   * Get registered tools
   */
  static getRegisteredTools(): string[] {
    return Array.from(this.toolRegistry.keys());
  }

  /**
   * Check if tool is registered
   */
  static hasTool(toolName: string): boolean {
    return this.toolRegistry.has(toolName);
  }

  /**
   * Execute tool with confidence tracking
   */
  static async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    let attempts = 0;
    let fallbackUsed = false;
    let startMemory = this.getMemoryUsage();

    try {
      // Validate tool exists
      const tool = this.toolRegistry.get(request.toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${request.toolName}`);
      }

      // Validate parameters
      this.validateParameters(tool, request.parameters);

      // Execute with retry logic
      const result = await RetryManager.executeWithAdaptiveRetry(
        () => this.executeTool(tool, request.parameters, request.context),
        {
          component: 'executor',
          operation: request.toolName,
          priority: request.priority
        },
        {
          maxAttempts: 3
        }
      );

      attempts = result.attempts;

      if (result.success && result.data) {
        // Calculate execution confidence
        const executionConfidence = ConfidenceScorer.calculateExecutionConfidence(
          Array.isArray(result.data) ? result.data : [result.data],
          request.toolName,
          request.parameters,
          result.totalTime
        );

        // Update tool usage metrics
        this.updateToolMetrics(request.toolName, true, result.totalTime, executionConfidence.overallScore);

        const endMemory = this.getMemoryUsage();
        const memoryUsage = endMemory - startMemory;

        return {
          success: true,
          data: result.data,
          executionTime: result.totalTime,
          confidence: {
            score: executionConfidence.overallScore,
            reasoning: executionConfidence.reasoning,
            timestamp: new Date()
          },
          metadata: {
            toolName: request.toolName,
            parameters: request.parameters,
            attempts,
            fallbackUsed,
            memoryUsage,
            resultCount: Array.isArray(result.data) ? result.data.length : 1
          }
        };
      } else {
        // Try fallback execution
        fallbackUsed = true;
        const fallbackResult = await this.executeFallback(request);

        return this.createExecutionResult(
          fallbackResult.success,
          fallbackResult.data,
          fallbackResult.error,
          Date.now() - startTime,
          request.toolName,
          request.parameters,
          attempts + 1,
          true,
          startMemory
        );
      }

    } catch (error) {
      // Handle execution error with recovery
      const errorContext: ErrorContext = {
        component: 'executor',
        operation: request.toolName,
        error: error instanceof Error ? error : new Error('Unknown execution error'),
        timestamp: new Date(),
        retryCount: attempts,
        data: { request }
      };

      const recoveryResult = await ErrorRecoveryManager.handleError(errorContext);

      if (recoveryResult.recovered && recoveryResult.data) {
        fallbackUsed = true;
        return this.createExecutionResult(
          true,
          recoveryResult.data,
          undefined,
          Date.now() - startTime,
          request.toolName,
          request.parameters,
          attempts + 1,
          true,
          startMemory
        );
      }

      // Final error case
      return this.createExecutionResult(
        false,
        undefined,
        error instanceof Error ? error : new Error('Execution failed'),
        Date.now() - startTime,
        request.toolName,
        request.parameters,
        attempts,
        fallbackUsed,
        startMemory
      );
    }
  }

  /**
   * Execute multiple tools in parallel with confidence aggregation
   */
  static async executeParallel(
    requests: ExecutionRequest[]
  ): Promise<ExecutionResult[]> {
    const results = await Promise.allSettled(
      requests.map(request => this.execute(request))
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason instanceof Error ? result.reason : new Error('Parallel execution failed'),
          executionTime: 0,
          confidence: { score: 0, reasoning: 'Parallel execution failed', timestamp: new Date() },
          metadata: {
            toolName: 'parallel',
            parameters: {},
            attempts: 1,
            fallbackUsed: false,
            resultCount: 0
          }
        };
      }
    });
  }

  /**
   * Execute tools in sequence with context passing
   */
  static async executeSequence(
    requests: ExecutionRequest[]
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    let currentContext = requests[0]?.context;
    let currentState = requests[0]?.state;

    for (const request of requests) {
      // Update context and state from previous results
      const enhancedRequest = {
        ...request,
        context: currentContext || request.context,
        state: currentState || request.state
      };

      const result = await this.execute(enhancedRequest);
      results.push(result);

      // Update context and state for next execution
      if (result.success && result.data && currentState) {
        currentState = StateManager.updateStateWithResults(
          currentState,
          Array.isArray(result.data) ? result.data : [result.data],
          request.toolName,
          result.confidence,
          result.confidence.reasoning
        );
      }
    }

    return results;
  }

  /**
   * Get execution metrics
   */
  static getMetrics(): ExecutionMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      averageConfidence: 0,
      toolUsage: {},
      errorDistribution: {},
      fallbackUsage: 0,
      memoryEfficiency: {}
    };
  }

  /**
   * Execute tool with monitoring
   */
  private static async executeTool(
    tool: Tool,
    parameters: Record<string, any>,
    context: QueryContext
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Pre-execution validation
      this.preExecutionValidation(tool, parameters, context);

      // Execute the tool function
      const result = await tool.function(parameters);

      // Post-execution validation
      this.postExecutionValidation(tool, result, parameters);

      return result;

    } finally {
      const executionTime = Date.now() - startTime;
      this.updatePerformanceMetrics(tool.name, executionTime);
    }
  }

  /**
   * Validate tool parameters
   */
  private static validateParameters(tool: Tool, parameters: Record<string, any>): void {
    if (tool.parameters) {
      for (const [paramName, paramSpec] of Object.entries(tool.parameters)) {
        if ((paramSpec as any).required && !(paramName in parameters)) {
          throw new Error(`Required parameter missing: ${paramName}`);
        }

        if (paramName in parameters) {
          const value = parameters[paramName];
          const expectedType = (paramSpec as any).type;

          // Type validation
          if (expectedType && typeof value !== expectedType) {
            // Try type conversion
            try {
              switch (expectedType) {
                case 'string':
                  parameters[paramName] = String(value);
                  break;
                case 'number':
                  parameters[paramName] = Number(value);
                  break;
                case 'boolean':
                  parameters[paramName] = Boolean(value);
                  break;
                case 'array':
                  if (!Array.isArray(value)) {
                    parameters[paramName] = [value];
                  }
                  break;
              }
            } catch {
              throw new Error(`Parameter type mismatch for ${paramName}: expected ${expectedType}, got ${typeof value}`);
            }
          }
        }
      }
    }
  }

  /**
   * Pre-execution validation
   */
  private static preExecutionValidation(
    tool: Tool,
    parameters: Record<string, any>,
    context: QueryContext
  ): void {
    // Check if tool is appropriate for current context
    if (tool.contextRequirements) {
      for (const requirement of tool.contextRequirements) {
        if (!this.checkContextRequirement(requirement, context)) {
          throw new Error(`Tool ${tool.name} requires: ${requirement}`);
        }
      }
    }

    // Check resource availability (if property exists)
    if ((tool as any).resourceRequirements) {
      for (const [resource, required] of Object.entries((tool as any).resourceRequirements)) {
        const available = this.checkResourceAvailability(resource, required);
        if (!available) {
          throw new Error(`Insufficient ${resource} for tool ${tool.name}`);
        }
      }
    }
  }

  /**
   * Post-execution validation
   */
  private static postExecutionValidation(
    tool: Tool,
    result: any,
    parameters: Record<string, any>
  ): void {
    // Check if result is valid
    if (result === undefined || result === null) {
      throw new Error(`Tool ${tool.name} returned invalid result`);
    }

    // Check result structure if expected (if property exists)
    if ((tool as any).expectedResult) {
      const expectedResult = (tool as any).expectedResult;
      if (expectedResult.type === 'array' && !Array.isArray(result)) {
        throw new Error(`Tool ${tool.name} expected array result`);
      }

      if (expectedResult.minLength && Array.isArray(result) && result.length < expectedResult.minLength) {
        throw new Error(`Tool ${tool.name} result too short: expected at least ${expectedResult.minLength} items`);
      }
    }
  }

  /**
   * Execute fallback strategy
   */
  private static async executeFallback(request: ExecutionRequest): Promise<ExecutionResult> {
    // Try similar tool
    const similarTool = this.findSimilarTool(request.toolName);
    if (similarTool) {
      try {
        const fallbackRequest = {
          ...request,
          toolName: similarTool
        };

        return await this.execute(fallbackRequest);
      } catch {
        // Continue to next fallback strategy
      }
    }

    // Return safe default result
    return {
      success: true,
      data: this.generateSafeDefaultResult(request.toolName, request.parameters),
      executionTime: 0,
      confidence: {
        score: 0.3,
        reasoning: 'Fallback execution with safe default result',
        timestamp: new Date()
      },
      metadata: {
        toolName: request.toolName,
        parameters: request.parameters,
        attempts: 1,
        fallbackUsed: true,
        resultCount: 0
      }
    };
  }

  /**
   * Find similar tool for fallback
   */
  private static findSimilarTool(toolName: string): string | null {
    const tool = this.toolRegistry.get(toolName);
    if (!tool) return null;

    // Find tools with similar functionality
    const similarTools = Array.from(this.toolRegistry.values())
      .filter(t => t.name !== toolName && (t as any).category === (tool as any).category)
      .map(t => (t as any).name || t.name);

    return similarTools.length > 0 ? similarTools[0] : null;
  }

  /**
   * Generate safe default result
   */
  private static generateSafeDefaultResult(toolName: string, parameters: Record<string, any>): any {
    // Return appropriate default based on tool type
    if (toolName.includes('search') || toolName.includes('find')) {
      return [];
    }

    if (toolName.includes('filter')) {
      return [];
    }

    if (toolName.includes('sort')) {
      return [];
    }

    if (toolName.includes('group')) {
      return {};
    }

    if (toolName.includes('count')) {
      return 0;
    }

    return null;
  }

  /**
   * Create execution result
   */
  private static createExecutionResult(
    success: boolean,
    data: any,
    error: Error | undefined,
    executionTime: number,
    toolName: string,
    parameters: Record<string, any>,
    attempts: number,
    fallbackUsed: boolean,
    startMemory: number
  ): ExecutionResult {
    const confidence: ConfidenceScore = success ? {
      score: fallbackUsed ? 0.4 : 0.8,
      reasoning: fallbackUsed ? 'Execution succeeded with fallback' : 'Execution succeeded',
      timestamp: new Date()
    } : {
      score: 0.1,
      reasoning: `Execution failed: ${error?.message || 'Unknown error'}`,
      timestamp: new Date()
    };

    const endMemory = this.getMemoryUsage();
    const memoryUsage = endMemory - startMemory;

    // Update metrics
    this.updateToolMetrics(toolName, success, executionTime, confidence.score);
    if (fallbackUsed) {
      this.metrics.fallbackUsage++;
    }

    const result: ExecutionResult = {
      success,
      executionTime,
      confidence,
      metadata: {
        toolName,
        parameters,
        attempts,
        fallbackUsed,
        memoryUsage,
        resultCount: success && data ? (Array.isArray(data) ? data.length : 1) : 0
      }
    };

    if (data !== undefined) {
      result.data = data;
    }

    if (error !== undefined) {
      result.error = error;
    }

    return result;
  }

  /**
   * Update tool metrics
   */
  private static updateToolMetrics(
    toolName: string,
    success: boolean,
    executionTime: number,
    confidence: number
  ): void {
    this.metrics.totalExecutions++;

    // Update success rate
    this.metrics.successRate =
      (this.metrics.successRate * (this.metrics.totalExecutions - 1) + (success ? 1 : 0)) /
      this.metrics.totalExecutions;

    // Update average execution time
    this.metrics.averageExecutionTime =
      (this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1) + executionTime) /
      this.metrics.totalExecutions;

    // Update average confidence
    this.metrics.averageConfidence =
      (this.metrics.averageConfidence * (this.metrics.totalExecutions - 1) + confidence) /
      this.metrics.totalExecutions;

    // Update tool usage
    this.metrics.toolUsage[toolName] = (this.metrics.toolUsage[toolName] || 0) + 1;

    // Update error distribution
    if (!success) {
      const errorType = 'execution_error';
      this.metrics.errorDistribution[errorType] = (this.metrics.errorDistribution[errorType] || 0) + 1;
    }
  }

  /**
   * Update performance metrics
   */
  private static updatePerformanceMetrics(toolName: string, executionTime: number): void {
    // Update memory efficiency (would be calculated with actual memory usage)
    const memoryEfficiency = Math.max(0, 1 - (executionTime / 10000)); // Normalize to 0-1
    this.metrics.memoryEfficiency[toolName] = memoryEfficiency;
  }

  /**
   * Check context requirement
   */
  private static checkContextRequirement(requirement: string, context: QueryContext): boolean {
    switch (requirement) {
      case 'hasQuery':
        return !!context.originalQuery;
      case 'hasIntent':
        return !!context.interpretedIntent;
      case 'hasEntities':
        return Object.keys(context.extractedEntities).length > 0;
      case 'hasConstraints':
        return Object.keys(context.constraints).length > 0;
      default:
        return true;
    }
  }

  /**
   * Check resource availability
   */
  private static checkResourceAvailability(resource: string, required: any): boolean {
    switch (resource) {
      case 'memory':
        // Check available memory (simplified)
        return this.getMemoryUsage() < 1000; // 1GB limit
      case 'timeout':
        // Check time constraints
        return true;
      default:
        return true;
    }
  }

  /**
   * Get memory usage (simplified)
   */
  private static getMemoryUsage(): number {
    // In a real implementation, this would use process.memoryUsage()
    // For now, return a simulated value
    return Math.random() * 500;
  }
}

export default ToolExecutor;
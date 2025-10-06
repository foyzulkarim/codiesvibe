/**
 * LLM Planner with Reasoning and Robust Parsing
 * AI-powered planning using LLM with comprehensive error handling
 */

import { QueryContext as BaseQueryContext, AgentState, Tool } from '../types';
import { QueryContext } from '../graph/context';
import { PromptBuilder } from '../prompts/builder';
import { ResponseParser, ParseResult } from '../parsing/parser';
import { ResponseValidator } from '../validation/schemas';
import { RetryManager } from '../retry/backoff';
import { ErrorRecoveryManager, ErrorContext } from '../recovery/strategies';
import { ConfidenceScorer } from '../confidence/scoring';
import { LLMService } from '../services/llm-service';
import { TOOL_REGISTRY } from '../tools';

export interface LLMPlanningRequest {
  context: QueryContext;
  state: AgentState;
  availableTools: string[];
  iteration: number;
  maxIterations: number;
  planningType: 'initial' | 'iteration' | 'clarification' | 'completion';
}

export interface LLMPlan {
  tool: string;
  parameters: Record<string, any>;
  reasoning: string;
  confidence: number;
  expectedOutcome: string;
  alternativePlans?: LLMPlan[];
  riskFactors?: string[];
  estimatedTime?: number;
}

export interface LLMPlanningResult {
  plan: LLMPlan;
  confidence: number;
  reasoning: string;
  metadata: {
    planningTime: number;
    llmCalls: number;
    parsingAttempts: number;
    fallbackUsed: boolean;
    promptTokens: number;
    responseTokens: number;
  };
}

export interface LLMPlanningMetrics {
  totalPlans: number;
  successRate: number;
  averagePlanningTime: number;
  averageLLMCalls: number;
  toolSelectionAccuracy: Record<string, number>;
  confidenceDistribution: Record<string, number>;
  lastPlan?: LLMPlanningResult;
}

export class LLMPlanner {
  private static metrics: LLMPlanningMetrics = {
    totalPlans: 0,
    successRate: 0,
    averagePlanningTime: 0,
    averageLLMCalls: 0,
    toolSelectionAccuracy: {},
    confidenceDistribution: { high: 0, medium: 0, low: 0 },
  };

  /**
   * Generate plan using LLM with reasoning
   */
  static async generatePlan(request: LLMPlanningRequest): Promise<LLMPlanningResult> {
    const startTime = Date.now();
    let llmCalls = 0;
    let parsingAttempts = 0;
    let fallbackUsed = false;

    try {
      // Build planning prompt
      const prompt = this.buildPlanningPrompt(request);

      // Call LLM with retry logic
      const llmResponse = await this.callLLMWithRetry(prompt, request.planningType);
      llmCalls++;

      // Parse LLM response
      const parseResult = await this.parseLLMResponse(llmResponse, request.planningType);
      parsingAttempts = parseResult.metadata?.attempts || 1;

      if (!parseResult.success || !parseResult.data) {
        // Try fallback planning
        fallbackUsed = true;
        const fallbackPlan = await this.generateFallbackPlan(request);

        return this.createPlanningResult(fallbackPlan, startTime, llmCalls, parsingAttempts, fallbackUsed);
      }

      // Validate and enhance the plan
      const validatedPlan = await this.validateAndEnhancePlan(parseResult.data, request);

      return this.createPlanningResult(validatedPlan, startTime, llmCalls, parsingAttempts, fallbackUsed);

    } catch (error) {
      console.error(`🔥 LLM Planning Error:`, error);

      // Use emergency fallback
      fallbackUsed = true;
      const emergencyPlan = this.generateEmergencyFallbackPlan(request);

      return this.createPlanningResult(emergencyPlan, startTime, llmCalls, parsingAttempts, true);
    }
  }

  /**
   * Generate iterative planning (for multi-step reasoning)
   */
  static async generateIterativePlan(
    request: LLMPlanningRequest,
    previousPlans: LLMPlan[] = []
  ): Promise<LLMPlanningResult> {
    // Include previous plans in context
    const enhancedRequest = {
      ...request,
      previousPlans,
      planningType: 'iteration' as const
    };

    return this.generatePlan(enhancedRequest);
  }

  /**
   * Generate clarification plan
   */
  static async generateClarificationPlan(
    request: LLMPlanningRequest,
    ambiguities: string[]
  ): Promise<LLMPlanningResult> {
    const clarificationRequest = {
      ...request,
      planningType: 'clarification' as const,
      ambiguities
    };

    return this.generatePlan(clarificationRequest);
  }

  /**
   * Get planning metrics
   */
  static getMetrics(): LLMPlanningMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalPlans: 0,
      successRate: 0,
      averagePlanningTime: 0,
      averageLLMCalls: 0,
      toolSelectionAccuracy: {},
      confidenceDistribution: { high: 0, medium: 0, low: 0 },
    };
  }

  /**
   * Build planning prompt
   */
  private static buildPlanningPrompt(request: LLMPlanningRequest): string {
    const { context, state, availableTools, iteration, maxIterations, planningType } = request;

    // Enhance context with query pattern information if available
    const enhancedContext = {
      ...context,
      queryPattern: (context as any).queryPattern,
      suggestedTools: (context as any).suggestedTools,
      analysisConfidence: (context as any).analysisConfidence
    };

    switch (planningType) {
      case 'initial':
        // Use enhanced tool selection prompt for initial planning to get better tool selection
        return PromptBuilder.buildEnhancedToolSelectionPrompt(
          enhancedContext,
          state,
          availableTools
        );

      case 'iteration':
        // Use enhanced tool selection prompt for iterations as well
        return PromptBuilder.buildEnhancedToolSelectionPrompt(
          enhancedContext,
          state,
          availableTools
        );

      case 'clarification':
        return PromptBuilder.buildAmbiguityResolutionPrompt(
          context.originalQuery,
          context.interpretedIntent,
          context.ambiguities,
          context.clarificationHistory || []
        );

      case 'completion':
        return PromptBuilder.buildEnhancedToolSelectionPrompt(
          enhancedContext,
          state,
          availableTools
        );

      default:
        // Always use enhanced tool selection prompt
        return PromptBuilder.buildEnhancedToolSelectionPrompt(
          enhancedContext,
          state,
          availableTools
        );
    }
  }

  /**
   * Call LLM with retry logic
   */
  private static async callLLMWithRetry(prompt: string, planningType?: string): Promise<string> {
    return RetryManager.executeWithRetry(async () => {
      try {
        // Use real LLM service
        const systemPrompt = this.getSystemPromptForPlanningType(planningType);
        return await LLMService.callLLM(prompt, systemPrompt);
      } catch (error) {
        console.error(`🔥 LLM call failed for ${planningType}:`, error);
        throw error;
      }
    }, {
      maxAttempts: 3,
      baseDelay: 1000,
      backoffFactor: 2,
      retryableErrors: ['network', 'timeout', 'rate limit']
    }).then(result => {
      if (!result.success) {
        throw new Error(`LLM call failed: ${result.error?.message}`);
      }
      return result.data as string;
    });
  }

  /**
   * Get system prompt based on planning type
   */
  private static getSystemPromptForPlanningType(planningType?: string): string {
    const baseSystemPrompt = `You are an AI-powered search planning assistant for a database of AI tools and software.

Your task is to analyze user queries and create execution plans using the available tools. You must:
1. Understand the user's intent and extract key entities
2. Select the most appropriate tools from the available options
3. Generate specific parameters for the selected tools
4. Provide clear reasoning for your decisions
5. Assess confidence in your plan

Always respond in valid JSON format with the required schema.`;

    switch (planningType) {
      case 'initial':
        return `${baseSystemPrompt}

For initial query analysis, focus on:
- Understanding user intent
- Extracting key entities and constraints
- Identifying ambiguities that need clarification
- Suggesting appropriate search strategies

Response schema:
{
  "intent": "string",
  "entities": {"key": "value"},
  "constraints": {"key": "value"},
  "ambiguities": ["string"],
  "confidence": number,
  "reasoning": "string",
  "suggestedActions": ["string"]
}`;

      case 'iteration':
        return `${baseSystemPrompt}

For iterative planning, focus on:
- Analyzing current results and what's missing
- Determining the next best action to improve results
- Building upon previous steps rather than starting over
- Considering efficiency and user experience

Response schema:
{
  "tool": "string",
  "parameters": {"key": "value"},
  "reasoning": "string",
  "confidence": number,
  "expectedOutcome": "string"
}`;

      case 'completion':
        return `${baseSystemPrompt}

For tool selection, focus on:
- Selecting the most appropriate tool for the current context
- Providing specific, actionable parameters
- Considering data field availability and tool constraints
- Ensuring the selected tool will produce useful results

Response schema:
{
  "tool": "string",
  "parameters": {"key": "value"},
  "reasoning": "string",
  "confidence": number,
  "expectedOutcome": "string"
}`;

      case 'clarification':
        return `${baseSystemPrompt}

For clarification, focus on:
- Identifying specific ambiguities in the user's query
- Formulating clear, actionable clarification questions
- Providing options for disambiguation
- Maintaining a helpful and conversational tone

Response schema:
{
  "question": "string",
  "options": ["string"],
  "reasoning": "string",
  "confidence": number
}`;

      default:
        return baseSystemPrompt;
    }
  }

  /**
   * Parse LLM response with robust parsing
   */
  private static async parseLLMResponse(
    response: string,
    planningType: string
  ): Promise<ParseResult<any>> {
    try {
      switch (planningType) {
        case 'initial':
          return await ResponseParser.parseQueryAnalysis(response);

        case 'iteration':
        case 'completion':
          return await ResponseParser.parseToolSelection(response);

        case 'clarification':
          return await ResponseParser.parseClarification(response);

        default:
          return await ResponseParser.parseJSON(response);
      }
    } catch (error) {
      // Handle parsing errors with recovery
      const errorContext: ErrorContext = {
        component: 'llm-planner',
        operation: 'parse-response',
        error: error instanceof Error ? error : new Error('Unknown parsing error'),
        timestamp: new Date(),
        retryCount: 0,
        data: { response, planningType }
      };

      const recoveryResult = await ErrorRecoveryManager.handleError(errorContext);

      if (recoveryResult.recovered && recoveryResult.data) {
        return {
          success: true,
          data: recoveryResult.data,
          confidence: recoveryResult.confidence,
          metadata: {
            parseTime: 0,
            originalLength: 0,
            attempts: 0,
            fallbackUsed: false
          }
        };
      }

      throw error;
    }
  }

  /**
   * Validate and enhance plan
   */
  private static async validateAndEnhancePlan(
    planData: any,
    request: LLMPlanningRequest
  ): Promise<LLMPlan> {
    // Validate plan structure with more detailed error logging
    const validation = ResponseValidator.validateQuick(planData, 'tool');
    if (!validation.isValid) {
      console.error('🔥 Validation Errors:', validation.errors);
      console.error('🔥 Plan Data:', JSON.stringify(planData, null, 2));
      throw new Error(`Plan validation failed: ${validation.errors.join(', ')}`);
    }

    // Create base plan
    const plan: LLMPlan = {
      tool: planData.tool || planData.selectedTool,
      parameters: planData.parameters || {},
      reasoning: planData.reasoning || 'No reasoning provided',
      confidence: planData.confidence || 0.5,
      expectedOutcome: planData.expectedOutcome || 'Improve search results'
    };

    // Enhance with additional reasoning
    const confidenceCalculation = ConfidenceScorer.calculateToolConfidence(
      plan.tool,
      plan.parameters,
      request.context,
      plan.reasoning
    );

    // Update confidence with LLM reasoning
    plan.confidence = (plan.confidence + confidenceCalculation.overallScore) / 2;

    // Add risk factors if not present
    if (!plan.riskFactors) {
      plan.riskFactors = this.identifyRiskFactors(plan, request);
    }

    // Estimate execution time
    if (!plan.estimatedTime) {
      plan.estimatedTime = this.estimateExecutionTime(plan.tool, plan.parameters);
    }

    // Generate alternative plans if confidence is low
    if (plan.confidence < 0.7 && request.availableTools.length > 1) {
      plan.alternativePlans = this.generateAlternativePlans(plan, request);
    }

    return plan;
  }

  /**
   * Generate fallback plan
   */
  private static async generateFallbackPlan(request: LLMPlanningRequest): Promise<LLMPlan> {
    // Use rule-based fallback
    const fallbackTool = this.selectFallbackTool(request);

    return {
      tool: fallbackTool,
      parameters: this.generateFallbackParameters(fallbackTool, request),
      reasoning: 'Fallback plan generated due to LLM planning failure',
      confidence: 0.4,
      expectedOutcome: 'Basic search using heuristic approach',
      riskFactors: ['LLM planning failed', 'Using heuristic approach'],
      estimatedTime: 3000
    };
  }

  /**
   * Generate emergency fallback plan
   */
  private static generateEmergencyFallbackPlan(request: LLMPlanningRequest): LLMPlan {
    return {
      tool: 'searchByText',
      parameters: {
        query: request.context.originalQuery,
        fields: ['name', 'description']
      },
      reasoning: 'Emergency fallback: basic text search',
      confidence: 0.2,
      expectedOutcome: 'Basic search results',
      riskFactors: ['Emergency fallback', 'Minimal reasoning'],
      estimatedTime: 2000
    };
  }

  /**
   * Create planning result
   */
  private static createPlanningResult(
    plan: LLMPlan,
    startTime: number,
    llmCalls: number,
    parsingAttempts: number,
    fallbackUsed: boolean
  ): LLMPlanningResult {
    const planningTime = Date.now() - startTime;

    const result: LLMPlanningResult = {
      plan,
      confidence: plan.confidence,
      reasoning: plan.reasoning,
      metadata: {
        planningTime,
        llmCalls,
        parsingAttempts,
        fallbackUsed,
        promptTokens: 0, // Would be calculated in real implementation
        responseTokens: 0
      }
    };

    // Update metrics
    this.updateMetrics(result);

    return result;
  }

  /**
   * Identify risk factors
   */
  private static identifyRiskFactors(plan: LLMPlan, request: LLMPlanningRequest): string[] {
    const risks: string[] = [];

    // Low confidence risk
    if (plan.confidence < 0.5) {
      risks.push('Low confidence in plan');
    }

    // Tool compatibility risk
    if (!request.availableTools.includes(plan.tool)) {
      risks.push('Selected tool not available');
    }

    // Parameter risk
    if (!plan.parameters || Object.keys(plan.parameters).length === 0) {
      risks.push('Missing or insufficient parameters');
    }

    // Iteration risk
    if (request.iteration > 5) {
      risks.push('High iteration count may indicate issues');
    }

    // Context risk
    if (request.context.ambiguities.length > 2) {
      risks.push('Multiple ambiguities may affect results');
    }

    return risks;
  }

  /**
   * Estimate execution time
   */
  private static estimateExecutionTime(toolName: string, parameters: any): number {
    const baseTimes: Record<string, number> = {
      'searchByText': 2000,
      'searchByKeywords': 1500,
      'filterByPriceRange': 1000,
      'filterByArrayContains': 800,
      'sortByField': 1200,
      'groupBy': 2500,
      'limitResults': 200,
      'skipResults': 100
    };

    const baseTime = baseTimes[toolName] || 2000;

    // Adjust based on parameters
    if (parameters && Object.keys(parameters).length > 3) {
      return baseTime * 1.5; // More complex parameters
    }

    return baseTime;
  }

  /**
   * Generate alternative plans
   */
  private static generateAlternativePlans(
    primaryPlan: LLMPlan,
    request: LLMPlanningRequest
  ): LLMPlan[] {
    const alternatives: LLMPlan[] = [];
    const availableTools = request.availableTools.filter(tool => tool !== primaryPlan.tool);

    // Generate up to 2 alternatives
    for (let i = 0; i < Math.min(2, availableTools.length); i++) {
      const alternativeTool = availableTools[i];

      alternatives.push({
        tool: alternativeTool || 'unknown',
        parameters: this.generateFallbackParameters(alternativeTool || 'unknown', request),
        reasoning: `Alternative to ${primaryPlan?.tool || 'unknown'}`,
        confidence: (primaryPlan?.confidence || 0.5) * 0.8, // Lower confidence for alternatives
        expectedOutcome: 'Alternative approach if primary plan fails',
        estimatedTime: this.estimateExecutionTime(alternativeTool || 'unknown', {})
      });
    }

    return alternatives;
  }

  /**
   * Select fallback tool
   */
  private static selectFallbackTool(request: LLMPlanningRequest): string {
    const { context, availableTools } = request;

    // Prefer text search for fallback
    if (availableTools.includes('searchByText')) {
      return 'searchByText';
    }

    // Use keyword search as second option
    if (availableTools.includes('searchByKeywords')) {
      return 'searchByKeywords';
    }

    // Use first available tool
    return availableTools[0] || 'searchByText';
  }

  /**
   * Generate fallback parameters
   */
  private static generateFallbackParameters(toolName: string, request: LLMPlanningRequest): Record<string, any> {
    const { context, state } = request;

    switch (toolName) {
      case 'searchByText':
        return {
          query: context.originalQuery,
          fields: ['name', 'description', 'tags']
        };

      case 'searchByKeywords':
        return {
          keywords: this.extractKeywords(context.originalQuery),
          fields: ['name', 'description']
        };

      case 'filterByPriceRange':
        return {
          minPrice: context.constraints.minPrice,
          maxPrice: context.constraints.maxPrice
        };

      default:
        return {};
    }
  }

  /**
   * Extract keywords from query
   */
  private static extractKeywords(query: string): string[] {
    // Simple keyword extraction
    return query
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 2 && !['the', 'and', 'for', 'with', 'that'].includes(word))
      .slice(0, 5);
  }

  /**
   * Validate LLM connection and availability
   */
  private static async validateLLMConnection(): Promise<boolean> {
    try {
      const healthCheck = await LLMService.healthCheck();
      return healthCheck.connected;
    } catch (error) {
      console.error('LLM connection validation failed:', error);
      return false;
    }
  }

  /**
   * Update metrics
   */
  private static updateMetrics(result: LLMPlanningResult): void {
    this.metrics.totalPlans++;
    this.metrics.lastPlan = result;

    // Update success rate (consider any plan generation as success)
    this.metrics.successRate = 1.0;

    // Update average planning time
    this.metrics.averagePlanningTime =
      (this.metrics.averagePlanningTime * (this.metrics.totalPlans - 1) + result.metadata.planningTime) /
      this.metrics.totalPlans;

    // Update average LLM calls
    this.metrics.averageLLMCalls =
      (this.metrics.averageLLMCalls * (this.metrics.totalPlans - 1) + result.metadata.llmCalls) /
      this.metrics.totalPlans;

    // Update tool selection accuracy
    const toolName = result.plan.tool;
    this.metrics.toolSelectionAccuracy[toolName] = (this.metrics.toolSelectionAccuracy[toolName] || 0) + 1;

    // Update confidence distribution
    const confidenceCategory = result.confidence >= 0.7 ? 'high' :
                              result.confidence >= 0.4 ? 'medium' : 'low';
    if (this.metrics.confidenceDistribution[confidenceCategory] !== undefined) {
      this.metrics.confidenceDistribution[confidenceCategory]++;
    }
  }
}

export default LLMPlanner;

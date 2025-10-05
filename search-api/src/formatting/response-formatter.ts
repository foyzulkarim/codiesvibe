/**
 * Response Formatter with Reasoning Chain
 * Formats final responses with comprehensive reasoning and explanation
 */

import { AgentState, QueryContext, ConfidenceScore } from '../types';
import { EvaluationResult } from '../evaluation/evaluator';
import { StateManager } from '../state/helpers';

export interface FormattingOptions {
  includeReasoning: boolean;
  includeMetrics: boolean;
  includeConfidence: boolean;
  includeSuggestions: boolean;
  verbosity: 'concise' | 'standard' | 'detailed';
  format: 'json' | 'markdown' | 'html';
}

export interface ReasoningStep {
  step: number;
  phase: string;
  action: string;
  reasoning: string;
  result: any;
  confidence: number;
  timestamp: Date;
}

export interface FormattedResponse {
  success: boolean;
  results: any[];
  summary: string;
  reasoning: ReasoningStep[];
  metrics: ResponseMetrics;
  confidence: number;
  suggestions: string[];
  metadata: ResponseMetadata;
}

export interface ResponseMetrics {
  totalResults: number;
  executionTime: number;
  iterations: number;
  toolsUsed: string[];
  averageConfidence: number;
  qualityScore: number;
  clarificationRounds?: number;
}

export interface ResponseMetadata {
  query: string;
  intent: string;
  timestamp: Date;
  responseFormat: string;
  version: string;
  warnings: string[];
  errors: string[];
}

export interface FormattingMetrics {
  totalFormatted: number;
  averageFormattingTime: number;
  formatUsage: Record<string, number>;
  verbosityUsage: Record<string, number>;
  lastFormatted?: FormattedResponse;
}

export class ResponseFormatter {
  private static metrics: FormattingMetrics = {
    totalFormatted: 0,
    averageFormattingTime: 0,
    formatUsage: {},
    verbosityUsage: {}
  };

  /**
   * Format response with reasoning chain
   */
  static async formatResponse(
    state: AgentState,
    context: QueryContext,
    evaluation: EvaluationResult,
    options: Partial<FormattingOptions> = {}
  ): Promise<FormattedResponse> {
    const startTime = Date.now();

    // Merge with default options
    const finalOptions: FormattingOptions = {
      includeReasoning: true,
      includeMetrics: true,
      includeConfidence: true,
      includeSuggestions: true,
      verbosity: 'standard',
      format: 'json',
      ...options
    };

    try {
      // Build reasoning chain
      const reasoning = this.buildReasoningChain(state, context);

      // Calculate metrics
      const metrics = this.calculateResponseMetrics(state, context, evaluation);

      // Generate summary
      const summary = this.generateSummary(state, context, evaluation, finalOptions);

      // Generate suggestions
      const suggestions = this.generateSuggestions(state, context, evaluation, finalOptions);

      // Create metadata
      const metadata = this.createMetadata(state, context, finalOptions);

      const response: FormattedResponse = {
        success: state.isComplete && !StateManager.hasError(state),
        results: state.currentResults || [],
        summary,
        reasoning: finalOptions.includeReasoning ? reasoning : [],
        metrics: finalOptions.includeMetrics ? metrics : this.createEmptyMetrics(),
        confidence: finalOptions.includeConfidence ? (state.currentConfidence?.score || 0) : 0,
        suggestions: finalOptions.includeSuggestions ? suggestions : [],
        metadata
      };

      // Format according to requested format
      const formattedResponse = this.applyFormat(response, finalOptions.format);

      // Update metrics
      this.updateMetrics(finalOptions, Date.now() - startTime);

      return formattedResponse;

    } catch (error) {
      return this.createFallbackResponse(state, context, finalOptions, Date.now() - startTime);
    }
  }

  /**
   * Format response for different output types
   */
  static formatForOutput(
    response: FormattedResponse,
    outputType: 'api' | 'ui' | 'log' | 'export'
  ): any {
    switch (outputType) {
      case 'api':
        return this.formatForAPI(response);
      case 'ui':
        return this.formatForUI(response);
      case 'log':
        return this.formatForLogging(response);
      case 'export':
        return this.formatForExport(response);
      default:
        return response;
    }
  }

  /**
   * Create concise summary response
   */
  static createConciseResponse(
    state: AgentState,
    context: QueryContext
  ): { summary: string; resultCount: number; confidence: number } {
    const resultCount = state.currentResults?.length || 0;
    const confidence = state.currentConfidence?.score || 0;

    let summary = '';
    if (resultCount === 0) {
      summary = `No results found for "${context.originalQuery}"`;
    } else if (resultCount === 1) {
      summary = `Found 1 result for "${context.originalQuery}"`;
    } else {
      summary = `Found ${resultCount} results for "${context.originalQuery}"`;
    }

    if (state.iterationCount > 1) {
      summary += ` after ${state.iterationCount} iterations`;
    }

    return { summary, resultCount, confidence };
  }

  /**
   * Build reasoning chain from state history
   */
  private static buildReasoningChain(state: AgentState, context: QueryContext): ReasoningStep[] {
    const reasoning: ReasoningStep[] = [];
    let stepNumber = 1;

    // Initial query analysis
    reasoning.push({
      step: stepNumber++,
      phase: 'analysis',
      action: 'Query Analysis',
      reasoning: `Analyzed query: "${context.originalQuery}"`,
      result: {
        intent: context.interpretedIntent,
        entities: Object.keys(context.extractedEntities),
        constraints: Object.keys(context.constraints)
      },
      confidence: 0.8,
      timestamp: context.clarificationHistory?.[0]?.timestamp || new Date()
    });

    // Clarification rounds
    if (context.clarificationHistory && context.clarificationHistory.length > 0) {
      for (const clarification of context.clarificationHistory) {
        reasoning.push({
          step: stepNumber++,
          phase: 'clarification',
          action: 'Ambiguity Resolution',
          reasoning: `Asked: ${clarification.question}`,
          result: { response: clarification.response, confidence: clarification.confidence },
          confidence: clarification.confidence,
          timestamp: clarification.timestamp
        });
      }
    }

    // Tool execution steps
    if (state.toolHistory) {
      for (const tool of state.toolHistory) {
        reasoning.push({
          step: stepNumber++,
          phase: 'execution',
          action: `Executed: ${tool.toolName}`,
          reasoning: tool.reasoning,
          result: {
            resultCount: tool.resultCount,
            confidence: tool.confidence?.score || 0
          },
          confidence: tool.confidence?.score || 0,
          timestamp: tool.timestamp
        });
      }
    }

    // Final evaluation
    reasoning.push({
      step: stepNumber++,
      phase: 'evaluation',
      action: 'Result Evaluation',
      reasoning: 'Evaluated result quality and completeness',
      result: {
        resultCount: state.currentResults?.length || 0,
        isComplete: state.isComplete,
        confidence: state.currentConfidence?.score || 0
      },
      confidence: state.currentConfidence?.score || 0,
      timestamp: new Date()
    });

    return reasoning;
  }

  /**
   * Calculate response metrics
   */
  private static calculateResponseMetrics(
    state: AgentState,
    context: QueryContext,
    evaluation: EvaluationResult
  ): ResponseMetrics {
    const toolsUsed = state.toolHistory?.map(tool => tool.toolName) || [];

    return {
      totalResults: state.currentResults?.length || 0,
      executionTime: state.lastUpdateTime.getTime() - (state.metadata.startTime?.getTime() || Date.now()),
      iterations: state.iterationCount,
      toolsUsed: [...new Set(toolsUsed)], // Remove duplicates
      averageConfidence: this.calculateAverageConfidence(state),
      qualityScore: evaluation.overallScore,
      clarificationRounds: context.clarificationHistory?.length || 0
    };
  }

  /**
   * Generate summary based on options
   */
  private static generateSummary(
    state: AgentState,
    context: QueryContext,
    evaluation: EvaluationResult,
    options: FormattingOptions
  ): string {
    const resultCount = state.currentResults?.length || 0;
    const confidence = state.currentConfidence?.score || 0;

    let summary = '';

    switch (options.verbosity) {
      case 'concise':
        if (resultCount === 0) {
          summary = 'No results found';
        } else {
          summary = `Found ${resultCount} result${resultCount !== 1 ? 's' : ''}`;
        }
        break;

      case 'standard':
        summary = this.generateStandardSummary(state, context, evaluation);
        break;

      case 'detailed':
        summary = this.generateDetailedSummary(state, context, evaluation);
        break;
    }

    return summary;
  }

  /**
   * Generate standard summary
   */
  private static generateStandardSummary(
    state: AgentState,
    context: QueryContext,
    evaluation: EvaluationResult
  ): string {
    const resultCount = state.currentResults?.length || 0;
    const confidence = state.currentConfidence?.score || 0;
    const iterations = state.iterationCount;

    let summary = '';

    if (resultCount === 0) {
      summary = `No results found for "${context.originalQuery}"`;
    } else {
      summary = `Found ${resultCount} result${resultCount !== 1 ? 's' : ''} for "${context.originalQuery}"`;
    }

    if (iterations > 1) {
      summary += ` after ${iterations} iteration${iterations !== 1 ? 's' : ''}`;
    }

    if (confidence >= 0.8) {
      summary += ' with high confidence';
    } else if (confidence >= 0.6) {
      summary += ' with moderate confidence';
    } else {
      summary += ' with low confidence';
    }

    return summary;
  }

  /**
   * Generate detailed summary
   */
  private static generateDetailedSummary(
    state: AgentState,
    context: QueryContext,
    evaluation: EvaluationResult
  ): string {
    const standardSummary = this.generateStandardSummary(state, context, evaluation);
    const resultCount = state.currentResults?.length || 0;

    let detailed = standardSummary;

    // Add intent information
    if (context.interpretedIntent && context.interpretedIntent !== 'unknown') {
      detailed += `. Interpreted intent: ${context.interpretedIntent}`;
    }

    // Add key entities
    const entities = Object.keys(context.extractedEntities);
    if (entities.length > 0) {
      detailed += `. Key entities: ${entities.join(', ')}`;
    }

    // Add quality assessment
    if (evaluation.overallScore >= 0.8) {
      detailed += '. Results passed all quality checks';
    } else if (evaluation.overallScore >= 0.6) {
      detailed += '. Results passed most quality checks';
    } else {
      detailed += '. Results have some quality issues';
    }

    // Add clarification information
    const clarificationRounds = context.clarificationHistory?.length || 0;
    if (clarificationRounds > 0) {
      detailed += `. Required ${clarificationRounds} clarification round${clarificationRounds !== 1 ? 's' : ''}`;
    }

    return detailed;
  }

  /**
   * Generate suggestions
   */
  private static generateSuggestions(
    state: AgentState,
    context: QueryContext,
    evaluation: EvaluationResult,
    options: FormattingOptions
  ): string[] {
    const suggestions: string[] = [];

    // Add evaluation recommendations
    if (evaluation.recommendations) {
      suggestions.push(...evaluation.recommendations);
    }

    // Add contextual suggestions based on results
    const resultCount = state.currentResults?.length || 0;

    if (resultCount === 0) {
      suggestions.push('Try using different keywords or broader search terms');
      suggestions.push('Check for typos in your query');
    } else if (resultCount > 50) {
      suggestions.push('Consider adding more specific criteria to narrow results');
      suggestions.push('Use filters to focus on most relevant items');
    } else if (resultCount < 5) {
      suggestions.push('Try removing some constraints to find more results');
      suggestions.push('Consider alternative search terms');
    }

    // Add confidence-based suggestions
    const confidence = state.currentConfidence?.score || 0;
    if (confidence < 0.5) {
      suggestions.push('Results may not fully match your intent - consider refining your query');
    }

    // Remove duplicates and limit based on verbosity
    const uniqueSuggestions = [...new Set(suggestions)];

    switch (options.verbosity) {
      case 'concise':
        return uniqueSuggestions.slice(0, 2);
      case 'standard':
        return uniqueSuggestions.slice(0, 4);
      case 'detailed':
        return uniqueSuggestions.slice(0, 8);
      default:
        return uniqueSuggestions;
    }
  }

  /**
   * Create response metadata
   */
  private static createMetadata(
    state: AgentState,
    context: QueryContext,
    options: FormattingOptions
  ): ResponseMetadata {
    return {
      query: context.originalQuery,
      intent: context.interpretedIntent || 'unknown',
      timestamp: new Date(),
      responseFormat: options.format,
      version: '1.0.0',
      warnings: this.generateWarnings(state, context),
      errors: this.generateErrors(state, context)
    };
  }

  /**
   * Generate warnings
   */
  private static generateWarnings(state: AgentState, context: QueryContext): string[] {
    const warnings: string[] = [];

    // Low confidence warning
    const confidence = state.currentConfidence?.score || 0;
    if (confidence < 0.5) {
      warnings.push('Low confidence in results');
    }

    // High iteration warning
    if (state.iterationCount > 8) {
      warnings.push('High number of iterations may indicate inefficiency');
    }

    // No results warning
    const resultCount = state.currentResults?.length || 0;
    if (resultCount === 0) {
      warnings.push('No results found');
    }

    // Ambiguity warning
    if (context.ambiguities.length > 0) {
      warnings.push('Query contained ambiguities that may affect results');
    }

    return warnings;
  }

  /**
   * Generate errors
   */
  private static generateErrors(state: AgentState, context: QueryContext): string[] {
    const errors: string[] = [];

    // State validation errors
    const validation = StateManager.validateState(state);
    if (!validation.isValid) {
      errors.push(...validation.issues);
    }

    // Error state
    if (StateManager.hasError(state)) {
      errors.push('Search encountered errors during execution');
    }

    return errors;
  }

  /**
   * Apply format to response
   */
  private static applyFormat(response: FormattedResponse, format: string): FormattedResponse {
    switch (format) {
      case 'markdown':
        return this.formatAsMarkdown(response);
      case 'html':
        return this.formatAsHTML(response);
      case 'json':
      default:
        return response;
    }
  }

  /**
   * Format as JSON (default)
   */
  private static formatAsJSON(response: FormattedResponse): FormattedResponse {
    return response;
  }

  /**
   * Format as Markdown
   */
  private static formatAsMarkdown(response: FormattedResponse): FormattedResponse {
    const markdownResponse = { ...response };

    // Convert summary to markdown
    if (markdownResponse.summary) {
      markdownResponse.summary = `## Summary\n\n${markdownResponse.summary}`;
    }

    // Convert reasoning to markdown
    if (markdownResponse.reasoning.length > 0) {
      const reasoningMarkdown = markdownResponse.reasoning.map(step =>
        `### Step ${step.step}: ${step.action}\n\n**Phase:** ${step.phase}\n\n**Reasoning:** ${step.reasoning}\n\n**Confidence:** ${(step.confidence * 100).toFixed(1)}%\n`
      ).join('\n');

      (markdownResponse as any).reasoningMarkdown = `## Reasoning Chain\n\n${reasoningMarkdown}`;
    }

    return markdownResponse;
  }

  /**
   * Format as HTML
   */
  private static formatAsHTML(response: FormattedResponse): FormattedResponse {
    const htmlResponse = { ...response };

    // Convert summary to HTML
    if (htmlResponse.summary) {
      htmlResponse.summary = `<h2>Summary</h2><p>${htmlResponse.summary}</p>`;
    }

    // Convert reasoning to HTML
    if (htmlResponse.reasoning.length > 0) {
      const reasoningHTML = htmlResponse.reasoning.map(step =>
        `<div class="reasoning-step">
          <h3>Step ${step.step}: ${step.action}</h3>
          <p><strong>Phase:</strong> ${step.phase}</p>
          <p><strong>Reasoning:</strong> ${step.reasoning}</p>
          <p><strong>Confidence:</strong> ${(step.confidence * 100).toFixed(1)}%</p>
        </div>`
      ).join('\n');

      (htmlResponse as any).reasoningHTML = `<div class="reasoning-chain"><h2>Reasoning Chain</h2>${reasoningHTML}</div>`;
    }

    return htmlResponse;
  }

  /**
   * Format for API output
   */
  private static formatForAPI(response: FormattedResponse): any {
    return {
      success: response.success,
      results: response.results,
      summary: response.summary,
      resultCount: response.results.length,
      confidence: response.confidence,
      metadata: response.metadata
    };
  }

  /**
   * Format for UI output
   */
  private static formatForUI(response: FormattedResponse): any {
    return {
      success: response.success,
      results: response.results,
      summary: response.summary,
      metrics: response.metrics,
      suggestions: response.suggestions,
      confidence: response.confidence,
      reasoning: response.reasoning.map(step => ({
        phase: step.phase,
        action: step.action,
        reasoning: step.reasoning,
        confidence: step.confidence
      }))
    };
  }

  /**
   * Format for logging
   */
  private static formatForLogging(response: FormattedResponse): any {
    return {
      timestamp: response.metadata.timestamp,
      query: response.metadata.query,
      success: response.success,
      resultCount: response.results.length,
      confidence: response.confidence,
      iterations: response.metrics.iterations,
      executionTime: response.metrics.executionTime,
      warnings: response.metadata.warnings,
      errors: response.metadata.errors
    };
  }

  /**
   * Format for export
   */
  private static formatForExport(response: FormattedResponse): any {
    return {
      query: response.metadata.query,
      intent: response.metadata.intent,
      timestamp: response.metadata.timestamp,
      results: response.results,
      reasoning: response.reasoning,
      metrics: response.metrics,
      summary: response.summary
    };
  }

  /**
   * Calculate average confidence
   */
  private static calculateAverageConfidence(state: AgentState): number {
    const scores = state.confidenceScores || [];
    if (scores.length === 0) return 0;

    const sum = scores.reduce((total, score) => total + score.score, 0);
    return sum / scores.length;
  }

  /**
   * Create empty metrics
   */
  private static createEmptyMetrics(): ResponseMetrics {
    return {
      totalResults: 0,
      executionTime: 0,
      iterations: 0,
      toolsUsed: [],
      averageConfidence: 0,
      qualityScore: 0
    };
  }

  /**
   * Create fallback response
   */
  private static createFallbackResponse(
    state: AgentState,
    context: QueryContext,
    options: FormattingOptions,
    formattingTime: number
  ): FormattedResponse {
    return {
      success: false,
      results: state.currentResults || [],
      summary: 'Error occurred while formatting response',
      reasoning: [],
      metrics: this.createEmptyMetrics(),
      confidence: 0,
      suggestions: ['Try the search again', 'Contact support if the issue persists'],
      metadata: {
        query: context.originalQuery,
        intent: 'unknown',
        timestamp: new Date(),
        responseFormat: options.format,
        version: '1.0.0',
        warnings: ['Response formatting failed'],
        errors: ['Formatting error occurred']
      }
    };
  }

  /**
   * Update formatting metrics
   */
  private static updateMetrics(options: FormattingOptions, formattingTime: number): void {
    this.metrics.totalFormatted++;

    // Update average formatting time
    this.metrics.averageFormattingTime =
      (this.metrics.averageFormattingTime * (this.metrics.totalFormatted - 1) + formattingTime) /
      this.metrics.totalFormatted;

    // Update format usage
    this.metrics.formatUsage[options.format] = (this.metrics.formatUsage[options.format] || 0) + 1;

    // Update verbosity usage
    this.metrics.verbosityUsage[options.verbosity] = (this.metrics.verbosityUsage[options.verbosity] || 0) + 1;
  }

  /**
   * Get formatting metrics
   */
  static getMetrics(): FormattingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalFormatted: 0,
      averageFormattingTime: 0,
      formatUsage: {},
      verbosityUsage: {}
    };
  }
}

export default ResponseFormatter;
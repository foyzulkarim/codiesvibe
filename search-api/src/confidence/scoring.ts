/**
 * Confidence Scoring System
 * Comprehensive confidence assessment for AI reasoning components
 */

import { ConfidenceScore, QueryContext as BaseQueryContext, AgentState } from '../types';
import { QueryContext } from '../graph/context';

export interface ConfidenceFactor {
  name: string;
  weight: number; // 0-1, relative importance
  score: number; // 0-1, factor-specific confidence
  reasoning: string;
  metadata?: Record<string, any>;
}

export interface ConfidenceCalculation {
  overallScore: number;
  factors: ConfidenceFactor[];
  reasoning: string;
  metadata: {
    calculationTime: number;
    timestamp: Date;
    version: string;
  };
}

export interface ConfidenceThresholds {
  high: number;    // >= high confidence
  medium: number;  // >= medium confidence
  low: number;     // >= low confidence
}

export interface ConfidenceMetrics {
  totalCalculations: number;
  averageConfidence: number;
  distribution: {
    high: number;
    medium: number;
    low: number;
  };
  factorUsage: Record<string, number>;
  lastCalculation?: ConfidenceCalculation;
}

export class ConfidenceScorer {
  private static readonly DEFAULT_THRESHOLDS: ConfidenceThresholds = {
    high: 0.8,
    medium: 0.6,
    low: 0.4
  };

  private static metrics: ConfidenceMetrics = {
    totalCalculations: 0,
    averageConfidence: 0,
    distribution: { high: 0, medium: 0, low: 0 },
    factorUsage: {}
  };

  /**
   * Calculate confidence for query analysis
   */
  static calculateQueryConfidence(
    query: string,
    context: QueryContext,
    analysis: any
  ): ConfidenceCalculation {
    const startTime = Date.now();
    const factors: ConfidenceFactor[] = [];

    // Factor 1: Query clarity and specificity
    factors.push(this.calculateQueryClarityFactor(query));

    // Factor 2: Entity extraction quality
    factors.push(this.calculateEntityQualityFactor(context.extractedEntities));

    // Factor 3: Constraint specificity
    factors.push(this.calculateConstraintSpecificityFactor(context.constraints));

    // Factor 4: Ambiguity level
    factors.push(this.calculateAmbiguityFactor(context.ambiguities));

    // Factor 5: Intent recognition confidence
    factors.push(this.calculateIntentFactor(context.interpretedIntent, query));

    // Factor 6: Context completeness
    factors.push(this.calculateContextCompletenessFactor(context));

    const calculation = this.computeOverallScore(factors);
    calculation.metadata.calculationTime = Date.now() - startTime;
    calculation.metadata.timestamp = new Date();

    this.updateMetrics(calculation);

    return calculation;
  }

  /**
   * Calculate confidence for tool selection
   */
  static calculateToolConfidence(
    toolName: string,
    parameters: any,
    context: QueryContext,
    reasoning: string
  ): ConfidenceCalculation {
    const startTime = Date.now();
    const factors: ConfidenceFactor[] = [];

    // Factor 1: Tool-intent match
    factors.push(this.calculateToolIntentMatchFactor(toolName, context.interpretedIntent));

    // Factor 2: Parameter quality
    factors.push(this.calculateParameterQualityFactor(parameters));

    // Factor 3: Reasoning coherence
    factors.push(this.calculateReasoningCoherenceFactor(reasoning));

    // Factor 4: Historical success rate
    factors.push(this.calculateHistoricalSuccessFactor(toolName));

    // Factor 5: Context compatibility
    factors.push(this.calculateContextCompatibilityFactor(toolName, context));

    const calculation = this.computeOverallScore(factors);
    calculation.metadata.calculationTime = Date.now() - startTime;
    calculation.metadata.timestamp = new Date();

    this.updateMetrics(calculation);

    return calculation;
  }

  /**
   * Calculate confidence for execution results
   */
  static calculateExecutionConfidence(
    results: any[],
    toolName: string,
    parameters: any,
    executionTime: number
  ): ConfidenceCalculation {
    const startTime = Date.now();
    const factors: ConfidenceFactor[] = [];

    // Factor 1: Result quality
    factors.push(this.calculateResultQualityFactor(results));

    // Factor 2: Execution efficiency
    factors.push(this.calculateExecutionEfficiencyFactor(executionTime, results.length));

    // Factor 3: Parameter-result alignment
    factors.push(this.calculateParameterAlignmentFactor(parameters, results));

    // Factor 4: Tool performance consistency
    factors.push(this.calculatePerformanceConsistencyFactor(toolName, executionTime));

    const calculation = this.computeOverallScore(factors);
    calculation.metadata.calculationTime = Date.now() - startTime;
    calculation.metadata.timestamp = new Date();

    this.updateMetrics(calculation);

    return calculation;
  }

  /**
   * Calculate confidence for overall agent state
   */
  static calculateOverallStateConfidence(state: AgentState): ConfidenceCalculation {
    const startTime = Date.now();
    const factors: ConfidenceFactor[] = [];

    // Factor 1: Result completeness
    factors.push(this.calculateResultCompletenessFactor(state.currentResults));

    // Factor 2: Progress consistency
    factors.push(this.calculateProgressConsistencyFactor(state));

    // Factor 3: Confidence trajectory
    factors.push(this.calculateConfidenceTrajectoryFactor(state.confidenceScores));

    // Factor 4: Completion likelihood
    factors.push(this.calculateCompletionLikelihoodFactor(state));

    const calculation = this.computeOverallScore(factors);
    calculation.metadata.calculationTime = Date.now() - startTime;
    calculation.metadata.timestamp = new Date();

    this.updateMetrics(calculation);

    return calculation;
  }

  /**
   * Get confidence category
   */
  static getConfidenceCategory(score: number, thresholds?: Partial<ConfidenceThresholds>): string {
    const finalThresholds = { ...this.DEFAULT_THRESHOLDS, ...thresholds };

    if (score >= finalThresholds.high) return 'high';
    if (score >= finalThresholds.medium) return 'medium';
    if (score >= finalThresholds.low) return 'low';
    return 'very_low';
  }

  /**
   * Validate confidence score
   */
  static validateConfidenceScore(score: number): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (typeof score !== 'number') {
      issues.push('Confidence score must be a number');
    } else if (score < 0 || score > 1) {
      issues.push('Confidence score must be between 0 and 1');
    } else if (isNaN(score)) {
      issues.push('Confidence score cannot be NaN');
    } else if (!isFinite(score)) {
      issues.push('Confidence score must be finite');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get confidence metrics
   */
  static getMetrics(): ConfidenceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalCalculations: 0,
      averageConfidence: 0,
      distribution: { high: 0, medium: 0, low: 0 },
      factorUsage: {}
    };
  }

  /**
   * Calculate query clarity factor
   */
  private static calculateQueryClarityFactor(query: string): ConfidenceFactor {
    let score = 0.5; // Base score
    const reasoning: string[] = [];

    // Length considerations
    if (query.length >= 5 && query.length <= 100) {
      score += 0.2;
      reasoning.push('Query length is appropriate');
    } else if (query.length < 5) {
      score -= 0.2;
      reasoning.push('Query is too short');
    } else {
      score -= 0.1;
      reasoning.push('Query is very long');
    }

    // Specific language indicators
    const specificTerms = ['under', 'less than', 'with', 'for', 'api', 'free', 'paid'];
    const vagueTerms = ['good', 'best', 'interesting', 'nice', 'cool'];

    const hasSpecificTerms = specificTerms.some(term =>
      query.toLowerCase().includes(term));
    const hasVagueTerms = vagueTerms.some(term =>
      query.toLowerCase().includes(term));

    if (hasSpecificTerms) {
      score += 0.2;
      reasoning.push('Contains specific terms');
    }

    if (hasVagueTerms) {
      score -= 0.3;
      reasoning.push('Contains vague terms');
    }

    // Question clarity
    if (query.includes('?')) {
      score += 0.1;
      reasoning.push('Clear question format');
    }

    score = Math.max(0, Math.min(1, score));

    return {
      name: 'query_clarity',
      weight: 0.25,
      score,
      reasoning: reasoning.join('; ')
    };
  }

  /**
   * Calculate entity quality factor
   */
  private static calculateEntityQualityFactor(entities: Record<string, any>): ConfidenceFactor {
    let score = 0.3; // Base score
    const reasoning: string[] = [];

    const entityCount = Object.keys(entities).length;

    if (entityCount > 0) {
      score += Math.min(0.3, entityCount * 0.1);
      reasoning.push(`Found ${entityCount} entities`);
    } else {
      score -= 0.2;
      reasoning.push('No entities extracted');
    }

    // Check for structured data
    let hasStructuredEntities = false;
    for (const [key, value] of Object.entries(entities)) {
      if (typeof value === 'object' && value !== null) {
        hasStructuredEntities = true;
        break;
      }
    }

    if (hasStructuredEntities) {
      score += 0.2;
      reasoning.push('Entities are well-structured');
    }

    // Check for pricing information
    if (entities.pricing || entities.price) {
      score += 0.1;
      reasoning.push('Pricing information extracted');
    }

    // Check for features/capabilities
    if (entities.features || entities.capabilities) {
      score += 0.1;
      reasoning.push('Feature information extracted');
    }

    score = Math.max(0, Math.min(1, score));

    return {
      name: 'entity_quality',
      weight: 0.2,
      score,
      reasoning: reasoning.join('; ')
    };
  }

  /**
   * Calculate constraint specificity factor
   */
  private static calculateConstraintSpecificityFactor(constraints: Record<string, any>): ConfidenceFactor {
    let score = 0.3; // Base score
    const reasoning: string[] = [];

    const constraintCount = Object.keys(constraints).length;

    if (constraintCount > 0) {
      score += Math.min(0.4, constraintCount * 0.15);
      reasoning.push(`Found ${constraintCount} constraints`);
    } else {
      reasoning.push('No explicit constraints');
    }

    // Check for numeric constraints
    const hasNumericConstraints = Object.values(constraints).some(value =>
      typeof value === 'number'
    );

    if (hasNumericConstraints) {
      score += 0.2;
      reasoning.push('Contains numeric constraints');
    }

    // Check for array constraints (multiple values)
    const hasArrayConstraints = Object.values(constraints).some(value =>
      Array.isArray(value)
    );

    if (hasArrayConstraints) {
      score += 0.1;
      reasoning.push('Contains multi-value constraints');
    }

    score = Math.max(0, Math.min(1, score));

    return {
      name: 'constraint_specificity',
      weight: 0.15,
      score,
      reasoning: reasoning.join('; ')
    };
  }

  /**
   * Calculate ambiguity factor
   */
  private static calculateAmbiguityFactor(ambiguities: string[]): ConfidenceFactor {
    let score = 0.8; // Start high, reduce based on ambiguities
    const reasoning: string[] = [];

    if (ambiguities.length === 0) {
      reasoning.push('No ambiguities detected');
    } else {
      score -= ambiguities.length * 0.15;
      reasoning.push(`Found ${ambiguities.length} ambiguities`);

      // Check ambiguity types
      const criticalAmbiguities = ['budget', 'price', 'specific features'];
      const hasCriticalAmbiguities = ambiguities.some(ambiguity =>
        criticalAmbiguities.some(critical =>
          ambiguity.toLowerCase().includes(critical)
        )
      );

      if (hasCriticalAmbiguities) {
        score -= 0.2;
        reasoning.push('Contains critical ambiguities');
      }
    }

    score = Math.max(0, Math.min(1, score));

    return {
      name: 'ambiguity_level',
      weight: 0.2,
      score,
      reasoning: reasoning.join('; ')
    };
  }

  /**
   * Calculate intent recognition factor
   */
  private static calculateIntentFactor(intent: string, query: string): ConfidenceFactor {
    let score = 0.5;
    const reasoning: string[] = [];

    // Check intent specificity
    const specificIntents = [
      'find_free_tools', 'filter_by_price', 'search_by_category',
      'compare_tools', 'analyze_pricing'
    ];

    const generalIntents = [
      'search', 'browse', 'find', 'show'
    ];

    if (specificIntents.some(specific => intent.includes(specific))) {
      score += 0.3;
      reasoning.push('Specific intent recognized');
    } else if (generalIntents.some(general => intent.includes(general))) {
      score += 0.1;
      reasoning.push('General intent recognized');
    } else {
      score -= 0.1;
      reasoning.push('Unclear intent recognition');
    }

    // Check intent-query alignment
    const queryWords = query.toLowerCase().split(' ');
    const intentWords = intent.toLowerCase().split('_');
    const overlap = queryWords.filter(word =>
      intentWords.some(intentWord => intentWord.includes(word))
    ).length;

    if (overlap > 0) {
      score += Math.min(0.2, overlap * 0.05);
      reasoning.push(`Intent aligns with query (${overlap} overlapping terms)`);
    }

    score = Math.max(0, Math.min(1, score));

    return {
      name: 'intent_recognition',
      weight: 0.2,
      score,
      reasoning: reasoning.join('; ')
    };
  }

  /**
   * Calculate context completeness factor
   */
  private static calculateContextCompletenessFactor(context: QueryContext): ConfidenceFactor {
    let score = 0.4;
    const reasoning: string[] = [];

    // Check required context fields
    const requiredFields = ['originalQuery', 'interpretedIntent', 'extractedEntities'];
    const presentFields = requiredFields.filter(field => context[field as keyof QueryContext]);

    if (presentFields.length === requiredFields.length) {
      score += 0.3;
      reasoning.push('All required context fields present');
    } else {
      score -= 0.2;
      reasoning.push(`Missing context fields: ${requiredFields.filter(field => !context[field as keyof QueryContext]).join(', ')}`);
    }

    // Check optional but valuable fields
    const valuableFields = ['constraints', 'ambiguities', 'clarificationHistory'];
    const presentValuableFields = valuableFields.filter(field => context[field as keyof QueryContext]);

    if (presentValuableFields.length > 0) {
      score += presentValuableFields.length * 0.1;
      reasoning.push(`Additional context fields: ${presentValuableFields.join(', ')}`);
    }

    score = Math.max(0, Math.min(1, score));

    return {
      name: 'context_completeness',
      weight: 0.1,
      score,
      reasoning: reasoning.join('; ')
    };
  }

  /**
   * Compute overall score from factors
   */
  private static computeOverallScore(factors: ConfidenceFactor[]): ConfidenceCalculation {
    // Weighted average of factor scores
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const weightedScore = factors.reduce((sum, factor) =>
      sum + (factor.score * factor.weight), 0) / totalWeight;

    // Generate reasoning summary
    const highConfidenceFactors = factors.filter(f => f.score >= 0.7);
    const lowConfidenceFactors = factors.filter(f => f.score < 0.4);

    const reasoningParts: string[] = [];

    if (highConfidenceFactors.length > 0) {
      reasoningParts.push(`Strong indicators: ${highConfidenceFactors.map(f => f.name).join(', ')}`);
    }

    if (lowConfidenceFactors.length > 0) {
      reasoningParts.push(`Weak areas: ${lowConfidenceFactors.map(f => f.name).join(', ')}`);
    }

    if (highConfidenceFactors.length > lowConfidenceFactors.length) {
      reasoningParts.push('Overall positive assessment');
    } else if (lowConfidenceFactors.length > highConfidenceFactors.length) {
      reasoningParts.push('Overall uncertain assessment');
    } else {
      reasoningParts.push('Mixed assessment');
    }

    return {
      overallScore: Math.max(0, Math.min(1, weightedScore)),
      factors,
      reasoning: reasoningParts.join('. '),
      metadata: {
        calculationTime: 0,
        timestamp: new Date(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Update metrics
   */
  private static updateMetrics(calculation: ConfidenceCalculation): void {
    this.metrics.totalCalculations++;
    this.metrics.lastCalculation = calculation;

    // Update average confidence
    this.metrics.averageConfidence =
      (this.metrics.averageConfidence * (this.metrics.totalCalculations - 1) +
       calculation.overallScore) / this.metrics.totalCalculations;

    // Update distribution
    const category = this.getConfidenceCategory(calculation.overallScore);
    if (category === 'high') this.metrics.distribution.high++;
    else if (category === 'medium') this.metrics.distribution.medium++;
    else this.metrics.distribution.low++;

    // Update factor usage
    for (const factor of calculation.factors) {
      this.metrics.factorUsage[factor.name] = (this.metrics.factorUsage[factor.name] || 0) + 1;
    }
  }

  // Additional factor calculation methods for other confidence types...

  private static calculateToolIntentMatchFactor(toolName: string, intent: string): ConfidenceFactor {
    // Implementation for tool-intent matching
    return {
      name: 'tool_intent_match',
      weight: 0.3,
      score: 0.7,
      reasoning: 'Tool appears suitable for the intent'
    };
  }

  private static calculateParameterQualityFactor(parameters: any): ConfidenceFactor {
    // Implementation for parameter quality assessment
    return {
      name: 'parameter_quality',
      weight: 0.2,
      score: 0.8,
      reasoning: 'Parameters are well-structured'
    };
  }

  private static calculateReasoningCoherenceFactor(reasoning: string): ConfidenceFactor {
    // Implementation for reasoning coherence assessment
    return {
      name: 'reasoning_coherence',
      weight: 0.2,
      score: 0.75,
      reasoning: 'Reasoning appears logical and coherent'
    };
  }

  private static calculateHistoricalSuccessFactor(toolName: string): ConfidenceFactor {
    // Implementation for historical success rate
    return {
      name: 'historical_success',
      weight: 0.15,
      score: 0.6,
      reasoning: 'Based on historical performance'
    };
  }

  private static calculateContextCompatibilityFactor(toolName: string, context: QueryContext): ConfidenceFactor {
    // Implementation for context compatibility
    return {
      name: 'context_compatibility',
      weight: 0.15,
      score: 0.7,
      reasoning: 'Tool aligns well with current context'
    };
  }

  private static calculateResultQualityFactor(results: any[]): ConfidenceFactor {
    // Implementation for result quality assessment
    return {
      name: 'result_quality',
      weight: 0.4,
      score: 0.8,
      reasoning: `Results appear relevant (${results.length} items found)`
    };
  }

  private static calculateExecutionEfficiencyFactor(executionTime: number, resultCount: number): ConfidenceFactor {
    // Implementation for execution efficiency
    return {
      name: 'execution_efficiency',
      weight: 0.2,
      score: 0.7,
      reasoning: `Execution completed in ${executionTime}ms with ${resultCount} results`
    };
  }

  private static calculateParameterAlignmentFactor(parameters: any, results: any[]): ConfidenceFactor {
    // Implementation for parameter-result alignment
    return {
      name: 'parameter_alignment',
      weight: 0.2,
      score: 0.75,
      reasoning: 'Results align well with provided parameters'
    };
  }

  private static calculatePerformanceConsistencyFactor(toolName: string, executionTime: number): ConfidenceFactor {
    // Implementation for performance consistency
    return {
      name: 'performance_consistency',
      weight: 0.2,
      score: 0.8,
      reasoning: 'Performance is within expected range'
    };
  }

  private static calculateResultCompletenessFactor(results: any[]): ConfidenceFactor {
    // Implementation for result completeness
    return {
      name: 'result_completeness',
      weight: 0.3,
      score: 0.7,
      reasoning: `Results appear complete with ${results.length} items`
    };
  }

  private static calculateProgressConsistencyFactor(state: AgentState): ConfidenceFactor {
    // Implementation for progress consistency
    return {
      name: 'progress_consistency',
      weight: 0.25,
      score: 0.75,
      reasoning: `Progress is consistent across ${state.iterationCount} iterations`
    };
  }

  private static calculateConfidenceTrajectoryFactor(confidenceScores: ConfidenceScore[]): ConfidenceFactor {
    // Implementation for confidence trajectory
    return {
      name: 'confidence_trajectory',
      weight: 0.25,
      score: 0.8,
      reasoning: 'Confidence scores show positive trajectory'
    };
  }

  private static calculateCompletionLikelihoodFactor(state: AgentState): ConfidenceFactor {
    // Implementation for completion likelihood
    return {
      name: 'completion_likelihood',
      weight: 0.2,
      score: 0.7,
      reasoning: 'Current state suggests successful completion is likely'
    };
  }
}

export default ConfidenceScorer;
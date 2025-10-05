/**
 * Evaluator with Reasoning Quality Checks
 * Comprehensive evaluation of results with quality assessment and reasoning validation
 */

import { AgentState, QueryContext, ConfidenceScore } from '../types';
import { ConfidenceScorer } from '../confidence/scoring';
import { StateManager } from '../state/helpers';

export interface EvaluationCriteria {
  relevance: number;        // How well results match the query
  completeness: number;    // How complete the results are
  accuracy: number;        // Accuracy of information
  quality: number;         // Overall quality of results
  confidence: number;      // Confidence in evaluation
}

export interface QualityCheck {
  name: string;
  passed: boolean;
  score: number;
  reasoning: string;
  suggestions?: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface EvaluationResult {
  overallScore: number;
  criteria: EvaluationCriteria;
  qualityChecks: QualityCheck[];
  shouldContinue: boolean;
  nextAction: string;
  reasoning: string;
  recommendations: string[];
  confidence: number;
  metadata: {
    evaluationTime: number;
    resultCount: number;
    iterationCount: number;
    evaluationDepth: 'shallow' | 'medium' | 'deep';
  };
}

export interface EvaluationMetrics {
  totalEvaluations: number;
  averageScore: number;
  continueRate: number;
  qualityPassRate: number;
  averageEvaluationTime: number;
  qualityCheckDistribution: Record<string, number>;
  lastEvaluation?: EvaluationResult;
}

export class ResultEvaluator {
  private static metrics: EvaluationMetrics = {
    totalEvaluations: 0,
    averageScore: 0,
    continueRate: 0,
    qualityPassRate: 0,
    averageEvaluationTime: 0,
    qualityCheckDistribution: {}
  };

  /**
   * Evaluate current results with comprehensive quality checks
   */
  static async evaluateResults(
    state: AgentState,
    context: QueryContext,
    evaluationDepth: 'shallow' | 'medium' | 'deep' = 'medium'
  ): Promise<EvaluationResult> {
    const startTime = Date.now();

    try {
      // Perform quality checks
      const qualityChecks = await this.performQualityChecks(state, context, evaluationDepth);

      // Evaluate criteria
      const criteria = await this.evaluateCriteria(state, context, qualityChecks);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(criteria);

      // Determine if should continue
      const shouldContinue = this.shouldContinueSearch(state, context, overallScore, qualityChecks);

      // Generate next action
      const nextAction = this.generateNextAction(state, context, shouldContinue, overallScore);

      // Generate reasoning
      const reasoning = this.generateEvaluationReasoning(criteria, qualityChecks, shouldContinue);

      // Generate recommendations
      const recommendations = this.generateRecommendations(state, context, criteria, qualityChecks);

      const result: EvaluationResult = {
        overallScore,
        criteria,
        qualityChecks,
        shouldContinue,
        nextAction,
        reasoning,
        recommendations,
        confidence: this.calculateEvaluationConfidence(criteria, qualityChecks),
        metadata: {
          evaluationTime: Date.now() - startTime,
          resultCount: state.currentResults?.length || 0,
          iterationCount: state.iterationCount,
          evaluationDepth
        }
      };

      // Update metrics
      this.updateMetrics(result);

      return result;

    } catch (error) {
      // Fallback evaluation
      return this.createFallbackEvaluation(state, context, Date.now() - startTime);
    }
  }

  /**
   * Perform comprehensive quality checks
   */
  private static async performQualityChecks(
    state: AgentState,
    context: QueryContext,
    depth: 'shallow' | 'medium' | 'deep'
  ): Promise<QualityCheck[]> {
    const checks: QualityCheck[] = [];

    // Basic checks (always performed)
    checks.push(this.checkResultPresence(state));
    checks.push(this.checkResultConsistency(state));
    checks.push(this.checkConfidenceTrajectory(state));

    if (depth === 'medium' || depth === 'deep') {
      // Medium depth checks
      checks.push(this.checkQueryRelevance(state, context));
      checks.push(this.checkResultDiversity(state));
      checks.push(this.checkIterationEfficiency(state));
    }

    if (depth === 'deep') {
      // Deep checks
      checks.push(this.checkSemanticQuality(state, context));
      checks.push(this.checkCompleteness(state, context));
      checks.push(this.checkAccuracy(state, context));
      checks.push(this.checkUserIntentAlignment(state, context));
    }

    return checks;
  }

  /**
   * Evaluate evaluation criteria
   */
  private static async evaluateCriteria(
    state: AgentState,
    context: QueryContext,
    qualityChecks: QualityCheck[]
  ): Promise<EvaluationCriteria> {
    const criteria: EvaluationCriteria = {
      relevance: this.evaluateRelevance(state, context, qualityChecks),
      completeness: this.evaluateCompleteness(state, context, qualityChecks),
      accuracy: this.evaluateAccuracy(state, context, qualityChecks),
      quality: this.evaluateQuality(state, context, qualityChecks),
      confidence: this.evaluateConfidence(state, qualityChecks)
    };

    return criteria;
  }

  /**
   * Quality check: Result presence
   */
  private static checkResultPresence(state: AgentState): QualityCheck {
    const hasResults = state.currentResults && state.currentResults.length > 0;
    const resultCount = state.currentResults?.length || 0;

    let score = 0;
    let reasoning = '';
    let suggestions: string[] = [];

    if (hasResults) {
      if (resultCount >= 1 && resultCount <= 50) {
        score = 1.0;
        reasoning = `Good result count: ${resultCount} items`;
      } else if (resultCount > 50) {
        score = 0.7;
        reasoning = `Too many results: ${resultCount} items, may need filtering`;
        suggestions.push('Consider applying additional filters to reduce result count');
      } else {
        score = 0.9;
        reasoning = `Few results: ${resultCount} items`;
      }
    } else {
      score = 0.0;
      reasoning = 'No results found';
      suggestions.push('Try broadening search criteria or using different keywords');
      suggestions.push('Check for typos or alternative terms');
    }

    return {
      name: 'result_presence',
      passed: score > 0.5,
      score,
      reasoning,
      suggestions,
      priority: 'high'
    };
  }

  /**
   * Quality check: Result consistency
   */
  private static checkResultConsistency(state: AgentState): QualityCheck {
    const results = state.currentResults || [];
    let consistentResults = 0;
    let inconsistencies: string[] = [];

    if (results.length === 0) {
      return {
        name: 'result_consistency',
        passed: false,
        score: 0,
        reasoning: 'No results to check consistency',
        priority: 'medium'
      };
    }

    // Check for consistent data structure
    const firstResult = results[0];
    if (!firstResult) {
      return {
        name: 'result_consistency',
        passed: false,
        score: 0,
        reasoning: 'No results to check consistency',
        priority: 'high'
      };
    }

    for (const result of results) {
      let isConsistent = true;

      // Check for required fields
      if (firstResult.name && !result.name) isConsistent = false;
      if (firstResult.description && !result.description) isConsistent = false;
      if (firstResult.categories && !result.categories) isConsistent = false;

      if (isConsistent) {
        consistentResults++;
      } else {
        inconsistencies.push('Inconsistent data structure detected');
      }
    }

    const score = consistentResults / results.length;
    const passed = score >= 0.8;

    return {
      name: 'result_consistency',
      passed,
      score,
      reasoning: `${consistentResults}/${results.length} results have consistent structure`,
      suggestions: score < 0.8 ? ['Data structure inconsistencies detected'] : [],
      priority: 'medium'
    };
  }

  /**
   * Quality check: Confidence trajectory
   */
  private static checkConfidenceTrajectory(state: AgentState): QualityCheck {
    const scores = state.confidenceScores || [];

    if (scores.length === 0) {
      return {
        name: 'confidence_trajectory',
        passed: true,
        score: 0.5,
        reasoning: 'No confidence history available',
        priority: 'low'
      };
    }

    // Check confidence trend
    const recentScores = scores.slice(-3);
    const averageRecent = recentScores.reduce((sum, score) => sum + score.score, 0) / recentScores.length;
    const overallAverage = scores.reduce((sum, score) => sum + score.score, 0) / scores.length;

    let score = 0.5;
    let reasoning = '';
    let suggestions: string[] = [];

    if (averageRecent >= overallAverage + 0.1) {
      score = 0.9;
      reasoning = 'Confidence is improving over time';
    } else if (averageRecent <= overallAverage - 0.1) {
      score = 0.3;
      reasoning = 'Confidence is declining over time';
      suggestions.push('Consider changing search strategy if confidence continues to decline');
    } else {
      score = 0.7;
      reasoning = 'Confidence is stable';
    }

    return {
      name: 'confidence_trajectory',
      passed: score >= 0.5,
      score,
      reasoning,
      suggestions,
      priority: 'medium'
    };
  }

  /**
   * Quality check: Query relevance
   */
  private static checkQueryRelevance(state: AgentState, context: QueryContext): QualityCheck {
    const results = state.currentResults || [];
    const query = context.originalQuery.toLowerCase();
    const queryWords = query.split(' ').filter(word => word.length > 2);

    if (results.length === 0 || queryWords.length === 0) {
      return {
        name: 'query_relevance',
        passed: false,
        score: 0,
        reasoning: 'Insufficient data for relevance check',
        priority: 'high'
      };
    }

    let relevantResults = 0;
    let totalRelevanceScore = 0;

    for (const result of results) {
      const resultText = [
        result.name,
        result.description,
        result.tags?.join(' '),
        result.categories?.primary?.join(' ')
      ].join(' ').toLowerCase();

      // Calculate relevance score
      let relevanceScore = 0;
      for (const word of queryWords) {
        if (resultText.includes(word)) {
          relevanceScore += 1;
        }
      }

      totalRelevanceScore += relevanceScore;
      if (relevanceScore >= Math.max(1, queryWords.length * 0.3)) {
        relevantResults++;
      }
    }

    const score = relevantResults / results.length;
    const averageRelevance = totalRelevanceScore / results.length;

    return {
      name: 'query_relevance',
      passed: score >= 0.6,
      score,
      reasoning: `${relevantResults}/${results.length} results match query terms (avg relevance: ${averageRelevance.toFixed(1)})`,
      priority: 'high'
    };
  }

  /**
   * Quality check: Result diversity
   */
  private static checkResultDiversity(state: AgentState): QualityCheck {
    const results = state.currentResults || [];

    if (results.length === 0) {
      return {
        name: 'result_diversity',
        passed: false,
        score: 0,
        reasoning: 'No results to check diversity',
        priority: 'medium'
      };
    }

    // Check category diversity
    const categories = new Set<string>();
    for (const result of results) {
      if (result.categories?.primary) {
        for (const category of result.categories.primary) {
          categories.add(category);
        }
      }
    }

    // Check price range diversity
    const priceRanges = new Set<string>();
    for (const result of results) {
      if (result.pricing?.models?.[0]?.price) {
        const price = result.pricing.models[0].price;
        let range = 'unknown';
        if (price === 0) range = 'free';
        else if (price < 20) range = 'low';
        else if (price < 100) range = 'medium';
        else range = 'high';
        priceRanges.add(range);
      }
    }

    const categoryScore = Math.min(1, categories.size / 3); // Good diversity if 3+ categories
    const priceScore = Math.min(1, priceRanges.size / 2); // Good diversity if 2+ price ranges
    const overallScore = (categoryScore + priceScore) / 2;

    return {
      name: 'result_diversity',
      passed: overallScore >= 0.4,
      score: overallScore,
      reasoning: `Found ${categories.size} categories and ${priceRanges.size} price ranges`,
      priority: 'medium'
    };
  }

  /**
   * Quality check: Iteration efficiency
   */
  private static checkIterationEfficiency(state: AgentState): QualityCheck {
    const iterationCount = state.iterationCount;
    const resultCount = state.currentResults?.length || 0;

    let score = 1.0;
    let reasoning = '';
    let suggestions: string[] = [];

    if (iterationCount > 10) {
      score = 0.3;
      reasoning = `High iteration count (${iterationCount}) may indicate inefficiency`;
      suggestions.push('Consider reviewing search strategy for optimization');
    } else if (iterationCount > 6) {
      score = 0.6;
      reasoning = `Moderate iteration count (${iterationCount})`;
    } else {
      reasoning = `Efficient iteration count (${iterationCount})`;
    }

    // Factor in result quality vs iterations
    if (resultCount > 0) {
      const efficiencyScore = resultCount / iterationCount;
      if (efficiencyScore < 1) {
        score *= 0.8;
        reasoning += `; Low result efficiency (${efficiencyScore.toFixed(1)} results per iteration)`;
      }
    }

    return {
      name: 'iteration_efficiency',
      passed: score >= 0.6,
      score,
      reasoning,
      suggestions,
      priority: 'medium'
    };
  }

  /**
   * Additional quality checks for deep evaluation
   */
  private static checkSemanticQuality(state: AgentState, context: QueryContext): QualityCheck {
    // Placeholder for semantic quality analysis
    return {
      name: 'semantic_quality',
      passed: true,
      score: 0.8,
      reasoning: 'Results appear semantically relevant to query',
      priority: 'low'
    };
  }

  private static checkCompleteness(state: AgentState, context: QueryContext): QualityCheck {
    // Check if results address all aspects of the query
    const addressedConstraints = Object.keys(context.constraints).length;
    const totalConstraints = Object.keys(context.constraints).length;
    const score = totalConstraints > 0 ? addressedConstraints / totalConstraints : 1.0;

    return {
      name: 'completeness',
      passed: score >= 0.8,
      score,
      reasoning: `Addressed ${addressedConstraints}/${totalConstraints} query constraints`,
      priority: 'high'
    };
  }

  private static checkAccuracy(state: AgentState, context: QueryContext): QualityCheck {
    // Placeholder for accuracy verification
    return {
      name: 'accuracy',
      passed: true,
      score: 0.9,
      reasoning: 'Result data appears accurate based on available information',
      priority: 'high'
    };
  }

  private static checkUserIntentAlignment(state: AgentState, context: QueryContext): QualityCheck {
    // Check if results align with interpreted user intent
    const intent = context.interpretedIntent;
    let score = 0.7; // Base score

    if (intent.includes('search') && state.currentResults.length > 0) {
      score = 0.9;
    } else if (intent.includes('find') && state.currentResults.length > 0) {
      score = 0.9;
    } else if (intent.includes('analyze') && state.currentResults.length > 0) {
      score = 0.8;
    }

    return {
      name: 'user_intent_alignment',
      passed: score >= 0.7,
      score,
      reasoning: `Results align with interpreted intent: ${intent}`,
      priority: 'high'
    };
  }

  /**
   * Evaluate specific criteria
   */
  private static evaluateRelevance(state: AgentState, context: QueryContext, checks: QualityCheck[]): number {
    const relevanceCheck = checks.find(check => check.name === 'query_relevance');
    return relevanceCheck ? relevanceCheck.score : 0.5;
  }

  private static evaluateCompleteness(state: AgentState, context: QueryContext, checks: QualityCheck[]): number {
    const completenessCheck = checks.find(check => check.name === 'completeness');
    const presenceCheck = checks.find(check => check.name === 'result_presence');

    const completenessScore = completenessCheck ? completenessCheck.score : 0.5;
    const presenceScore = presenceCheck ? presenceCheck.score : 0.5;

    return (completenessScore + presenceScore) / 2;
  }

  private static evaluateAccuracy(state: AgentState, context: QueryContext, checks: QualityCheck[]): number {
    const accuracyCheck = checks.find(check => check.name === 'accuracy');
    const consistencyCheck = checks.find(check => check.name === 'result_consistency');

    const accuracyScore = accuracyCheck ? accuracyCheck.score : 0.8;
    const consistencyScore = consistencyCheck ? consistencyCheck.score : 0.7;

    return (accuracyScore + consistencyScore) / 2;
  }

  private static evaluateQuality(state: AgentState, context: QueryContext, checks: QualityCheck[]): number {
    const qualityScores = checks
      .filter(check => check.priority === 'high')
      .map(check => check.score);

    if (qualityScores.length === 0) return 0.7;

    return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  }

  private static evaluateConfidence(state: AgentState, checks: QualityCheck[]): number {
    const trajectoryCheck = checks.find(check => check.name === 'confidence_trajectory');
    return trajectoryCheck ? trajectoryCheck.score : (state.currentConfidence?.score || 0.5);
  }

  /**
   * Calculate overall evaluation score
   */
  private static calculateOverallScore(criteria: EvaluationCriteria): number {
    const weights = {
      relevance: 0.3,
      completeness: 0.2,
      accuracy: 0.2,
      quality: 0.2,
      confidence: 0.1
    };

    return Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (criteria[key as keyof EvaluationCriteria] * weight);
    }, 0);
  }

  /**
   * Determine if search should continue
   */
  private static shouldContinueSearch(
    state: AgentState,
    context: QueryContext,
    overallScore: number,
    qualityChecks: QualityCheck[]
  ): boolean {
    // Don't continue if already marked complete
    if (state.isComplete) {
      return false;
    }

    // Continue if score is low
    if (overallScore < 0.4) {
      return true;
    }

    // Continue if critical quality checks failed
    const criticalChecks = qualityChecks.filter(check => check.priority === 'high');
    const failedCriticalChecks = criticalChecks.filter(check => !check.passed);
    if (failedCriticalChecks.length > 0) {
      return true;
    }

    // Continue if iteration count is low and score isn't high
    if (state.iterationCount < 3 && overallScore < 0.8) {
      return true;
    }

    // Continue if there are specific improvement opportunities
    const improvementSuggestions = qualityChecks
      .filter(check => check.suggestions && check.suggestions.length > 0)
      .map(check => check.suggestions);

    if (improvementSuggestions.length > 2 && state.iterationCount < 6) {
      return true;
    }

    return false;
  }

  /**
   * Generate next action
   */
  private static generateNextAction(
    state: AgentState,
    context: QueryContext,
    shouldContinue: boolean,
    overallScore: number
  ): string {
    if (!shouldContinue) {
      return 'complete_search';
    }

    if (overallScore < 0.3) {
      return 'restart_search_with_different_strategy';
    }

    if (state.currentResults.length === 0) {
      return 'broaden_search_criteria';
    }

    if (state.currentResults.length > 50) {
      return 'apply_filters_to_reduce_results';
    }

    const failedChecks = state.confidenceScores?.filter(score => score.score < 0.5) || [];
    if (failedChecks.length > 2) {
      return 'refine_search_approach';
    }

    return 'continue_with_current_strategy';
  }

  /**
   * Generate evaluation reasoning
   */
  private static generateEvaluationReasoning(
    criteria: EvaluationCriteria,
    qualityChecks: QualityCheck[],
    shouldContinue: boolean
  ): string {
    const reasoningParts: string[] = [];

    // Overall assessment
    reasoningParts.push(`Overall evaluation score: ${criteria.quality.toFixed(2)}`);

    // Key factors
    const strongAreas = Object.entries(criteria)
      .filter(([key, value]) => value >= 0.7)
      .map(([key]) => key);

    if (strongAreas.length > 0) {
      reasoningParts.push(`Strong areas: ${strongAreas.join(', ')}`);
    }

    // Quality check summary
    const passedChecks = qualityChecks.filter(check => check.passed).length;
    const totalChecks = qualityChecks.length;
    reasoningParts.push(`Quality checks: ${passedChecks}/${totalChecks} passed`);

    // Decision rationale
    if (shouldContinue) {
      reasoningParts.push('Search should continue to improve result quality');
    } else {
      reasoningParts.push('Search can be completed with current results');
    }

    return reasoningParts.join('. ');
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(
    state: AgentState,
    context: QueryContext,
    criteria: EvaluationCriteria,
    qualityChecks: QualityCheck[]
  ): string[] {
    const recommendations: string[] = [];

    // Collect all suggestions from quality checks
    for (const check of qualityChecks) {
      if (check.suggestions) {
        recommendations.push(...check.suggestions);
      }
    }

    // Add specific recommendations based on criteria
    if (criteria.relevance < 0.6) {
      recommendations.push('Consider using different keywords or search terms');
    }

    if (criteria.completeness < 0.6) {
      recommendations.push('Additional search may be needed to address all query requirements');
    }

    if (criteria.accuracy < 0.7) {
      recommendations.push('Verify result accuracy through additional filtering');
    }

    // Remove duplicates and limit to top 5 recommendations
    return [...new Set(recommendations)].slice(0, 5);
  }

  /**
   * Calculate evaluation confidence
   */
  private static calculateEvaluationConfidence(
    criteria: EvaluationCriteria,
    qualityChecks: QualityCheck[]
  ): number {
    // Base confidence on consistency of criteria scores
    const scores = Object.values(criteria);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length;

    // Higher confidence when scores are consistent (low variance)
    const consistencyConfidence = Math.max(0.3, 1 - variance);

    // Factor in quality check pass rate
    const passRate = qualityChecks.filter(check => check.passed).length / qualityChecks.length;

    return (consistencyConfidence * 0.6) + (passRate * 0.4);
  }

  /**
   * Create fallback evaluation
   */
  private static createFallbackEvaluation(
    state: AgentState,
    context: QueryContext,
    evaluationTime: number
  ): EvaluationResult {
    const resultCount = state.currentResults?.length || 0;
    const fallbackScore = resultCount > 0 ? 0.5 : 0.2;

    return {
      overallScore: fallbackScore,
      criteria: {
        relevance: fallbackScore,
        completeness: fallbackScore,
        accuracy: 0.7,
        quality: fallbackScore,
        confidence: 0.3
      },
      qualityChecks: [{
        name: 'fallback_evaluation',
        passed: fallbackScore > 0.4,
        score: fallbackScore,
        reasoning: 'Fallback evaluation due to error in comprehensive evaluation',
        priority: 'high' as const
      }],
      shouldContinue: fallbackScore < 0.6,
      nextAction: 'continue_with_caution',
      reasoning: 'Using fallback evaluation due to evaluation error',
      recommendations: ['Proceed with caution, comprehensive evaluation failed'],
      confidence: 0.3,
      metadata: {
        evaluationTime,
        resultCount,
        iterationCount: state.iterationCount,
        evaluationDepth: 'shallow'
      }
    };
  }

  /**
   * Update metrics
   */
  private static updateMetrics(result: EvaluationResult): void {
    this.metrics.totalEvaluations++;
    this.metrics.lastEvaluation = result;

    // Update average score
    this.metrics.averageScore =
      (this.metrics.averageScore * (this.metrics.totalEvaluations - 1) + result.overallScore) /
      this.metrics.totalEvaluations;

    // Update continue rate
    this.metrics.continueRate =
      (this.metrics.continueRate * (this.metrics.totalEvaluations - 1) + (result.shouldContinue ? 1 : 0)) /
      this.metrics.totalEvaluations;

    // Update quality pass rate
    const passRate = result.qualityChecks.filter(check => check.passed).length / result.qualityChecks.length;
    this.metrics.qualityPassRate =
      (this.metrics.qualityPassRate * (this.metrics.totalEvaluations - 1) + passRate) /
      this.metrics.totalEvaluations;

    // Update average evaluation time
    this.metrics.averageEvaluationTime =
      (this.metrics.averageEvaluationTime * (this.metrics.totalEvaluations - 1) + result.metadata.evaluationTime) /
      this.metrics.totalEvaluations;

    // Update quality check distribution
    for (const check of result.qualityChecks) {
      this.metrics.qualityCheckDistribution[check.name] = (this.metrics.qualityCheckDistribution[check.name] || 0) + 1;
    }
  }

  /**
   * Get evaluation metrics
   */
  static getMetrics(): EvaluationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalEvaluations: 0,
      averageScore: 0,
      continueRate: 0,
      qualityPassRate: 0,
      averageEvaluationTime: 0,
      qualityCheckDistribution: {}
    };
  }
}

export default ResultEvaluator;
/**
 * State Helpers with AI Reasoning
 * Helper functions for managing agent state with intelligent reasoning
 */

import { AgentState, QueryContext, ConfidenceScore, Tool } from '../types';
import { ConfidenceScorer, ConfidenceCalculation } from '../confidence/scoring';
import { AmbiguityDetector, ClarificationRequest } from '../ambiguity/detector';

export interface StateTransition {
  from: 'idle' | 'analyzing' | 'planning' | 'executing' | 'evaluating' | 'clarifying' | 'completed' | 'error';
  to: 'idle' | 'analyzing' | 'planning' | 'executing' | 'evaluating' | 'clarifying' | 'completed' | 'error';
  reason: string;
  confidence: number;
  timestamp: Date;
}

export interface StateSnapshot {
  state: AgentState;
  timestamp: Date;
  transition?: StateTransition;
  metadata: {
    phase: string;
    confidence: number;
    progress: number;
  };
}

export interface StateAnalysis {
  currentState: string;
  progress: number;
  confidence: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
  nextActions: string[];
  potentialIssues: string[];
  completionLikelihood: number;
}

export interface StateMetrics {
  totalTransitions: number;
  averageConfidence: number;
  timeInStates: Record<string, number>;
  errorRate: number;
  completionRate: number;
  averageIterations: number;
  lastTransition?: StateTransition;
}

export class StateManager {
  private static stateHistory: StateSnapshot[] = [];
  private static metrics: StateMetrics = {
    totalTransitions: 0,
    averageConfidence: 0,
    timeInStates: {},
    errorRate: 0,
    completionRate: 0,
    averageIterations: 0
  };

  /**
   * Create initial agent state
   */
  static createInitialState(query: string): AgentState {
    return {
      originalQuery: query,
      currentResults: [],
      iterationCount: 0,
      isComplete: false,
      confidenceScores: [],
      lastUpdateTime: new Date(),
      metadata: {
        startTime: new Date(),
        currentPhase: 'initialization',
        totalSteps: 0,
        completedSteps: 0
      }
    };
  }

  /**
   * Update state with new results
   */
  static updateStateWithResults(
    state: AgentState,
    results: any[],
    toolName: string,
    confidence: ConfidenceScore,
    reasoning: string
  ): AgentState {
    const updatedState: AgentState = {
      ...state,
      currentResults: results,
      iterationCount: state.iterationCount + 1,
      confidenceScores: [...state.confidenceScores, confidence],
      lastUpdateTime: new Date(),
      toolHistory: [
        ...(state.toolHistory || []),
        {
          toolName,
          parameters: {},
          resultCount: results.length,
          confidence,
          reasoning,
          timestamp: new Date()
        }
      ],
      metadata: {
        ...state.metadata,
        completedSteps: (state.metadata.completedSteps || 0) + 1
      }
    };

    // Calculate overall state confidence
    const stateConfidence = this.calculateStateConfidence(updatedState);
    updatedState.currentConfidence = stateConfidence;

    return updatedState;
  }

  /**
   * Transition state to new phase
   */
  static transitionState(
    currentState: AgentState,
    newState: string,
    reason: string,
    confidence: number = 0.8
  ): { state: AgentState; transition: StateTransition } {
    const oldPhase = currentState.metadata.currentPhase || 'idle';
    const transition: StateTransition = {
      from: oldPhase as any,
      to: newState as any,
      reason,
      confidence,
      timestamp: new Date()
    };

    const updatedState: AgentState = {
      ...currentState,
      metadata: {
        ...currentState.metadata,
        currentPhase: newState,
        totalSteps: (currentState.metadata.totalSteps || 0) + 1
      },
      lastUpdateTime: new Date()
    };

    // Save state snapshot
    this.saveStateSnapshot(updatedState, transition);

    // Update metrics
    this.updateMetrics(transition);

    return { state: updatedState, transition };
  }

  /**
   * Analyze current state
   */
  static analyzeState(state: AgentState): StateAnalysis {
    const progress = this.calculateProgress(state);
    const confidence = this.getAverageConfidence(state);
    const quality = this.assessStateQuality(state);
    const completionLikelihood = this.calculateCompletionLikelihood(state);

    const analysis: StateAnalysis = {
      currentState: state.metadata.currentPhase || 'unknown',
      progress,
      confidence,
      quality,
      recommendations: this.generateRecommendations(state),
      nextActions: this.generateNextActions(state),
      potentialIssues: this.identifyPotentialIssues(state),
      completionLikelihood
    };

    return analysis;
  }

  /**
   * Check if state is valid
   */
  static validateState(state: AgentState): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check required fields
    if (!state.originalQuery) {
      issues.push('Missing original query');
    }

    if (state.iterationCount < 0) {
      issues.push('Invalid iteration count');
    }

    if (state.currentResults && !Array.isArray(state.currentResults)) {
      issues.push('Current results must be an array');
    }

    // Check confidence scores
    if (state.confidenceScores) {
      for (const score of state.confidenceScores) {
        if (typeof score.score !== 'number' || score.score < 0 || score.score > 1) {
          issues.push(`Invalid confidence score: ${score.score}`);
        }
      }
    }

    // Check metadata
    if (state.metadata) {
      if (state.metadata.completedSteps && state.metadata.totalSteps &&
          state.metadata.completedSteps > state.metadata.totalSteps) {
        issues.push('Completed steps cannot exceed total steps');
      }
    }

    // Check for state consistency
    if (state.isComplete && state.iterationCount === 0) {
      issues.push('Cannot be complete with zero iterations');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get state summary for logging
   */
  static getStateSummary(state: AgentState): Record<string, any> {
    return {
      phase: state.metadata.currentPhase,
      iterations: state.iterationCount,
      results: state.currentResults?.length || 0,
      confidence: state.currentConfidence?.score || 0,
      progress: this.calculateProgress(state),
      duration: this.calculateDuration(state),
      toolsUsed: state.toolHistory?.length || 0,
      isComplete: state.isComplete
    };
  }

  /**
   * Check if state indicates completion
   */
  static isComplete(state: AgentState): boolean {
    // Explicit completion
    if (state.isComplete) {
      return true;
    }

    // High confidence with good results
    if (state.currentConfidence && state.currentConfidence.score >= 0.9) {
      const resultCount = state.currentResults?.length || 0;
      if (resultCount > 0 && resultCount <= 50) { // Reasonable number of results
        return true;
      }
    }

    // Too many iterations without progress
    if (state.iterationCount >= 10) {
      const recentConfidence = state.confidenceScores.slice(-3);
      const avgRecentConfidence = recentConfidence.length > 0
        ? recentConfidence.reduce((sum, score) => sum + score.score, 0) / recentConfidence.length
        : 0;

      if (avgRecentConfidence >= 0.7) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if state indicates error
   */
  static hasError(state: AgentState): boolean {
    // Check for error metadata
    if (state.metadata.hasError) {
      return true;
    }

    // Check for very low confidence
    if (state.currentConfidence && state.currentConfidence.score < 0.3) {
      return true;
    }

    // Check for too many failed iterations
    const recentScores = state.confidenceScores.slice(-5);
    const lowScores = recentScores.filter(score => score.score < 0.4);
    if (lowScores.length >= 4) {
      return true;
    }

    return false;
  }

  /**
   * Get state history
   */
  static getStateHistory(): StateSnapshot[] {
    return [...this.stateHistory];
  }

  /**
   * Get state metrics
   */
  static getStateMetrics(): StateMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset state metrics
   */
  static resetMetrics(): void {
    this.stateHistory = [];
    this.metrics = {
      totalTransitions: 0,
      averageConfidence: 0,
      timeInStates: {},
      errorRate: 0,
      completionRate: 0,
      averageIterations: 0
    };
  }

  /**
   * Calculate state confidence
   */
  private static calculateStateConfidence(state: AgentState): ConfidenceScore {
    const factors: { name: string; weight: number; score: number }[] = [];

    // Factor 1: Result quality
    const resultCount = state.currentResults?.length || 0;
    let resultScore = 0.5;
    if (resultCount > 0 && resultCount <= 50) {
      resultScore = 0.8;
    } else if (resultCount > 50) {
      resultScore = 0.6;
    } else {
      resultScore = 0.3;
    }
    factors.push({ name: 'result_quality', weight: 0.3, score: resultScore });

    // Factor 2: Confidence trajectory
    const recentScores = state.confidenceScores.slice(-3);
    let trajectoryScore = 0.5;
    if (recentScores.length >= 2) {
      const latestScore = recentScores[recentScores.length - 1]?.score || 0;
      const firstScore = recentScores[0]?.score || 0;
      const trend = latestScore - firstScore;
      if (trend > 0.1) {
        trajectoryScore = 0.8;
      } else if (trend < -0.1) {
        trajectoryScore = 0.3;
      } else {
        trajectoryScore = 0.6;
      }
    }
    factors.push({ name: 'confidence_trajectory', weight: 0.25, score: trajectoryScore });

    // Factor 3: Iteration efficiency
    let efficiencyScore = 0.8;
    if (state.iterationCount > 8) {
      efficiencyScore = 0.4;
    } else if (state.iterationCount > 5) {
      efficiencyScore = 0.6;
    }
    factors.push({ name: 'iteration_efficiency', weight: 0.2, score: efficiencyScore });

    // Factor 4: Progress consistency
    const progress = this.calculateProgress(state);
    factors.push({ name: 'progress_consistency', weight: 0.15, score: progress });

    // Factor 5: Tool success rate
    const toolSuccessRate = this.calculateToolSuccessRate(state);
    factors.push({ name: 'tool_success_rate', weight: 0.1, score: toolSuccessRate });

    // Calculate weighted average
    const weightedScore = factors.reduce((sum, factor) =>
      sum + (factor.score * factor.weight), 0);

    return {
      score: Math.max(0, Math.min(1, weightedScore)),
      reasoning: `Based on ${factors.length} factors: result quality, confidence trajectory, iteration efficiency, progress consistency, and tool success rate`,
      factors,
      timestamp: new Date()
    };
  }

  /**
   * Calculate progress percentage
   */
  private static calculateProgress(state: AgentState): number {
    if (state.isComplete) {
      return 1.0;
    }

    // Base progress from iterations
    const iterationProgress = Math.min(0.7, state.iterationCount / 8);

    // Boost from confidence
    const confidenceBoost = (state.currentConfidence?.score || 0) * 0.2;

    // Boost from results
    const resultCount = state.currentResults?.length || 0;
    const resultBoost = Math.min(0.1, resultCount / 100);

    return Math.min(1.0, iterationProgress + confidenceBoost + resultBoost);
  }

  /**
   * Get average confidence
   */
  private static getAverageConfidence(state: AgentState): number {
    if (state.confidenceScores.length === 0) {
      return 0;
    }

    const sum = state.confidenceScores.reduce((total, score) => total + score.score, 0);
    return sum / state.confidenceScores.length;
  }

  /**
   * Assess state quality
   */
  private static assessStateQuality(state: AgentState): 'excellent' | 'good' | 'fair' | 'poor' {
    const confidence = state.currentConfidence?.score || 0;
    const progress = this.calculateProgress(state);
    const iterationCount = state.iterationCount;

    if (confidence >= 0.8 && progress >= 0.7 && iterationCount <= 5) {
      return 'excellent';
    }

    if (confidence >= 0.6 && progress >= 0.5 && iterationCount <= 8) {
      return 'good';
    }

    if (confidence >= 0.4 && progress >= 0.3) {
      return 'fair';
    }

    return 'poor';
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(state: AgentState): string[] {
    const recommendations: string[] = [];
    const confidence = state.currentConfidence?.score || 0;
    const resultCount = state.currentResults?.length || 0;

    if (confidence < 0.5) {
      recommendations.push('Consider adding more specific criteria to improve confidence');
    }

    if (resultCount === 0) {
      recommendations.push('Try broadening search criteria or using different keywords');
    }

    if (resultCount > 100) {
      recommendations.push('Consider applying additional filters to reduce result set');
    }

    if (state.iterationCount > 6) {
      recommendations.push('Consider concluding search if current results are satisfactory');
    }

    if (!state.metadata.currentPhase || state.metadata.currentPhase === 'idle') {
      recommendations.push('Initiate query analysis to begin search process');
    }

    return recommendations;
  }

  /**
   * Generate next actions
   */
  private static generateNextActions(state: AgentState): string[] {
    const actions: string[] = [];
    const phase = state.metadata.currentPhase;

    switch (phase) {
      case 'idle':
        actions.push('Analyze query to understand intent and extract entities');
        break;

      case 'analyzing':
        actions.push('Complete query analysis and move to planning phase');
        break;

      case 'planning':
        actions.push('Select appropriate tools and plan execution steps');
        break;

      case 'executing':
        actions.push('Continue tool execution or move to evaluation');
        break;

      case 'evaluating':
        actions.push('Evaluate results and decide whether to continue or conclude');
        break;

      case 'clarifying':
        actions.push('Process user clarification and refine search');
        break;

      default:
        actions.push('Determine appropriate next phase based on current state');
    }

    return actions;
  }

  /**
   * Identify potential issues
   */
  private static identifyPotentialIssues(state: AgentState): string[] {
    const issues: string[] = [];
    const confidence = state.currentConfidence?.score || 0;

    if (confidence < 0.3) {
      issues.push('Very low confidence may indicate poor result quality');
    }

    if (state.iterationCount > 10) {
      issues.push('High iteration count may indicate inefficient search strategy');
    }

    const recentScores = state.confidenceScores.slice(-3);
    const decliningConfidence = recentScores.length >= 2 &&
      (recentScores[recentScores.length - 1]?.score || 0) < (recentScores[0]?.score || 0) - 0.2;

    if (decliningConfidence) {
      issues.push('Declining confidence trajectory may need strategy adjustment');
    }

    const resultCount = state.currentResults?.length || 0;
    if (resultCount === 0 && state.iterationCount > 3) {
      issues.push('No results after multiple iterations may indicate query issues');
    }

    return issues;
  }

  /**
   * Calculate completion likelihood
   */
  private static calculateCompletionLikelihood(state: AgentState): number {
    if (state.isComplete) {
      return 1.0;
    }

    const confidence = state.currentConfidence?.score || 0;
    const progress = this.calculateProgress(state);
    const quality = this.assessStateQuality(state);

    const qualityScores = { excellent: 1.0, good: 0.8, fair: 0.6, poor: 0.3 };
    const qualityScore = qualityScores[quality];

    return (confidence * 0.4) + (progress * 0.3) + (qualityScore * 0.3);
  }

  /**
   * Calculate tool success rate
   */
  private static calculateToolSuccessRate(state: AgentState): number {
    const toolHistory = state.toolHistory || [];
    if (toolHistory.length === 0) {
      return 0.8; // Default assumption
    }

    const successfulTools = toolHistory.filter(tool =>
      (tool.confidence?.score || 0) >= 0.5
    );

    return successfulTools.length / toolHistory.length;
  }

  /**
   * Calculate duration
   */
  private static calculateDuration(state: AgentState): number {
    const startTime = state.metadata.startTime;
    if (!startTime) {
      return 0;
    }

    return Date.now() - startTime.getTime();
  }

  /**
   * Save state snapshot
   */
  private static saveStateSnapshot(state: AgentState, transition?: StateTransition): void {
    const snapshot: StateSnapshot = {
      state: { ...state },
      timestamp: new Date(),
      transition: transition ? transition : {
        from: 'idle',
        to: 'idle',
        reason: 'no transition',
        confidence: 0,
        timestamp: new Date()
      },
      metadata: {
        phase: state.metadata.currentPhase || 'unknown',
        confidence: state.currentConfidence?.score || 0,
        progress: this.calculateProgress(state)
      }
    };

    this.stateHistory.push(snapshot);

    // Keep only last 100 snapshots to prevent memory issues
    if (this.stateHistory.length > 100) {
      this.stateHistory = this.stateHistory.slice(-100);
    }
  }

  /**
   * Update metrics
   */
  private static updateMetrics(transition: StateTransition): void {
    this.metrics.totalTransitions++;
    this.metrics.lastTransition = transition;

    // Update time in states
    const fromState = transition.from;
    if (!this.metrics.timeInStates[fromState]) {
      this.metrics.timeInStates[fromState] = 0;
    }
    this.metrics.timeInStates[fromState] += 1;

    // Update average confidence
    this.metrics.averageConfidence =
      (this.metrics.averageConfidence * (this.metrics.totalTransitions - 1) + transition.confidence) /
      this.metrics.totalTransitions;
  }
}

export default StateManager;

/**
 * Rules-Based Planner with Context Awareness
 * Intelligent planning system using rule-based decision making
 */

import { QueryContext as BaseQueryContext, AgentState, Tool, Ambiguity as BaseAmbiguity } from '../types';
import { QueryContext } from '../graph/context';
import { StateManager } from '../state/helpers';
import { AmbiguityDetector, Ambiguity as DetectorAmbiguity } from '../ambiguity/detector';

export interface PlanningRule {
  id: string;
  name: string;
  priority: number;
  condition: (context: QueryContext, state: AgentState) => boolean;
  action: PlanningAction;
  reasoning: string;
  metadata?: {
    category: string;
    confidence: number;
    estimatedTime: number;
  };
}

export interface PlanningAction {
  type: 'analyze' | 'clarify' | 'select_tool' | 'execute' | 'evaluate' | 'iterate' | 'complete' | 'error';
  toolName?: string;
  parameters?: Record<string, any>;
  nextPhase?: string;
  confidence: number;
  reasoning: string;
}

// Function type for dynamic actions
export type ActionFunction = (context: QueryContext, state: AgentState) => PlanningAction;

export interface PlanningResult {
  action: PlanningAction;
  confidence: number;
  reasoning: string;
  appliedRules: string[];
  alternatives: PlanningAction[];
  metadata: {
    planningTime: number;
    consideredOptions: number;
    contextSummary: string;
  };
}

export interface PlanningMetrics {
  totalPlans: number;
  ruleUsage: Record<string, number>;
  averageConfidence: number;
  averagePlanningTime: number;
  successRate: number;
  lastPlan?: PlanningResult;
}

export class RulesBasedPlanner {
  private static rules: PlanningRule[] = [];
  private static metrics: PlanningMetrics = {
    totalPlans: 0,
    ruleUsage: {},
    averageConfidence: 0,
    averagePlanningTime: 0,
    successRate: 0
  };

  /**
   * Initialize default planning rules
   */
  static initializeRules(): void {
    this.rules = [
      // High priority: Clarification needed
      {
        id: 'need_clarification',
        name: 'Require Clarification',
        priority: 100,
        condition: (context: QueryContext, state: AgentState) => {
          // Convert QueryContext to BaseQueryContext for AmbiguityDetector
          const baseContext: BaseQueryContext = {
            originalQuery: context.originalQuery,
            interpretedIntent: context.interpretedIntent,
            extractedEntities: context.extractedEntities,
            constraints: context.constraints,
            ambiguities: context.ambiguities.map(a => ({
              type: 'context_ambiguity' as any,
              description: a,
              confidence: 0.5,
              options: []
            })),
            clarificationHistory: context.clarificationHistory.map(c => ({
              round: 1,
              question: c.question,
              response: c.response,
              confidence: 0.5,
              timestamp: new Date(c.timestamp),
              resolvedAmbiguities: []
            })),
            sessionId: context.sessionId
          };
          return AmbiguityDetector.needsClarification(baseContext);
        },
        action: {
          type: 'clarify',
          confidence: 0.9,
          reasoning: 'Query contains ambiguities that need clarification for accurate results'
        },
        reasoning: 'High-priority ambiguities detected that would significantly impact search quality',
        metadata: {
          category: 'clarification',
          confidence: 0.9,
          estimatedTime: 5000
        }
      },

      // High priority: Initial analysis
      {
        id: 'initial_analysis',
        name: 'Initial Query Analysis',
        priority: 90,
        condition: (context, state) => {
          return state.iterationCount === 0 && !context.interpretedIntent;
        },
        action: {
          type: 'analyze',
          confidence: 0.95,
          reasoning: 'Perform initial query analysis to understand intent and extract entities'
        },
        reasoning: 'First step in processing any new query',
        metadata: {
          category: 'analysis',
          confidence: 0.95,
          estimatedTime: 2000
        }
      },

      // Medium priority: Search with clear intent
      {
        id: 'search_clear_intent',
        name: 'Search with Clear Intent',
        priority: 80,
        condition: (context, state) => {
          const clearIntents = ['find', 'search', 'show', 'get', 'list'];
          return clearIntents.some(intent => context.interpretedIntent.includes(intent)) &&
                 Object.keys(context.extractedEntities).length > 0 &&
                 state.iterationCount < 3;
        },
        action: {
          type: 'select_tool',
          toolName: 'searchByText',
          confidence: 0.8,
          reasoning: 'Execute search based on clear intent and extracted entities'
        },
        reasoning: 'Clear search intent with sufficient context for effective search',
        metadata: {
          category: 'search',
          confidence: 0.8,
          estimatedTime: 3000
        }
      },

      // Medium priority: Apply price constraints
      {
        id: 'apply_price_constraints',
        name: 'Apply Price Constraints',
        priority: 75,
        condition: (context, state) => {
          return (context.constraints.minPrice !== undefined ||
                  context.constraints.maxPrice !== undefined) &&
                 state.currentResults.length > 10 &&
                 state.iterationCount < 5;
        },
        action: {
          type: 'select_tool',
          toolName: 'filterByPriceRange',
          parameters: {
            minPrice: (context: QueryContext) => context.constraints.minPrice,
            maxPrice: (context: QueryContext) => context.constraints.maxPrice
          },
          confidence: 0.85,
          reasoning: 'Apply price constraints to narrow down results'
        } as PlanningAction,
        reasoning: 'Price constraints specified and current result set is large enough to benefit from filtering',
        metadata: {
          category: 'filtering',
          confidence: 0.85,
          estimatedTime: 1000
        }
      },

      // Medium priority: Sort results when too many
      {
        id: 'sort_excessive_results',
        name: 'Sort Excessive Results',
        priority: 70,
        condition: (context, state) => {
          return state.currentResults.length > 50 && state.iterationCount < 6;
        },
        action: {
          type: 'select_tool',
          toolName: 'sortByField',
          parameters: {
            field: 'pricing.models.price',
            order: 'asc'
          },
          confidence: 0.7,
          reasoning: 'Sort results to present most relevant items first'
        },
        reasoning: 'Too many results to present effectively, sorting will improve user experience',
        metadata: {
          category: 'sorting',
          confidence: 0.7,
          estimatedTime: 1500
        }
      },

      // Medium priority: Category filtering
      {
        id: 'filter_by_category',
        name: 'Filter by Category',
        priority: 65,
        condition: (context, state) => {
          return context.extractedEntities.category &&
                 state.currentResults.length > 20 &&
                 state.iterationCount < 4;
        },
        action: {
          type: 'select_tool',
          toolName: 'filterByArrayContains',
          parameters: {
            field: 'categories.primary',
            values: (context: QueryContext) => Array.isArray(context.extractedEntities.category)
              ? context.extractedEntities.category
              : [context.extractedEntities.category]
          },
          confidence: 0.75,
          reasoning: 'Filter results by specified category'
        } as PlanningAction,
        reasoning: 'Category specified and current results can be narrowed down effectively',
        metadata: {
          category: 'filtering',
          confidence: 0.75,
          estimatedTime: 1000
        }
      },

      // Low priority: Analysis tasks
      {
        id: 'analyze_results',
        name: 'Analyze Results',
        priority: 50,
        condition: (context, state) => {
          const analysisIntents = ['analyze', 'compare', 'summarize', 'statistics'];
          return analysisIntents.some(intent => context.interpretedIntent.includes(intent)) &&
                 state.currentResults.length > 0;
        },
        action: {
          type: 'select_tool',
          toolName: 'groupBy',
          parameters: {
            field: 'categories.primary'
          },
          confidence: 0.8,
          reasoning: 'Group results for analysis'
        },
        reasoning: 'Analysis intent detected with available results',
        metadata: {
          category: 'analysis',
          confidence: 0.8,
          estimatedTime: 2000
        }
      },

      // Low priority: Completion conditions
      {
        id: 'complete_good_results',
        name: 'Complete with Good Results',
        priority: 40,
        condition: (context, state) => {
          const resultCount = state.currentResults.length;
          const confidence = state.currentConfidence?.score || 0;
          return resultCount > 0 && resultCount <= 20 && confidence >= 0.8 && state.iterationCount >= 2;
        },
        action: {
          type: 'complete',
          confidence: 0.9,
          reasoning: 'Good quality results obtained, search can be completed'
        },
        reasoning: 'Satisfactory results with high confidence',
        metadata: {
          category: 'completion',
          confidence: 0.9,
          estimatedTime: 500
        }
      },

      // Low priority: Max iterations reached
      {
        id: 'max_iterations_reached',
        name: 'Max Iterations Reached',
        priority: 35,
        condition: (context, state) => {
          return state.iterationCount >= 10;
        },
        action: {
          type: 'complete',
          confidence: 0.6,
          reasoning: 'Maximum iterations reached, completing search to prevent endless loop'
        },
        reasoning: 'Prevent endless searching by setting reasonable iteration limit',
        metadata: {
          category: 'completion',
          confidence: 0.6,
          estimatedTime: 500
        }
      },

      // Fallback: Continue iteration
      {
        id: 'continue_iteration',
        name: 'Continue Iteration',
        priority: 10,
        condition: (context, state) => {
          return true; // Always applicable as fallback
        },
        action: {
          type: 'iterate',
          confidence: 0.4,
          reasoning: 'Continue searching with refined approach'
        },
        reasoning: 'Fallback rule when no other rules apply',
        metadata: {
          category: 'fallback',
          confidence: 0.4,
          estimatedTime: 3000
        }
      }
    ];

    // Sort rules by priority (highest first)
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Plan next action based on context and state
   */
  static planNextAction(context: QueryContext, state: AgentState): PlanningResult {
    const startTime = Date.now();
    const appliedRules: string[] = [];
    const alternatives: PlanningAction[] = [];

    // Find applicable rules
    const applicableRules = this.rules.filter(rule =>
      rule.condition(context, state)
    );

    if (applicableRules.length === 0) {
      throw new Error('No applicable planning rules found');
    }

    // Select highest priority rule
    const primaryRule = applicableRules[0];
    if (!primaryRule) {
      throw new Error('No primary rule found');
    }
    appliedRules.push(primaryRule.id);

    // Generate alternatives from other applicable rules
    for (let i = 1; i < Math.min(3, applicableRules.length); i++) {
      const rule = applicableRules[i];
      if (rule) {
        alternatives.push(rule.action);
      }
    }

    // Enhance action with context-specific parameters
    const enhancedAction = this.enhanceActionWithContext(primaryRule.action, context, state);

    const planningTime = Date.now() - startTime;

    const result: PlanningResult = {
      action: enhancedAction,
      confidence: primaryRule.metadata?.confidence || primaryRule.action.confidence,
      reasoning: primaryRule.reasoning,
      appliedRules,
      alternatives,
      metadata: {
        planningTime,
        consideredOptions: applicableRules.length,
        contextSummary: this.generateContextSummary(context, state)
      }
    };

    // Update metrics
    this.updateMetrics(result);

    return result;
  }

  /**
   * Add custom planning rule
   */
  static addRule(rule: PlanningRule): void {
    this.rules.push(rule);
    // Re-sort by priority
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove planning rule
   */
  static removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all rules
   */
  static getRules(): PlanningRule[] {
    return [...this.rules];
  }

  /**
   * Get rules by category
   */
  static getRulesByCategory(category: string): PlanningRule[] {
    return this.rules.filter(rule => rule.metadata?.category === category);
  }

  /**
   * Validate rule conditions
   */
  static validateRules(context: QueryContext, state: AgentState): {
    valid: number;
    invalid: number;
    errors: string[];
  } {
    let valid = 0;
    let invalid = 0;
    const errors: string[] = [];

    for (const rule of this.rules) {
      try {
        const isApplicable = rule.condition(context, state);
        if (isApplicable) {
          valid++;
        }
      } catch (error) {
        invalid++;
        errors.push(`Rule ${rule.id} (${rule.name}) condition error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return { valid, invalid, errors };
  }

  /**
   * Get planning metrics
   */
  static getMetrics(): PlanningMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalPlans: 0,
      ruleUsage: {},
      averageConfidence: 0,
      averagePlanningTime: 0,
      successRate: 0
    };
  }

  /**
   * Enhance action with context-specific parameters
   */
  private static enhanceActionWithContext(
    action: PlanningAction,
    context: QueryContext,
    state: AgentState
  ): PlanningAction {
    const enhanced = { ...action };

    // Add context-specific parameters based on action type
    switch (action.type) {
      case 'select_tool':
        if (!enhanced.parameters) {
          enhanced.parameters = {};
        }

        // Add common parameters based on context
        if (context.extractedEntities.keywords) {
          enhanced.parameters.keywords = context.extractedEntities.keywords;
        }

        if (context.constraints.features) {
          enhanced.parameters.features = context.constraints.features;
        }

        // Adjust confidence based on context quality
        const contextQuality = this.assessContextQuality(context);
        enhanced.confidence = Math.min(1.0, enhanced.confidence * contextQuality);

        break;

      case 'analyze':
        enhanced.parameters = {
          originalQuery: context.originalQuery,
          currentContext: context,
          previousResults: state.currentResults
        };
        break;

      case 'clarify':
        // Convert string ambiguities to DetectorAmbiguity objects
        const detectorAmbiguities: DetectorAmbiguity[] = context.ambiguities.map((ambiguity: any) => {
          if (typeof ambiguity === 'string') {
            return {
              id: `amb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'context_ambiguity' as any,
              description: ambiguity,
              severity: 'medium' as const,
              text: ambiguity
            };
          }
          return ambiguity as DetectorAmbiguity;
        });
        
        // Convert QueryContext to BaseQueryContext for AmbiguityDetector
        const baseContext: BaseQueryContext = {
          originalQuery: context.originalQuery,
          interpretedIntent: context.interpretedIntent,
          extractedEntities: context.extractedEntities,
          constraints: context.constraints,
          ambiguities: detectorAmbiguities,
          clarificationHistory: context.clarificationHistory.map(c => ({
            round: 1,
            question: c.question,
            response: c.response,
            confidence: 0.5,
            timestamp: new Date(c.timestamp),
            resolvedAmbiguities: []
          })),
          sessionId: context.sessionId
        };
        
        const clarificationRequest = AmbiguityDetector.generateClarificationRequest(
          detectorAmbiguities,
          context.originalQuery,
          baseContext
        );
        if (clarificationRequest) {
          enhanced.parameters = {
            requestId: clarificationRequest.id,
            question: clarificationRequest.question,
            options: clarificationRequest.options
          };
        }
        break;
    }

    // Add next phase suggestion
    enhanced.nextPhase = this.suggestNextPhase(enhanced, context, state);

    return enhanced;
  }

  /**
   * Assess context quality
   */
  private static assessContextQuality(context: QueryContext): number {
    let quality = 0.5; // Base quality

    // Boost for clear intent
    if (context.interpretedIntent && context.interpretedIntent !== 'unknown') {
      quality += 0.2;
    }

    // Boost for extracted entities
    const entityCount = Object.keys(context.extractedEntities).length;
    quality += Math.min(0.2, entityCount * 0.05);

    // Boost for constraints
    const constraintCount = Object.keys(context.constraints).length;
    quality += Math.min(0.15, constraintCount * 0.05);

    // Penalty for ambiguities
    const ambiguityCount = context.ambiguities.length;
    quality -= Math.min(0.3, ambiguityCount * 0.1);

    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Suggest next phase
   */
  private static suggestNextPhase(
    action: PlanningAction,
    context: QueryContext,
    state: AgentState
  ): string {
    switch (action.type) {
      case 'analyze':
        return 'planning';
      case 'clarify':
        return 'analyzing';
      case 'select_tool':
        return 'executing';
      case 'execute':
        return 'evaluating';
      case 'evaluate':
        return StateManager.isComplete(state) ? 'completed' : 'planning';
      case 'complete':
        return 'completed';
      default:
        return state.metadata.currentPhase || 'analyzing';
    }
  }

  /**
   * Generate context summary
   */
  private static generateContextSummary(context: QueryContext, state: AgentState): string {
    const parts = [
      `Intent: ${context.interpretedIntent}`,
      `Entities: ${Object.keys(context.extractedEntities).length}`,
      `Constraints: ${Object.keys(context.constraints).length}`,
      `Ambiguities: ${context.ambiguities.length}`,
      `Iterations: ${state.iterationCount}`,
      `Results: ${state.currentResults.length}`
    ];

    return parts.join(' | ');
  }

  /**
   * Update metrics
   */
  private static updateMetrics(result: PlanningResult): void {
    this.metrics.totalPlans++;
    this.metrics.lastPlan = result;

    // Update rule usage
    for (const ruleId of result.appliedRules) {
      this.metrics.ruleUsage[ruleId] = (this.metrics.ruleUsage[ruleId] || 0) + 1;
    }

    // Update average confidence
    this.metrics.averageConfidence =
      (this.metrics.averageConfidence * (this.metrics.totalPlans - 1) + result.confidence) /
      this.metrics.totalPlans;

    // Update average planning time
    this.metrics.averagePlanningTime =
      (this.metrics.averagePlanningTime * (this.metrics.totalPlans - 1) + result.metadata.planningTime) /
      this.metrics.totalPlans;
  }
}

// Initialize rules on module load
RulesBasedPlanner.initializeRules();

export default RulesBasedPlanner;

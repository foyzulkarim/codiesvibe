import { Tool } from '../types';

/**
 * Query context for maintaining conversation state and intent across reasoning iterations
 */
export interface QueryContext {
  /** Original user query */
  originalQuery: string;
  /** Interpreted intent of the query */
  interpretedIntent: string;
  /** Extracted entities from the query */
  extractedEntities: Record<string, any>;
  /** Constraints and requirements */
  constraints: Record<string, any>;
  /** Identified ambiguities in the query */
  ambiguities: string[];
  /** Whether clarification is needed */
  clarificationNeeded: boolean;
  /** Previous clarifications and responses */
  clarificationHistory: Array<{
    question: string;
    response: string;
    timestamp: string;
  }>;
  /** Query refinement history */
  refinementHistory: Array<{
    originalQuery: string;
    refinedQuery: string;
    reason: string;
    timestamp: string;
  }>;
  /** Session metadata */
  sessionId: string;
  userId?: string;
  preferences: {
    preferredLanguage?: string;
    resultLimit?: number;
    sortPreference?: string;
    confidenceThreshold?: number;
  };
}

/**
 * Context drift detection metrics
 */
export interface ContextDriftMetrics {
  /** Semantic drift between original and current interpretation */
  semanticDrift: number;
  /** Entity drift - changes in extracted entities */
  entityDrift: number;
  /** Intent drift - changes in interpreted intent */
  intentDrift: number;
  /** Overall drift score */
  overallDrift: number;
  /** Whether drift exceeds threshold */
  exceedsThreshold: boolean;
}

/**
 * Context preservation manager
 */
export class ContextManager {
  private static readonly DRIFT_THRESHOLD = 0.3;
  private static readonly MAX_HISTORY_SIZE = 10;

  /**
   * Create initial context from user query
   */
  static createInitialContext(
    query: string,
    sessionId: string,
    userId?: string
  ): QueryContext {
    const context: QueryContext = {
      originalQuery: query,
      interpretedIntent: this.extractInitialIntent(query),
      extractedEntities: this.extractInitialEntities(query),
      constraints: this.extractInitialConstraints(query),
      ambiguities: this.identifyAmbiguities(query),
      clarificationNeeded: false,
      clarificationHistory: [],
      refinementHistory: [],
      sessionId,
      preferences: {}
    };

    if (userId !== undefined) {
      context.userId = userId;
    }

    return context;
  }

  /**
   * Update context with new interpretation
   */
  static updateContext(
    context: QueryContext,
    newInterpretation: Partial<QueryContext>
  ): QueryContext {
    const updated = { ...context };

    if (newInterpretation.interpretedIntent) {
      updated.interpretedIntent = newInterpretation.interpretedIntent;
    }

    if (newInterpretation.extractedEntities) {
      updated.extractedEntities = {
        ...context.extractedEntities,
        ...newInterpretation.extractedEntities
      };
    }

    if (newInterpretation.constraints) {
      updated.constraints = {
        ...context.constraints,
        ...newInterpretation.constraints
      };
    }

    if (newInterpretation.ambiguities) {
      updated.ambiguities = [
        ...context.ambiguities,
        ...newInterpretation.ambiguities.filter(a => !context.ambiguities.includes(a))
      ];
    }

    updated.clarificationNeeded = newInterpretation.clarificationNeeded || false;

    return updated;
  }

  /**
   * Add clarification to history
   */
  static addClarification(
    context: QueryContext,
    question: string,
    response: string
  ): QueryContext {
    const updated = { ...context };
    updated.clarificationHistory = [
      ...context.clarificationHistory.slice(-this.MAX_HISTORY_SIZE + 1),
      {
        question,
        response,
        timestamp: new Date().toISOString()
      }
    ];
    return updated;
  }

  /**
   * Add query refinement to history
   */
  static addRefinement(
    context: QueryContext,
    originalQuery: string,
    refinedQuery: string,
    reason: string
  ): QueryContext {
    const updated = { ...context };
    updated.refinementHistory = [
      ...context.refinementHistory.slice(-this.MAX_HISTORY_SIZE + 1),
      {
        originalQuery,
        refinedQuery,
        reason,
        timestamp: new Date().toISOString()
      }
    ];
    updated.originalQuery = refinedQuery;
    return updated;
  }

  /**
   * Detect context drift between two contexts
   */
  static detectContextDrift(
    original: QueryContext,
    current: QueryContext
  ): ContextDriftMetrics {
    const semanticDrift = this.calculateSemanticDrift(
      original.interpretedIntent,
      current.interpretedIntent
    );

    const entityDrift = this.calculateEntityDrift(
      original.extractedEntities,
      current.extractedEntities
    );

    const intentDrift = this.calculateIntentDrift(
      original.constraints,
      current.constraints
    );

    const overallDrift = (semanticDrift + entityDrift + intentDrift) / 3;
    const exceedsThreshold = overallDrift > this.DRIFT_THRESHOLD;

    return {
      semanticDrift,
      entityDrift,
      intentDrift,
      overallDrift,
      exceedsThreshold
    };
  }

  /**
   * Get context summary for AI reasoning
   */
  static getContextSummary(context: QueryContext): string {
    const parts = [
      `Original Query: "${context.originalQuery}"`,
      `Intent: ${context.interpretedIntent}`,
      `Entities: ${JSON.stringify(context.extractedEntities)}`,
      `Constraints: ${JSON.stringify(context.constraints)}`
    ];

    if (context.ambiguities.length > 0) {
      parts.push(`Ambiguities: ${context.ambiguities.join(', ')}`);
    }

    if (context.clarificationHistory.length > 0) {
      parts.push(`Clarifications: ${context.clarificationHistory.length} rounds`);
    }

    return parts.join(' | ');
  }

  /**
   * Check if context is stable for continued reasoning
   */
  static isContextStable(context: QueryContext): boolean {
    // Check for excessive ambiguities
    if (context.ambiguities.length > 5) return false;

    // Check for too many clarifications
    if (context.clarificationHistory.length > 3) return false;

    // Check for too many refinements
    if (context.refinementHistory.length > 2) return false;

    return true;
  }

  /**
   * Extract initial intent from query
   */
  private static extractInitialIntent(query: string): string {
    const lowerQuery = query.toLowerCase();

    // Basic intent detection
    if (lowerQuery.includes('free') || lowerQuery.includes('no cost')) {
      return 'find_free_tools';
    } else if (lowerQuery.includes('popular') || lowerQuery.includes('trending')) {
      return 'find_popular_tools';
    } else if (lowerQuery.includes('api') || lowerQuery.includes('integration')) {
      return 'find_tools_with_api';
    } else if (lowerQuery.includes('cheap') || lowerQuery.includes('affordable')) {
      return 'find_affordable_tools';
    } else {
      return 'general_search';
    }
  }

  /**
   * Extract initial entities from query
   */
  private static extractInitialEntities(query: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract price-related entities
    const priceMatch = query.match(/\$(\d+)/);
    if (priceMatch && priceMatch[1]) {
      entities.price = parseInt(priceMatch[1]);
    }

    // Extract category mentions
    const categories = ['ai', 'machine learning', 'automation', 'productivity', 'design'];
    for (const category of categories) {
      if (query.toLowerCase().includes(category)) {
        entities.category = category;
        break;
      }
    }

    return entities;
  }

  /**
   * Extract initial constraints from query
   */
  private static extractInitialConstraints(query: string): Record<string, any> {
    const constraints: Record<string, any> = {};

    // Extract limit constraints
    const limitMatch = query.match(/(\d+)\s*(item|result|tool)/i);
    if (limitMatch && limitMatch[1]) {
      constraints.limit = parseInt(limitMatch[1]);
    }

    // Extract sorting preferences
    if (query.toLowerCase().includes('most popular')) {
      constraints.sortBy = 'popularity';
      constraints.sortOrder = 'desc';
    }

    return constraints;
  }

  /**
   * Identify ambiguities in query
   */
  private static identifyAmbiguities(query: string): string[] {
    const ambiguities: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Common ambiguous terms
    if (lowerQuery === 'show me tools' || lowerQuery === 'list tools') {
      ambiguities.push('general_query_needs_criteria');
    }

    if (lowerQuery.includes('good') || lowerQuery.includes('best')) {
      ambiguities.push('subjective_criteria_needs_clarification');
    }

    if (lowerQuery.includes('recent') || lowerQuery.includes('new')) {
      ambiguities.push('timeframe_needs_specification');
    }

    return ambiguities;
  }

  /**
   * Calculate semantic drift between intents
   */
  private static calculateSemanticDrift(original: string, current: string): number {
    if (original === current) return 0;

    const originalWords = original.toLowerCase().split(/\s+/);
    const currentWords = current.toLowerCase().split(/\s+/);

    const commonWords = originalWords.filter(word => currentWords.includes(word));
    const totalWords = new Set([...originalWords, ...currentWords]).size;

    return 1 - (commonWords.length / totalWords);
  }

  /**
   * Calculate entity drift
   */
  private static calculateEntityDrift(original: Record<string, any>, current: Record<string, any>): number {
    const originalKeys = Object.keys(original);
    const currentKeys = Object.keys(current);
    const allKeys = new Set([...originalKeys, ...currentKeys]);

    if (allKeys.size === 0) return 0;

    let matches = 0;
    for (const key of allKeys) {
      if (original[key] === current[key]) {
        matches++;
      }
    }

    return 1 - (matches / allKeys.size);
  }

  /**
   * Calculate intent drift
   */
  private static calculateIntentDrift(original: Record<string, any>, current: Record<string, any>): number {
    const originalKeys = Object.keys(original);
    const currentKeys = Object.keys(current);
    const allKeys = new Set([...originalKeys, ...currentKeys]);

    if (allKeys.size === 0) return 0;

    let matches = 0;
    for (const key of allKeys) {
      if (JSON.stringify(original[key]) === JSON.stringify(current[key])) {
        matches++;
      }
    }

    return 1 - (matches / allKeys.size);
  }
}

export default ContextManager;
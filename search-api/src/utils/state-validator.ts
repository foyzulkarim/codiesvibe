import { State } from "#types/state";
import { z } from "zod";

/**
 * Deep clone function that preserves Date objects
 */
function deepCloneWithDates<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepCloneWithDates) as T;
  }

  const cloned: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepCloneWithDates((obj as Record<string, unknown>)[key]);
    }
  }

  return cloned as T;
}

/**
 * State validation and consistency checking utilities
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stage: string;
}

export interface StateTransition {
  fromNode: string;
  toNode: string;
  timestamp: Date;
}

export interface StateSnapshot {
  state: State;
  timestamp: Date;
  node: string;
  transitionId: string;
}

export interface RollbackPoint {
  snapshot: StateSnapshot;
  transitionId: string;
  canRollback: boolean;
  rollbackReason?: string;
}

export interface StateValidatorConfig {
  enableStrictValidation: boolean;
  enableTransitionTracking: boolean;
  maxRollbackPoints: number;
  enableConsistencyChecks: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

/**
 * State validation schemas for different stages
 */
export const StateSchemas = {
  initial: z.object({
    query: z.string().min(1, "Query cannot be empty"),
    metadata: z.object({
      startTime: z.date(),
      executionPath: z.array(z.string()),
      nodeExecutionTimes: z.record(z.number()),
    }),
  }).partial(),

  intentExtraction: z.object({
    query: z.string().min(1),
    intent: z.object({
      toolNames: z.array(z.string()),
      categories: z.array(z.string()),
      functionality: z.array(z.string()),
      userTypes: z.array(z.string()),
      interface: z.array(z.string()),
      deployment: z.array(z.string()),
      isComparative: z.boolean(),
      referenceTool: z.string().optional(),
      semanticQuery: z.string().optional(),
      keywords: z.array(z.string()),
      excludeTools: z.array(z.string()),
      priceConstraints: z.object({
        hasFreeTier: z.boolean().optional(),
        maxPrice: z.number().optional(),
        minPrice: z.number().optional(),
        pricingModel: z.string().optional(),
      }).optional(),
    }),
    confidence: z.object({
      overall: z.number().min(0).max(1),
      breakdown: z.record(z.number()),
    }),
    metadata: z.object({
      startTime: z.date(),
      executionPath: z.array(z.string()),
      nodeExecutionTimes: z.record(z.number()),
    }),
  }).partial(),

  contextEnrichment: z.object({
    query: z.string().min(1),
    intent: z.object({
      toolNames: z.array(z.string()),
      categories: z.array(z.string()),
      functionality: z.array(z.string()),
      userTypes: z.array(z.string()),
      interface: z.array(z.string()),
      deployment: z.array(z.string()),
      isComparative: z.boolean(),
      referenceTool: z.string().optional(),
      semanticQuery: z.string().optional(),
      keywords: z.array(z.string()),
      excludeTools: z.array(z.string()),
      priceConstraints: z.object({
        hasFreeTier: z.boolean().optional(),
        maxPrice: z.number().optional(),
        minPrice: z.number().optional(),
        pricingModel: z.string().optional(),
      }).optional(),
    }),
    confidence: z.object({
      overall: z.number().min(0).max(1),
      breakdown: z.record(z.number()),
    }),
    entityStatistics: z.record(z.unknown()).optional(),
    metadataContext: z.object({
      searchSpaceSize: z.number(),
      metadataConfidence: z.number(),
      assumptions: z.array(z.string()),
      lastUpdated: z.date(),
      enrichmentStrategy: z.string(),
      processingTime: z.number(),
    }).optional(),
    metadata: z.object({
      startTime: z.date(),
      executionPath: z.array(z.string()),
      nodeExecutionTimes: z.record(z.number()),
    }),
  }).partial(),

  queryPlanning: z.object({
    query: z.string().min(1),
    intent: z.object({
      toolNames: z.array(z.string()),
      categories: z.array(z.string()),
      functionality: z.array(z.string()),
      userTypes: z.array(z.string()),
      interface: z.array(z.string()),
      deployment: z.array(z.string()),
      isComparative: z.boolean(),
      referenceTool: z.string().optional(),
      semanticQuery: z.string().optional(),
      keywords: z.array(z.string()),
      excludeTools: z.array(z.string()),
      priceConstraints: z.object({
        hasFreeTier: z.boolean().optional(),
        maxPrice: z.number().optional(),
        minPrice: z.number().optional(),
        pricingModel: z.string().optional(),
      }).optional(),
    }),
    plan: z.object({
      steps: z.array(z.object({
        name: z.string(),
        parameters: z.record(z.unknown()).optional(),
        inputFromStep: z.number().optional(),
      })),
      description: z.string().optional(),
      mergeStrategy: z.enum(["weighted", "best", "diverse"]).optional(),
    }),
    routingDecision: z.enum(["optimal", "multi-strategy", "fallback"]),
    metadata: z.object({
      startTime: z.date(),
      executionPath: z.array(z.string()),
      nodeExecutionTimes: z.record(z.number()),
    }),
  }).partial(),

  execution: z.object({
    query: z.string().min(1),
    intent: z.object({
      toolNames: z.array(z.string()),
      categories: z.array(z.string()),
      functionality: z.array(z.string()),
      userTypes: z.array(z.string()),
      interface: z.array(z.string()),
      deployment: z.array(z.string()),
      isComparative: z.boolean(),
      referenceTool: z.string().optional(),
      semanticQuery: z.string().optional(),
      keywords: z.array(z.string()),
      excludeTools: z.array(z.string()),
      priceConstraints: z.object({
        hasFreeTier: z.boolean().optional(),
        maxPrice: z.number().optional(),
        minPrice: z.number().optional(),
        pricingModel: z.string().optional(),
      }).optional(),
    }),
    plan: z.object({
      steps: z.array(z.object({
        name: z.string(),
        parameters: z.record(z.unknown()).optional(),
        inputFromStep: z.number().optional(),
      })),
      description: z.string().optional(),
      mergeStrategy: z.enum(["weighted", "best", "diverse"]).optional(),
    }),
    routingDecision: z.enum(["optimal", "multi-strategy", "fallback"]),
    executionResults: z.array(z.unknown()),
    queryResults: z.array(z.unknown()),
    metadata: z.object({
      startTime: z.date(),
      executionPath: z.array(z.string()),
      nodeExecutionTimes: z.record(z.number()),
    }),
  }).partial(),

  completion: z.object({
    query: z.string().min(1),
    completion: z.object({
      query: z.string(),
      strategy: z.string(),
      results: z.array(z.unknown()),
      explanation: z.string(),
      metadata: z.object({
        executionTime: z.string(),
        resultsCount: z.number(),
      }),
    }),
    qualityAssessment: z.object({
      resultCount: z.number(),
      averageRelevance: z.number(),
      categoryDiversity: z.number(),
      decision: z.enum(["accept", "refine", "expand"]),
    }),
    metadata: z.object({
      startTime: z.date(),
      endTime: z.date(),
      executionPath: z.array(z.string()),
      nodeExecutionTimes: z.record(z.number()),
    }),
  }).partial(),
};

/**
 * State Validator class for comprehensive state validation and tracking
 */
export class StateValidator {
  private static instance: StateValidator;
  private config: StateValidatorConfig;
  private stateHistory: Map<string, StateSnapshot[]> = new Map();
  private rollbackPoints: Map<string, RollbackPoint[]> = new Map();
  private transitions: Map<string, StateTransition[]> = new Map();
  private consistencyRules: Map<string, (state: State, previousState?: State) => ValidationResult[]> = new Map();

  private constructor(config: Partial<StateValidatorConfig> = {}) {
    this.config = {
      enableStrictValidation: true,
      enableTransitionTracking: true,
      maxRollbackPoints: 5,
      enableConsistencyChecks: true,
      logLevel: "info",
      ...config
    };

    this.initializeConsistencyRules();
  }

  public static getInstance(config?: Partial<StateValidatorConfig>): StateValidator {
    if (!StateValidator.instance) {
      StateValidator.instance = new StateValidator(config);
    }
    return StateValidator.instance;
  }

  /**
   * Validate state at a specific stage
   */
  public validateState(state: State, stage: keyof typeof StateSchemas): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic structure validation
      if (!state || typeof state !== 'object') {
        errors.push('State must be a valid object');
        return { isValid: false, errors, warnings, stage };
      }

      // Stage-specific validation
      const schema = StateSchemas[stage];
      if (schema) {
        const result = schema.safeParse(state);
        if (!result.success) {
          result.error.issues.forEach(issue => {
            errors.push(`${issue.path.join('.')}: ${issue.message}`);
          });
        }
      }

      // Consistency checks
      if (this.config.enableConsistencyChecks) {
        const consistencyErrors = this.checkConsistency(state, stage);
        errors.push(...consistencyErrors);
      }

      // Data integrity checks
      const integrityWarnings = this.checkDataIntegrity(state, stage);
      warnings.push(...integrityWarnings);

      this.logValidation(stage, errors, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        stage
      };

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, warnings, stage };
    }
  }

  /**
   * Create a state checkpoint for rollback
   */
  public createCheckpoint(
    threadId: string,
    state: State,
    node: string,
    transitionId: string
  ): RollbackPoint {
    const snapshot: StateSnapshot = {
      state: deepCloneWithDates(state), // Use date-aware deep clone
      timestamp: new Date(),
      node,
      transitionId
    };

    const rollbackPoint: RollbackPoint = {
      snapshot,
      transitionId,
      canRollback: true
    };

    // Store in history
    if (!this.stateHistory.has(threadId)) {
      this.stateHistory.set(threadId, []);
    }
    this.stateHistory.get(threadId)!.push(snapshot);

    // Store as rollback point
    if (!this.rollbackPoints.has(threadId)) {
      this.rollbackPoints.set(threadId, []);
    }
    
    const threadRollbackPoints = this.rollbackPoints.get(threadId)!;
    threadRollbackPoints.push(rollbackPoint);

    // Limit rollback points
    if (threadRollbackPoints.length > this.config.maxRollbackPoints) {
      threadRollbackPoints.shift();
    }

    this.logCheckpoint(threadId, node, transitionId);
    return rollbackPoint;
  }

  /**
   * Rollback to a specific checkpoint
   */
  public rollbackToCheckpoint(
    threadId: string,
    transitionId: string,
    reason?: string
  ): { success: boolean; state?: State; error?: string } {
    const threadRollbackPoints = this.rollbackPoints.get(threadId);
    if (!threadRollbackPoints) {
      return { success: false, error: 'No rollback points found for thread' };
    }

    const rollbackPoint = threadRollbackPoints.find(rp => rp.transitionId === transitionId);
    if (!rollbackPoint) {
      return { success: false, error: `Rollback point ${transitionId} not found` };
    }

    if (!rollbackPoint.canRollback) {
      return { success: false, error: 'Rollback point is not eligible for rollback' };
    }

    try {
      // Create a deep clone of the state with date preservation
      const restoredState = deepCloneWithDates(rollbackPoint.snapshot.state);
      
      // Update rollback reason
      rollbackPoint.rollbackReason = reason;
      
      this.logRollback(threadId, transitionId, reason);
      
      return { success: true, state: restoredState };
    } catch (error) {
      return { 
        success: false, 
        error: `Rollback failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Track state transition
   */
  public trackTransition(
    threadId: string,
    fromNode: string,
    toNode: string,
    transitionId: string
  ): void {
    if (!this.config.enableTransitionTracking) {
      return;
    }

    const transition: StateTransition = {
      fromNode,
      toNode,
      timestamp: new Date()
    };

    if (!this.transitions.has(threadId)) {
      this.transitions.set(threadId, []);
    }
    this.transitions.get(threadId)!.push(transition);

    this.logTransition(threadId, fromNode, toNode, transitionId);
  }

  /**
   * Get state history for a thread
   */
  public getStateHistory(threadId: string): StateSnapshot[] {
    return this.stateHistory.get(threadId) || [];
  }

  /**
   * Get rollback points for a thread
   */
  public getRollbackPoints(threadId: string): RollbackPoint[] {
    return this.rollbackPoints.get(threadId) || [];
  }

  /**
   * Get transitions for a thread
   */
  public getTransitions(threadId: string): StateTransition[] {
    return this.transitions.get(threadId) || [];
  }

  /**
   * Clear state data for a thread
   */
  public clearThreadData(threadId: string): void {
    this.stateHistory.delete(threadId);
    this.rollbackPoints.delete(threadId);
    this.transitions.delete(threadId);
    this.logCleanup(threadId);
  }

  /**
   * Initialize consistency rules
   */
  private initializeConsistencyRules(): void {
    // Query consistency rule
    this.consistencyRules.set("query-consistency", (state, previousState) => {
      const errors: string[] = [];
      
      if (previousState && state.query !== previousState.query) {
        if (!state.metadata?.originalQuery) {
          errors.push('Query changed but originalQuery not preserved in metadata');
        }
      }
      
      return [{ isValid: errors.length === 0, errors, warnings: [], stage: "consistency" }];
    });

    // Metadata consistency rule
    this.consistencyRules.set("metadata-consistency", (state, previousState) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (!state.metadata?.startTime) {
        errors.push('Missing metadata.startTime');
      }
      
      if (!Array.isArray(state.metadata?.executionPath)) {
        errors.push('metadata.executionPath must be an array');
      }
      
      if (state.metadata?.startTime && previousState?.metadata?.startTime) {
        if (new Date(state.metadata.startTime) < new Date(previousState.metadata.startTime)) {
          warnings.push('startTime moved backward - potential clock skew issue');
        }
      }
      
      return [{ isValid: errors.length === 0, errors, warnings, stage: "consistency" }];
    });

    // Execution path consistency rule
    this.consistencyRules.set("execution-path-consistency", (state, previousState) => {
      const errors: string[] = [];
      
      if (previousState && state.metadata?.executionPath && previousState.metadata?.executionPath) {
        const currentPath = state.metadata.executionPath;
        const previousPath = previousState.metadata.executionPath;
        
        // Path should only grow or be reset, not have invalid transitions
        if (currentPath.length < previousPath.length) {
          // Path shortened - check if it's a valid reset
          const lastCommonIndex = currentPath.findIndex((node, index) => 
            index >= previousPath.length || node !== previousPath[index]
          );
          
          if (lastCommonIndex > 0 && lastCommonIndex < currentPath.length - 1) {
            errors.push('Invalid execution path - partial rollback detected');
          }
        }
      }
      
      return [{ isValid: errors.length === 0, errors, warnings: [], stage: "consistency" }];
    });
  }

  /**
   * Check state consistency
   */
  private checkConsistency(state: State, _stage: string): string[] {
    const errors: string[] = [];
    
    const threadId = state.metadata?.threadId;
    if (!threadId) {
      return errors; // Skip consistency checks if no thread ID
    }

    const history = this.stateHistory.get(threadId);
    if (!history || history.length === 0) {
      return errors; // No previous state to compare
    }

    const previousState = history[history.length - 1].state;

    // Apply all consistency rules
    for (const [ruleName, ruleFn] of this.consistencyRules) {
      try {
        const results = ruleFn(state, previousState);
        for (const result of results) {
          errors.push(...result.errors);
        }
    } catch (error) {
        errors.push(`Consistency rule ${ruleName} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return errors;
  }

  /**
   * Check data integrity
   */
  private checkDataIntegrity(state: State, _stage: string): string[] {
    const warnings: string[] = [];

    // Check for circular references
    try {
      JSON.stringify(state);
    } catch {
      warnings.push('State contains circular references');
    }

    // Check for potentially large objects
    const stateSize = JSON.stringify(state).length;
    if (stateSize > 1024 * 1024) { // 1MB
      warnings.push('State size exceeds 1MB - potential memory issue');
    }

    // Check for undefined values in critical fields
    if (state.query === undefined) {
      warnings.push('Query field is undefined');
    }

    return warnings;
  }

  /**
   * Logging methods
   */
  private logValidation(stage: string, errors: string[], warnings: string[]): void {
    if (errors.length > 0) {
      this.log(`error`, `State validation failed at stage ${stage}: ${errors.join(', ')}`);
    }
    
    if (warnings.length > 0) {
      this.log(`warn`, `State validation warnings at stage ${stage}: ${warnings.join(', ')}`);
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      this.log(`debug`, `State validation passed at stage ${stage}`);
    }
  }

  private logCheckpoint(threadId: string, node: string, transitionId: string): void {
    this.log(`info`, `Created checkpoint for thread ${threadId} at node ${node} (transition: ${transitionId})`);
  }

  private logRollback(threadId: string, transitionId: string, reason?: string): void {
    this.log(`info`, `Rolled back thread ${threadId} to transition ${transitionId}${reason ? ` (${reason})` : ''}`);
  }

  private logTransition(threadId: string, fromNode: string, toNode: string, transitionId: string): void {
    this.log(`debug`, `State transition in thread ${threadId}: ${fromNode} -> ${toNode} (transition: ${transitionId})`);
  }

  private logCleanup(threadId: string): void {
    this.log(`info`, `Cleared state data for thread ${threadId}`);
  }

  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [StateValidator] [${level.toUpperCase()}] ${message}`;
    
    switch (this.config.logLevel) {
      case "debug":
        if (level === "debug" || level === "info" || level === "warn" || level === "error") {
          console.log(logMessage);
        }
        break;
      case "info":
        if (level === "info" || level === "warn" || level === "error") {
          console.log(logMessage);
        }
        break;
      case "warn":
        if (level === "warn" || level === "error") {
          console.log(logMessage);
        }
        break;
      case "error":
        if (level === "error") {
          console.log(logMessage);
        }
        break;
    }
  }
}

// Export singleton instance
export const stateValidator = StateValidator.getInstance();

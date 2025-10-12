import { State } from "@/types/state";
import { stateValidator, RollbackPoint, StateSnapshot } from "./state-validator";
import { checkpointManager } from "./checkpoint-manager";
import { v4 as uuidv4 } from "uuid";

/**
 * Rollback management utilities for state restoration
 */

export interface RollbackOperation {
  id: string;
  threadId: string;
  reason: string;
  timestamp: Date;
  fromTransitionId: string;
  toTransitionId?: string;
  success: boolean;
  error?: string;
  executionTime: number;
}

export interface RollbackStrategy {
  name: string;
  description: string;
  canRollback: (fromState: State, toState: State) => boolean;
  rollback: (fromState: State, toState: State) => Promise<State>;
}

export interface RollbackConfig {
  enableAutoRollback: boolean;
  maxRollbackAttempts: number;
  rollbackTimeout: number;
  enableRollbackLogging: boolean;
  validateAfterRollback: boolean;
  strategies: string[];
}

/**
 * Rollback Manager class for handling state restoration operations
 */
export class RollbackManager {
  private static instance: RollbackManager;
  private config: RollbackConfig;
  private rollbackHistory: Map<string, RollbackOperation[]> = new Map();
  private rollbackStrategies: Map<string, RollbackStrategy> = new Map();

  private constructor(config: Partial<RollbackConfig> = {}) {
    this.config = {
      enableAutoRollback: true,
      maxRollbackAttempts: 3,
      rollbackTimeout: 30000, // 30 seconds
      enableRollbackLogging: true,
      validateAfterRollback: true,
      strategies: ["safe", "aggressive", "conservative"],
      ...config
    };

    this.initializeRollbackStrategies();
  }

  public static getInstance(config?: Partial<RollbackConfig>): RollbackManager {
    if (!RollbackManager.instance) {
      RollbackManager.instance = new RollbackManager(config);
    }
    return RollbackManager.instance;
  }

  /**
   * Perform rollback to a specific checkpoint
   */
  public async rollbackToCheckpoint(
    threadId: string,
    transitionId: string,
    reason: string,
    strategy: string = "safe"
  ): Promise<{ success: boolean; state?: State; error?: string }> {
    const startTime = Date.now();
    const operationId = uuidv4();

    try {
      this.logRollback(`Starting rollback operation ${operationId} for thread ${threadId}`);

      // Get rollback point
      const rollbackPoints = stateValidator.getRollbackPoints(threadId);
      const targetRollbackPoint = rollbackPoints.find(rp => rp.transitionId === transitionId);

      if (!targetRollbackPoint) {
        const error = `Rollback point ${transitionId} not found for thread ${threadId}`;
        return this.recordRollbackOperation(operationId, threadId, reason, transitionId, false, startTime, error);
      }

      if (!targetRollbackPoint.canRollback) {
        const error = `Rollback point ${transitionId} is not eligible for rollback`;
        return this.recordRollbackOperation(operationId, threadId, reason, transitionId, false, startTime, error);
      }

      // Get current state for comparison
      const currentStateHistory = stateValidator.getStateHistory(threadId);
      const currentState = currentStateHistory.length > 0 ? 
        currentStateHistory[currentStateHistory.length - 1].state : null;

      if (!currentState) {
        const error = `No current state found for thread ${threadId}`;
        return this.recordRollbackOperation(operationId, threadId, reason, transitionId, false, startTime, error);
      }

      // Get rollback strategy
      const rollbackStrategy = this.rollbackStrategies.get(strategy);
      if (!rollbackStrategy) {
        const error = `Rollback strategy ${strategy} not found`;
        return this.recordRollbackOperation(operationId, threadId, reason, transitionId, false, startTime, error);
      }

      // Check if rollback is possible with this strategy
      if (!rollbackStrategy.canRollback(currentState, targetRollbackPoint.snapshot.state)) {
        const error = `Rollback strategy ${strategy} cannot rollback from current state to target state`;
        return this.recordRollbackOperation(operationId, threadId, reason, transitionId, false, startTime, error);
      }

      // Perform rollback with timeout
      const rollbackPromise = rollbackStrategy.rollback(currentState, targetRollbackPoint.snapshot.state);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Rollback timeout")), this.config.rollbackTimeout);
      });

      const rolledBackState = await Promise.race([rollbackPromise, timeoutPromise]);

      // Validate rolled back state if enabled
      if (this.config.validateAfterRollback) {
        const validation = stateValidator.validateState(rolledBackState, "execution");
        if (!validation.isValid) {
          const error = `Rolled back state validation failed: ${validation.errors.join(', ')}`;
          return this.recordRollbackOperation(operationId, threadId, reason, transitionId, false, startTime, error);
        }
      }

      // Create new checkpoint after rollback
      const newTransitionId = uuidv4();
      stateValidator.createCheckpoint(threadId, rolledBackState, "rollback", newTransitionId);

      this.logRollback(`Successfully rolled back thread ${threadId} to transition ${transitionId}`);

      return this.recordRollbackOperation(operationId, threadId, reason, transitionId, true, startTime, undefined, newTransitionId, rolledBackState);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logRollback(`Rollback failed for thread ${threadId}: ${errorMessage}`);
      return this.recordRollbackOperation(operationId, threadId, reason, transitionId, false, startTime, errorMessage);
    }
  }

  /**
   * Auto-rollback to the last valid checkpoint
   */
  public async autoRollback(threadId: string, reason: string): Promise<{ success: boolean; state?: State; error?: string }> {
    if (!this.config.enableAutoRollback) {
      return { success: false, error: "Auto-rollback is disabled" };
    }

    try {
      // Get rollback points
      const rollbackPoints = stateValidator.getRollbackPoints(threadId);
      if (rollbackPoints.length === 0) {
        return { success: false, error: "No rollback points available" };
      }

      // Find the latest valid rollback point
      const validRollbackPoints = rollbackPoints.filter(rp => rp.canRollback);
      if (validRollbackPoints.length === 0) {
        return { success: false, error: "No valid rollback points available" };
      }

      // Try rollback points from newest to oldest
      for (const rollbackPoint of validRollbackPoints.reverse()) {
        const result = await this.rollbackToCheckpoint(
          threadId,
          rollbackPoint.transitionId,
          `Auto-rollback: ${reason}`,
          "safe"
        );

        if (result.success) {
          this.logRollback(`Auto-rollback successful for thread ${threadId} to transition ${rollbackPoint.transitionId}`);
          return result;
        }

        this.logRollback(`Auto-rollback attempt failed for thread ${threadId} to transition ${rollbackPoint.transitionId}: ${result.error}`);
      }

      return { success: false, error: "All auto-rollback attempts failed" };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logRollback(`Auto-rollback failed for thread ${threadId}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get rollback history for a thread
   */
  public getRollbackHistory(threadId: string): RollbackOperation[] {
    return this.rollbackHistory.get(threadId) || [];
  }

  /**
   * Clear rollback history for a thread
   */
  public clearRollbackHistory(threadId: string): void {
    this.rollbackHistory.delete(threadId);
    this.logRollback(`Cleared rollback history for thread ${threadId}`);
  }

  /**
   * Get available rollback strategies
   */
  public getRollbackStrategies(): RollbackStrategy[] {
    return Array.from(this.rollbackStrategies.values());
  }

  /**
   * Check if rollback is possible for a thread
   */
  public canRollback(threadId: string): { canRollback: boolean; availablePoints: number; lastValidPoint?: string } {
    const rollbackPoints = stateValidator.getRollbackPoints(threadId);
    const validRollbackPoints = rollbackPoints.filter(rp => rp.canRollback);
    
    return {
      canRollback: validRollbackPoints.length > 0,
      availablePoints: validRollbackPoints.length,
      lastValidPoint: validRollbackPoints.length > 0 ? 
        validRollbackPoints[validRollbackPoints.length - 1].transitionId : undefined
    };
  }

  /**
   * Record rollback operation
   */
  private recordRollbackOperation(
    operationId: string,
    threadId: string,
    reason: string,
    fromTransitionId: string,
    success: boolean,
    startTime: number,
    error?: string,
    toTransitionId?: string,
    state?: State
  ): { success: boolean; state?: State; error?: string } {
    const operation: RollbackOperation = {
      id: operationId,
      threadId,
      reason,
      timestamp: new Date(),
      fromTransitionId,
      toTransitionId,
      success,
      error,
      executionTime: Date.now() - startTime
    };

    // Store in history
    if (!this.rollbackHistory.has(threadId)) {
      this.rollbackHistory.set(threadId, []);
    }
    this.rollbackHistory.get(threadId)!.push(operation);

    // Log operation
    if (this.config.enableRollbackLogging) {
      this.logRollback(`Rollback operation ${operationId}: ${success ? 'SUCCESS' : 'FAILED'} - ${reason}`);
      if (error) {
        this.logRollback(`Rollback error: ${error}`);
      }
    }

    return { success, state, error };
  }

  /**
   * Initialize rollback strategies
   */
  private initializeRollbackStrategies(): void {
    // Safe strategy - only rolls back if no data loss
    this.rollbackStrategies.set("safe", {
      name: "safe",
      description: "Safe rollback that preserves all important data",
      canRollback: (fromState: State, toState: State) => {
        // Check if rollback would lose critical data
        if (fromState.completion && !toState.completion) {
          return false; // Don't rollback if it would lose completion results
        }
        return true;
      },
      rollback: async (fromState: State, toState: State) => {
        // Create a merged state preserving important data
        const mergedState: State = {
          ...toState,
          // Preserve metadata from current state but note the rollback
          metadata: {
            ...toState.metadata,
            threadId: fromState.metadata?.threadId,
            rollbackTime: new Date(),
            originalQuery: fromState.query,
            executionPath: [
              ...(toState.metadata?.executionPath || []),
              "rollback"
            ]
          }
        };

        return mergedState;
      }
    });

    // Aggressive strategy - rolls back regardless of data loss
    this.rollbackStrategies.set("aggressive", {
      name: "aggressive",
      description: "Aggressive rollback that prioritizes state restoration over data preservation",
      canRollback: () => true, // Always can rollback
      rollback: async (fromState: State, toState: State) => {
        // Simply return the target state with updated metadata
        return {
          ...toState,
          metadata: {
            ...toState.metadata,
            threadId: fromState.metadata?.threadId,
            rollbackTime: new Date(),
            originalQuery: fromState.query,
            executionPath: [
              ...(toState.metadata?.executionPath || []),
              "rollback-aggressive"
            ]
          }
        };
      }
    });

    // Conservative strategy - only rolls back to very safe points
    this.rollbackStrategies.set("conservative", {
      name: "conservative",
      description: "Conservative rollback that only allows rollback to early execution stages",
      canRollback: (fromState: State, toState: State) => {
        // Only allow rollback to early stages (before execution)
        if (toState.metadata?.executionPath && 
            toState.metadata.executionPath.includes("execution")) {
          return false;
        }
        return true;
      },
      rollback: async (fromState: State, toState: State) => {
        // Similar to safe but more restrictive
        return {
          ...toState,
          metadata: {
            ...toState.metadata,
            threadId: fromState.metadata?.threadId,
            rollbackTime: new Date(),
            originalQuery: fromState.query,
            executionPath: [
              ...(toState.metadata?.executionPath || []),
              "rollback-conservative"
            ]
          }
        };
      }
    });
  }

  /**
   * Logging method
   */
  private logRollback(message: string): void {
    if (this.config.enableRollbackLogging) {
      console.log(`[${new Date().toISOString()}] [RollbackManager] ${message}`);
    }
  }
}

// Export singleton instance
export const rollbackManager = RollbackManager.getInstance();

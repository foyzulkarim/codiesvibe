import { MemorySaver } from "@langchain/langgraph";
import { State } from "@/types/state";
import { threadManager, ThreadInfo } from "./thread-manager";
import { stateValidator, ValidationResult, StateSchemas } from "./state-validator";
import { rollbackManager } from "./rollback-manager";

/**
 * Checkpoint configuration and management utilities
 */
export interface CheckpointConfig {
  enableCheckpoints: boolean;
  checkpointInterval?: number; // Save after N nodes
  maxCheckpointsPerThread?: number;
  enableCompression?: boolean;
}

export interface CheckpointMetadata {
  threadId: string;
  checkpointId: string;
  timestamp: Date;
  nodeName: string;
  executionTime: number;
  stateSize: number;
  compressed: boolean;
}

export interface RecoveryOptions {
  enableRecovery: boolean;
  maxRetries: number;
  retryDelay: number;
  fallbackToLastCheckpoint: boolean;
}

export interface RecoveryResult {
  success: boolean;
  recoveredState?: State;
  fromCheckpoint?: string;
  error?: string;
  retryAttempts: number;
}

export class CheckpointManager {
  private static instance: CheckpointManager;
  private memorySaver: MemorySaver;
  private checkpointConfigs: Map<string, CheckpointConfig> = new Map();
  private defaultConfig: CheckpointConfig = {
    enableCheckpoints: true,
    checkpointInterval: 1,
    maxCheckpointsPerThread: 10,
    enableCompression: false
  };
  private defaultRecoveryOptions: RecoveryOptions = {
    enableRecovery: true,
    maxRetries: 3,
    retryDelay: 1000,
    fallbackToLastCheckpoint: true
  };

  private constructor() {
    this.memorySaver = new MemorySaver();
  }

  public static getInstance(): CheckpointManager {
    if (!CheckpointManager.instance) {
      CheckpointManager.instance = new CheckpointManager();
    }
    return CheckpointManager.instance;
  }

  /**
   * Get the MemorySaver instance
   */
  public getMemorySaver(): MemorySaver {
    return this.memorySaver;
  }

  /**
   * Configure checkpointing for a thread
   */
  public configureThread(threadId: string, config: Partial<CheckpointConfig>): void {
    const threadConfig = { ...this.defaultConfig, ...config };
    this.checkpointConfigs.set(threadId, threadConfig);
  }

  /**
   * Get checkpoint configuration for a thread
   */
  public getThreadConfig(threadId: string): CheckpointConfig {
    return this.checkpointConfigs.get(threadId) || this.defaultConfig;
  }

  /**
   * Create a checkpoint with metadata
   */
  public async createCheckpoint(
    threadId: string,
    checkpointId: string,
    state: State,
    nodeName: string,
    executionTime: number = 0
  ): Promise<void> {
    try {
      const config = this.getThreadConfig(threadId);
      
      if (!config.enableCheckpoints) {
        return;
      }

      // Validate state before creating checkpoint
      const validation = this.validateStateForCheckpoint(state, nodeName);
      if (!validation.isValid) {
        console.warn(`[CheckpointManager] State validation failed for checkpoint ${checkpointId}: ${validation.errors.join(', ')}`);
        
        // Attempt auto-rollback if state is invalid
        if (config.enableCompression) { // Using this as a flag for auto-recovery
          try {
            const rollbackResult = await rollbackManager.autoRollback(threadId, `State validation failed: ${validation.errors.join(', ')}`);
            if (rollbackResult.success) {
              console.log(`[CheckpointManager] Auto-rollback successful, creating checkpoint with restored state`);
              state = rollbackResult.state!;
            }
          } catch (rollbackError) {
            console.error(`[CheckpointManager] Auto-rollback failed:`, rollbackError);
          }
        }
      }

      const metadata: CheckpointMetadata = {
        threadId,
        checkpointId,
        timestamp: new Date(),
        nodeName,
        executionTime,
        stateSize: JSON.stringify(state).length,
        compressed: config.enableCompression || false
      };

      // Store checkpoint with metadata
      const checkpointData = {
        state,
        metadata,
        config
      };

      // Create state validator checkpoint for rollback
      stateValidator.createCheckpoint(threadId, state, nodeName, checkpointId);

      // Use MemorySaver to store the checkpoint
      // Note: MemorySaver automatically handles checkpointing when used with compiled graph
      // The actual checkpoint creation happens during graph execution
      // We'll store metadata separately for tracking purposes
      console.log(`[CheckpointManager] Checkpoint tracking enabled for thread ${threadId} at node ${nodeName}`);

      console.log(`[CheckpointManager] Created checkpoint ${checkpointId} for thread ${threadId} after node ${nodeName}`);

      // Clean up old checkpoints if needed
      await this.cleanupOldCheckpoints(threadId, config);

    } catch (error) {
      console.error(`[CheckpointManager] Failed to create checkpoint ${checkpointId} for thread ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Restore state from a checkpoint
   */
  public async restoreFromCheckpoint(
    threadId: string,
    checkpointId?: string
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    let retryAttempts = 0;

    try {
      const validation = threadManager.validateThreadId(threadId);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid thread ID: ${validation.error}`,
          retryAttempts
        };
      }

      const config = this.getThreadConfig(threadId);
      const recoveryOptions = this.defaultRecoveryOptions;

      while (retryAttempts < recoveryOptions.maxRetries) {
        try {
          // Get checkpoint list for the thread
          const checkpointList = await this.getCheckpointList(threadId);
          
          if (checkpointList.length === 0) {
            return {
              success: false,
              error: 'No checkpoints found for thread',
              retryAttempts
            };
          }

          // Determine which checkpoint to restore
          let targetCheckpointId = checkpointId;
          if (!targetCheckpointId) {
            // Use the latest checkpoint
            targetCheckpointId = checkpointList[checkpointList.length - 1].checkpoint_id;
          }

          // Verify checkpoint exists
          const checkpointExists = checkpointList.some(cp => cp.checkpoint_id === targetCheckpointId);
          if (!checkpointExists) {
            if (recoveryOptions.fallbackToLastCheckpoint) {
              targetCheckpointId = checkpointList[checkpointList.length - 1].checkpoint_id;
              console.log(`[CheckpointManager] Checkpoint ${checkpointId} not found, falling back to latest: ${targetCheckpointId}`);
            } else {
              return {
                success: false,
                error: `Checkpoint ${checkpointId} not found and fallback disabled`,
                retryAttempts
              };
            }
          }

          // Note: MemorySaver integration with graph compilation handles restoration
          // This is a placeholder for the actual restoration logic
          // that would be implemented when using the compiled graph with thread config
          console.log(`[CheckpointManager] Restoration placeholder for checkpoint ${targetCheckpointId} in thread ${threadId}`);
          
          // For now, return a placeholder result
          // In actual implementation, this would be handled by the graph execution
          return {
            success: false,
            error: 'Checkpoint restoration not implemented - handled by graph compilation',
            retryAttempts
          };

        } catch (error) {
          retryAttempts++;
          console.error(`[CheckpointManager] Recovery attempt ${retryAttempts} failed for thread ${threadId}:`, error);
          
          if (retryAttempts < recoveryOptions.maxRetries) {
            await this.delay(recoveryOptions.retryDelay);
          }
        }
      }

      return {
        success: false,
        error: `Recovery failed after ${retryAttempts} attempts`,
        retryAttempts
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryAttempts
      };
    }
  }

  /**
   * Get list of checkpoints for a thread
   */
  public async getCheckpointList(threadId: string): Promise<any[]> {
    try {
      // MemorySaver doesn't have a direct method to list checkpoints
      // We'll need to track checkpoints manually or use alternative approach
      // For now, return empty array - this will be enhanced based on actual MemorySaver API
      return [];
    } catch (error) {
      console.error(`[CheckpointManager] Failed to get checkpoint list for thread ${threadId}:`, error);
      return [];
    }
  }

  /**
   * Delete a specific checkpoint
   */
  public async deleteCheckpoint(threadId: string, checkpointId: string): Promise<boolean> {
    try {
      // MemorySaver doesn't have a direct delete method
      // This would need to be implemented based on actual API
      console.log(`[CheckpointManager] Delete checkpoint ${checkpointId} for thread ${threadId} - not implemented yet`);
      return false;
    } catch (error) {
      console.error(`[CheckpointManager] Failed to delete checkpoint ${checkpointId} for thread ${threadId}:`, error);
      return false;
    }
  }

  /**
   * Clean up old checkpoints for a thread
   */
  private async cleanupOldCheckpoints(threadId: string, config: CheckpointConfig): Promise<void> {
    try {
      if (!config.maxCheckpointsPerThread || config.maxCheckpointsPerThread <= 0) {
        return;
      }

      const checkpointList = await this.getCheckpointList(threadId);
      
      if (checkpointList.length <= config.maxCheckpointsPerThread) {
        return;
      }

      // Remove oldest checkpoints beyond the limit
      const toDelete = checkpointList.slice(0, checkpointList.length - config.maxCheckpointsPerThread);
      let deletedCount = 0;

      for (const checkpoint of toDelete) {
        const deleted = await this.deleteCheckpoint(threadId, checkpoint.checkpoint_id);
        if (deleted) {
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`[CheckpointManager] Cleaned up ${deletedCount} old checkpoints for thread ${threadId}`);
      }

    } catch (error) {
      console.error(`[CheckpointManager] Failed to cleanup old checkpoints for thread ${threadId}:`, error);
    }
  }

  /**
   * Get checkpoint statistics
   */
  public async getCheckpointStats(threadId: string): Promise<{
    checkpointCount: number;
    totalSize: number;
    oldestCheckpoint?: Date;
    newestCheckpoint?: Date;
  }> {
    try {
      const checkpointList = await this.getCheckpointList(threadId);
      
      if (checkpointList.length === 0) {
        return {
          checkpointCount: 0,
          totalSize: 0
        };
      }

      const timestamps = checkpointList.map(cp => new Date(cp.metadata?.timestamp || 0));
      const sizes = checkpointList.map(cp => cp.metadata?.stateSize || 0);

      return {
        checkpointCount: checkpointList.length,
        totalSize: sizes.reduce((sum, size) => sum + size, 0),
        oldestCheckpoint: new Date(Math.min(...timestamps.map(t => t.getTime()))),
        newestCheckpoint: new Date(Math.max(...timestamps.map(t => t.getTime())))
      };

    } catch (error) {
      console.error(`[CheckpointManager] Failed to get checkpoint stats for thread ${threadId}:`, error);
      return {
        checkpointCount: 0,
        totalSize: 0
      };
    }
  }

  /**
   * Clear all checkpoints for a thread
   */
  public async clearThreadCheckpoints(threadId: string): Promise<number> {
    try {
      const checkpointList = await this.getCheckpointList(threadId);
      let deletedCount = 0;

      for (const checkpoint of checkpointList) {
        const deleted = await this.deleteCheckpoint(threadId, checkpoint.checkpoint_id);
        if (deleted) {
          deletedCount++;
        }
      }

      console.log(`[CheckpointManager] Cleared ${deletedCount} checkpoints for thread ${threadId}`);
      return deletedCount;

    } catch (error) {
      console.error(`[CheckpointManager] Failed to clear checkpoints for thread ${threadId}:`, error);
      return 0;
    }
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate state consistency after recovery
   */
  public validateRecoveredState(state: State): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      // Check required fields
      if (!state.query) {
        errors.push('Missing required field: query');
      }

      if (!state.metadata) {
        errors.push('Missing required field: metadata');
      } else {
        if (!state.metadata.startTime) {
          errors.push('Missing required field: metadata.startTime');
        }
        if (!Array.isArray(state.metadata.executionPath)) {
          errors.push('Invalid metadata.executionPath: must be array');
        }
      }

      // Check data consistency
      if (state.intent && typeof state.intent !== 'object') {
        errors.push('Invalid intent: must be object');
      }

      if (state.completion && typeof state.completion !== 'object') {
        errors.push('Invalid completion: must be object');
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`State validation failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Validate state for checkpoint creation
   */
  private validateStateForCheckpoint(state: State, nodeName: string): ValidationResult {
    // Determine the validation stage based on node name
    let stage: keyof typeof StateSchemas = "initial";
    
    switch (nodeName) {
      case "intent-extraction":
        stage = "intentExtraction";
        break;
      case "context-enrichment":
        stage = "contextEnrichment";
        break;
      case "skip-context-enrichment":
        stage = "contextEnrichment"; // Use same validation stage as context enrichment
        break;
      case "query-planning":
        stage = "queryPlanning";
        break;
      case "execution":
        stage = "execution";
        break;
      case "final-completion":
        stage = "completion";
        break;
      default:
        stage = "initial";
    }

    return stateValidator.validateState(state, stage);
  }

  /**
   * Get comprehensive state synchronization status
   */
  public async getStateSyncStatus(threadId: string): Promise<{
    checkpointCount: number;
    rollbackPoints: number;
    lastValidation: ValidationResult | null;
    canRollback: boolean;
    lastRollback?: import("./rollback-manager").RollbackOperation;
    stateHistory: import("./state-validator").StateSnapshot[];
  }> {
    try {
      const checkpointStats = await this.getCheckpointStats(threadId);
      const rollbackPoints = stateValidator.getRollbackPoints(threadId);
      const stateHistory = stateValidator.getStateHistory(threadId);
      const rollbackHistory = rollbackManager.getRollbackHistory(threadId);
      const lastRollback = rollbackHistory.length > 0 ? rollbackHistory[rollbackHistory.length - 1] : undefined;
      
      // Get last state validation result
      let lastValidation: ValidationResult | null = null;
      if (stateHistory.length > 0) {
        const lastState = stateHistory[stateHistory.length - 1].state;
        lastValidation = stateValidator.validateState(lastState, "completion");
      }

      const canRollback = rollbackManager.canRollback(threadId);

      return {
        checkpointCount: checkpointStats.checkpointCount,
        rollbackPoints: rollbackPoints.length,
        lastValidation,
        canRollback: canRollback.canRollback,
        lastRollback,
        stateHistory
      };

    } catch (error) {
      console.error(`[CheckpointManager] Failed to get state sync status for thread ${threadId}:`, error);
      return {
        checkpointCount: 0,
        rollbackPoints: 0,
        lastValidation: null,
        canRollback: false,
        stateHistory: []
      };
    }
  }

  /**
   * Clear all state synchronization data for a thread
   */
  public async clearStateSyncData(threadId: string): Promise<void> {
    try {
      // Clear checkpoints
      await this.clearThreadCheckpoints(threadId);
      
      // Clear state validator data
      stateValidator.clearThreadData(threadId);
      
      // Clear rollback manager data
      rollbackManager.clearRollbackHistory(threadId);
      
      console.log(`[CheckpointManager] Cleared all state synchronization data for thread ${threadId}`);
    } catch (error) {
      console.error(`[CheckpointManager] Failed to clear state sync data for thread ${threadId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const checkpointManager = CheckpointManager.getInstance();

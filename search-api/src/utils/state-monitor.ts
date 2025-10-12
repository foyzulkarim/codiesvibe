import { State } from "@/types/state";
import { stateValidator, StateTransition, StateSnapshot } from "./state-validator";
import { rollbackManager, RollbackOperation } from "./rollback-manager";
import { checkpointManager } from "./checkpoint-manager";

/**
 * State monitoring and logging utilities
 */

export interface StateMetrics {
  threadId: string;
  totalTransitions: number;
  totalRollbacks: number;
  totalCheckpoints: number;
  averageExecutionTime: number;
  stateValidationFailures: number;
  autoRecoverySuccesses: number;
  lastActivity: Date;
  currentState?: State;
}

export interface StateMonitorConfig {
  enableMetrics: boolean;
  enableDetailedLogging: boolean;
  metricsRetentionPeriod: number; // in hours
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface StateAlert {
  id: string;
  threadId: string;
  type: "validation_failure" | "rollback" | "state_corruption" | "performance_issue";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * State Monitor class for tracking state transitions and performance
 */
export class StateMonitor {
  private static instance: StateMonitor;
  private config: StateMonitorConfig;
  private metrics: Map<string, StateMetrics> = new Map();
  private alerts: StateAlert[] = [];
  private performanceData: Map<string, number[]> = new Map();

  private constructor(config: Partial<StateMonitorConfig> = {}) {
    this.config = {
      enableMetrics: true,
      enableDetailedLogging: true,
      metricsRetentionPeriod: 24, // 24 hours
      logLevel: "info",
      ...config
    };

    // Start cleanup interval
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000); // Every hour
  }

  public static getInstance(config?: Partial<StateMonitorConfig>): StateMonitor {
    if (!StateMonitor.instance) {
      StateMonitor.instance = new StateMonitor(config);
    }
    return StateMonitor.instance;
  }

  /**
   * Track state transition
   */
  public trackTransition(
    threadId: string,
    fromNode: string,
    toNode: string,
    executionTime: number,
    state: State
  ): void {
    if (!this.config.enableMetrics) {
      return;
    }

    // Update metrics
    this.updateMetrics(threadId, executionTime, state);

    // Track performance
    if (!this.performanceData.has(threadId)) {
      this.performanceData.set(threadId, []);
    }
    
    const perfData = this.performanceData.get(threadId)!;
    perfData.push(executionTime);
    
    // Keep only last 100 data points
    if (perfData.length > 100) {
      perfData.shift();
    }

    // Check for performance issues
    if (executionTime > 5000) { // 5 seconds
      this.createAlert(
        threadId,
        "performance_issue",
        "medium",
        `Slow transition detected: ${fromNode} -> ${toNode} took ${executionTime}ms`,
        { executionTime, fromNode, toNode }
      );
    }

    this.logTransition(threadId, fromNode, toNode, executionTime);
  }

  /**
   * Track state validation failure
   */
  public trackValidationFailure(
    threadId: string,
    node: string,
    errors: string[],
    state: State
  ): void {
    if (!this.config.enableMetrics) {
      return;
    }

    // Update metrics
    const metrics = this.getOrCreateMetrics(threadId);
    metrics.stateValidationFailures++;
    metrics.lastActivity = new Date();

    // Create alert
    this.createAlert(
      threadId,
      "validation_failure",
      "high",
      `State validation failed at ${node}: ${errors.join(', ')}`,
      { node, errors, stateSize: JSON.stringify(state).length }
    );

    this.logValidationFailure(threadId, node, errors);
  }

  /**
   * Track rollback operation
   */
  public trackRollback(
    threadId: string,
    rollbackOperation: RollbackOperation
  ): void {
    if (!this.config.enableMetrics) {
      return;
    }

    // Update metrics
    const metrics = this.getOrCreateMetrics(threadId);
    metrics.totalRollbacks++;
    metrics.lastActivity = new Date();

    if (rollbackOperation.success) {
      metrics.autoRecoverySuccesses++;
    }

    // Create alert
    this.createAlert(
      threadId,
      "rollback",
      rollbackOperation.success ? "medium" : "high",
      `Rollback ${rollbackOperation.success ? 'succeeded' : 'failed'}: ${rollbackOperation.reason}`,
      { 
        rollbackId: rollbackOperation.id,
        executionTime: rollbackOperation.executionTime,
        fromTransition: rollbackOperation.fromTransitionId,
        toTransition: rollbackOperation.toTransitionId
      }
    );

    this.logRollback(threadId, rollbackOperation);
  }

  /**
   * Get metrics for a thread
   */
  public getMetrics(threadId: string): StateMetrics | null {
    return this.metrics.get(threadId) || null;
  }

  /**
   * Get all metrics
   */
  public getAllMetrics(): StateMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get alerts for a thread
   */
  public getAlerts(threadId?: string, severity?: string): StateAlert[] {
    let filteredAlerts = this.alerts;

    if (threadId) {
      filteredAlerts = filteredAlerts.filter(alert => alert.threadId === threadId);
    }

    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }

    return filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get performance statistics for a thread
   */
  public getPerformanceStats(threadId: string): {
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    count: number;
  } | null {
    const perfData = this.performanceData.get(threadId);
    if (!perfData || perfData.length === 0) {
      return null;
    }

    const sorted = [...perfData].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      average: perfData.reduce((sum, time) => sum + time, 0) / count,
      min: sorted[0],
      max: sorted[count - 1],
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
      count
    };
  }

  /**
   * Get comprehensive state synchronization status
   */
  public async getStateSyncStatus(threadId: string): Promise<{
    metrics: StateMetrics | null;
    performanceStats: any;
    recentAlerts: StateAlert[];
    rollbackHistory: RollbackOperation[];
    stateHistory: StateSnapshot[];
    checkpointStats: any;
    canRollback: boolean;
  }> {
    try {
      const metrics = this.getMetrics(threadId);
      const performanceStats = this.getPerformanceStats(threadId);
      const recentAlerts = this.getAlerts(threadId).slice(0, 10);
      const rollbackHistory = rollbackManager.getRollbackHistory(threadId);
      const stateHistory = stateValidator.getStateHistory(threadId);
      const checkpointStats = await checkpointManager.getCheckpointStats(threadId);
      const canRollback = rollbackManager.canRollback(threadId);

      return {
        metrics,
        performanceStats,
        recentAlerts,
        rollbackHistory,
        stateHistory,
        checkpointStats,
        canRollback: canRollback.canRollback
      };

    } catch (error) {
      this.logError(`Failed to get state sync status for thread ${threadId}:`, error);
      return {
        metrics: null,
        performanceStats: null,
        recentAlerts: [],
        rollbackHistory: [],
        stateHistory: [],
        checkpointStats: null,
        canRollback: false
      };
    }
  }

  /**
   * Clear monitoring data for a thread
   */
  public clearThreadData(threadId: string): void {
    this.metrics.delete(threadId);
    this.performanceData.delete(threadId);
    this.alerts = this.alerts.filter(alert => alert.threadId !== threadId);
    this.logCleanup(threadId);
  }

  /**
   * Update metrics for a thread
   */
  private updateMetrics(threadId: string, executionTime: number, state: State): void {
    const metrics = this.getOrCreateMetrics(threadId);
    
    metrics.totalTransitions++;
    metrics.lastActivity = new Date();
    metrics.currentState = state;
    
    // Update average execution time
    const totalTransitions = metrics.totalTransitions;
    metrics.averageExecutionTime = 
      (metrics.averageExecutionTime * (totalTransitions - 1) + executionTime) / totalTransitions;
  }

  /**
   * Get or create metrics for a thread
   */
  private getOrCreateMetrics(threadId: string): StateMetrics {
    if (!this.metrics.has(threadId)) {
      this.metrics.set(threadId, {
        threadId,
        totalTransitions: 0,
        totalRollbacks: 0,
        totalCheckpoints: 0,
        averageExecutionTime: 0,
        stateValidationFailures: 0,
        autoRecoverySuccesses: 0,
        lastActivity: new Date()
      });
    }
    return this.metrics.get(threadId)!;
  }

  /**
   * Create an alert
   */
  private createAlert(
    threadId: string,
    type: StateAlert["type"],
    severity: StateAlert["severity"],
    message: string,
    metadata?: Record<string, any>
  ): void {
    const alert: StateAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      threadId,
      type,
      severity,
      message,
      timestamp: new Date(),
      metadata
    };

    this.alerts.push(alert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    this.logAlert(alert);
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - this.config.metricsRetentionPeriod);

    let cleanedCount = 0;

    for (const [threadId, metrics] of this.metrics.entries()) {
      if (metrics.lastActivity < cutoffTime) {
        this.clearThreadData(threadId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logCleanup(`global cleanup of ${cleanedCount} threads`);
    }
  }

  /**
   * Logging methods
   */
  private logTransition(threadId: string, fromNode: string, toNode: string, executionTime: number): void {
    this.log(`debug`, `Transition: ${threadId} ${fromNode} -> ${toNode} (${executionTime}ms)`);
  }

  private logValidationFailure(threadId: string, node: string, errors: string[]): void {
    this.log(`warn`, `Validation failure: ${threadId} at ${node}: ${errors.join(', ')}`);
  }

  private logRollback(threadId: string, rollbackOperation: RollbackOperation): void {
    this.log(`info`, `Rollback: ${threadId} ${rollbackOperation.success ? 'SUCCESS' : 'FAILED'} - ${rollbackOperation.reason}`);
  }

  private logAlert(alert: StateAlert): void {
    this.log(
      alert.severity === "critical" || alert.severity === "high" ? "error" : 
      alert.severity === "medium" ? "warn" : "info",
      `Alert [${alert.severity.toUpperCase()}]: ${alert.threadId} - ${alert.message}`
    );
  }

  private logCleanup(identifier: string): void {
    this.log(`info`, `Cleaned up monitoring data: ${identifier}`);
  }

  private logError(message: string, error: any): void {
    this.log(`error`, `${message}: ${error instanceof Error ? error.message : String(error)}`);
  }

  private log(level: string, message: string): void {
    if (!this.config.enableDetailedLogging && level === "debug") {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [StateMonitor] [${level.toUpperCase()}] ${message}`;
    
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
export const stateMonitor = StateMonitor.getInstance();

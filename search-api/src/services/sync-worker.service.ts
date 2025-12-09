/**
 * Sync Worker Service
 *
 * Background service for processing failed and pending sync operations.
 * Runs periodic sweeps to retry failed syncs with exponential backoff.
 */

import { Tool, ITool, SyncCollectionName, SyncStatus } from '../models/tool.model.js';
import { toolSyncService } from './tool-sync.service.js';
import { toolCrudService } from './tool-crud.service.js';
import { searchLogger } from '../config/logger.js';

// ============================================
// TYPES AND CONFIGURATION
// ============================================

/**
 * Worker configuration
 */
export interface SyncWorkerConfig {
  /** Interval between sync sweeps in milliseconds (default: 60000 = 1 minute) */
  sweepInterval: number;
  /** Maximum tools to process per sweep (default: 50) */
  batchSize: number;
  /** Maximum retries before giving up (default: 5) */
  maxRetries: number;
  /** Base delay for exponential backoff in milliseconds (default: 60000 = 1 minute) */
  baseBackoffDelay: number;
  /** Maximum backoff delay in milliseconds (default: 3600000 = 1 hour) */
  maxBackoffDelay: number;
  /** Enable worker on startup (default: true) */
  enabled: boolean;
}

/**
 * Worker status
 */
export interface SyncWorkerStatus {
  isRunning: boolean;
  lastSweepAt: Date | null;
  lastSweepDuration: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  nextSweepAt: Date | null;
  config: SyncWorkerConfig;
}

/**
 * Sweep result
 */
export interface SweepResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: Array<{ toolId: string; error: string }>;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: SyncWorkerConfig = {
  sweepInterval: 60000, // 1 minute
  batchSize: 50,
  maxRetries: 5,
  baseBackoffDelay: 60000, // 1 minute
  maxBackoffDelay: 3600000, // 1 hour
  enabled: true,
};

// ============================================
// SERVICE CLASS
// ============================================

export class SyncWorkerService {
  private config: SyncWorkerConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastSweepAt: Date | null = null;
  private lastSweepDuration = 0;
  private processedCount = 0;
  private successCount = 0;
  private failedCount = 0;
  private isProcessing = false;

  constructor(config: Partial<SyncWorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // LIFECYCLE METHODS
  // ============================================

  /**
   * Start the sync worker
   */
  start(): void {
    if (this.isRunning) {
      searchLogger.warn('[SyncWorker] Already running', { service: 'sync-worker' });
      return;
    }

    if (!this.config.enabled) {
      searchLogger.info('[SyncWorker] Disabled by configuration', { service: 'sync-worker' });
      return;
    }

    searchLogger.info('[SyncWorker] Starting sync worker', {
      service: 'sync-worker',
      config: {
        sweepInterval: this.config.sweepInterval,
        batchSize: this.config.batchSize,
        maxRetries: this.config.maxRetries,
      },
    });

    this.isRunning = true;

    // Run initial sweep after a short delay
    setTimeout(() => this.sweep(), 5000);

    // Schedule periodic sweeps
    this.intervalId = setInterval(() => this.sweep(), this.config.sweepInterval);
  }

  /**
   * Stop the sync worker
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    searchLogger.info('[SyncWorker] Stopping sync worker', { service: 'sync-worker' });

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Get worker status
   */
  getStatus(): SyncWorkerStatus {
    const nextSweepAt = this.isRunning && this.lastSweepAt
      ? new Date(this.lastSweepAt.getTime() + this.config.sweepInterval)
      : null;

    return {
      isRunning: this.isRunning,
      lastSweepAt: this.lastSweepAt,
      lastSweepDuration: this.lastSweepDuration,
      processedCount: this.processedCount,
      successCount: this.successCount,
      failedCount: this.failedCount,
      nextSweepAt,
      config: this.config,
    };
  }

  /**
   * Manually trigger a sweep
   */
  async triggerSweep(): Promise<SweepResult> {
    return this.sweep();
  }

  // ============================================
  // SWEEP LOGIC
  // ============================================

  /**
   * Main sweep function - processes pending/failed sync operations
   */
  private async sweep(): Promise<SweepResult> {
    // Prevent concurrent sweeps
    if (this.isProcessing) {
      searchLogger.warn('[SyncWorker] Sweep already in progress, skipping', { service: 'sync-worker' });
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        errors: [],
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const result: SweepResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
    };

    try {
      // Ensure Mongoose connection is established before database operations
      await toolCrudService.ensureConnection();

      searchLogger.info('[SyncWorker] Starting sweep', { service: 'sync-worker' });

      // Find tools that need sync (approved tools with failed/pending status)
      const toolsNeedingSync = await this.findToolsNeedingSync();

      if (toolsNeedingSync.length === 0) {
        searchLogger.debug('[SyncWorker] No tools need sync', { service: 'sync-worker' });
        return result;
      }

      searchLogger.info(`[SyncWorker] Found ${toolsNeedingSync.length} tools needing sync`, {
        service: 'sync-worker',
      });

      // Process each tool
      for (const tool of toolsNeedingSync) {
        // Check if tool should be skipped due to backoff
        if (this.shouldSkipDueToBackoff(tool)) {
          result.skipped++;
          continue;
        }

        // Process the tool
        const toolResult = await this.processTool(tool);

        result.processed++;
        this.processedCount++;

        if (toolResult.success) {
          result.succeeded++;
          this.successCount++;
        } else {
          result.failed++;
          this.failedCount++;
          if (toolResult.error) {
            result.errors.push({ toolId: tool.id, error: toolResult.error });
          }
        }
      }
    } catch (error) {
      searchLogger.error('[SyncWorker] Sweep error', error as Error, { service: 'sync-worker' });
    } finally {
      this.isProcessing = false;
      this.lastSweepAt = new Date();
      this.lastSweepDuration = Date.now() - startTime;
      result.duration = this.lastSweepDuration;

      searchLogger.info('[SyncWorker] Sweep completed', {
        service: 'sync-worker',
        ...result,
      });
    }

    return result;
  }

  /**
   * Find tools that need sync processing
   */
  private async findToolsNeedingSync(): Promise<ITool[]> {
    // Query for approved tools with pending, failed, or stale sync status
    const tools = await Tool.find({
      approvalStatus: 'approved',
      $or: [
        { 'syncMetadata.overallStatus': 'pending' },
        { 'syncMetadata.overallStatus': 'failed' },
        { 'syncMetadata.overallStatus': 'stale' },
        { 'syncMetadata.collections.tools.status': { $in: ['pending', 'failed', 'stale'] } },
        { 'syncMetadata.collections.functionality.status': { $in: ['pending', 'failed', 'stale'] } },
        { 'syncMetadata.collections.usecases.status': { $in: ['pending', 'failed', 'stale'] } },
        { 'syncMetadata.collections.interface.status': { $in: ['pending', 'failed', 'stale'] } },
      ],
    })
      .sort({ 'syncMetadata.updatedAt': 1 }) // Process oldest first
      .limit(this.config.batchSize);

    return tools;
  }

  /**
   * Check if a tool should be skipped due to exponential backoff
   */
  private shouldSkipDueToBackoff(tool: ITool): boolean {
    const syncMetadata = tool.syncMetadata;
    if (!syncMetadata) return false;

    // Find the collection with the highest retry count
    let maxRetryCount = 0;
    let lastAttempt: Date | null = null;

    const collections: SyncCollectionName[] = ['tools', 'functionality', 'usecases', 'interface'];

    for (const collection of collections) {
      const collectionStatus = syncMetadata.collections?.[collection];
      if (collectionStatus) {
        if (collectionStatus.retryCount > maxRetryCount) {
          maxRetryCount = collectionStatus.retryCount;
        }
        if (collectionStatus.lastSyncAttemptAt) {
          const attemptDate = new Date(collectionStatus.lastSyncAttemptAt);
          if (!lastAttempt || attemptDate > lastAttempt) {
            lastAttempt = attemptDate;
          }
        }
      }
    }

    // Skip if max retries exceeded
    if (maxRetryCount >= this.config.maxRetries) {
      return true;
    }

    // Apply exponential backoff
    if (lastAttempt && maxRetryCount > 0) {
      const backoffDelay = Math.min(
        this.config.baseBackoffDelay * Math.pow(2, maxRetryCount - 1),
        this.config.maxBackoffDelay
      );
      const nextAttemptTime = lastAttempt.getTime() + backoffDelay;

      if (Date.now() < nextAttemptTime) {
        return true;
      }
    }

    return false;
  }

  /**
   * Process a single tool
   */
  private async processTool(tool: ITool): Promise<{ success: boolean; error?: string }> {
    try {
      // Determine which collections need sync
      const collectionsToSync = this.getCollectionsNeedingSync(tool);

      if (collectionsToSync.length === 0) {
        // Already synced
        return { success: true };
      }

      searchLogger.debug(`[SyncWorker] Processing tool ${tool.id}`, {
        service: 'sync-worker',
        collections: collectionsToSync,
      });

      // Sync the tool to specific collections
      const result = await toolSyncService.syncToolToCollections(tool, collectionsToSync, {
        force: true,
      });

      return {
        success: result.success,
        error: result.failedCount > 0
          ? result.collections.filter((c) => !c.success).map((c) => c.error).join('; ')
          : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get collections that need sync for a tool
   */
  private getCollectionsNeedingSync(tool: ITool): SyncCollectionName[] {
    const needsSync: SyncCollectionName[] = [];
    const collections: SyncCollectionName[] = ['tools', 'functionality', 'usecases', 'interface'];

    for (const collection of collections) {
      const status = tool.syncMetadata?.collections?.[collection]?.status;
      if (status === 'pending' || status === 'failed' || status === 'stale') {
        needsSync.push(collection);
      }
    }

    return needsSync;
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  /**
   * Force retry a specific tool
   */
  async forceRetryTool(toolId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await toolSyncService.retryFailedSync(toolId);
      return {
        success: result.success,
        error: result.failedCount > 0 ? 'Some collections failed to sync' : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Force retry all failed tools
   */
  async forceRetryAllFailed(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: Array<{ toolId: string; error: string }>;
  }> {
    // Ensure Mongoose connection is established
    await toolCrudService.ensureConnection();

    const tools = await Tool.find({
      approvalStatus: 'approved',
      'syncMetadata.overallStatus': 'failed',
    }).limit(100);

    const result = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as Array<{ toolId: string; error: string }>,
    };

    for (const tool of tools) {
      const retryResult = await this.forceRetryTool(tool.id);
      result.processed++;

      if (retryResult.success) {
        result.succeeded++;
      } else {
        result.failed++;
        if (retryResult.error) {
          result.errors.push({ toolId: tool.id, error: retryResult.error });
        }
      }
    }

    return result;
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    total: number;
    synced: number;
    pending: number;
    failed: number;
    byCollection: Record<SyncCollectionName, { synced: number; pending: number; failed: number }>;
  }> {
    // Ensure Mongoose connection is established
    await toolCrudService.ensureConnection();

    const [total, synced, pending, failed] = await Promise.all([
      Tool.countDocuments({ approvalStatus: 'approved' }),
      Tool.countDocuments({
        approvalStatus: 'approved',
        'syncMetadata.overallStatus': 'synced',
      }),
      Tool.countDocuments({
        approvalStatus: 'approved',
        'syncMetadata.overallStatus': 'pending',
      }),
      Tool.countDocuments({
        approvalStatus: 'approved',
        'syncMetadata.overallStatus': 'failed',
      }),
    ]);

    // Get per-collection stats
    const collections: SyncCollectionName[] = ['tools', 'functionality', 'usecases', 'interface'];
    const byCollection = {} as Record<SyncCollectionName, { synced: number; pending: number; failed: number }>;

    for (const collection of collections) {
      const [collSynced, collPending, collFailed] = await Promise.all([
        Tool.countDocuments({
          approvalStatus: 'approved',
          [`syncMetadata.collections.${collection}.status`]: 'synced',
        }),
        Tool.countDocuments({
          approvalStatus: 'approved',
          [`syncMetadata.collections.${collection}.status`]: 'pending',
        }),
        Tool.countDocuments({
          approvalStatus: 'approved',
          [`syncMetadata.collections.${collection}.status`]: 'failed',
        }),
      ]);

      byCollection[collection] = {
        synced: collSynced,
        pending: collPending,
        failed: collFailed,
      };
    }

    return {
      total,
      synced,
      pending,
      failed,
      byCollection,
    };
  }

  /**
   * Reset retry count for a tool (allows immediate retry)
   */
  async resetRetryCount(toolId: string): Promise<boolean> {
    // Ensure Mongoose connection is established
    await toolCrudService.ensureConnection();

    const result = await Tool.updateOne(
      { $or: [{ id: toolId }, { slug: toolId }] },
      {
        $set: {
          'syncMetadata.collections.tools.retryCount': 0,
          'syncMetadata.collections.functionality.retryCount': 0,
          'syncMetadata.collections.usecases.retryCount': 0,
          'syncMetadata.collections.interface.retryCount': 0,
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Mark a tool as stale (needs re-sync)
   */
  async markToolAsStale(toolId: string): Promise<boolean> {
    // Ensure Mongoose connection is established
    await toolCrudService.ensureConnection();

    const result = await Tool.updateOne(
      { $or: [{ id: toolId }, { slug: toolId }] },
      {
        $set: {
          'syncMetadata.overallStatus': 'pending',
          'syncMetadata.collections.tools.status': 'pending',
          'syncMetadata.collections.functionality.status': 'pending',
          'syncMetadata.collections.usecases.status': 'pending',
          'syncMetadata.collections.interface.status': 'pending',
          'syncMetadata.collections.tools.retryCount': 0,
          'syncMetadata.collections.functionality.retryCount': 0,
          'syncMetadata.collections.usecases.retryCount': 0,
          'syncMetadata.collections.interface.retryCount': 0,
        },
      }
    );

    return result.modifiedCount > 0;
  }
}

// Export singleton instance
export const syncWorkerService = new SyncWorkerService();

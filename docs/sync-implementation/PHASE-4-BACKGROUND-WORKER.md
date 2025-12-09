# Phase 4: Background Worker - Automatic Retry

> **Prerequisites:** Complete Phases 1-3

---

## Overview

This phase creates a background worker service that:
- Periodically checks for tools needing sync
- Retries failed syncs with exponential backoff
- Provides status visibility for monitoring

---

## 4.1 Sync Worker Service

**New File:** `search-api/src/services/sync-worker.service.ts`

```typescript
import { toolSyncService, SyncStats } from './tool-sync.service';
import { ITool, SyncCollectionName } from '../models/tool.model';
import { searchLogger } from '../config/logger';

// ============================================
// TYPES
// ============================================

/**
 * Worker status for API responses
 */
export interface WorkerStatus {
  /** Is the worker interval active */
  running: boolean;

  /** Is the worker currently processing a batch */
  processing: boolean;

  /** Timestamp of last completed cycle */
  lastRunAt: Date | null;

  /** Stats from last completed cycle */
  lastCycleStats: {
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
    duration: number;
  } | null;

  /** Worker configuration */
  config: WorkerConfig;
}

/**
 * Worker configuration
 */
interface WorkerConfig {
  enabled: boolean;
  intervalMs: number;
  batchSize: number;
  maxRetries: number;
  baseBackoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

// ============================================
// SERVICE CLASS
// ============================================

class SyncWorkerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private lastRunAt: Date | null = null;
  private lastCycleStats: WorkerStatus['lastCycleStats'] = null;

  /**
   * Worker configuration from environment variables
   */
  private readonly config: WorkerConfig = {
    // Enable/disable worker (default: enabled)
    enabled: process.env.SYNC_WORKER_ENABLED !== 'false',

    // How often to run (default: 60 seconds)
    intervalMs: parseInt(process.env.SYNC_WORKER_INTERVAL_MS ?? '60000', 10),

    // Tools to process per cycle (default: 10)
    batchSize: parseInt(process.env.SYNC_WORKER_BATCH_SIZE ?? '10', 10),

    // Max retries before giving up (default: 5)
    maxRetries: parseInt(process.env.SYNC_MAX_RETRIES ?? '5', 10),

    // Initial backoff delay (default: 5 seconds)
    baseBackoffMs: parseInt(process.env.SYNC_BASE_BACKOFF_MS ?? '5000', 10),

    // Backoff multiplier (default: 2x)
    backoffMultiplier: parseFloat(process.env.SYNC_BACKOFF_MULTIPLIER ?? '2'),

    // Maximum backoff delay (default: 5 minutes)
    maxBackoffMs: parseInt(process.env.SYNC_MAX_BACKOFF_MS ?? '300000', 10),
  };

  // ============================================
  // LIFECYCLE METHODS
  // ============================================

  /**
   * Start the background worker
   *
   * Should be called after server initialization.
   */
  start(): void {
    if (!this.config.enabled) {
      searchLogger.info('Sync worker disabled by configuration');
      return;
    }

    if (this.intervalId) {
      searchLogger.warn('Sync worker already running');
      return;
    }

    searchLogger.info('Starting sync worker', {
      intervalMs: this.config.intervalMs,
      batchSize: this.config.batchSize,
      maxRetries: this.config.maxRetries,
    });

    // Start the interval
    this.intervalId = setInterval(
      () => this.runCycle(),
      this.config.intervalMs
    );

    // Run first cycle after a short delay (let server initialize)
    setTimeout(() => this.runCycle(), 5000);
  }

  /**
   * Stop the background worker
   *
   * Should be called during graceful shutdown.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      searchLogger.info('Sync worker stopped');
    }
  }

  /**
   * Get current worker status
   *
   * @returns Worker status for API responses
   */
  getStatus(): WorkerStatus {
    return {
      running: this.intervalId !== null,
      processing: this.isProcessing,
      lastRunAt: this.lastRunAt,
      lastCycleStats: this.lastCycleStats,
      config: this.config,
    };
  }

  /**
   * Manually trigger a worker cycle
   *
   * Useful for testing or manual intervention via API.
   */
  async forceRun(): Promise<void> {
    if (this.isProcessing) {
      throw new Error('Worker is already processing a batch');
    }
    await this.runCycle();
  }

  // ============================================
  // MAIN CYCLE
  // ============================================

  /**
   * Run one cycle of the worker
   *
   * 1. Query tools needing sync
   * 2. Check backoff periods
   * 3. Sync each tool
   * 4. Update statistics
   */
  private async runCycle(): Promise<void> {
    // Prevent concurrent cycles
    if (this.isProcessing) {
      searchLogger.debug('Skipping cycle - previous still running');
      return;
    }

    this.isProcessing = true;
    this.lastRunAt = new Date();
    const cycleStart = Date.now();

    let processed = 0;
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    try {
      // Get tools needing sync
      const tools = await toolSyncService.getToolsNeedingSync(
        this.config.batchSize
      );

      if (tools.length === 0) {
        searchLogger.debug('No tools need syncing');
        this.lastCycleStats = {
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          duration: Date.now() - cycleStart,
        };
        return;
      }

      searchLogger.info(`Processing ${tools.length} tools for sync`);

      // Process each tool
      for (const tool of tools) {
        processed++;

        // Determine which collections need sync for this tool
        const failedCollections = toolSyncService.getFailedCollections(tool);
        const collectionsToSync =
          failedCollections.length > 0 ? failedCollections : undefined;

        // Check backoff period
        const shouldProcess = this.checkBackoff(tool, collectionsToSync);
        if (!shouldProcess) {
          searchLogger.debug('Skipping tool - in backoff period', {
            toolId: tool.id,
          });
          skipped++;
          continue;
        }

        // Sync the tool
        try {
          const result = await toolSyncService.syncTool(tool.id, {
            collections: collectionsToSync,
            skipUnchanged: false, // Worker should always attempt sync
          });

          if (result.success) {
            successful++;
          } else {
            failed++;
          }

          searchLogger.info('Worker sync completed', {
            toolId: tool.id,
            success: result.success,
            overallStatus: result.overallStatus,
            collections: result.collections.map(
              (c) =>
                `${c.collection}:${c.success ? 'ok' : c.skipped ? 'skip' : 'fail'}`
            ),
            duration: result.totalDuration,
          });
        } catch (error) {
          failed++;
          searchLogger.error('Worker sync error', {
            toolId: tool.id,
            error: (error as Error).message,
          });
        }
      }
    } catch (error) {
      searchLogger.error('Sync worker cycle error', {
        error: (error as Error).message,
      });
    } finally {
      this.isProcessing = false;
      this.lastCycleStats = {
        processed,
        successful,
        failed,
        skipped,
        duration: Date.now() - cycleStart,
      };

      if (processed > 0) {
        searchLogger.info('Sync worker cycle completed', this.lastCycleStats);
      }
    }
  }

  // ============================================
  // BACKOFF LOGIC
  // ============================================

  /**
   * Check if a tool should be processed based on backoff
   *
   * For failed tools, we wait an exponentially increasing time
   * before retrying.
   *
   * @param tool - Tool document
   * @param collections - Specific collections to check (or all)
   * @returns True if tool should be processed
   */
  private checkBackoff(
    tool: ITool,
    collections?: SyncCollectionName[]
  ): boolean {
    const collectionsToCheck: SyncCollectionName[] = collections || [
      'tools',
      'functionality',
      'usecases',
      'interface',
    ];

    for (const collection of collectionsToCheck) {
      const collectionMeta = tool.syncMetadata?.collections?.[collection];

      // Only check backoff for failed collections
      if (!collectionMeta || collectionMeta.status !== 'failed') {
        continue;
      }

      // Skip if exceeded max retries
      if (collectionMeta.retryCount >= this.config.maxRetries) {
        searchLogger.debug('Tool exceeded max retries', {
          toolId: tool.id,
          collection,
          retryCount: collectionMeta.retryCount,
        });
        continue; // Don't block other collections
      }

      // Calculate backoff time
      const backoffMs = this.calculateBackoff(collectionMeta.retryCount || 0);
      const lastAttempt = collectionMeta.lastSyncAttemptAt?.getTime() || 0;
      const timeSinceAttempt = Date.now() - lastAttempt;

      // Check if still in backoff period
      if (timeSinceAttempt < backoffMs) {
        searchLogger.debug('Tool in backoff period', {
          toolId: tool.id,
          collection,
          backoffMs,
          timeSinceAttempt,
          retryCount: collectionMeta.retryCount,
        });
        return false; // Still in backoff
      }
    }

    return true; // OK to process
  }

  /**
   * Calculate exponential backoff delay
   *
   * Formula: baseBackoff * (multiplier ^ retryCount)
   * Capped at maxBackoff
   *
   * Example with defaults (base=5s, mult=2, max=5min):
   * - Retry 0: 5s
   * - Retry 1: 10s
   * - Retry 2: 20s
   * - Retry 3: 40s
   * - Retry 4: 80s
   * - Retry 5+: 5min (capped)
   *
   * @param retryCount - Number of previous retries
   * @returns Backoff delay in milliseconds
   */
  private calculateBackoff(retryCount: number): number {
    const backoff =
      this.config.baseBackoffMs *
      Math.pow(this.config.backoffMultiplier, retryCount);

    return Math.min(backoff, this.config.maxBackoffMs);
  }
}

// Export singleton instance
export const syncWorkerService = new SyncWorkerService();
```

---

## 4.2 Server Integration

**File:** `search-api/src/server.ts`

Add worker lifecycle management:

```typescript
// Add import at top
import { syncWorkerService } from './services/sync-worker.service';

// ... existing server setup ...

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Start background sync worker
  syncWorkerService.start();
});

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');

    // Stop sync worker
    syncWorkerService.stop();

    // Close database connections
    // ... existing cleanup ...

    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

## 4.3 Environment Variables

Add to `search-api/.env.example`:

```env
# ============================================
# SYNC WORKER CONFIGURATION
# ============================================

# Enable/disable background sync worker (default: true)
SYNC_WORKER_ENABLED=true

# How often to check for tools needing sync (default: 60000 = 1 minute)
SYNC_WORKER_INTERVAL_MS=60000

# Number of tools to process per cycle (default: 10)
SYNC_WORKER_BATCH_SIZE=10

# Maximum retry attempts before giving up (default: 5)
SYNC_MAX_RETRIES=5

# Initial backoff delay in ms (default: 5000 = 5 seconds)
SYNC_BASE_BACKOFF_MS=5000

# Backoff multiplier for exponential backoff (default: 2)
SYNC_BACKOFF_MULTIPLIER=2

# Maximum backoff delay in ms (default: 300000 = 5 minutes)
SYNC_MAX_BACKOFF_MS=300000
```

---

## Worker Behavior

### Cycle Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Worker Cycle                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Query MongoDB for tools needing sync                    │
│     - status = 'pending' OR 'stale' OR 'failed'            │
│     - retryCount < maxRetries                               │
│     - ORDER BY updatedAt ASC (oldest first)                 │
│     - LIMIT batchSize                                       │
│                                                              │
│  2. For each tool:                                          │
│     a. Check backoff period                                 │
│        - If in backoff → skip                               │
│     b. Determine collections to sync                        │
│        - Failed collections only (if any)                   │
│        - Or all collections (for pending/stale)             │
│     c. Sync tool                                            │
│     d. Log result                                           │
│                                                              │
│  3. Update cycle stats                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Backoff Schedule

With default configuration:

| Retry # | Delay | Cumulative Time |
|---------|-------|-----------------|
| 1 | 5 seconds | 5 seconds |
| 2 | 10 seconds | 15 seconds |
| 3 | 20 seconds | 35 seconds |
| 4 | 40 seconds | 75 seconds |
| 5 | 80 seconds | ~2.5 minutes |
| 6+ | 5 minutes (max) | ... |

After 5 failed retries, the tool is considered permanently failed and won't be retried until manually reset.

### Status Transitions

```
┌─────────┐    create    ┌─────────┐
│         │ ──────────► │ pending │
│   N/A   │              └────┬────┘
│         │                   │
└─────────┘                   │ sync success
                              ▼
┌─────────┐    update    ┌─────────┐
│  stale  │ ◄────────── │ synced  │
└────┬────┘              └─────────┘
     │                        ▲
     │ sync success           │
     └────────────────────────┘

     │ sync failure
     ▼
┌─────────┐
│ failed  │ ──► worker retries with backoff
└─────────┘
```

---

## Verification Checklist

After implementing Phase 4:

- [ ] Worker starts on server startup
- [ ] Worker stops on graceful shutdown
- [ ] Worker processes pending/stale/failed tools
- [ ] Backoff is applied to failed tools
- [ ] Worker respects maxRetries limit
- [ ] Worker status is accessible via `getStatus()`
- [ ] Worker can be manually triggered via `forceRun()`
- [ ] Logs show worker activity

---

## Testing

### Start Worker Manually (for testing)

```typescript
// In a test or debug script
import { syncWorkerService } from './services/sync-worker.service';

// Start worker
syncWorkerService.start();

// Check status
console.log(syncWorkerService.getStatus());

// Force run a cycle
await syncWorkerService.forceRun();

// Stop worker
syncWorkerService.stop();
```

### Monitor Worker Logs

```bash
# Watch logs for worker activity
npm run dev 2>&1 | grep -i "sync worker"
```

---

## Next Phase

Once Phase 4 is complete, proceed to [Phase 5: API Endpoints](./PHASE-5-API-ENDPOINTS.md).

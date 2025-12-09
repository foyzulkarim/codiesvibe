# Phase 5: API Endpoints - Sync Management

> **Prerequisites:** Complete Phases 1-4

---

## Overview

This phase creates REST API endpoints for:
- Viewing sync status and statistics
- Querying tools by sync status
- Manually triggering sync operations
- Controlling the background worker

---

## 5.1 Sync Routes

**New File:** `search-api/src/routes/sync.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { toolSyncService } from '../services/tool-sync.service';
import { syncWorkerService } from '../services/sync-worker.service';
import { Tool, SyncCollectionName } from '../models/tool.model';
import { clerkRequireAuth } from '../middleware/clerk-auth.middleware';

const router = Router();

// ============================================
// PUBLIC ENDPOINTS (No Auth Required)
// ============================================

/**
 * GET /api/sync/status
 *
 * Get comprehensive sync statistics with per-collection breakdown.
 * Used by the admin dashboard widget.
 *
 * Response:
 * {
 *   total: number,
 *   synced: number,
 *   pending: number,
 *   stale: number,
 *   failed: number,
 *   perCollection: {
 *     tools: { synced, pending, stale, failed },
 *     functionality: { ... },
 *     usecases: { ... },
 *     interface: { ... }
 *   },
 *   worker: {
 *     running: boolean,
 *     processing: boolean,
 *     lastRunAt: string | null,
 *     lastCycleStats: { ... } | null
 *   }
 * }
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const stats = await toolSyncService.getSyncStats();
    const workerStatus = syncWorkerService.getStatus();

    res.json({
      ...stats,
      worker: workerStatus,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get sync status',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/sync/tools
 *
 * Get paginated list of tools filtered by sync status.
 *
 * Query Parameters:
 * - status: 'all' | 'synced' | 'pending' | 'stale' | 'failed' (default: 'all')
 * - collection: 'all' | 'tools' | 'functionality' | 'usecases' | 'interface' (default: 'all')
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * Response:
 * {
 *   data: Tool[],
 *   pagination: {
 *     page: number,
 *     limit: number,
 *     total: number,
 *     totalPages: number
 *   }
 * }
 */
router.get('/tools', async (req: Request, res: Response) => {
  try {
    const {
      status = 'all',
      collection = 'all',
      page = '1',
      limit = '20',
    } = req.query;

    // Validate and parse pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

    // Build filter
    const filter: any = {};

    if (status && status !== 'all') {
      if (collection && collection !== 'all') {
        // Filter by specific collection status
        filter[`syncMetadata.collections.${collection}.status`] = status;
      } else {
        // Filter by overall status
        filter['syncMetadata.overallStatus'] = status;
      }
    }

    // Query with pagination
    const [tools, total] = await Promise.all([
      Tool.find(filter)
        .sort({ 'syncMetadata.updatedAt': -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('id name slug syncMetadata lastUpdated createdAt')
        .lean(),
      Tool.countDocuments(filter),
    ]);

    res.json({
      data: tools,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get tools',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/sync/worker/status
 *
 * Get detailed worker status.
 *
 * Response:
 * {
 *   running: boolean,
 *   processing: boolean,
 *   lastRunAt: string | null,
 *   lastCycleStats: { ... } | null,
 *   config: { ... }
 * }
 */
router.get('/worker/status', async (req: Request, res: Response) => {
  try {
    const status = syncWorkerService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get worker status',
      message: (error as Error).message,
    });
  }
});

// ============================================
// PROTECTED ENDPOINTS (Auth Required)
// ============================================

/**
 * POST /api/sync/tools/:id/retry
 *
 * Force sync a single tool to all or specific collections.
 *
 * URL Parameters:
 * - id: Tool ID or slug
 *
 * Body (optional):
 * {
 *   force?: boolean,           // Ignore content hashes (default: false)
 *   collections?: string[]     // Specific collections to sync (default: all)
 * }
 *
 * Response:
 * {
 *   toolId: string,
 *   success: boolean,
 *   totalDuration: number,
 *   collections: CollectionSyncResult[],
 *   overallStatus: string
 * }
 */
router.post(
  '/tools/:id/retry',
  clerkRequireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { force = false, collections } = req.body;

      // Validate collections if provided
      const validCollections: SyncCollectionName[] = [
        'tools',
        'functionality',
        'usecases',
        'interface',
      ];

      if (collections && Array.isArray(collections)) {
        const invalidCollections = collections.filter(
          (c: string) => !validCollections.includes(c as SyncCollectionName)
        );

        if (invalidCollections.length > 0) {
          return res.status(400).json({
            error: 'Invalid collections',
            invalidCollections,
            validCollections,
          });
        }
      }

      const result = await toolSyncService.syncTool(id, {
        force,
        collections: collections as SyncCollectionName[] | undefined,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Sync failed',
        message: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/sync/batch
 *
 * Sync multiple tools at once.
 *
 * Body:
 * {
 *   toolIds: string[],         // Required, max 50
 *   force?: boolean,           // Ignore content hashes (default: false)
 *   collections?: string[]     // Specific collections to sync (default: all)
 * }
 *
 * Response:
 * {
 *   results: ToolSyncResult[]
 * }
 */
router.post('/batch', clerkRequireAuth, async (req: Request, res: Response) => {
  try {
    const { toolIds, force = false, collections } = req.body;

    // Validate toolIds
    if (!Array.isArray(toolIds) || toolIds.length === 0) {
      return res.status(400).json({
        error: 'toolIds array is required',
      });
    }

    if (toolIds.length > 50) {
      return res.status(400).json({
        error: 'Maximum 50 tools per batch',
        provided: toolIds.length,
      });
    }

    // Validate collections if provided
    const validCollections: SyncCollectionName[] = [
      'tools',
      'functionality',
      'usecases',
      'interface',
    ];

    if (collections && Array.isArray(collections)) {
      const invalidCollections = collections.filter(
        (c: string) => !validCollections.includes(c as SyncCollectionName)
      );

      if (invalidCollections.length > 0) {
        return res.status(400).json({
          error: 'Invalid collections',
          invalidCollections,
          validCollections,
        });
      }
    }

    const results = await toolSyncService.syncToolBatch(toolIds, {
      force,
      collections: collections as SyncCollectionName[] | undefined,
    });

    res.json({ results });
  } catch (error) {
    res.status(500).json({
      error: 'Batch sync failed',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/sync/all-pending
 *
 * Queue all pending/stale/failed tools for sync.
 * Resets retry counts on failed tools to allow re-processing.
 *
 * Response:
 * {
 *   queued: number,
 *   message: string
 * }
 */
router.post(
  '/all-pending',
  clerkRequireAuth,
  async (req: Request, res: Response) => {
    try {
      // Reset retry counts on failed tools to allow re-processing
      await Tool.updateMany(
        { 'syncMetadata.overallStatus': 'failed' },
        {
          $set: {
            'syncMetadata.collections.tools.retryCount': 0,
            'syncMetadata.collections.functionality.retryCount': 0,
            'syncMetadata.collections.usecases.retryCount': 0,
            'syncMetadata.collections.interface.retryCount': 0,
          },
        }
      );

      // Count tools that will be processed
      const pendingCount = await Tool.countDocuments({
        'syncMetadata.overallStatus': { $in: ['stale', 'pending', 'failed'] },
      });

      res.json({
        queued: pendingCount,
        message: `${pendingCount} tools queued for sync. The background worker will process them.`,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to queue tools',
        message: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/sync/worker/run
 *
 * Manually trigger a worker cycle.
 * Useful for testing or immediate processing.
 *
 * Response:
 * {
 *   message: string
 * }
 */
router.post(
  '/worker/run',
  clerkRequireAuth,
  async (req: Request, res: Response) => {
    try {
      await syncWorkerService.forceRun();

      res.json({
        message: 'Worker cycle completed',
        stats: syncWorkerService.getStatus().lastCycleStats,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Worker run failed',
        message: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/sync/reset/:id
 *
 * Reset sync status for a tool (mark all collections as pending).
 * Useful for debugging or forcing full re-sync.
 *
 * URL Parameters:
 * - id: Tool ID or slug
 *
 * Response:
 * {
 *   message: string,
 *   tool: { id, syncMetadata }
 * }
 */
router.post(
  '/reset/:id',
  clerkRequireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const tool = await Tool.findOneAndUpdate(
        { $or: [{ id }, { slug: id }] },
        {
          $set: {
            'syncMetadata.overallStatus': 'pending',
            'syncMetadata.collections.tools.status': 'pending',
            'syncMetadata.collections.tools.retryCount': 0,
            'syncMetadata.collections.tools.lastError': null,
            'syncMetadata.collections.tools.errorCode': null,
            'syncMetadata.collections.functionality.status': 'pending',
            'syncMetadata.collections.functionality.retryCount': 0,
            'syncMetadata.collections.functionality.lastError': null,
            'syncMetadata.collections.functionality.errorCode': null,
            'syncMetadata.collections.usecases.status': 'pending',
            'syncMetadata.collections.usecases.retryCount': 0,
            'syncMetadata.collections.usecases.lastError': null,
            'syncMetadata.collections.usecases.errorCode': null,
            'syncMetadata.collections.interface.status': 'pending',
            'syncMetadata.collections.interface.retryCount': 0,
            'syncMetadata.collections.interface.lastError': null,
            'syncMetadata.collections.interface.errorCode': null,
            'syncMetadata.updatedAt': new Date(),
          },
        },
        { new: true }
      ).select('id name syncMetadata');

      if (!tool) {
        return res.status(404).json({
          error: 'Tool not found',
          id,
        });
      }

      res.json({
        message: 'Sync status reset. Tool will be synced by the background worker.',
        tool,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Reset failed',
        message: (error as Error).message,
      });
    }
  }
);

export default router;
```

---

## 5.2 Register Routes

**File:** `search-api/src/server.ts`

Add the sync routes to the Express app:

```typescript
// Add import
import syncRoutes from './routes/sync.routes';

// Register routes (after existing routes)
app.use('/api/sync', syncRoutes);
```

---

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync/status` | Get sync statistics and worker status |
| GET | `/api/sync/tools` | List tools filtered by sync status |
| GET | `/api/sync/worker/status` | Get detailed worker status |

### Protected Endpoints (Require Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync/tools/:id/retry` | Force sync a single tool |
| POST | `/api/sync/batch` | Sync multiple tools at once |
| POST | `/api/sync/all-pending` | Queue all pending tools for sync |
| POST | `/api/sync/worker/run` | Manually trigger worker cycle |
| POST | `/api/sync/reset/:id` | Reset sync status for a tool |

---

## Example API Calls

### Get Sync Status

```bash
curl http://localhost:4003/api/sync/status
```

Response:
```json
{
  "total": 150,
  "synced": 145,
  "pending": 2,
  "stale": 2,
  "failed": 1,
  "perCollection": {
    "tools": { "synced": 148, "pending": 1, "stale": 1, "failed": 0 },
    "functionality": { "synced": 147, "pending": 2, "stale": 1, "failed": 0 },
    "usecases": { "synced": 146, "pending": 2, "stale": 1, "failed": 1 },
    "interface": { "synced": 149, "pending": 1, "stale": 0, "failed": 0 }
  },
  "worker": {
    "running": true,
    "processing": false,
    "lastRunAt": "2024-12-07T10:30:00.000Z",
    "lastCycleStats": {
      "processed": 3,
      "successful": 2,
      "failed": 1,
      "skipped": 0,
      "duration": 4523
    }
  }
}
```

### Get Failed Tools

```bash
curl "http://localhost:4003/api/sync/tools?status=failed&page=1&limit=10"
```

### Force Sync a Tool

```bash
curl -X POST http://localhost:4003/api/sync/tools/my-tool-id/retry \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### Sync Only Specific Collections

```bash
curl -X POST http://localhost:4003/api/sync/tools/my-tool-id/retry \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"collections": ["tools", "functionality"]}'
```

### Batch Sync

```bash
curl -X POST http://localhost:4003/api/sync/batch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"toolIds": ["tool-1", "tool-2", "tool-3"], "force": true}'
```

### Queue All Pending

```bash
curl -X POST http://localhost:4003/api/sync/all-pending \
  -H "Authorization: Bearer <token>"
```

---

## Verification Checklist

After implementing Phase 5:

- [ ] `GET /api/sync/status` returns correct statistics
- [ ] `GET /api/sync/tools` supports filtering and pagination
- [ ] `POST /api/sync/tools/:id/retry` triggers sync correctly
- [ ] `POST /api/sync/batch` handles multiple tools
- [ ] `POST /api/sync/all-pending` resets retry counts
- [ ] `POST /api/sync/worker/run` triggers worker cycle
- [ ] Protected endpoints require authentication
- [ ] Error responses are consistent

---

## Next Phase

Once Phase 5 is complete, proceed to [Phase 6: Admin UI](./PHASE-6-ADMIN-UI.md).

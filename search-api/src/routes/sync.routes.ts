/**
 * Sync Routes
 *
 * Admin-only endpoints for managing MongoDB-Qdrant synchronization.
 * All routes require admin authentication.
 */

import { Router, Request, Response } from 'express';
import { syncWorkerService } from '../services/sync-worker.service.js';
import { toolSyncService } from '../services/tool-sync.service.js';
import { mongoDBService } from '../services/mongodb.service.js';
import { SyncCollectionName } from '../types/tool.interfaces.js';
import { searchLogger } from '../config/logger.js';
import { SearchRequest } from '../middleware/correlation.middleware.js';
import { clerkRequireAuth } from '../middleware/clerk-auth.middleware.js';
import { attachUserRole, requireAdmin, RoleAuthenticatedRequest } from '../middleware/role.middleware.js';

const router = Router();

// All sync routes require admin authentication
router.use(clerkRequireAuth, attachUserRole, requireAdmin);

// ============================================
// SYNC STATUS ENDPOINTS
// ============================================

/**
 * GET /api/sync/status - Get overall sync status
 */
router.get('/status', async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;

  try {
    const [syncStats, workerStatus] = await Promise.all([
      syncWorkerService.getSyncStats(),
      syncWorkerService.getStatus(),
    ]);

    searchLogger.info('Sync status retrieved', {
      service: 'sync-api',
      correlationId: searchReq.correlationId,
    });

    res.json({
      stats: syncStats,
      worker: workerStatus,
    });
  } catch (error) {
    searchLogger.error('Failed to retrieve sync status', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: searchReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed to retrieve sync status',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/sync/stats - Get detailed sync statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;

  try {
    const stats = await syncWorkerService.getSyncStats();

    searchLogger.info('Sync stats retrieved', {
      service: 'sync-api',
      correlationId: searchReq.correlationId,
    });

    res.json(stats);
  } catch (error) {
    searchLogger.error('Failed to retrieve sync stats', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: searchReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed to retrieve sync stats',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/sync/worker - Get worker status
 */
router.get('/worker', (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;

  try {
    const status = syncWorkerService.getStatus();

    searchLogger.info('Worker status retrieved', {
      service: 'sync-api',
      correlationId: searchReq.correlationId,
    });

    res.json(status);
  } catch (error) {
    searchLogger.error('Failed to retrieve worker status', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: searchReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed to retrieve worker status',
      code: 'INTERNAL_ERROR',
    });
  }
});

// ============================================
// SYNC OPERATION ENDPOINTS
// ============================================

/**
 * POST /api/sync/sweep - Trigger a manual sync sweep
 */
router.post('/sweep', async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;

  try {
    searchLogger.info('Manual sync sweep triggered', {
      service: 'sync-api',
      correlationId: authReq.correlationId,
      triggeredBy: authReq.auth.userId,
    });

    const result = await syncWorkerService.triggerSweep();

    searchLogger.info('Manual sync sweep completed', {
      service: 'sync-api',
      correlationId: authReq.correlationId,
      result,
    });

    res.json({
      message: 'Sync sweep completed',
      result,
    });
  } catch (error) {
    searchLogger.error('Failed to trigger sync sweep', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: authReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed to trigger sync sweep',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/sync/retry/:toolId - Retry sync for a specific tool
 */
router.post('/retry/:toolId', async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const { toolId } = req.params;

  try {
    searchLogger.info('Manual sync retry triggered', {
      service: 'sync-api',
      correlationId: authReq.correlationId,
      triggeredBy: authReq.auth.userId,
      toolId,
    });

    const result = await syncWorkerService.forceRetryTool(toolId);

    if (result.success) {
      searchLogger.info('Manual sync retry completed', {
        service: 'sync-api',
        correlationId: authReq.correlationId,
        toolId,
      });

      res.json({
        message: 'Sync retry completed',
        toolId,
        success: true,
      });
    } else {
      // Log the actual error so it's visible in logs
      searchLogger.error('Sync retry failed', new Error(result.error || 'Unknown error'), {
        service: 'sync-api',
        correlationId: authReq.correlationId,
        toolId,
        errorMessage: result.error,
      });

      res.status(500).json({
        error: result.error || 'Sync retry failed',
        code: 'SYNC_RETRY_FAILED',
        toolId,
        success: false,
      });
    }
  } catch (error) {
    searchLogger.error('Failed to retry sync', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: authReq.correlationId,
      toolId,
    });

    res.status(500).json({
      error: 'Failed to retry sync',
      code: 'INTERNAL_ERROR',
      toolId,
    });
  }
});

/**
 * POST /api/sync/retry-all - Retry all failed syncs
 */
router.post('/retry-all', async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;

  try {
    searchLogger.info('Retry all failed syncs triggered', {
      service: 'sync-api',
      correlationId: authReq.correlationId,
      triggeredBy: authReq.auth.userId,
    });

    const result = await syncWorkerService.forceRetryAllFailed();

    searchLogger.info('Retry all failed syncs completed', {
      service: 'sync-api',
      correlationId: authReq.correlationId,
      result,
    });

    res.json({
      message: 'Retry all failed syncs completed',
      result,
    });
  } catch (error) {
    searchLogger.error('Failed to retry all failed syncs', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: authReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed to retry all failed syncs',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/sync/reset/:toolId - Reset retry count for a tool
 */
router.post('/reset/:toolId', async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const { toolId } = req.params;

  try {
    const result = await syncWorkerService.resetRetryCount(toolId);

    if (result) {
      searchLogger.info('Retry count reset', {
        service: 'sync-api',
        correlationId: authReq.correlationId,
        toolId,
        resetBy: authReq.auth.userId,
      });

      res.json({
        message: 'Retry count reset',
        toolId,
        success: true,
      });
    } else {
      res.status(404).json({
        error: 'Tool not found',
        code: 'TOOL_NOT_FOUND',
        toolId,
      });
    }
  } catch (error) {
    searchLogger.error('Failed to reset retry count', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: authReq.correlationId,
      toolId,
    });

    res.status(500).json({
      error: 'Failed to reset retry count',
      code: 'INTERNAL_ERROR',
      toolId,
    });
  }
});

/**
 * POST /api/sync/stale/:toolId - Mark a tool as stale (needs re-sync)
 */
router.post('/stale/:toolId', async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const { toolId } = req.params;

  try {
    const result = await syncWorkerService.markToolAsStale(toolId);

    if (result) {
      searchLogger.info('Tool marked as stale', {
        service: 'sync-api',
        correlationId: authReq.correlationId,
        toolId,
        markedBy: authReq.auth.userId,
      });

      res.json({
        message: 'Tool marked as stale - will be re-synced',
        toolId,
        success: true,
      });
    } else {
      res.status(404).json({
        error: 'Tool not found',
        code: 'TOOL_NOT_FOUND',
        toolId,
      });
    }
  } catch (error) {
    searchLogger.error('Failed to mark tool as stale', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: authReq.correlationId,
      toolId,
    });

    res.status(500).json({
      error: 'Failed to mark tool as stale',
      code: 'INTERNAL_ERROR',
      toolId,
    });
  }
});

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * POST /api/sync/batch/stale - Mark multiple tools as stale
 */
router.post('/batch/stale', async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const { toolIds } = req.body as { toolIds: string[] };

  if (!Array.isArray(toolIds) || toolIds.length === 0) {
    return res.status(400).json({
      error: 'toolIds array is required',
      code: 'VALIDATION_ERROR',
    });
  }

  if (toolIds.length > 100) {
    return res.status(400).json({
      error: 'Maximum 100 tools per batch',
      code: 'VALIDATION_ERROR',
    });
  }

  try {
    const results: Array<{ toolId: string; success: boolean }> = [];

    for (const toolId of toolIds) {
      const result = await syncWorkerService.markToolAsStale(toolId);
      results.push({ toolId, success: result });
    }

    const successCount = results.filter((r) => r.success).length;

    searchLogger.info('Batch stale operation completed', {
      service: 'sync-api',
      correlationId: authReq.correlationId,
      totalTools: toolIds.length,
      successCount,
      markedBy: authReq.auth.userId,
    });

    res.json({
      message: 'Batch stale operation completed',
      totalTools: toolIds.length,
      successCount,
      results,
    });
  } catch (error) {
    searchLogger.error('Failed batch stale operation', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: authReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed batch stale operation',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/sync/batch/sync - Force sync multiple tools
 */
router.post('/batch/sync', async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const { toolIds, collections } = req.body as { toolIds: string[]; collections?: SyncCollectionName[] };

  if (!Array.isArray(toolIds) || toolIds.length === 0) {
    return res.status(400).json({
      error: 'toolIds array is required',
      code: 'VALIDATION_ERROR',
    });
  }

  if (toolIds.length > 50) {
    return res.status(400).json({
      error: 'Maximum 50 tools per batch sync',
      code: 'VALIDATION_ERROR',
    });
  }

  try {
    const results: Array<{ toolId: string; success: boolean; error?: string }> = [];

    for (const toolId of toolIds) {
      const tool = await mongoDBService.findToolByIdOrSlug(toolId);

      if (!tool) {
        results.push({ toolId, success: false, error: 'Tool not found' });
        continue;
      }

      const syncResult = collections
        ? await toolSyncService.syncToolToCollections(tool, collections, { force: true })
        : await toolSyncService.syncTool(tool, { force: true });

      results.push({
        toolId,
        success: syncResult.success,
        error: syncResult.failedCount > 0 ? 'Some collections failed' : undefined,
      });
    }

    const successCount = results.filter((r) => r.success).length;

    searchLogger.info('Batch sync operation completed', {
      service: 'sync-api',
      correlationId: authReq.correlationId,
      totalTools: toolIds.length,
      successCount,
      syncedBy: authReq.auth.userId,
    });

    res.json({
      message: 'Batch sync operation completed',
      totalTools: toolIds.length,
      successCount,
      results,
    });
  } catch (error) {
    searchLogger.error('Failed batch sync operation', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: authReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed batch sync operation',
      code: 'INTERNAL_ERROR',
    });
  }
});

// ============================================
// TOOL SYNC STATUS ENDPOINTS
// ============================================

/**
 * GET /api/sync/tool/:toolId - Get sync status for a specific tool
 */
router.get('/tool/:toolId', async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;
  const { toolId } = req.params;

  try {
    const tool = await mongoDBService.findToolByIdOrSlug(toolId);

    if (!tool) {
      return res.status(404).json({
        error: 'Tool not found',
        code: 'TOOL_NOT_FOUND',
        toolId,
      });
    }

    res.json({
      toolId: tool.id,
      name: tool.name,
      approvalStatus: tool.approvalStatus,
      syncMetadata: tool.syncMetadata,
    });
  } catch (error) {
    searchLogger.error('Failed to retrieve tool sync status', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: searchReq.correlationId,
      toolId,
    });

    res.status(500).json({
      error: 'Failed to retrieve tool sync status',
      code: 'INTERNAL_ERROR',
      toolId,
    });
  }
});

/**
 * GET /api/sync/failed - Get list of tools with failed sync
 */
router.get('/failed', async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;
  const { limit = 50, page = 1 } = req.query;

  try {
    const filter = {
      approvalStatus: 'approved',
      'syncMetadata.overallStatus': 'failed',
    };

    const { data: tools, total } = await mongoDBService.findToolsPaginated({
      filter,
      sort: { 'syncMetadata.updatedAt': -1 },
      page: Number(page),
      limit: Number(limit),
    });

    // Map to return only needed fields
    const mappedTools = tools.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      syncMetadata: t.syncMetadata,
      approvalStatus: t.approvalStatus,
    }));

    res.json({
      data: mappedTools,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    searchLogger.error('Failed to retrieve failed syncs', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: searchReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed to retrieve failed syncs',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/sync/pending - Get list of tools with pending sync
 */
router.get('/pending', async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;
  const { limit = 50, page = 1 } = req.query;

  try {
    const filter = {
      approvalStatus: 'approved',
      'syncMetadata.overallStatus': 'pending',
    };

    const { data: tools, total } = await mongoDBService.findToolsPaginated({
      filter,
      sort: { 'syncMetadata.updatedAt': -1 },
      page: Number(page),
      limit: Number(limit),
    });

    // Map to return only needed fields
    const mappedTools = tools.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      syncMetadata: t.syncMetadata,
      approvalStatus: t.approvalStatus,
    }));

    res.json({
      data: mappedTools,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    searchLogger.error('Failed to retrieve pending syncs', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'sync-api',
      correlationId: searchReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed to retrieve pending syncs',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;

/**
 * Sync Admin Hooks
 *
 * React Query hooks for MongoDB-Qdrant sync management.
 * All hooks require admin authentication (handled by searchClient).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchClient } from '@/api/search-client';
import { toast } from 'sonner';
import type { SyncStatus, SyncCollectionName, SyncMetadata, Tool } from './useToolsAdmin';

// ============================================
// TYPES
// ============================================

export interface SyncStats {
  total: number;
  synced: number;
  pending: number;
  failed: number;
  byCollection: Record<SyncCollectionName, {
    synced: number;
    pending: number;
    failed: number;
  }>;
}

export interface SyncWorkerConfig {
  sweepInterval: number;
  batchSize: number;
  maxRetries: number;
  baseBackoffDelay: number;
  maxBackoffDelay: number;
  enabled: boolean;
}

export interface SyncWorkerStatus {
  isRunning: boolean;
  lastSweepAt: string | null;
  lastSweepDuration: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  nextSweepAt: string | null;
  config: SyncWorkerConfig;
}

export interface SyncStatusResponse {
  stats: SyncStats;
  worker: SyncWorkerStatus;
}

export interface SweepResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: Array<{ toolId: string; error: string }>;
}

export interface RetryAllResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ toolId: string; error: string }>;
}

export interface BatchStaleResult {
  totalTools: number;
  successCount: number;
  results: Array<{ toolId: string; success: boolean }>;
}

export interface BatchSyncResult {
  totalTools: number;
  successCount: number;
  results: Array<{ toolId: string; success: boolean; error?: string }>;
}

export interface ToolSyncStatusResponse {
  toolId: string;
  name: string;
  approvalStatus: string;
  syncMetadata: SyncMetadata;
}

export interface FailedToolsResponse {
  data: Array<Pick<Tool, 'id' | 'name' | 'slug' | 'syncMetadata' | 'approvalStatus'>>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// QUERY KEYS
// ============================================

export const syncAdminKeys = {
  all: ['sync-admin'] as const,
  status: () => [...syncAdminKeys.all, 'status'] as const,
  stats: () => [...syncAdminKeys.all, 'stats'] as const,
  worker: () => [...syncAdminKeys.all, 'worker'] as const,
  tool: (toolId: string) => [...syncAdminKeys.all, 'tool', toolId] as const,
  failed: (params: { page?: number; limit?: number }) =>
    [...syncAdminKeys.all, 'failed', params] as const,
  pending: (params: { page?: number; limit?: number }) =>
    [...syncAdminKeys.all, 'pending', params] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to fetch overall sync status (admin only)
 */
export function useSyncStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: syncAdminKeys.status(),
    queryFn: async (): Promise<SyncStatusResponse> => {
      const response = await searchClient.get<SyncStatusResponse>('/sync/status');
      return response.data;
    },
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch detailed sync statistics (admin only)
 */
export function useSyncStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: syncAdminKeys.stats(),
    queryFn: async (): Promise<SyncStats> => {
      const response = await searchClient.get<SyncStats>('/sync/stats');
      return response.data;
    },
    staleTime: 10 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch worker status (admin only)
 */
export function useSyncWorkerStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: syncAdminKeys.worker(),
    queryFn: async (): Promise<SyncWorkerStatus> => {
      const response = await searchClient.get<SyncWorkerStatus>('/sync/worker');
      return response.data;
    },
    staleTime: 5 * 1000, // 5 seconds - worker status changes frequently
    refetchInterval: 15 * 1000, // Auto-refresh every 15 seconds
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch sync status for a specific tool (admin only)
 */
export function useToolSyncStatus(toolId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: syncAdminKeys.tool(toolId),
    queryFn: async (): Promise<ToolSyncStatusResponse> => {
      const response = await searchClient.get<ToolSyncStatusResponse>(`/sync/tool/${toolId}`);
      return response.data;
    },
    enabled: (options?.enabled ?? true) && !!toolId,
  });
}

/**
 * Hook to fetch failed tools (admin only)
 */
export function useFailedTools(params: { page?: number; limit?: number } = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: syncAdminKeys.failed(params),
    queryFn: async (): Promise<FailedToolsResponse> => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      const response = await searchClient.get<FailedToolsResponse>(
        `/sync/failed?${searchParams.toString()}`
      );
      return response.data;
    },
    staleTime: 10 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch pending tools (admin only)
 */
export function usePendingTools(params: { page?: number; limit?: number } = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: syncAdminKeys.pending(params),
    queryFn: async (): Promise<FailedToolsResponse> => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      const response = await searchClient.get<FailedToolsResponse>(
        `/sync/pending?${searchParams.toString()}`
      );
      return response.data;
    },
    staleTime: 10 * 1000,
    enabled: options?.enabled ?? true,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to trigger a manual sync sweep (admin only)
 */
export function useTriggerSweep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ message: string; result: SweepResult }> => {
      const response = await searchClient.post<{ message: string; result: SweepResult }>(
        '/sync/sweep',
        {},
        {
          timeout: 600000, // 10 minutes timeout for sweep operations (processes multiple tools)
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate sync queries AND tools queries to update sync status in tools list
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tools-admin'] });
      const { result } = data;
      toast.success(
        `Sync sweep completed: ${result.succeeded} synced, ${result.failed} failed, ${result.skipped} skipped`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to trigger sync sweep');
    },
  });
}

/**
 * Hook to retry sync for a specific tool (admin only)
 */
export function useRetryToolSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toolId: string): Promise<{ message: string; toolId: string; success: boolean }> => {
      const response = await searchClient.post<{ message: string; toolId: string; success: boolean }>(
        `/sync/retry/${toolId}`,
        {},
        {
          timeout: 300000, // 5 minutes timeout for sync operations
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate sync queries AND tools queries to update sync status in tools list
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tools-admin'] });
      toast.success(`Sync retry completed for tool: ${data.toolId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to retry sync');
    },
  });
}

/**
 * Hook to retry all failed syncs (admin only)
 */
export function useRetryAllFailed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ message: string; result: RetryAllResult }> => {
      const response = await searchClient.post<{ message: string; result: RetryAllResult }>(
        '/sync/retry-all',
        {},
        {
          timeout: 600000, // 10 minutes timeout for retry-all operations
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate sync queries AND tools queries to update sync status in tools list
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tools-admin'] });
      const { result } = data;
      toast.success(
        `Retry all completed: ${result.succeeded} succeeded, ${result.failed} failed`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to retry all failed syncs');
    },
  });
}

/**
 * Hook to reset retry count for a tool (admin only)
 */
export function useResetRetryCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toolId: string): Promise<{ message: string; toolId: string; success: boolean }> => {
      const response = await searchClient.post<{ message: string; toolId: string; success: boolean }>(
        `/sync/reset/${toolId}`
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate sync queries AND tools queries to update sync status in tools list
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.tool(data.toolId) });
      queryClient.invalidateQueries({ queryKey: ['tools-admin'] });
      toast.success(`Retry count reset for tool: ${data.toolId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reset retry count');
    },
  });
}

/**
 * Hook to mark a tool as stale (admin only)
 */
export function useMarkToolAsStale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toolId: string): Promise<{ message: string; toolId: string; success: boolean }> => {
      const response = await searchClient.post<{ message: string; toolId: string; success: boolean }>(
        `/sync/stale/${toolId}`
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate sync queries AND tools queries to update sync status in tools list
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tools-admin'] });
      toast.success(`Tool marked as stale: ${data.toolId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark tool as stale');
    },
  });
}

/**
 * Hook to batch mark tools as stale (admin only)
 */
export function useBatchMarkAsStale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toolIds: string[]): Promise<{ message: string } & BatchStaleResult> => {
      const response = await searchClient.post<{ message: string } & BatchStaleResult>(
        '/sync/batch/stale',
        { toolIds }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate sync queries AND tools queries to update sync status in tools list
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tools-admin'] });
      toast.success(
        `Batch stale operation: ${data.successCount}/${data.totalTools} tools marked as stale`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to batch mark tools as stale');
    },
  });
}

/**
 * Hook to batch sync tools (admin only)
 */
export function useBatchSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      toolIds,
      collections,
    }: {
      toolIds: string[];
      collections?: SyncCollectionName[];
    }): Promise<{ message: string } & BatchSyncResult> => {
      const response = await searchClient.post<{ message: string } & BatchSyncResult>(
        '/sync/batch/sync',
        { toolIds, collections },
        {
          timeout: 600000, // 10 minutes timeout for batch sync operations
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate sync queries AND tools queries to update sync status in tools list
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tools-admin'] });
      toast.success(
        `Batch sync completed: ${data.successCount}/${data.totalTools} tools synced`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to batch sync tools');
    },
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook to get sync health status
 * Returns a computed health status based on stats
 */
export function useSyncHealth() {
  const { data: status, isLoading, error } = useSyncStatus();

  const health = status?.stats ? {
    isHealthy: status.stats.failed === 0 && status.stats.pending < 10,
    isDegraded: status.stats.failed > 0 || status.stats.pending >= 10,
    isCritical: status.stats.failed > status.stats.synced * 0.1, // More than 10% failed
    syncedPercentage: status.stats.total > 0
      ? Math.round((status.stats.synced / status.stats.total) * 100)
      : 0,
    failedPercentage: status.stats.total > 0
      ? Math.round((status.stats.failed / status.stats.total) * 100)
      : 0,
    pendingPercentage: status.stats.total > 0
      ? Math.round((status.stats.pending / status.stats.total) * 100)
      : 0,
  } : null;

  return {
    health,
    stats: status?.stats,
    worker: status?.worker,
    isLoading,
    error,
  };
}

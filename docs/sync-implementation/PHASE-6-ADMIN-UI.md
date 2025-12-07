# Phase 6: Admin UI - Sync Visibility

> **Prerequisites:** Complete Phases 1-5

---

## Overview

This phase adds sync visibility to the existing Admin UI by:
- Extending type definitions in `useToolsAdmin.ts`
- Adding sync hooks that follow the existing `fetch`-based pattern
- Creating reusable sync components
- Integrating sync status column into the existing `ToolsList.tsx`

**Integration Approach:** We're extending existing files where possible to maintain consistency with the established patterns (TanStack Query, fetch API, Sonner toasts).

---

## 6.1 Type Definitions

**File:** `src/hooks/api/useToolsAdmin.ts`

Add these type definitions **after the existing interfaces** (around line 68):

```typescript
// ============================================
// SYNC STATUS TYPES (add after existing interfaces)
// ============================================

/**
 * Possible sync statuses
 */
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'stale';

/**
 * Collection names that are synced to Qdrant
 */
export type SyncCollectionName = 'tools' | 'functionality' | 'usecases' | 'interface';

/**
 * Sync status for a single collection
 */
export interface CollectionSyncStatus {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastSyncAttemptAt: string | null;
  lastError: string | null;
  errorCode: string | null;
  retryCount: number;
  contentHash: string;
  vectorVersion: number;
}

/**
 * Overall sync metadata for a tool
 */
export interface SyncMetadata {
  overallStatus: SyncStatus;
  collections: Record<SyncCollectionName, CollectionSyncStatus>;
  lastModifiedFields: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Update the existing Tool interface** (around line 19) to include `syncMetadata`:

```typescript
export interface Tool {
  _id?: string;
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  tagline?: string;
  categories: string[];
  industries: string[];
  userTypes: string[];
  pricing: { tier: string; billingPeriod: string; price: number }[];
  pricingModel: ('Free' | 'Paid')[];
  pricingUrl?: string;
  interface: string[];
  functionality: string[];
  deployment: string[];
  logoUrl?: string;
  website?: string;
  documentation?: string;
  status: 'active' | 'beta' | 'deprecated' | 'discontinued';
  contributor: string;
  dateAdded: string;
  lastUpdated?: string;
  createdAt?: string;
  updatedAt?: string;

  /** Sync status metadata - added for Qdrant sync tracking */
  syncMetadata?: SyncMetadata;
}
```

**Update ToolsQueryParams** to add sync filtering:

```typescript
export interface ToolsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'dateAdded' | 'status';
  sortOrder?: 'asc' | 'desc';
  status?: string;
  category?: string;
  industry?: string;
  pricingModel?: string;

  // New sync filters
  syncStatus?: SyncStatus | 'all';
  syncCollection?: SyncCollectionName | 'all';
}
```

---

## 6.2 Sync Hooks

**New File:** `src/hooks/api/useSyncAdmin.ts`

This file follows the same patterns as `useToolsAdmin.ts` (fetch API, TanStack Query, Sonner toasts):

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { SyncCollectionName, SyncStatus, toolsAdminKeys } from './useToolsAdmin';

// Reuse the same API URL pattern from useToolsAdmin
const getSearchApiUrl = () => {
  return import.meta.env.VITE_SEARCH_API_URL || 'http://localhost:4003';
};

// ============================================
// TYPES
// ============================================

/**
 * Per-collection statistics
 */
export interface CollectionStats {
  synced: number;
  pending: number;
  stale: number;
  failed: number;
}

/**
 * Worker status from API
 */
export interface WorkerStatus {
  running: boolean;
  processing: boolean;
  lastRunAt: string | null;
  lastCycleStats: {
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
    duration: number;
  } | null;
  config: {
    enabled: boolean;
    intervalMs: number;
    batchSize: number;
    maxRetries: number;
  };
}

/**
 * Overall sync statistics
 */
export interface SyncStats {
  total: number;
  synced: number;
  pending: number;
  stale: number;
  failed: number;
  perCollection: Record<SyncCollectionName, CollectionStats>;
  worker: WorkerStatus;
}

/**
 * Result of syncing a single collection
 */
export interface CollectionSyncResult {
  collection: SyncCollectionName;
  success: boolean;
  duration: number;
  error?: string;
  errorCode?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Result of syncing a tool
 */
export interface ToolSyncResult {
  toolId: string;
  success: boolean;
  totalDuration: number;
  collections: CollectionSyncResult[];
  overallStatus: SyncStatus;
}

// ============================================
// QUERY KEYS (following useToolsAdmin pattern)
// ============================================

export const syncAdminKeys = {
  all: ['sync-admin'] as const,
  status: () => [...syncAdminKeys.all, 'status'] as const,
  tools: (params: { status?: string; collection?: string; page?: number; limit?: number }) =>
    [...syncAdminKeys.all, 'tools', params] as const,
};

// ============================================
// HOOKS
// ============================================

/**
 * Get overall sync status and statistics
 *
 * Refreshes every 15 seconds to show near-real-time status.
 */
export function useSyncStatus() {
  return useQuery<SyncStats>({
    queryKey: syncAdminKeys.status(),
    queryFn: async () => {
      const response = await fetch(`${getSearchApiUrl()}/api/sync/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }
      return response.json();
    },
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

/**
 * Get tools filtered by sync status
 */
export function useSyncTools(params: {
  status?: SyncStatus | 'all';
  collection?: SyncCollectionName | 'all';
  page?: number;
  limit?: number;
}) {
  const { status = 'all', collection = 'all', page = 1, limit = 20 } = params;

  return useQuery({
    queryKey: syncAdminKeys.tools({ status, collection, page, limit }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (status !== 'all') searchParams.set('status', status);
      if (collection !== 'all') searchParams.set('collection', collection);
      searchParams.set('page', String(page));
      searchParams.set('limit', String(limit));

      const response = await fetch(
        `${getSearchApiUrl()}/api/sync/tools?${searchParams.toString()}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch sync tools');
      }
      return response.json();
    },
  });
}

/**
 * Sync a single tool (retry/force sync)
 */
export function useSyncTool() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      toolId,
      force = false,
      collections,
    }: {
      toolId: string;
      force?: boolean;
      collections?: SyncCollectionName[];
    }): Promise<ToolSyncResult> => {
      const token = await getToken();
      const response = await fetch(
        `${getSearchApiUrl()}/api/sync/tools/${toolId}/retry`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ force, collections }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to sync tool');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.lists() });
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.all });

      // Show result toast
      const successCount = data.collections.filter((c) => c.success).length;
      const totalCount = data.collections.length;

      if (data.success) {
        toast.success(`Synced to ${successCount}/${totalCount} collections`);
      } else {
        toast.warning(
          `Partial sync: ${successCount}/${totalCount} collections succeeded`
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Sync failed');
    },
  });
}

/**
 * Sync multiple tools in batch
 */
export function useSyncBatch() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      toolIds,
      force = false,
      collections,
    }: {
      toolIds: string[];
      force?: boolean;
      collections?: SyncCollectionName[];
    }) => {
      const token = await getToken();
      const response = await fetch(`${getSearchApiUrl()}/api/sync/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ toolIds, force, collections }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to batch sync');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.lists() });
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.all });

      const successCount = data.results.filter((r: ToolSyncResult) => r.success).length;
      toast.success(`Synced ${successCount}/${data.results.length} tools`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Batch sync failed');
    },
  });
}

/**
 * Queue all pending/stale/failed tools for sync
 */
export function useSyncAllPending() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const response = await fetch(`${getSearchApiUrl()}/api/sync/all-pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to queue tools');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.all });
      toast.success(`${data.queued} tools queued for sync`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to queue tools');
    },
  });
}

/**
 * Force run worker cycle
 */
export function useForceWorkerRun() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const response = await fetch(`${getSearchApiUrl()}/api/sync/worker/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Worker run failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.all });
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.lists() });

      const stats = data.stats;
      if (stats) {
        toast.success(
          `Worker completed: ${stats.successful}/${stats.processed} synced`
        );
      } else {
        toast.success('Worker cycle completed');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Worker run failed');
    },
  });
}

/**
 * Reset sync status for a tool (marks as pending for re-sync)
 */
export function useResetSyncStatus() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (toolId: string) => {
      const token = await getToken();
      const response = await fetch(`${getSearchApiUrl()}/api/sync/reset/${toolId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Reset failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.lists() });
      queryClient.invalidateQueries({ queryKey: syncAdminKeys.all });
      toast.success('Sync status reset');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Reset failed');
    },
  });
}
```

---

## 6.3 Sync Status Indicator Component

**New File:** `src/components/admin/SyncStatusIndicator.tsx`

```tsx
import React from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Tool, SyncCollectionName, SyncStatus } from '@/hooks/api/useToolsAdmin';
import { useSyncTool } from '@/hooks/api/useSyncAdmin';
import { cn } from '@/lib/utils';

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG: Record<
  SyncStatus,
  { icon: typeof CheckCircle; color: string; bgColor: string; label: string }
> = {
  synced: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Synced',
  },
  pending: {
    icon: Clock,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    label: 'Pending',
  },
  stale: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    label: 'Stale',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Failed',
  },
};

const COLLECTION_LABELS: Record<SyncCollectionName, string> = {
  tools: 'T',
  functionality: 'F',
  usecases: 'U',
  interface: 'I',
};

const COLLECTION_FULL_NAMES: Record<SyncCollectionName, string> = {
  tools: 'Tools',
  functionality: 'Functionality',
  usecases: 'Use Cases',
  interface: 'Interface',
};

// ============================================
// COMPONENT
// ============================================

interface SyncStatusIndicatorProps {
  tool: Tool;
  showCollectionDetails?: boolean;
  showSyncButton?: boolean;
  compact?: boolean;
}

export function SyncStatusIndicator({
  tool,
  showCollectionDetails = true,
  showSyncButton = true,
  compact = false,
}: SyncStatusIndicatorProps) {
  const syncTool = useSyncTool();

  const overallStatus = tool.syncMetadata?.overallStatus ?? 'pending';
  const config = STATUS_CONFIG[overallStatus];
  const Icon = config.icon;

  // Build tooltip content with per-collection details
  const renderTooltipContent = () => {
    if (!tool.syncMetadata?.collections) {
      return <p className="text-sm">No sync data available</p>;
    }

    const collections = tool.syncMetadata.collections;

    return (
      <div className="space-y-3 text-xs max-w-xs">
        <div className="font-medium text-sm">{config.label}</div>

        <div className="space-y-2">
          {(
            Object.entries(collections) as [SyncCollectionName, any][]
          ).map(([name, status]) => {
            const colConfig = STATUS_CONFIG[status.status as SyncStatus];
            const ColIcon = colConfig.icon;

            return (
              <div key={name} className="space-y-1">
                <div className="flex items-center gap-2">
                  <ColIcon className={cn('h-3 w-3', colConfig.color)} />
                  <span className="font-medium">
                    {COLLECTION_FULL_NAMES[name]}
                  </span>
                </div>

                {status.status === 'synced' && status.lastSyncedAt && (
                  <div className="text-gray-400 pl-5">
                    Synced{' '}
                    {formatDistanceToNow(new Date(status.lastSyncedAt))} ago
                  </div>
                )}

                {status.status === 'failed' && status.lastError && (
                  <div className="text-red-400 pl-5 break-words">
                    {status.lastError}
                  </div>
                )}

                {status.status === 'failed' && status.retryCount > 0 && (
                  <div className="text-gray-400 pl-5">
                    Retries: {status.retryCount}/5
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {tool.syncMetadata.lastModifiedFields?.length > 0 && (
          <div className="pt-2 border-t border-gray-700">
            <div className="text-gray-400">Last modified:</div>
            <div className="text-gray-300">
              {tool.syncMetadata.lastModifiedFields.join(', ')}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render collection badges
  const renderCollectionBadges = () => {
    if (!tool.syncMetadata?.collections) return null;

    return (
      <div className="flex gap-0.5">
        {(
          Object.entries(tool.syncMetadata.collections) as [
            SyncCollectionName,
            any
          ][]
        ).map(([name, status]) => {
          const colConfig = STATUS_CONFIG[status.status as SyncStatus];

          return (
            <Badge
              key={name}
              variant="outline"
              className={cn(
                'h-4 w-4 p-0 flex items-center justify-center text-[10px] font-mono',
                colConfig.color,
                'border-current'
              )}
            >
              {COLLECTION_LABELS[name]}
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <div className={cn('rounded p-0.5', config.bgColor)}>
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>

              {showCollectionDetails && !compact && renderCollectionBadges()}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-gray-900 border-gray-700">
            {renderTooltipContent()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showSyncButton &&
        (overallStatus === 'stale' || overallStatus === 'failed') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              syncTool.mutate({ toolId: tool.id });
            }}
            disabled={syncTool.isPending}
          >
            <RefreshCw
              className={cn(
                'h-3 w-3',
                syncTool.isPending && 'animate-spin'
              )}
            />
          </Button>
        )}
    </div>
  );
}
```

---

## 6.4 Sync Dashboard Widget

**New File:** `src/components/admin/SyncStatusWidget.tsx`

```tsx
import React from 'react';
import {
  useSyncStatus,
  useSyncAllPending,
  useForceWorkerRun,
} from '@/hooks/api/useSyncAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Play, AlertCircle } from 'lucide-react';
import { SyncCollectionName } from '@/hooks/api/useToolsAdmin';
import { cn } from '@/lib/utils';

// ============================================
// CONSTANTS
// ============================================

const COLLECTION_NAMES: Record<SyncCollectionName, string> = {
  tools: 'Tools',
  functionality: 'Functionality',
  usecases: 'Use Cases',
  interface: 'Interface',
};

// ============================================
// COMPONENT
// ============================================

export function SyncStatusWidget() {
  const { data: stats, isLoading, error, refetch } = useSyncStatus();
  const syncAllPending = useSyncAllPending();
  const forceWorkerRun = useForceWorkerRun();

  // Loading state
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-2 bg-muted rounded" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !stats) {
    return (
      <Card className="mb-6 border-red-500/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load sync status</span>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate health percentage
  const healthPercent =
    stats.total > 0 ? Math.round((stats.synced / stats.total) * 100) : 100;
  const needsAttention = stats.stale + stats.failed + stats.pending;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Vector Sync Health</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{healthPercent}% synced</span>
            <span className="text-muted-foreground">
              {stats.synced}/{stats.total} tools
            </span>
          </div>
          <Progress
            value={healthPercent}
            className={cn(
              'h-2',
              healthPercent === 100 && 'bg-green-500/20',
              healthPercent < 100 && healthPercent >= 80 && 'bg-yellow-500/20',
              healthPercent < 80 && 'bg-red-500/20'
            )}
          />
        </div>

        {/* Status Counts */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-green-500/10 rounded p-2">
            <div className="font-semibold text-green-600">{stats.synced}</div>
            <div className="text-xs text-muted-foreground">Synced</div>
          </div>
          <div className="bg-yellow-500/10 rounded p-2">
            <div className="font-semibold text-yellow-600">{stats.stale}</div>
            <div className="text-xs text-muted-foreground">Stale</div>
          </div>
          <div className="bg-red-500/10 rounded p-2">
            <div className="font-semibold text-red-600">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="bg-gray-500/10 rounded p-2">
            <div className="font-semibold text-gray-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* Per-Collection Status */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Per Collection
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {(
              Object.entries(stats.perCollection) as [
                SyncCollectionName,
                any
              ][]
            ).map(([name, colStats]) => {
              const colPercent =
                stats.total > 0
                  ? Math.round((colStats.synced / stats.total) * 100)
                  : 100;

              return (
                <div
                  key={name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">
                    {COLLECTION_NAMES[name]}
                  </span>
                  <div className="flex items-center gap-1">
                    <Progress value={colPercent} className="h-1 w-12" />
                    <span
                      className={cn(
                        'w-8 text-right font-mono',
                        colPercent === 100 && 'text-green-500',
                        colPercent < 100 && 'text-yellow-500'
                      )}
                    >
                      {colPercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sync All Button */}
        {needsAttention > 0 && (
          <Button
            size="sm"
            className="w-full"
            onClick={() => syncAllPending.mutate()}
            disabled={syncAllPending.isPending}
          >
            {syncAllPending.isPending ? (
              <>
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                Queueing...
              </>
            ) : (
              `Queue ${needsAttention} items for sync`
            )}
          </Button>
        )}

        {/* Worker Status */}
        <div className="flex items-center justify-between text-xs border-t pt-3">
          <div className="flex items-center gap-2">
            <Badge
              variant={stats.worker.running ? 'default' : 'secondary'}
              className="h-5 text-xs"
            >
              {stats.worker.running ? 'Running' : 'Stopped'}
            </Badge>
            {stats.worker.processing && (
              <Badge variant="outline" className="h-5 text-xs">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Processing
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => forceWorkerRun.mutate()}
            disabled={forceWorkerRun.isPending || stats.worker.processing}
          >
            <Play className="h-3 w-3 mr-1" />
            Run Now
          </Button>
        </div>

        {/* Last Run Info */}
        {stats.worker.lastRunAt && (
          <div className="text-xs text-muted-foreground text-center">
            Last run:{' '}
            {formatDistanceToNow(new Date(stats.worker.lastRunAt))} ago
            {stats.worker.lastCycleStats && (
              <span className="ml-1">
                ({stats.worker.lastCycleStats.successful}/
                {stats.worker.lastCycleStats.processed} synced in{' '}
                {(stats.worker.lastCycleStats.duration / 1000).toFixed(1)}s)
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 6.5 Integration with ToolsList

**File:** `src/pages/admin/ToolsList.tsx`

This section shows exact changes to integrate sync status into the existing tools list.

### Step 1: Add Imports

Add at the top of the file (after existing imports):

```tsx
// Add after line 43 (after existing lucide imports)
import { SyncStatusIndicator } from '@/components/admin/SyncStatusIndicator';
import { SyncStatusWidget } from '@/components/admin/SyncStatusWidget';
```

### Step 2: Add Sync Status Filter

Add a new filter dropdown after the pricing filter (around line 218):

```tsx
{/* Add after the pricing filter Select */}
<Select
  value={params.syncStatus || 'all'}
  onValueChange={(value) => setParams((prev) => ({
    ...prev,
    syncStatus: value === 'all' ? undefined : value as SyncStatus,
    page: 1,
  }))}
>
  <SelectTrigger className="w-[150px]">
    <SelectValue placeholder="Sync Status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Sync</SelectItem>
    <SelectItem value="synced">Synced</SelectItem>
    <SelectItem value="pending">Pending</SelectItem>
    <SelectItem value="stale">Stale</SelectItem>
    <SelectItem value="failed">Failed</SelectItem>
  </SelectContent>
</Select>
```

### Step 3: Add SyncStatusWidget

Add the widget inside CardContent, before the filters (around line 172):

```tsx
<CardContent>
  {/* Add sync health widget */}
  <SyncStatusWidget />

  {/* Existing filters */}
  <div className="flex flex-col md:flex-row gap-4 mb-6">
    {/* ... existing filter content ... */}
  </div>
```

### Step 4: Add Sync Column Header

Add a new table header after "Status" column (around line 253):

```tsx
<TableHeader>
  <TableRow>
    <TableHead className="w-[200px]">Name</TableHead>
    <TableHead className="hidden md:table-cell">Categories</TableHead>
    <TableHead>Pricing</TableHead>
    <TableHead>Status</TableHead>
    <TableHead className="w-[100px]">Sync</TableHead>  {/* NEW */}
    <TableHead className="hidden lg:table-cell">Added</TableHead>
    <TableHead className="text-right">Actions</TableHead>
  </TableRow>
</TableHeader>
```

### Step 5: Add Sync Status Cell

Add the sync status cell in each row, after the Status badge (around line 316):

```tsx
{/* After the Status TableCell */}
<TableCell>
  <Badge variant={getStatusBadgeVariant(tool.status)}>
    {tool.status}
  </Badge>
</TableCell>

{/* Add Sync Status Cell - NEW */}
<TableCell>
  <SyncStatusIndicator tool={tool} compact />
</TableCell>

{/* Before the Added date cell */}
<TableCell className="hidden lg:table-cell">
  {new Date(tool.dateAdded).toLocaleDateString()}
</TableCell>
```

### Step 6: Import SyncStatus Type

Add the import for the type (at the top with other imports):

```tsx
// Update the import from useToolsAdmin to include SyncStatus
import {
  useToolsAdmin,
  useDeleteTool,
  Tool,
  ToolsQueryParams,
  SyncStatus  // NEW
} from '@/hooks/api/useToolsAdmin';
```

### Complete ToolsList.tsx Changes Summary

Here's what the key changes look like in context:

```tsx
// src/pages/admin/ToolsList.tsx

// 1. Updated imports
import {
  useToolsAdmin,
  useDeleteTool,
  Tool,
  ToolsQueryParams,
  SyncStatus
} from '@/hooks/api/useToolsAdmin';
import { SyncStatusIndicator } from '@/components/admin/SyncStatusIndicator';
import { SyncStatusWidget } from '@/components/admin/SyncStatusWidget';

// 2. In the component, CardContent becomes:
<CardContent>
  {/* Sync health overview */}
  <SyncStatusWidget />

  {/* Filters - add sync filter */}
  <div className="flex flex-col md:flex-row gap-4 mb-6">
    {/* ... existing search and filters ... */}

    {/* New sync status filter */}
    <Select
      value={params.syncStatus || 'all'}
      onValueChange={(value) => setParams((prev) => ({
        ...prev,
        syncStatus: value === 'all' ? undefined : value as SyncStatus,
        page: 1,
      }))}
    >
      <SelectTrigger className="w-[130px]">
        <SelectValue placeholder="Sync" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Sync</SelectItem>
        <SelectItem value="synced">Synced</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="stale">Stale</SelectItem>
        <SelectItem value="failed">Failed</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Table with new Sync column */}
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="w-[200px]">Name</TableHead>
        <TableHead className="hidden md:table-cell">Categories</TableHead>
        <TableHead>Pricing</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="w-[100px]">Sync</TableHead>
        <TableHead className="hidden lg:table-cell">Added</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.data.map((tool: Tool) => (
        <TableRow key={tool.id}>
          {/* ... existing cells ... */}
          <TableCell>
            <Badge variant={getStatusBadgeVariant(tool.status)}>
              {tool.status}
            </Badge>
          </TableCell>

          {/* New Sync Status Cell */}
          <TableCell>
            <SyncStatusIndicator tool={tool} compact />
          </TableCell>

          <TableCell className="hidden lg:table-cell">
            {new Date(tool.dateAdded).toLocaleDateString()}
          </TableCell>
          {/* ... actions cell ... */}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</CardContent>
```

---

## Verification Checklist

After implementing Phase 6:

- [ ] Types compile without errors
- [ ] `useSyncStatus` hook fetches data correctly
- [ ] `useSyncTool` hook triggers sync and shows toast
- [ ] `SyncStatusIndicator` shows correct status with tooltip
- [ ] Collection badges show per-collection status
- [ ] Sync button triggers sync and shows loading state
- [ ] `SyncStatusWidget` displays all statistics
- [ ] Widget refresh button works
- [ ] "Queue all pending" button works
- [ ] "Run Now" button triggers worker cycle
- [ ] Per-collection progress bars display correctly

---

## Final Testing

### Complete Flow Test

1. Create a new tool via Admin UI
   - Should show "pending" status
   - Background worker should sync within 1 minute
   - Status should change to "synced"

2. Update tool's name
   - Should show "stale" for `tools` collection
   - Click sync button
   - Should sync only `tools` collection
   - Status should return to "synced"

3. Update tool's functionality
   - Should show "stale" for `functionality` collection
   - Should not affect `tools` collection

4. Delete a tool
   - Should remove from MongoDB
   - Should remove from all Qdrant collections

---

## Congratulations!

You have completed all phases of the MongoDB → Qdrant Smart Sync implementation.

### Summary of Implemented Features

1. **Per-Collection Sync Tracking** - Each of the 4 Qdrant collections has independent status
2. **Field-Specific Change Detection** - Only affected collections are synced on updates
3. **Background Worker** - Automatic retry with exponential backoff
4. **Admin Visibility** - Dashboard widget and status indicators
5. **Manual Controls** - Force sync, batch sync, reset status

### Files Created/Modified

- `search-api/src/models/tool.model.ts` (modified)
- `search-api/src/services/content-hash.service.ts` (new)
- `search-api/src/services/tool-sync.service.ts` (new)
- `search-api/src/services/sync-worker.service.ts` (new)
- `search-api/src/services/qdrant.service.ts` (modified)
- `search-api/src/services/tool-crud.service.ts` (modified)
- `search-api/src/routes/sync.routes.ts` (new)
- `search-api/src/server.ts` (modified)
- `src/hooks/api/useToolsAdmin.ts` (modified)
- `src/hooks/api/useSyncAdmin.ts` (new)
- `src/components/admin/SyncStatusIndicator.tsx` (new)
- `src/components/admin/SyncStatusWidget.tsx` (new)
- `src/pages/admin/ToolsList.tsx` (modified)

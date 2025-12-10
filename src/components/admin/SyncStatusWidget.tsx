/**
 * Sync Status Widget
 *
 * Admin dashboard widget showing MongoDB-Qdrant sync health.
 * Displays overall status, per-collection stats, and worker status.
 */

import { useState } from 'react';
import {
  useSyncHealth,
  useTriggerSweep,
  useRetryAllFailed,
} from '@/hooks/api/useSyncAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  RefreshCw,
  Cloud,
  CloudOff,
  AlertCircle,
  Clock,
  CheckCircle,
  ChevronDown,
  Loader2,
  PlayCircle,
  RotateCcw,
} from 'lucide-react';
import type { SyncCollectionName } from '@/hooks/api/useToolsAdmin';

interface SyncStatusWidgetProps {
  /** Show compact version */
  compact?: boolean;
}

export function SyncStatusWidget({ compact = false }: SyncStatusWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const { health, stats, worker, isLoading, error } = useSyncHealth();
  const triggerSweep = useTriggerSweep();
  const retryAllFailed = useRetryAllFailed();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading sync status...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-destructive">
          <AlertCircle className="h-6 w-6 mr-2" />
          <span>Failed to load sync status</span>
        </CardContent>
      </Card>
    );
  }

  if (!health || !stats) {
    return null;
  }

  const getHealthIcon = () => {
    if (health.isHealthy) return <Cloud className="h-5 w-5 text-green-500" />;
    if (health.isCritical) return <CloudOff className="h-5 w-5 text-destructive" />;
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  const getHealthText = () => {
    if (health.isHealthy) return 'Healthy';
    if (health.isCritical) return 'Critical';
    return 'Degraded';
  };

  const getHealthBadgeVariant = () => {
    if (health.isHealthy) return 'default';
    if (health.isCritical) return 'destructive';
    return 'secondary';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleTimeString();
  };

  const collectionNames: SyncCollectionName[] = ['tools', 'functionality', 'usecases', 'interface'];

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getHealthIcon()}
              <div>
                <CardTitle className="text-lg">Sync Status</CardTitle>
                <CardDescription>MongoDB to Qdrant synchronization</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getHealthBadgeVariant()}>{getHealthText()}</Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Sync Progress</span>
                <span className="font-medium">{health.syncedPercentage}%</span>
              </div>
              <Progress value={health.syncedPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  <CheckCircle className="h-3 w-3 inline mr-1 text-green-500" />
                  {stats.synced} synced
                </span>
                <span>
                  <Clock className="h-3 w-3 inline mr-1 text-yellow-500" />
                  {stats.pending} pending
                </span>
                <span>
                  <AlertCircle className="h-3 w-3 inline mr-1 text-destructive" />
                  {stats.failed} failed
                </span>
              </div>
            </div>

            {/* Per-Collection Status */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Collections</h4>
              <div className="grid grid-cols-2 gap-2">
                {collectionNames.map((collection) => {
                  const collectionStats = stats.byCollection[collection];
                  const total = collectionStats.synced + collectionStats.pending + collectionStats.failed;
                  const syncedPct = total > 0 ? Math.round((collectionStats.synced / total) * 100) : 0;

                  return (
                    <TooltipProvider key={collection}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <span className="text-xs font-medium capitalize">{collection}</span>
                            <div className="flex items-center gap-1">
                              {collectionStats.failed > 0 ? (
                                <AlertCircle className="h-3 w-3 text-destructive" />
                              ) : collectionStats.synced === total ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <Clock className="h-3 w-3 text-yellow-500" />
                              )}
                              <span className="text-xs">{syncedPct}%</span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <p>Synced: {collectionStats.synced}</p>
                            <p>Pending: {collectionStats.pending}</p>
                            <p>Failed: {collectionStats.failed}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>

            {/* Worker Status */}
            {worker && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Sync Worker</h4>
                  <Badge variant={worker.isRunning ? 'default' : 'secondary'}>
                    {worker.isRunning ? 'Running' : 'Stopped'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="block">Last sweep</span>
                    <span className="font-medium text-foreground">
                      {formatDate(worker.lastSweepAt)}
                    </span>
                  </div>
                  <div>
                    <span className="block">Next sweep</span>
                    <span className="font-medium text-foreground">
                      {formatDate(worker.nextSweepAt)}
                    </span>
                  </div>
                  <div>
                    <span className="block">Processed</span>
                    <span className="font-medium text-foreground">{worker.processedCount}</span>
                  </div>
                  <div>
                    <span className="block">Success rate</span>
                    <span className="font-medium text-foreground">
                      {worker.processedCount > 0
                        ? Math.round((worker.successCount / worker.processedCount) * 100)
                        : 100}
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerSweep.mutate()}
                disabled={triggerSweep.isPending}
              >
                {triggerSweep.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                Trigger Sweep
              </Button>
              {stats.failed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => retryAllFailed.mutate()}
                  disabled={retryAllFailed.isPending}
                >
                  {retryAllFailed.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Retry All Failed ({stats.failed})
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Compact version showing just the essential status
 */
export function SyncStatusBadge() {
  const { health, isLoading } = useSyncHealth();

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  if (!health) {
    return null;
  }

  const getIcon = () => {
    if (health.isHealthy) return <Cloud className="h-4 w-4 text-green-500" />;
    if (health.isCritical) return <CloudOff className="h-4 w-4 text-destructive" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {getIcon()}
            <span className="text-xs">{health.syncedPercentage}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Sync status: {health.isHealthy ? 'Healthy' : health.isCritical ? 'Critical' : 'Degraded'}</p>
          <p className="text-xs">
            {health.syncedPercentage}% synced, {health.failedPercentage}% failed
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

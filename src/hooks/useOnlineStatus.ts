import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

/**
 * Online status information
 */
export interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  offlineSince: Date | null;
  lastChecked: Date;
}

/**
 * Hook options
 */
export interface UseOnlineStatusOptions {
  /**
   * Enable toast notifications for status changes
   * @default true
   */
  enableNotifications?: boolean;

  /**
   * Polling interval in milliseconds (0 to disable)
   * @default 30000 (30 seconds)
   */
  pollingInterval?: number;

  /**
   * URL to ping for connectivity check
   * @default null (uses navigator.onLine only)
   */
  pingUrl?: string | null;

  /**
   * Callback when status changes
   */
  onStatusChange?: (status: OnlineStatus) => void;
}

/**
 * useOnlineStatus - Hook to detect and monitor online/offline status
 *
 * Features:
 * - Monitors browser online/offline events
 * - Optional periodic connectivity checks
 * - Toast notifications for status changes
 * - Tracks offline duration
 * - Callback support for custom handling
 *
 * @param options - Configuration options
 * @returns Online status information
 *
 * @example Basic usage
 * ```tsx
 * const { isOnline, wasOffline } = useOnlineStatus();
 *
 * if (!isOnline) {
 *   return <OfflineMessage />;
 * }
 * ```
 *
 * @example With custom ping
 * ```tsx
 * const status = useOnlineStatus({
 *   pingUrl: '/api/health',
 *   pollingInterval: 60000, // Check every minute
 *   onStatusChange: (status) => {
 *     console.log('Network status changed:', status);
 *   },
 * });
 * ```
 */
export const useOnlineStatus = (options: UseOnlineStatusOptions = {}): OnlineStatus => {
  const {
    enableNotifications = true,
    pollingInterval = 30000,
    pingUrl = null,
    onStatusChange,
  } = options;

  const [status, setStatus] = useState<OnlineStatus>(() => ({
    isOnline: navigator.onLine,
    wasOffline: false,
    offlineSince: navigator.onLine ? null : new Date(),
    lastChecked: new Date(),
  }));

  /**
   * Update online status
   */
  const updateStatus = useCallback((isOnline: boolean) => {
    setStatus((prevStatus) => {
      // No change, just update lastChecked
      if (prevStatus.isOnline === isOnline) {
        return {
          ...prevStatus,
          lastChecked: new Date(),
        };
      }

      // Status changed
      const newStatus: OnlineStatus = {
        isOnline,
        wasOffline: !isOnline || prevStatus.wasOffline,
        offlineSince: isOnline ? null : (prevStatus.offlineSince || new Date()),
        lastChecked: new Date(),
      };

      // Show notification
      if (enableNotifications) {
        if (isOnline) {
          const offlineDuration = prevStatus.offlineSince
            ? Math.round((Date.now() - prevStatus.offlineSince.getTime()) / 1000)
            : 0;

          toast({
            title: 'Back Online',
            description: offlineDuration > 0
              ? `Connection restored after ${offlineDuration}s`
              : 'Connection restored',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'No Internet Connection',
            description: 'You are currently offline. Some features may not work.',
          });
        }
      }

      // Call custom handler
      if (onStatusChange) {
        onStatusChange(newStatus);
      }

      return newStatus;
    });
  }, [enableNotifications, onStatusChange]);

  /**
   * Check connectivity by pinging a URL
   */
  const checkConnectivity = useCallback(async () => {
    if (!pingUrl) {
      updateStatus(navigator.onLine);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      updateStatus(response.ok);
    } catch (error) {
      // Network error or timeout
      updateStatus(false);
    }
  }, [pingUrl, updateStatus]);

  /**
   * Handle online event
   */
  const handleOnline = useCallback(() => {
    if (pingUrl) {
      checkConnectivity();
    } else {
      updateStatus(true);
    }
  }, [pingUrl, checkConnectivity, updateStatus]);

  /**
   * Handle offline event
   */
  const handleOffline = useCallback(() => {
    updateStatus(false);
  }, [updateStatus]);

  /**
   * Set up event listeners and polling
   */
  useEffect(() => {
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up polling if enabled
    let intervalId: NodeJS.Timeout | null = null;
    if (pollingInterval > 0 && pingUrl) {
      intervalId = setInterval(checkConnectivity, pollingInterval);
    }

    // Initial check
    if (pingUrl) {
      checkConnectivity();
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [handleOnline, handleOffline, pollingInterval, pingUrl, checkConnectivity]);

  return status;
};

/**
 * Simplified hook that just returns boolean
 */
export const useIsOnline = (): boolean => {
  const { isOnline } = useOnlineStatus({ enableNotifications: false });
  return isOnline;
};

/**
 * Hook for displaying offline banner
 */
export const useOfflineBanner = () => {
  const status = useOnlineStatus({ enableNotifications: true });

  return {
    shouldShow: !status.isOnline,
    message: status.offlineSince
      ? `You've been offline since ${status.offlineSince.toLocaleTimeString()}`
      : 'You are currently offline',
  };
};

import { useState } from 'react';
import { RefreshCw, AlertCircle, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { isDevelopment } from '@/config/env';
import { useIsOnline } from '@/hooks/useOnlineStatus';

export interface RetryButtonProps {
  /**
   * Callback function to execute when retry is clicked
   */
  onRetry: () => void | Promise<void>;

  /**
   * Error message to display
   */
  error?: string | null;

  /**
   * Whether the operation is currently loading
   */
  isLoading?: boolean;

  /**
   * Button variant
   * @default "outline"
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

  /**
   * Button size
   * @default "default"
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';

  /**
   * Custom button text
   * @default "Retry"
   */
  children?: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Disable retry when offline
   * @default true
   */
  disableWhenOffline?: boolean;

  /**
   * Show loading spinner during retry
   * @default true
   */
  showLoadingSpinner?: boolean;
}

/**
 * RetryButton - Button component for retrying failed operations
 *
 * Features:
 * - Automatic offline detection
 * - Loading state management
 * - Error display
 * - Customizable appearance
 *
 * @example Basic usage
 * ```tsx
 * <RetryButton
 *   onRetry={refetch}
 *   error={error?.message}
 *   isLoading={isLoading}
 * />
 * ```
 *
 * @example Custom styling
 * ```tsx
 * <RetryButton
 *   onRetry={handleRetry}
 *   variant="default"
 *   size="lg"
 *   className="w-full"
 * >
 *   Try Again
 * </RetryButton>
 * ```
 */
export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  error,
  isLoading = false,
  variant = 'outline',
  size = 'default',
  children = 'Retry',
  className,
  disableWhenOffline = true,
  showLoadingSpinner = true,
}) => {
  const isOnline = useIsOnline();
  const isDisabled = isLoading || (disableWhenOffline && !isOnline);

  const handleClick = async () => {
    if (isDisabled) return;
    await onRetry();
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading && showLoadingSpinner ? (
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
      ) : !isOnline ? (
        <WifiOff className="mr-2 h-4 w-4" />
      ) : (
        <RefreshCw className="mr-2 h-4 w-4" />
      )}
      {!isOnline && disableWhenOffline ? 'Offline' : children}
    </Button>
  );
};

/**
 * ErrorWithRetry - Combined error message with retry button
 *
 * @example
 * ```tsx
 * <ErrorWithRetry
 *   error="Failed to load data"
 *   onRetry={refetch}
 *   isLoading={isLoading}
 * />
 * ```
 */
export const ErrorWithRetry: React.FC<{
  error: string;
  onRetry: () => void | Promise<void>;
  isLoading?: boolean;
  title?: string;
  className?: string;
}> = ({
  error,
  onRetry,
  isLoading = false,
  title = 'Error',
  className,
}) => {
  const isOnline = useIsOnline();

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>{error}</p>
        {!isOnline && (
          <p className="text-sm flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            You are currently offline
          </p>
        )}
        <div className="pt-2">
          <RetryButton
            onRetry={onRetry}
            isLoading={isLoading}
            variant="outline"
            size="sm"
          />
        </div>
      </AlertDescription>
    </Alert>
  );
};

/**
 * QueryErrorBoundary - Error boundary specifically for React Query errors
 *
 * @example
 * ```tsx
 * const { data, error, isError, refetch } = useQuery(...);
 *
 * if (isError) {
 *   return (
 *     <QueryErrorBoundary
 *       error={error}
 *       onRetry={refetch}
 *       title="Failed to load tools"
 *     />
 *   );
 * }
 * ```
 */
export const QueryErrorBoundary: React.FC<{
  error: Error | null;
  onRetry: () => void;
  title?: string;
  description?: string;
  className?: string;
}> = ({
  error,
  onRetry,
  title = 'Something went wrong',
  description,
  className,
}) => {
  const isOnline = useIsOnline();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      // Wait a bit before removing loading state
      setTimeout(() => setIsRetrying(false), 500);
    }
  };

  const errorMessage = error?.message || 'An unexpected error occurred';

  return (
    <div className={`flex items-center justify-center p-8 ${className || ''}`}>
      <div className="max-w-md w-full space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-lg font-semibold">{title}</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p className="text-sm">
              {description || errorMessage}
            </p>

            {!isOnline && (
              <div className="flex items-center gap-2 text-sm bg-destructive/10 p-2 rounded">
                <WifiOff className="h-4 w-4" />
                <span>No internet connection detected</span>
              </div>
            )}

            {isDevelopment && error && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium">
                  Technical Details
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-auto text-xs">
                  {error.stack || error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-2 pt-2">
              <RetryButton
                onRetry={handleRetry}
                isLoading={isRetrying}
                variant="default"
                size="sm"
              >
                Try Again
              </RetryButton>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

/**
 * InlineRetry - Compact inline retry button for small spaces
 *
 * @example
 * ```tsx
 * {isError && (
 *   <InlineRetry
 *     onRetry={refetch}
 *     message="Failed to load"
 *   />
 * )}
 * ```
 */
export const InlineRetry: React.FC<{
  onRetry: () => void | Promise<void>;
  message?: string;
  isLoading?: boolean;
}> = ({ onRetry, message = 'Failed to load', isLoading = false }) => {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <AlertCircle className="h-4 w-4 text-destructive" />
      <span>{message}</span>
      <Button
        onClick={onRetry}
        variant="link"
        size="sm"
        className="h-auto p-0 text-xs"
        disabled={isLoading}
      >
        {isLoading ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : (
          'Retry'
        )}
      </Button>
    </div>
  );
};

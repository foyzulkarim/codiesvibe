import { ReactNode } from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { isDevelopment } from '@/config/env';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

/**
 * ErrorFallback - Default error UI displayed when an error is caught
 *
 * Features:
 * - User-friendly error message
 * - Detailed error info in development mode
 * - Reset, reload, and navigation options
 */
export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Safely extract error properties
  const errorObj = error instanceof Error ? error : new Error(String(error));

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl">Something went wrong</CardTitle>
          </div>
          <CardDescription>
            We're sorry, but something unexpected happened. We've been notified and are working on a fix.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isDevelopment && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Error Details (Development Mode)</h3>
              <div className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-64">
                <p className="font-semibold text-destructive mb-2">
                  {errorObj.name}: {errorObj.message}
                </p>
                {errorObj.stack && (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {errorObj.stack}
                  </pre>
                )}
              </div>
            </div>
          )}

          {!isDevelopment && (
            <p className="text-sm text-muted-foreground">
              If this problem persists, please contact support with the following error ID:
              <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
                {Date.now().toString(36).toUpperCase()}
              </code>
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={resetErrorBoundary} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={handleReload} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </Button>
          <Button onClick={handleGoHome} variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * ErrorBoundary - Catches JavaScript errors anywhere in the component tree
 *
 * Uses react-error-boundary under the hood for modern React error handling.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <SomeComponent />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundary({ children, fallback, onReset }: ErrorBoundaryProps) {
  if (fallback) {
    return (
      <ReactErrorBoundary
        fallbackRender={() => <>{fallback}</>}
        {...(onReset && { onReset: () => onReset() })}
      >
        {children}
      </ReactErrorBoundary>
    );
  }

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      {...(onReset && { onReset: () => onReset() })}
    >
      {children}
    </ReactErrorBoundary>
  );
}

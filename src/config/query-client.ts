import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

/**
 * Configured QueryClient with global defaults for queries and mutations
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Smart error handling (no retry on 4xx errors)
 * - Global toast notifications for errors
 * - Optimized caching strategy
 * - Query/Mutation cache callbacks
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Caching strategy
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for this duration
      gcTime: 10 * 60 * 1000, // 10 minutes - cache retention time (formerly cacheTime)

      // Retry strategy
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors - won't succeed on retry)
        const apiError = error as { response?: { status?: number } };
        if (apiError.response?.status && apiError.response.status >= 400 && apiError.response.status < 500) {
          return false;
        }
        // Retry up to 3 times for network errors or 5xx errors
        return failureCount < 3;
      },

      // Exponential backoff for retries (1s, 2s, 4s, max 30s)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch behavior
      refetchOnWindowFocus: false, // Don't refetch when window regains focus (can be annoying)
      refetchOnReconnect: true, // Refetch when internet connection is restored
      refetchOnMount: true, // Refetch when component mounts if data is stale

      // Network mode
      networkMode: 'online', // Only run queries when online
    },

    mutations: {
      // Retry mutations once (be conservative with mutations)
      retry: 1,
      retryDelay: 1000,

      // Network mode
      networkMode: 'online',

      // Global error handler for mutations
      onError: (error) => {
        const apiError = error as { message?: string; response?: { data?: { message?: string } } };
        const errorMessage = apiError.response?.data?.message || apiError.message || 'Something went wrong. Please try again.';

        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
      },
    },
  },

  // Query cache configuration with global error handler
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show toast if query has errorMessage in meta
      // This allows queries to opt-in to global error toasts
      if (query.meta?.errorMessage) {
        const apiError = error as { message?: string };
        toast({
          variant: 'destructive',
          title: 'Error',
          description: query.meta.errorMessage as string || apiError.message,
        });
      }
    },

    onSuccess: (data, query) => {
      // Optional: Log successful queries in development
      if (import.meta.env.DEV && query.meta?.logSuccess) {
        console.log('✅ Query success:', query.queryKey, data);
      }
    },
  }),

  // Mutation cache configuration with global success/error handlers
  mutationCache: new MutationCache({
    onSuccess: (data, variables, context, mutation) => {
      // Show success toast if mutation has successMessage in meta
      if (mutation.meta?.successMessage) {
        toast({
          title: 'Success',
          description: mutation.meta.successMessage as string,
        });
      }

      // Optional: Log successful mutations in development
      if (import.meta.env.DEV) {
        console.log('✅ Mutation success:', mutation.options.mutationKey, data);
      }
    },

    onError: (error, variables, context, mutation) => {
      // Optional: Log failed mutations in development
      if (import.meta.env.DEV) {
        console.error('❌ Mutation error:', mutation.options.mutationKey, error);
      }
    },
  }),
});

/**
 * React Query DevTools configuration
 * Only shown in development mode
 */
export const reactQueryDevtoolsConfig = {
  initialIsOpen: false,
  position: 'bottom-right' as const,
  buttonPosition: 'bottom-right' as const,
  errorTypes: [
    { name: 'Error', initializer: (query: any) => new Error(query) },
  ],
};

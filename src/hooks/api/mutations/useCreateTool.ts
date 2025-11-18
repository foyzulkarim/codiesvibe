import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { AITool } from '@/data/tools';
import { toast } from '@/components/ui/use-toast';
import { CreateToolParams, MutationResponse, MutationHookOptions, OptimisticUpdateContext } from './types';

/**
 * Transform API response to AITool format
 */
const transformResponse = (response: MutationResponse<AITool>): AITool => {
  // If the response is already in the correct format, return it
  if ('id' in response && 'name' in response) {
    return response as AITool;
  }

  // Otherwise, extract from data field
  return response.data as AITool;
};

/**
 * API function to create a new tool
 */
const createToolApi = async (params: CreateToolParams): Promise<AITool> => {
  const response = await apiClient.post<MutationResponse>('/tools', params);
  return transformResponse(response.data);
};

/**
 * Hook for creating a new tool
 *
 * Features:
 * - Automatic cache invalidation
 * - Optimistic updates (optional)
 * - Success/error toast notifications
 * - TypeScript type safety
 *
 * @param options - Optional configuration for the mutation
 *
 * @example
 * ```tsx
 * const createTool = useCreateTool({
 *   onSuccess: (newTool) => {
 *     console.log('Created:', newTool.name);
 *     navigate(`/tools/${newTool.id}`);
 *   }
 * });
 *
 * // Later in your component
 * const handleSubmit = (formData) => {
 *   createTool.mutate({
 *     name: formData.name,
 *     description: formData.description,
 *     // ... other fields
 *   });
 * };
 * ```
 *
 * @example With optimistic updates
 * ```tsx
 * const createTool = useCreateTool({
 *   optimistic: true,
 *   onSuccess: () => toast({ title: 'Tool created!' })
 * });
 * ```
 */
export const useCreateTool = (options: MutationHookOptions<AITool, CreateToolParams> = {}) => {
  const queryClient = useQueryClient();

  const {
    onSuccess,
    onError,
    onMutate,
    onSettled,
    optimistic = false,
    showSuccessToast = true,
    showErrorToast = true,
    successMessage = 'Tool created successfully!',
    errorMessage = 'Failed to create tool. Please try again.',
  } = options;

  return useMutation({
    mutationFn: createToolApi,

    // Optimistic update (before API call completes)
    onMutate: async (newTool) => {
      // Call user's onMutate if provided
      if (onMutate) {
        const userContext = await onMutate(newTool);
        if (userContext) {
          return userContext;
        }
      }

      // If optimistic updates enabled
      if (optimistic) {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries({ queryKey: ['tools'] });

        // Snapshot the previous value
        const previousTools = queryClient.getQueryData<AITool[]>(['tools']);

        // Optimistically update to the new value
        if (previousTools) {
          // Create a temporary ID for the optimistic tool
          const optimisticTool: AITool = {
            ...newTool,
            id: `temp-${Date.now()}`,
            slug: newTool.slug || newTool.name.toLowerCase().replace(/\s+/g, '-'),
            contributor: 'current-user', // Will be replaced by server
            dateAdded: new Date().toISOString(),
            status: newTool.status || 'active',
          } as AITool;

          queryClient.setQueryData<AITool[]>(['tools'], [...previousTools, optimisticTool]);
        }

        // Return a context object with the snapshotted value
        return { previousTools } as OptimisticUpdateContext;
      }
    },

    // On success
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch tools list
      queryClient.invalidateQueries({ queryKey: ['tools'] });

      // Add the new tool to the cache
      queryClient.setQueryData(['tool', data.id], data);

      // Show success toast
      if (showSuccessToast) {
        toast({
          title: 'Success',
          description: successMessage,
        });
      }

      // Call user's onSuccess callback
      if (onSuccess) {
        onSuccess(data, variables);
      }
    },

    // On error
    onError: (error: Error, variables, context) => {
      // If we had optimistic updates, rollback
      if (optimistic && context?.previousTools) {
        queryClient.setQueryData(['tools'], context.previousTools);
      }

      // Show error toast
      if (showErrorToast) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || errorMessage,
        });
      }

      // Call user's onError callback
      if (onError) {
        onError(error, variables);
      }
    },

    // On settled (always runs after success or error)
    onSettled: (data, error, variables, context) => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['tools'] });

      // Call user's onSettled callback
      if (onSettled) {
        onSettled(data, error, variables);
      }
    },

    // Retry configuration (inherited from global QueryClient config)
    // Can be overridden here if needed
    // retry: 1,
  });
};

/**
 * Type for the return value of useCreateTool
 * Useful for TypeScript type inference
 */
export type UseCreateToolReturn = ReturnType<typeof useCreateTool>;

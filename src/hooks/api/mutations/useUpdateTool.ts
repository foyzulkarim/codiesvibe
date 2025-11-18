import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { AITool } from '@/data/tools';
import { toast } from '@/components/ui/use-toast';
import { UpdateToolParams, MutationResponse, MutationHookOptions, OptimisticUpdateContext } from './types';

/**
 * Transform API response to AITool format
 */
const transformResponse = (response: MutationResponse<AITool>): AITool => {
  if ('id' in response && 'name' in response) {
    return response as AITool;
  }
  return response.data as AITool;
};

/**
 * API function to update an existing tool
 */
const updateToolApi = async (params: UpdateToolParams): Promise<AITool> => {
  const { id, ...updateData } = params;
  const response = await apiClient.patch<MutationResponse>(`/tools/${id}`, updateData);
  return transformResponse(response.data);
};

/**
 * Hook for updating an existing tool
 *
 * Features:
 * - Automatic cache invalidation
 * - Optimistic updates (optional)
 * - Success/error toast notifications
 * - Partial updates (only send changed fields)
 * - TypeScript type safety
 *
 * @param options - Optional configuration for the mutation
 *
 * @example
 * ```tsx
 * const updateTool = useUpdateTool({
 *   onSuccess: (updatedTool) => {
 *     console.log('Updated:', updatedTool.name);
 *   }
 * });
 *
 * // Later in your component
 * const handleUpdate = (toolId, changes) => {
 *   updateTool.mutate({
 *     id: toolId,
 *     ...changes // Only the fields that changed
 *   });
 * };
 * ```
 *
 * @example With optimistic updates
 * ```tsx
 * const updateTool = useUpdateTool({
 *   optimistic: true, // Update UI immediately
 *   successMessage: 'Changes saved!',
 * });
 *
 * const handleRatingChange = (toolId, newRating) => {
 *   updateTool.mutate({
 *     id: toolId,
 *     rating: newRating
 *   });
 * };
 * ```
 */
export const useUpdateTool = (options: MutationHookOptions<AITool, UpdateToolParams> = {}) => {
  const queryClient = useQueryClient();

  const {
    onSuccess,
    onError,
    onMutate,
    onSettled,
    optimistic = false,
    showSuccessToast = true,
    showErrorToast = true,
    successMessage = 'Tool updated successfully!',
    errorMessage = 'Failed to update tool. Please try again.',
  } = options;

  return useMutation({
    mutationFn: updateToolApi,

    // Optimistic update (before API call completes)
    onMutate: async (updatedTool) => {
      // Call user's onMutate if provided
      if (onMutate) {
        const userContext = await onMutate(updatedTool);
        if (userContext) {
          return userContext;
        }
      }

      // If optimistic updates enabled
      if (optimistic) {
        const { id } = updatedTool;

        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['tool', id] });
        await queryClient.cancelQueries({ queryKey: ['tools'] });

        // Snapshot the previous value
        const previousTool = queryClient.getQueryData<AITool>(['tool', id]);

        // Optimistically update the tool
        if (previousTool) {
          const optimisticTool: AITool = {
            ...previousTool,
            ...updatedTool,
            id, // Ensure ID doesn't change
            lastUpdated: new Date().toISOString(),
          };

          // Update the single tool cache
          queryClient.setQueryData(['tool', id], optimisticTool);

          // Update in the tools list cache if it exists
          const previousTools = queryClient.getQueryData<AITool[]>(['tools']);
          if (previousTools) {
            queryClient.setQueryData(
              ['tools'],
              previousTools.map(tool => tool.id === id ? optimisticTool : tool)
            );
          }
        }

        // Return context for potential rollback
        return { previousTool } as OptimisticUpdateContext;
      }
    },

    // On success
    onSuccess: (data, variables, context) => {
      const { id } = variables;

      // Update the cache with the server response
      queryClient.setQueryData(['tool', id], data);

      // Update in tools list if present
      const tools = queryClient.getQueryData<AITool[]>(['tools']);
      if (tools) {
        queryClient.setQueryData(
          ['tools'],
          tools.map(tool => tool.id === id ? data : tool)
        );
      }

      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['tool', id] });
      queryClient.invalidateQueries({ queryKey: ['tools'] });

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
      if (optimistic && context?.previousTool) {
        const { id } = variables;

        // Rollback single tool
        queryClient.setQueryData(['tool', id], context.previousTool);

        // Rollback in tools list
        const tools = queryClient.getQueryData<AITool[]>(['tools']);
        if (tools) {
          queryClient.setQueryData(
            ['tools'],
            tools.map(tool => tool.id === id ? context.previousTool! : tool)
          );
        }
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
      const { id } = variables;

      // Always refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['tool', id] });
      queryClient.invalidateQueries({ queryKey: ['tools'] });

      // Call user's onSettled callback
      if (onSettled) {
        onSettled(data, error, variables);
      }
    },

    // Retry configuration
    // Default: retry once for updates
    retry: 1,
  });
};

/**
 * Type for the return value of useUpdateTool
 */
export type UseUpdateToolReturn = ReturnType<typeof useUpdateTool>;

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { AITool } from '@/data/tools';
import { toast } from '@/components/ui/use-toast';
import { DeleteToolParams, DeleteResponse, MutationHookOptions, OptimisticUpdateContext } from './types';

/**
 * API function to delete a tool
 */
const deleteToolApi = async (params: DeleteToolParams): Promise<DeleteResponse> => {
  const { id, soft = false } = params;

  const response = await apiClient.delete<DeleteResponse>(`/tools/${id}`, {
    params: { soft },
  });

  return response.data;
};

/**
 * Hook for deleting a tool
 *
 * Features:
 * - Automatic cache invalidation
 * - Optimistic updates (optional)
 * - Success/error toast notifications
 * - Soft delete support (mark as deleted vs remove)
 * - TypeScript type safety
 * - Confirmation handling (if needed)
 *
 * @param options - Optional configuration for the mutation
 *
 * @example
 * ```tsx
 * const deleteTool = useDeleteTool({
 *   onSuccess: () => {
 *     navigate('/tools');
 *   }
 * });
 *
 * // Later in your component
 * const handleDelete = (toolId) => {
 *   if (confirm('Are you sure you want to delete this tool?')) {
 *     deleteTool.mutate({ id: toolId });
 *   }
 * };
 * ```
 *
 * @example With optimistic updates
 * ```tsx
 * const deleteTool = useDeleteTool({
 *   optimistic: true, // Remove from UI immediately
 *   successMessage: 'Tool deleted successfully',
 * });
 *
 * const handleDelete = (toolId) => {
 *   deleteTool.mutate({ id: toolId });
 * };
 * ```
 *
 * @example Soft delete
 * ```tsx
 * const deleteTool = useDeleteTool();
 *
 * const handleSoftDelete = (toolId) => {
 *   deleteTool.mutate({
 *     id: toolId,
 *     soft: true // Mark as deleted, don't remove
 *   });
 * };
 * ```
 */
export const useDeleteTool = (options: MutationHookOptions<DeleteResponse, DeleteToolParams> = {}) => {
  const queryClient = useQueryClient();

  const {
    onSuccess,
    onError,
    onMutate,
    onSettled,
    optimistic = false,
    showSuccessToast = true,
    showErrorToast = true,
    successMessage = 'Tool deleted successfully',
    errorMessage = 'Failed to delete tool. Please try again.',
  } = options;

  return useMutation({
    mutationFn: deleteToolApi,

    // Optimistic update (before API call completes)
    onMutate: async (params) => {
      // Call user's onMutate if provided
      if (onMutate) {
        const userContext = await onMutate(params);
        if (userContext) {
          return userContext;
        }
      }

      // If optimistic updates enabled
      if (optimistic) {
        const { id } = params;

        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['tool', id] });
        await queryClient.cancelQueries({ queryKey: ['tools'] });

        // Snapshot the previous values
        const previousTool = queryClient.getQueryData<AITool>(['tool', id]);
        const previousTools = queryClient.getQueryData<AITool[]>(['tools']);

        // Optimistically remove from cache
        if (previousTools) {
          queryClient.setQueryData(
            ['tools'],
            previousTools.filter(tool => tool.id !== id)
          );
        }

        // Remove single tool cache
        queryClient.removeQueries({ queryKey: ['tool', id] });

        // Return context for potential rollback
        return { previousTool, previousTools } as OptimisticUpdateContext;
      }
    },

    // On success
    onSuccess: (data, variables, context) => {
      const { id } = variables;

      // Remove from cache
      queryClient.removeQueries({ queryKey: ['tool', id] });

      // Update tools list
      const tools = queryClient.getQueryData<AITool[]>(['tools']);
      if (tools) {
        queryClient.setQueryData(
          ['tools'],
          tools.filter(tool => tool.id !== id)
        );
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['tools'] });

      // Show success toast
      if (showSuccessToast) {
        toast({
          title: 'Success',
          description: data.message || successMessage,
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
      if (optimistic && context) {
        const { id } = variables;

        // Rollback single tool if it existed
        if (context.previousTool) {
          queryClient.setQueryData(['tool', id], context.previousTool);
        }

        // Rollback tools list if it existed
        if (context.previousTools) {
          queryClient.setQueryData(['tools'], context.previousTools);
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
      // Always refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['tools'] });

      // Call user's onSettled callback
      if (onSettled) {
        onSettled(data, error, variables);
      }
    },

    // Retry configuration
    // Default: don't retry delete operations (could be dangerous)
    retry: false,
  });
};

/**
 * Type for the return value of useDeleteTool
 */
export type UseDeleteToolReturn = ReturnType<typeof useDeleteTool>;

/**
 * Helper hook for delete with confirmation
 *
 * @example
 * ```tsx
 * const { deleteTool, confirmDelete } = useDeleteToolWithConfirm({
 *   confirmMessage: 'Are you sure you want to delete this tool?',
 *   onSuccess: () => navigate('/tools'),
 * });
 *
 * // In your component
 * <button onClick={() => confirmDelete(toolId)}>
 *   Delete
 * </button>
 * ```
 */
export const useDeleteToolWithConfirm = (
  options: MutationHookOptions<DeleteResponse, DeleteToolParams> & {
    confirmMessage?: string;
  } = {}
) => {
  const deleteMutation = useDeleteTool(options);

  const confirmDelete = (params: DeleteToolParams) => {
    const message = options.confirmMessage || 'Are you sure you want to delete this tool? This action cannot be undone.';

    if (window.confirm(message)) {
      deleteMutation.mutate(params);
    }
  };

  return {
    deleteTool: deleteMutation,
    confirmDelete,
    isDeleting: deleteMutation.isPending,
    error: deleteMutation.error,
  };
};

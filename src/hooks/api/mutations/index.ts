/**
 * Mutation Hooks - Index
 *
 * Centralized exports for all mutation hooks
 * Makes it easy to import multiple hooks in components
 */

// Hook exports
export { useCreateTool, type UseCreateToolReturn } from './useCreateTool';
export { useUpdateTool, type UseUpdateToolReturn } from './useUpdateTool';
export { useDeleteTool, useDeleteToolWithConfirm, type UseDeleteToolReturn } from './useDeleteTool';

// Type exports
export type {
  CreateToolParams,
  UpdateToolParams,
  DeleteToolParams,
  MutationResponse,
  DeleteResponse,
  MutationHookOptions,
  OptimisticUpdateContext,
} from './types';

/**
 * Usage Examples:
 *
 * @example Import individual hooks
 * ```ts
 * import { useCreateTool } from '@/hooks/api/mutations';
 * ```
 *
 * @example Import multiple hooks
 * ```ts
 * import { useCreateTool, useUpdateTool, useDeleteTool } from '@/hooks/api/mutations';
 * ```
 *
 * @example Import with types
 * ```ts
 * import { useCreateTool, type CreateToolParams } from '@/hooks/api/mutations';
 * ```
 */

/**
 * Tools Admin Hooks
 *
 * React Query hooks for tools CRUD operations with the Search API.
 * Authentication is handled automatically by the searchClient.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchClient } from '@/api/search-client';
import { buildToolsQueryParams } from '@/lib/query-params';
import { ToolFormValues } from '@/schemas/tool-form.schema';
import { toast } from 'sonner';

// Types
export interface PaginatedToolsResponse {
  data: Tool[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

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
  // RBAC fields
  approvalStatus: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

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
  approvalStatus?: ApprovalStatus;
  contributor?: string;
}

export interface Vocabularies {
  categories: string[];
  industries: string[];
  userTypes: string[];
  interface: string[];
  functionality: string[];
  deployment: string[];
  pricingModels: string[];
  billingPeriods: string[];
}

// Query keys
export const toolsAdminKeys = {
  all: ['tools-admin'] as const,
  lists: () => [...toolsAdminKeys.all, 'list'] as const,
  list: (params: ToolsQueryParams) => [...toolsAdminKeys.lists(), params] as const,
  details: () => [...toolsAdminKeys.all, 'detail'] as const,
  detail: (id: string) => [...toolsAdminKeys.details(), id] as const,
  vocabularies: () => [...toolsAdminKeys.all, 'vocabularies'] as const,
  myTools: (params: Omit<ToolsQueryParams, 'contributor'>) =>
    [...toolsAdminKeys.all, 'my-tools', params] as const,
  adminTools: (params: ToolsQueryParams) =>
    [...toolsAdminKeys.all, 'admin', params] as const,
};

/**
 * Hook to fetch paginated tools list (public)
 */
export function useToolsAdmin(params: ToolsQueryParams = {}) {
  return useQuery({
    queryKey: toolsAdminKeys.list(params),
    queryFn: async (): Promise<PaginatedToolsResponse> => {
      const searchParams = buildToolsQueryParams(params);
      const response = await searchClient.get<PaginatedToolsResponse>(
        `/tools?${searchParams.toString()}`
      );
      return response.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single tool by ID (public)
 */
export function useToolAdmin(id: string) {
  return useQuery({
    queryKey: toolsAdminKeys.detail(id),
    queryFn: async (): Promise<Tool> => {
      const response = await searchClient.get<Tool>(`/tools/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch controlled vocabularies (public)
 */
export function useVocabularies() {
  return useQuery({
    queryKey: toolsAdminKeys.vocabularies(),
    queryFn: async (): Promise<Vocabularies> => {
      const response = await searchClient.get<Vocabularies>('/tools/vocabularies');
      return response.data;
    },
    staleTime: Infinity,
  });
}

/**
 * Hook to fetch user's own tools (requires authentication)
 */
export function useMyTools(params: Omit<ToolsQueryParams, 'contributor'> = {}) {
  return useQuery({
    queryKey: toolsAdminKeys.myTools(params),
    queryFn: async (): Promise<PaginatedToolsResponse> => {
      const searchParams = buildToolsQueryParams(params);
      const response = await searchClient.get<PaginatedToolsResponse>(
        `/tools/my-tools?${searchParams.toString()}`
      );
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch admin tools list (requires admin authentication)
 */
export function useAdminTools(params: ToolsQueryParams = {}) {
  return useQuery({
    queryKey: toolsAdminKeys.adminTools(params),
    queryFn: async (): Promise<PaginatedToolsResponse> => {
      const searchParams = buildToolsQueryParams(params);
      const response = await searchClient.get<PaginatedToolsResponse>(
        `/tools/admin?${searchParams.toString()}`
      );
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to create a new tool (requires authentication)
 */
export function useCreateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ToolFormValues): Promise<Tool> => {
      const response = await searchClient.post<Tool>('/tools', data);
      return response.data;
    },
    onSuccess: (newTool) => {
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.lists() });
      const statusMessage =
        newTool.approvalStatus === 'approved'
          ? 'and approved'
          : 'and is pending approval';
      toast.success(`Tool "${newTool.name}" created ${statusMessage}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create tool');
    },
  });
}

/**
 * Hook to update a tool (requires authentication)
 */
export function useUpdateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ToolFormValues>;
    }): Promise<Tool> => {
      const response = await searchClient.patch<Tool>(`/tools/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedTool) => {
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: toolsAdminKeys.detail(updatedTool.id),
      });
      toast.success(`Tool "${updatedTool.name}" updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update tool');
    },
  });
}

/**
 * Hook to delete a tool (requires admin authentication)
 */
export function useDeleteTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await searchClient.delete(`/tools/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.lists() });
      toast.success('Tool deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete tool');
    },
  });
}

/**
 * Hook to approve a tool (requires admin authentication)
 */
export function useApproveTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Tool> => {
      const response = await searchClient.patch<Tool>(`/tools/${id}/approve`);
      return response.data;
    },
    onSuccess: (approvedTool) => {
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.all });
      toast.success(`Tool "${approvedTool.name}" approved`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve tool');
    },
  });
}

/**
 * Hook to reject a tool (requires admin authentication)
 */
export function useRejectTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: string;
      reason: string;
    }): Promise<Tool> => {
      const response = await searchClient.patch<Tool>(`/tools/${id}/reject`, {
        reason,
      });
      return response.data;
    },
    onSuccess: (rejectedTool) => {
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.all });
      toast.success(`Tool "${rejectedTool.name}" rejected`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject tool');
    },
  });
}

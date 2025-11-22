import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
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
  pricingModel: 'Free' | 'Freemium' | 'Paid';
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
};

// Get search API base URL (different from main API)
const getSearchApiUrl = () => {
  // Use environment variable or default to localhost for development
  return import.meta.env.VITE_SEARCH_API_URL || 'http://localhost:4003';
};

/**
 * Hook to fetch paginated tools list
 */
export function useToolsAdmin(params: ToolsQueryParams = {}) {
  const { page = 1, limit = 20, search, sortBy, sortOrder, status, category, industry, pricingModel } = params;

  return useQuery({
    queryKey: toolsAdminKeys.list(params),
    queryFn: async (): Promise<PaginatedToolsResponse> => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(page));
      searchParams.set('limit', String(limit));
      if (search) searchParams.set('search', search);
      if (sortBy) searchParams.set('sortBy', sortBy);
      if (sortOrder) searchParams.set('sortOrder', sortOrder);
      if (status) searchParams.set('status', status);
      if (category) searchParams.set('category', category);
      if (industry) searchParams.set('industry', industry);
      if (pricingModel) searchParams.set('pricingModel', pricingModel);

      const response = await fetch(`${getSearchApiUrl()}/api/tools?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tools');
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single tool by ID
 */
export function useToolAdmin(id: string) {
  return useQuery({
    queryKey: toolsAdminKeys.detail(id),
    queryFn: async (): Promise<Tool> => {
      const response = await fetch(`${getSearchApiUrl()}/api/tools/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Tool not found');
        }
        throw new Error('Failed to fetch tool');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch controlled vocabularies
 */
export function useVocabularies() {
  return useQuery({
    queryKey: toolsAdminKeys.vocabularies(),
    queryFn: async (): Promise<Vocabularies> => {
      const response = await fetch(`${getSearchApiUrl()}/api/tools/vocabularies`);
      if (!response.ok) {
        throw new Error('Failed to fetch vocabularies');
      }
      return response.json();
    },
    staleTime: Infinity, // Vocabularies rarely change
  });
}

/**
 * Hook to create a new tool
 */
export function useCreateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ToolFormValues): Promise<Tool> => {
      const response = await fetch(`${getSearchApiUrl()}/api/tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create tool');
      }

      return response.json();
    },
    onSuccess: (newTool) => {
      // Invalidate and refetch tools list
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.lists() });
      toast.success(`Tool "${newTool.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create tool');
    },
  });
}

/**
 * Hook to update a tool
 */
export function useUpdateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ToolFormValues> }): Promise<Tool> => {
      const response = await fetch(`${getSearchApiUrl()}/api/tools/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update tool');
      }

      return response.json();
    },
    onSuccess: (updatedTool) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.lists() });
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.detail(updatedTool.id) });
      toast.success(`Tool "${updatedTool.name}" updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update tool');
    },
  });
}

/**
 * Hook to delete a tool
 */
export function useDeleteTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`${getSearchApiUrl()}/api/tools/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete tool');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch tools list
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.lists() });
      toast.success('Tool deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete tool');
    },
  });
}

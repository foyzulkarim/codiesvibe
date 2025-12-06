import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { getClerkToken } from '@/api/clerk-auth';
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

// Helper to get auth headers for protected endpoints
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getClerkToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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
 * Hook to create a new tool (requires authentication)
 */
export function useCreateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ToolFormValues): Promise<Tool> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${getSearchApiUrl()}/api/tools`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Please sign in to create a tool');
        }
        if (response.status === 403) {
          throw new Error(errorData.error || 'You do not have permission to create tools');
        }
        throw new Error(errorData.error || 'Failed to create tool');
      }

      return response.json();
    },
    onSuccess: (newTool) => {
      // Invalidate and refetch tools list
      queryClient.invalidateQueries({ queryKey: toolsAdminKeys.lists() });
      const statusMessage = newTool.approvalStatus === 'approved'
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<ToolFormValues> }): Promise<Tool> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${getSearchApiUrl()}/api/tools/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Please sign in to update this tool');
        }
        if (response.status === 403) {
          throw new Error(errorData.error || 'You do not have permission to update this tool');
        }
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
 * Hook to delete a tool (requires admin authentication)
 */
export function useDeleteTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${getSearchApiUrl()}/api/tools/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Please sign in to delete this tool');
        }
        if (response.status === 403) {
          throw new Error(errorData.error || 'Only admins can delete tools');
        }
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

/**
 * Hook to fetch user's own tools (my-tools endpoint)
 */
export function useMyTools(params: Omit<ToolsQueryParams, 'contributor'> = {}) {
  const { page = 1, limit = 20, approvalStatus, sortBy, sortOrder } = params;

  return useQuery({
    queryKey: [...toolsAdminKeys.all, 'my-tools', params] as const,
    queryFn: async (): Promise<PaginatedToolsResponse> => {
      const headers = await getAuthHeaders();
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(page));
      searchParams.set('limit', String(limit));
      if (approvalStatus) searchParams.set('approvalStatus', approvalStatus);
      if (sortBy) searchParams.set('sortBy', sortBy);
      if (sortOrder) searchParams.set('sortOrder', sortOrder);

      const response = await fetch(`${getSearchApiUrl()}/api/tools/my-tools?${searchParams.toString()}`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view your tools');
        }
        throw new Error('Failed to fetch your tools');
      }
      return response.json();
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch admin tools list (all tools with all statuses)
 */
export function useAdminTools(params: ToolsQueryParams = {}) {
  const { page = 1, limit = 20, search, sortBy, sortOrder, status, category, industry, pricingModel, approvalStatus, contributor } = params;

  return useQuery({
    queryKey: [...toolsAdminKeys.all, 'admin', params] as const,
    queryFn: async (): Promise<PaginatedToolsResponse> => {
      const headers = await getAuthHeaders();
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
      if (approvalStatus) searchParams.set('approvalStatus', approvalStatus);
      if (contributor) searchParams.set('contributor', contributor);

      const response = await fetch(`${getSearchApiUrl()}/api/tools/admin?${searchParams.toString()}`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to access admin tools');
        }
        if (response.status === 403) {
          throw new Error('Admin access required');
        }
        throw new Error('Failed to fetch admin tools');
      }
      return response.json();
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to approve a tool (admin only)
 */
export function useApproveTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Tool> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${getSearchApiUrl()}/api/tools/${id}/approve`, {
        method: 'PATCH',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Please sign in to approve tools');
        }
        if (response.status === 403) {
          throw new Error('Only admins can approve tools');
        }
        throw new Error(errorData.error || 'Failed to approve tool');
      }

      return response.json();
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
 * Hook to reject a tool (admin only)
 */
export function useRejectTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }): Promise<Tool> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${getSearchApiUrl()}/api/tools/${id}/reject`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Please sign in to reject tools');
        }
        if (response.status === 403) {
          throw new Error('Only admins can reject tools');
        }
        throw new Error(errorData.error || 'Failed to reject tool');
      }

      return response.json();
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

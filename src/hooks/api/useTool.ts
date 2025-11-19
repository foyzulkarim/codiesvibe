import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/api/client';
import { UseToolReturn, ToolResponseDto } from '@/api/types';
import { AITool } from '@/data/tools';

// Transform API response to match AITool interface (v2.0)
const transformToolResponse = (tool: ToolResponseDto): AITool => ({
  // Core v2.0 fields
  id: tool.id,
  name: tool.name,
  slug: tool.slug,
  description: tool.description,
  longDescription: tool.longDescription,
  tagline: tool.tagline,

  // v2.0 structured data
  categories: tool.categories,
  pricingSummary: tool.pricingSummary,
  pricingDetails: tool.pricingDetails,
  capabilities: tool.capabilities,
  useCases: tool.useCases,

  // Enhanced metadata
  searchKeywords: tool.searchKeywords,
  semanticTags: tool.semanticTags,
  aliases: tool.aliases,

  // Legacy fields for backward compatibility
  pricing: tool.pricing,
  interface: tool.interface,
  functionality: tool.functionality,
  deployment: tool.deployment,
  popularity: tool.popularity,
  rating: tool.rating,
  reviewCount: tool.reviewCount,

  // URLs and metadata
  logoUrl: tool.logoUrl,
  website: tool.website,
  documentation: tool.documentation,
  pricingUrl: tool.pricingUrl,
  status: tool.status,
  contributor: tool.contributor,
  dateAdded: tool.dateAdded,
  lastUpdated: tool.lastUpdated,

  // Legacy compatibility (if still needed)
  ...(tool.features && { features: tool.features }),
  ...(tool.tags && { tags: tool.tags })
});

// API function to fetch single tool
const fetchTool = async (id: string): Promise<AITool> => {
  try {
    const response = await apiClient.get<ToolResponseDto>(`/tools/${id}`);
    return transformToolResponse(response.data);
  } catch (error) {
    console.error(`Error fetching tool with id ${id}:`, error);
    throw error;
  }
};

// Hook for fetching single tool details
export const useTool = (id: string): UseToolReturn => {
  // Create query key for React Query caching
  const queryKey = useMemo(() => ['tool', id], [id]);

  // Fetch data using React Query
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchTool(id),
    enabled: !!id, // Only fetch if id is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: unknown) => {
      // Retry on network errors or 5xx errors, max 3 times
      if (failureCount >= 3) return false;
      const apiError = error as { response?: { status?: number } };
      return !apiError.response || (apiError.response.status && apiError.response.status >= 500);
    },
  });

  return {
    data: data || null,
    isLoading,
    isError,
    error: error as Error || null,
  };
};

// Hook for prefetching tool data (useful for hover effects or navigation)
export const usePrefetchTool = () => {
  const queryClient = useQueryClient();

  const prefetchTool = useMemo(
    () => (id: string) => {
      queryClient.prefetchQuery({
        queryKey: ['tool', id],
        queryFn: () => fetchTool(id),
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    },
    [queryClient]
  );

  return prefetchTool;
};

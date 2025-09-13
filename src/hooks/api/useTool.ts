import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import apiClient, { apiClient as axios } from '@/api/client';
import { UseToolReturn, ToolResponseDto } from '@/api/types';
import { AITool } from '@/data/tools';
import { ToolResponseDto as ToolResponseType } from '@/api/types';

// Transform API response to match AITool interface (duplicate since it's not exported from useTools)
const transformToolResponse = (tool: ToolResponseType): AITool => ({
  id: tool.id,
  name: tool.name,
  description: tool.description,
  longDescription: tool.longDescription,
  pricing: tool.pricing,
  interface: tool.interface,
  functionality: tool.functionality,
  deployment: tool.deployment,
  popularity: tool.popularity,
  rating: tool.rating,
  reviewCount: tool.reviewCount,
  lastUpdated: tool.lastUpdated,
  logoUrl: tool.logoUrl,
  features: tool.features,
  searchKeywords: tool.searchKeywords,
  tags: tool.tags,
});

// API function to fetch single tool
const fetchTool = async (id: string): Promise<AITool> => {
  try {
    const response = await axios.get<ToolResponseDto>(`/tools/${id}`);
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

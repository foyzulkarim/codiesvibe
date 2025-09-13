import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useMemo } from 'react';
import apiClient, { apiClient as axios } from '@/api/client';
import { 
  ToolsQueryParams, 
  FilterState, 
  UseToolsReturn, 
  ToolResponseDto 
} from '@/api/types';
import { AITool } from '@/data/tools';

// Transform API response to match AITool interface
const transformToolResponse = (tool: ToolResponseDto): AITool => ({
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

// Build query parameters from component state
const buildQueryParams = (
  searchQuery: string,
  filters: FilterState,
  sortBy?: string,
  sortDirection?: 'asc' | 'desc'
): ToolsQueryParams => {
  const params: ToolsQueryParams = {};

  // Add search query if present
  if (searchQuery.trim()) {
    params.search = searchQuery.trim();
  }

  // Add filters if any are selected
  Object.entries(filters).forEach(([key, values]) => {
    if (values.length > 0) {
      if (key === 'functionality') {
        params.functionality = values;
      } else if (key === 'deployment') {
        params.deployment = values;
      }
    }
  });

  // Add sorting if specified
  if (sortBy) {
    params.sortBy = sortBy as ToolsQueryParams['sortBy'];
  }

  return params;
};

// API function to fetch tools
const fetchTools = async (params: ToolsQueryParams): Promise<AITool[]> => {
  try {
    const response = await axios.get<ToolResponseDto[]>('/tools', {
      params,
    });

    // Transform the response data
    const transformedData = response.data.map(transformToolResponse);

    return transformedData;
  } catch (error) {
    console.error('Error fetching tools:', error);
    throw error;
  }
};

// Main hook for fetching tools
export const useTools = (
  searchQuery: string,
  filters: FilterState,
  sortBy?: string,
  sortDirection?: 'asc' | 'desc'
): UseToolsReturn => {
  // Build query parameters
  const queryParams = useMemo(
    () => buildQueryParams(searchQuery, filters, sortBy, sortDirection),
    [searchQuery, filters, sortBy, sortDirection]
  );

  // Create query key for React Query caching
  const queryKey = useMemo(
    () => ['tools', queryParams],
    [queryParams]
  );

  // Fetch data using React Query
  const { data, isLoading, isError, error } = useQuery<AITool[]>({
    queryKey,
    queryFn: () => fetchTools(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (cacheTime renamed to gcTime in v5)
    retry: (failureCount, error: unknown) => {
      // Retry on network errors or 5xx errors, max 3 times
      if (failureCount >= 3) return false;
      const apiError = error as { response?: { status?: number } };
      return !apiError.response || (apiError.response.status && apiError.response.status >= 500);
    },
  } as UseQueryOptions<AITool[]>);

  return {
    data: data || [],
    isLoading,
    isError,
    error: error || null,
  };
};

// Debounced search hook for better performance
export const useDebouncedSearch = (delay: number = 300) => {
  const debouncedSearch = useMemo(
    () => debounce((callback: (query: string) => void, query: string) => {
      callback(query);
    }, delay),
    [delay]
  );

  return debouncedSearch;
};

// Hook for getting unique filter options from API data
export const useFilterOptions = () => {
  const { data: tools } = useTools('', {
    pricing: [],
    interface: [],
    functionality: [],
    deployment: [],
  });

  const filterOptions = useMemo(() => {
    if (!tools.length) return {
      pricing: [],
      interface: [],
      functionality: [],
      deployment: [],
    };

    return {
      pricing: Array.from(new Set(tools.flatMap(tool => tool.pricing))),
      interface: Array.from(new Set(tools.flatMap(tool => tool.interface))),
      functionality: Array.from(new Set(tools.flatMap(tool => tool.functionality))),
      deployment: Array.from(new Set(tools.flatMap(tool => tool.deployment))),
    };
  }, [tools]);

  return filterOptions;
};

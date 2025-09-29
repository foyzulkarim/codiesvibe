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
      // Legacy v1.x filters
      if (key === 'functionality') {
        params.functionality = values.join(',');
      } else if (key === 'deployment') {
        params.deployment = values.join(',');
      } else if (key === 'pricing') {
        params.pricing = values.join(',');
      } else if (key === 'interface') {
        params.interface = values.join(',');
      }
      // v2.0 category filters
      else if (key === 'primaryCategories') {
        params.primaryCategory = values.join(',');
      } else if (key === 'secondaryCategories') {
        params.secondaryCategory = values.join(',');
      } else if (key === 'industries') {
        params.industry = values.join(',');
      } else if (key === 'userTypes') {
        params.userType = values.join(',');
      }
      // v2.0 metadata filters
      else if (key === 'status') {
        params.status = values.join(',');
      } else if (key === 'complexity') {
        params.complexity = values.join(',');
      } else if (key === 'pricingModels') {
        params.pricingModel = values.join(',');
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

// Hook for getting unique filter options from API data (v2.0)
export const useFilterOptions = () => {
  const { data: tools } = useTools('', {
    pricing: [],
    interface: [],
    functionality: [],
    deployment: [],
    primaryCategories: [],
    secondaryCategories: [],
    industries: [],
    userTypes: [],
    aiFeatures: [],
    technicalFeatures: [],
    status: [],
    complexity: [],
    pricingModels: [],
  });

  const filterOptions = useMemo(() => {
    if (!tools.length) return {
      // Legacy filters
      pricing: [],
      interface: [],
      functionality: [],
      deployment: [],
      // v2.0 filters
      primaryCategories: [],
      secondaryCategories: [],
      industries: [],
      userTypes: [],
      aiFeatures: [],
      technicalFeatures: [],
      status: [],
      complexity: [],
      pricingModels: [],
    };

    return {
      // Legacy filters
      pricing: Array.from(new Set(tools.flatMap(tool => tool.pricing || []))),
      interface: Array.from(new Set(tools.flatMap(tool => tool.interface || []))),
      functionality: Array.from(new Set(tools.flatMap(tool => tool.functionality || []))),
      deployment: Array.from(new Set(tools.flatMap(tool => tool.deployment || []))),

      // v2.0 category filters
      primaryCategories: Array.from(new Set(tools.flatMap(tool => tool.categories?.primary || []))),
      secondaryCategories: Array.from(new Set(tools.flatMap(tool => tool.categories?.secondary || []))),
      industries: Array.from(new Set(tools.flatMap(tool => tool.categories?.industries || []))),
      userTypes: Array.from(new Set(tools.flatMap(tool => tool.categories?.userTypes || []))),

      // v2.0 capability filters
      aiFeatures: Array.from(new Set(tools.flatMap(tool =>
        Object.entries(tool.capabilities?.aiFeatures || {})
          .filter(([_, value]) => value === true)
          .map(([key, _]) => key)
      ))),
      technicalFeatures: Array.from(new Set(tools.flatMap(tool =>
        Object.entries(tool.capabilities?.technical || {})
          .filter(([_, value]) => value === true)
          .map(([key, _]) => key)
      ))),

      // v2.0 metadata filters
      status: Array.from(new Set(tools.map(tool => tool.status).filter(Boolean))),
      complexity: Array.from(new Set(tools.flatMap(tool =>
        tool.useCases?.map(useCase => useCase.complexity) || []
      ))),
      pricingModels: Array.from(new Set(tools.flatMap(tool =>
        tool.pricingSummary?.pricingModel || []
      ))),
    };
  }, [tools]);

  return filterOptions;
};

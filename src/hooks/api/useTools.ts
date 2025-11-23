import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { apiConfig } from '@/config/api';
import { useDebounce } from '@/hooks/useDebounce';
import {
  UseToolsReturn,
  AiSearchReasoning,
} from '@/api/types';

// Get search API base URL (different from main API)
const getSearchApiUrl = () => {
  // Use environment variable or default to localhost for development
  return import.meta.env.VITE_SEARCH_API_URL || 'http://localhost:4003/api';
};

// Create axios instance for search API
const searchApiClient = axios.create({
  baseURL: getSearchApiUrl(),
  timeout: apiConfig.search.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types for AI search API response
interface AiSearchResponse {
  query: string;
  intentState: IntentState;
  executionPlan: ExecutionPlan;
  candidates: Candidate[];
  executionStats: ExecutionStats;
  executionTime: string;
  phase: string;
  strategy: string;
  explanation: string;
  results: SearchResult[];
}

interface IntentState {
  primaryGoal: string;
  referenceTool: string;
  comparisonMode: string | null;
  desiredFeatures: string[];
  filters: string[];
  pricing: string | null;
  priceRange: string | null;
  priceComparison: string | null;
  category: string;
  platform: string;
  semanticVariants: string[];
  constraints: string[];
  confidence: number;
}

interface ExecutionPlan {
  strategy: string;
  vectorSources: VectorSource[];
  structuredSources: StructuredSource[];
  reranker: Reranker;
  fusion: string;
  maxRefinementCycles: number;
  explanation: string;
  confidence: number;
}

interface VectorSource {
  collection: string;
  embeddingType: string;
  queryVectorSource: string;
  topK: number;
}

interface StructuredSource {
  source: string;
  filters: Filter[];
  limit: number;
}

interface Filter {
  field: string;
  operator: string;
  value: string;
}

interface Reranker {
  type: string;
  model: string;
  maxCandidates: number;
}

interface Candidate {
  id: string;
  source: string;
  score: number;
  metadata: {
    name: string;
    platform: string;
    features: string[];
    description: string;
  };
  embeddingVector: null;
  provenance: Provenance;
}

interface Provenance {
  collection: string;
  queryVectorSource: string;
  filtersApplied: string[];
}

interface ExecutionStats {
  totalTimeMs: number;
  nodeTimings: {
    [key: string]: number;
  };
  vectorQueriesExecuted: number;
  structuredQueriesExecuted: number;
  fusionMethod: string;
}

interface SearchResult {
  id: string;
  name: string;
  description: string;
  score: number;
  source: string;
  metadata: {
    name: string;
    platform: string;
    features: string[];
    description: string;
  };
}

const aiSearchTools = async (searchQuery: string): Promise<AiSearchResponse> => {
  try {
    if (apiConfig.features.debug) {
      console.log('aiSearchTools searchQuery:', searchQuery);
      console.log('typeof searchQuery:', typeof searchQuery);
      console.log('Search API URL:', getSearchApiUrl());
    }

    // Ensure searchQuery is a string
    const searchQueryStr = typeof searchQuery === 'string' ? searchQuery : String(searchQuery || '');

    const response = await searchApiClient.post<AiSearchResponse>('/search', {
      query: searchQueryStr,
      limit: apiConfig.search.defaultLimit,
      debug: apiConfig.features.debug,
    });

    if (apiConfig.features.debug) {
      console.log('aiSearchTools response.data:', response.data);
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching tools:', error);
    throw error;
  }
};

// Main hook for fetching tools
export const useTools = (params: string): UseToolsReturn => {
  // Debounce search query to reduce API calls
  const debouncedParams = useDebounce(params, apiConfig.search.debounceDelay);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tools', debouncedParams],
    queryFn: async () => {
      const response = {
        data: [],
        reasoning: {
          query: '',
          intentState: {},
          executionPlan: {},
          candidates: [],
          executionStats: {},
          executionTime: '',
          phase: '',
          strategy: '',
          explanation: ''
        }
      };
      if (debouncedParams) {
        // Trigger API call for debugging only
        const apiResponse = await aiSearchTools(debouncedParams);
        response.data = apiResponse.results;
        response.reasoning = {
          query: apiResponse.query,
          intentState: apiResponse.intentState,
          executionPlan: apiResponse.executionPlan,
          candidates: apiResponse.candidates,
          executionStats: apiResponse.executionStats,
          executionTime: apiResponse.executionTime,
          phase: apiResponse.phase,
          strategy: apiResponse.strategy,
          explanation: apiResponse.explanation
        };
      }

      return response;
    },
    // Only run query when debounced params meets minimum length
    enabled: !debouncedParams || debouncedParams.length >= apiConfig.search.minLength,
  });

  return {
    data: data?.data,
    reasoning: data?.reasoning,
    isLoading,
    isError,
    error,
  };
};

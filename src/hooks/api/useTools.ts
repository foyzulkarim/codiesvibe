import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useMemo } from 'react';
import { apiClient as axios } from '@/api/client';
import {
  UseToolsReturn,
  AiSearchReasoning,
} from '@/api/types';

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
    console.log('aiSearchTools searchQuery:', searchQuery);
    console.log('typeof searchQuery:', typeof searchQuery);

    // Ensure searchQuery is a string
    const searchQueryStr = typeof searchQuery === 'string' ? searchQuery : String(searchQuery || '');
    
    const response = await axios.post<AiSearchResponse>('/tools/ai-search', {
      query: searchQueryStr,
      limit: 10,
      debug: false,
    }, {
      timeout: 60000 // 60 seconds for LLM operations
    });
    console.log('aiSearchTools response.data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching tools:', error);
    throw error;
  }
};

// Main hook for fetching tools
export const useTools = (params: string): UseToolsReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tools', params],
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
      if (params) {
        // Trigger API call for debugging only
        const apiResponse = await aiSearchTools(params);
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
  });

  return {
    data: data?.data,
    reasoning: data?.reasoning,
    isLoading,
    isError,
    error,
  };
};

// Debounced search hook for better performance
export const useDebouncedSearch = (delay: number = 300) => {
  const debouncedSearch = useMemo(
    () =>
      debounce((callback: (query: string) => void, query: string) => {
        callback(query);
      }, delay),
    [delay]
  );

  return debouncedSearch;
};

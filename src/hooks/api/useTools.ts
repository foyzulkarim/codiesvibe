/**
 * AI Search Hook
 *
 * Hook for performing AI-powered semantic search on tools.
 */

import { useQuery } from '@tanstack/react-query';
import { searchClient } from '@/api/search-client';
import { apiConfig } from '@/config/api';
import { useDebounce } from '@/hooks/useDebounce';
import { UseToolsReturn, AiSearchReasoning } from '@/api/types';

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
  const searchQueryStr =
    typeof searchQuery === 'string' ? searchQuery : String(searchQuery || '');

  const response = await searchClient.post<AiSearchResponse>(
    '/search',
    {
      query: searchQueryStr,
      limit: apiConfig.search.defaultLimit,
      debug: apiConfig.features.debug,
    },
    {
      // Use search-specific timeout (10 minutes) for AI operations
      timeout: apiConfig.search.timeout,
    }
  );

  return response.data;
};

/**
 * Hook for AI-powered semantic search
 *
 * @param params - Search query string
 * @returns Search results with AI reasoning data
 */
export const useTools = (params: string): UseToolsReturn => {
  const debouncedParams = useDebounce(params, apiConfig.search.debounceDelay);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tools', debouncedParams],
    queryFn: async () => {
      const response: {
        data: SearchResult[];
        reasoning: AiSearchReasoning;
      } = {
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
          explanation: '',
        },
      };

      if (debouncedParams) {
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
          explanation: apiResponse.explanation,
        };
      }

      return response;
    },
    enabled:
      !debouncedParams || debouncedParams.length >= apiConfig.search.minLength,
  });

  return {
    data: data?.data,
    reasoning: data?.reasoning,
    isLoading,
    isError,
    error,
  };
};

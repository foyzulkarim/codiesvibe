import { EnhancedState } from "@/types/enhanced-state";
import { multiVectorSearchService } from "@/services/multi-vector-search.service";
import { enhancedSearchConfig } from "@/config/enhanced-search-config";

/**
 * Multi-Vector Search Node for AI Search Enhancement v2.0
 * 
 * This node wraps the existing multiVectorSearchService and integrates it
 * with the LangGraph execution flow. It uses the enhancedSearchConfig
 * for vector types and max results, includes proper error handling with
 * fallback to single vector search, and returns the appropriate EnhancedState structure.
 */
export async function multiVectorSearchNode(state: EnhancedState): Promise<Partial<EnhancedState>> {
  const startTime = Date.now();
  
  console.log('multiVectorSearchNode(): Starting multi-vector search', {
    query: state.metadata?.originalQuery || state.query || 'unknown',
    vectorTypes: enhancedSearchConfig.vectorTypes,
    maxResults: enhancedSearchConfig.maxResultsPerVector
  });

  try {
    // Extract query from state
    const query = state.metadata?.originalQuery || state.query || '';
    
    if (!query) {
      throw new Error('No query found in state for multi-vector search');
    }

    // Perform multi-vector search using the service
    const vectorSearchState = await multiVectorSearchService.searchMultiVector(query, {
      limit: enhancedSearchConfig.maxResultsPerVector,
      vectorTypes: enhancedSearchConfig.vectorTypes,
      mergeStrategy: 'reciprocal_rank_fusion',
      rrfKValue: enhancedSearchConfig.rrfKValue,
      enableSourceAttribution: true
    });

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Update metadata with execution information
    const updatedMetadata = {
      ...state.metadata,
      nodeExecutionTimes: {
        ...state.metadata?.nodeExecutionTimes,
        'multi-vector-search': executionTime
      },
      executionPath: [
        ...(state.metadata?.executionPath || []),
        'multi-vector-search'
      ]
    };

    console.log('multiVectorSearchNode(): Completed successfully', {
      executionTime,
      resultCount: Object.values(vectorSearchState.vectorSearchResults)
        .reduce((sum, results) => sum + results.length, 0)
    });

    // Return the enhanced state with vector search results
    return {
      vectorSearchState,
      metadata: updatedMetadata
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    console.error('multiVectorSearchNode(): Error during multi-vector search', {
      error: error instanceof Error ? error.message : String(error),
      executionTime,
      fallingBack: true
    });

    // Fallback to single vector search if multi-vector search fails
    try {
      console.log('multiVectorSearchNode(): Attempting fallback to single vector search');
      
      const query = state.metadata?.originalQuery || state.query || '';
      if (!query) {
        throw new Error('No query found in state for fallback search');
      }

      // Use just the semantic vector type for fallback
      const fallbackResults = await multiVectorSearchService.searchMultiVector(query, {
        limit: enhancedSearchConfig.maxResultsPerVector,
        vectorTypes: ['semantic'],
        mergeStrategy: 'reciprocal_rank_fusion',
        rrfKValue: enhancedSearchConfig.rrfKValue,
        enableSourceAttribution: true
      });

      // Update metadata with fallback information
      const updatedMetadata = {
        ...state.metadata,
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'multi-vector-search': executionTime
        },
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'multi-vector-search-fallback'
        ],
        fallbackUsed: 'single-vector-search',
        fallbackReason: error instanceof Error ? error.message : String(error)
      };

      console.log('multiVectorSearchNode(): Fallback completed successfully', {
        executionTime,
        resultCount: fallbackResults.vectorSearchResults.semantic?.length || 0
      });

      return {
        vectorSearchState: fallbackResults,
        metadata: updatedMetadata
      };

    } catch (fallbackError) {
      console.error('multiVectorSearchNode(): Fallback also failed', {
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      });

      // Even fallback failed, return empty state with error information
      const updatedMetadata = {
        ...state.metadata,
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'multi-vector-search': executionTime
        },
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'multi-vector-search-error'
        ],
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        fallbackFailed: true
      };

      return {
        vectorSearchState: {
          queryEmbedding: [],
          vectorSearchResults: {
            semantic: [],
            categories: [],
            functionality: [],
            aliases: [],
            composites: []
          },
          searchMetrics: {},
          mergeStrategy: 'reciprocal_rank_fusion'
        },
        metadata: updatedMetadata
      };
    }
  }
}

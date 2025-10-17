import { EnhancedState } from "@/types/enhanced-state";
import { resultMergerService } from "@/services/result-merger.service";
import { enhancedSearchConfig } from "@/config/enhanced-search-config";
import { RankedResults, MergedResult } from "@/services/result-merger.service";

/**
 * Result Merger Node for AI Search Enhancement v2.0
 * 
 * This node prepares execution results in the expected contract format,
 * uses the existing resultMergerService with RRF configuration,
 * handles multiple vector types as separate sources, includes proper error handling,
 * and tracks execution time and updates metadata.
 */
export async function resultMergerNode(state: EnhancedState): Promise<Partial<EnhancedState>> {
  const startTime = Date.now();
  
  console.log('resultMergerNode(): Starting result merging', {
    hasVectorSearchState: !!state.vectorSearchState,
    hasExecutionResults: !!state.executionResults,
    sourcesCount: state.executionResults?.length || 0
  });

  try {
    // Prepare execution results in the expected contract format
    const executionResults: RankedResults[] = [];
    
    // Add vector search results as separate sources if available
    if (state.vectorSearchState) {
      const { vectorSearchState } = state;
      
      // Process each vector type as a separate source
      Object.entries(vectorSearchState.vectorSearchResults).forEach(([vectorType, results]) => {
        if (results && results.length > 0) {
          executionResults.push({
            source: `qdrant-${vectorType}`,
            results: results.map(result => ({
              id: result.id || result.payload?.id || `temp_${Math.random().toString(36).substr(2, 9)}`,
              score: result.score || 0,
              payload: result.payload,
              metadata: {
                vectorType,
                rank: result.rank,
                originalScore: result.originalScore,
                attribution: result.attribution
              },
              source: vectorType
            })),
            totalResults: results.length,
            searchTime: vectorSearchState.searchMetrics[vectorType]?.searchTime || 0,
            metadata: {
              vectorType,
              mergeStrategy: vectorSearchState.mergeStrategy,
              avgSimilarity: vectorSearchState.searchMetrics[vectorType]?.avgSimilarity || 0
            }
          });
        }
      });
    }
    
    // Add traditional execution results if available
    if (state.executionResults && state.executionResults.length > 0) {
      state.executionResults.forEach((result, index) => {
        if (result.results && result.results.length > 0) {
          executionResults.push({
            source: result.source || `execution-${index}`,
            results: result.results.map(item => ({
              id: item._id?.toString() || item.id || `temp_${Math.random().toString(36).substr(2, 9)}`,
              score: item.relevanceScore || item.score || 0.5,
              payload: item,
              metadata: {
                sourceIndex: index,
                sourceType: 'traditional'
              },
              source: result.source || `execution-${index}`
            })),
            totalResults: result.results.length,
            searchTime: result.executionTime || 0,
            metadata: result.metadata || {}
          });
        }
      });
    }

    if (executionResults.length === 0) {
      console.log('resultMergerNode(): No results to merge, returning empty results');
      
      const executionTime = Date.now() - startTime;
      const updatedMetadata = {
        ...state.metadata,
        nodeExecutionTimes: {
          ...state.metadata?.nodeExecutionTimes,
          'result-merger': executionTime
        },
        executionPath: [
          ...(state.metadata?.executionPath || []),
          'result-merger-empty'
        ]
      };

      return {
        mergedResults: {
          results: [],
          mergingStrategy: 'none',
          diversityScore: 0,
          relevanceDistribution: {
            high: 0,
            medium: 0,
            low: 0
          }
        },
        metadata: updatedMetadata
      };
    }

    console.log('resultMergerNode(): Merging results from sources', {
      sourceCount: executionResults.length,
      totalResults: executionResults.reduce((sum, source) => sum + (source.results?.length || 0), 0),
      sources: executionResults.map(s => s.source)
    });

    // Use the existing resultMergerService with RRF configuration
    const mergedResults = await resultMergerService.mergeResults(executionResults, {
      kValue: enhancedSearchConfig.rrfKValue,
      maxResults: 100,
      enableDeduplication: true,
      deduplicationThreshold: enhancedSearchConfig.dedupeThreshold,
      preserveMetadata: true,
      sourceWeights: enhancedSearchConfig.sourceWeights,
      useEnhancedDuplicateDetection: true
    });

    // Calculate relevance distribution
    const relevanceDistribution = {
      high: mergedResults.filter(r => r.rrfScore > 0.05).length,
      medium: mergedResults.filter(r => r.rrfScore > 0.02 && r.rrfScore <= 0.05).length,
      low: mergedResults.filter(r => r.rrfScore <= 0.02).length
    };

    // Calculate diversity score (simple implementation)
    const categories = new Set(mergedResults.map(r => r.payload?.category).filter(Boolean));
    const diversityScore = categories.size / Math.max(mergedResults.length, 1);

    // Format results to match the expected schema
    const formattedResults = {
      results: mergedResults.map(result => ({
        tool: result.payload,
        finalScore: result.rrfScore,
        sourceScores: {
          mongodb: result.originalRankings['mongodb']?.score || 0,
          qdrant: {
            semantic: result.originalRankings['qdrant-semantic']?.score || 0,
            categories: result.originalRankings['qdrant-categories']?.score || 0,
            functionality: result.originalRankings['qdrant-functionality']?.score || 0,
            aliases: result.originalRankings['qdrant-aliases']?.score || 0,
            composites: result.originalRankings['qdrant-composites']?.score || 0
          },
          combined: result.rrfScore
        },
        explanation: `Merged from ${result.sourceCount} sources using Reciprocal Rank Fusion (k=${enhancedSearchConfig.rrfKValue})`,
        matchSignals: {
          exactMatches: [],
          semanticMatches: [result.payload?.name].filter(Boolean),
          categoryMatches: [result.payload?.category].filter(Boolean),
          featureMatches: []
        }
      })),
      mergingStrategy: `reciprocal_rank_fusion_k${enhancedSearchConfig.rrfKValue}`,
      diversityScore,
      relevanceDistribution
    };

    const executionTime = Date.now() - startTime;

    // Update metadata with execution information
    const updatedMetadata = {
      ...state.metadata,
      nodeExecutionTimes: {
        ...state.metadata?.nodeExecutionTimes,
        'result-merger': executionTime
      },
      executionPath: [
        ...(state.metadata?.executionPath || []),
        'result-merger'
      ],
      resultStats: {
        sourcesProcessed: executionResults.length,
        totalInputResults: executionResults.reduce((sum, source) => sum + (source.results?.length || 0), 0),
        uniqueResults: mergedResults.length,
        duplicatesRemoved: executionResults.reduce((sum, source) => sum + (source.results?.length || 0), 0) - mergedResults.length,
        diversityScore,
        mergeStrategy: `reciprocal_rank_fusion_k${enhancedSearchConfig.rrfKValue}`
      }
    };

    console.log('resultMergerNode(): Completed successfully', {
      executionTime,
      inputResults: executionResults.reduce((sum, source) => sum + (source.results?.length || 0), 0),
      uniqueResults: mergedResults.length,
      duplicatesRemoved: executionResults.reduce((sum, source) => sum + (source.results?.length || 0), 0) - mergedResults.length,
      diversityScore
    });

    // Return the enhanced state with merged results
    return {
      mergedResults: formattedResults,
      metadata: updatedMetadata
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    console.error('resultMergerNode(): Error during result merging', {
      error: error instanceof Error ? error.message : String(error),
      executionTime
    });

    // Return empty results with error information
    const updatedMetadata = {
      ...state.metadata,
      nodeExecutionTimes: {
        ...state.metadata?.nodeExecutionTimes,
        'result-merger': executionTime
      },
      executionPath: [
        ...(state.metadata?.executionPath || []),
        'result-merger-error'
      ],
      error: error instanceof Error ? error.message : String(error)
    };

    return {
      mergedResults: {
        results: [],
        mergingStrategy: 'error',
        diversityScore: 0,
        relevanceDistribution: {
          high: 0,
          medium: 0,
          low: 0
        }
      },
      metadata: updatedMetadata
    };
  }
}

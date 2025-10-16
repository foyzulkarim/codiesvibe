/**
 * Result Merger Service - Reciprocal Rank Fusion Algorithm
 *
 * This service implements the Reciprocal Rank Fusion (RRF) algorithm for merging
 * search results from multiple sources. It provides a clean interface for
 * combining ranked results from different search systems (vector search,
 * traditional search, etc.) while maintaining original metadata and removing
 * duplicates.
 */

import { z } from 'zod';
import { duplicateDetectionService } from './duplicate-detection.service';
import { DuplicateDetectionConfig, DetectionStrategy } from './duplicate-detection.interfaces';

// Interface for search result items
export interface SearchResultItem {
  id: string;
  score: number;
  payload?: any;
  metadata?: Record<string, any>;
  source?: string;
}

// Interface for ranked results from a single source
export interface RankedResults {
  source: string;
  results: SearchResultItem[];
  totalResults?: number;
  searchTime?: number;
  metadata?: Record<string, any>;
}

// Interface for merged result with RRF score
export interface MergedResult extends SearchResultItem {
  rrfScore: number;
  originalRankings: {
    [source: string]: {
      rank: number;
      score: number;
    };
  };
  sourceCount: number;
  finalRank: number;
}

// Interface for merge configuration
export interface MergeConfig {
  kValue?: number; // RRF k parameter (typically 60)
  maxResults?: number;
  enableDeduplication?: boolean;
  deduplicationThreshold?: number;
  preserveMetadata?: boolean;
  sourceWeights?: Record<string, number>;
  // Enhanced duplicate detection options
  useEnhancedDuplicateDetection?: boolean;
  duplicateDetectionConfig?: DuplicateDetectionConfig;
}

// Default configuration
const DEFAULT_CONFIG: Required<Omit<MergeConfig, 'sourceWeights' | 'duplicateDetectionConfig'>> & {
  sourceWeights: Record<string, number>;
  duplicateDetectionConfig: DuplicateDetectionConfig;
} = {
  kValue: 60,
  maxResults: 100,
  enableDeduplication: true,
  deduplicationThreshold: 0.9,
  preserveMetadata: true,
  useEnhancedDuplicateDetection: true,
  sourceWeights: {
    semantic: 1.0,
    traditional: 0.9,
    hybrid: 0.95,
    vector: 0.85,
    fulltext: 0.8
  },
  duplicateDetectionConfig: {
    enabled: true,
    strategies: [DetectionStrategy.EXACT_ID, DetectionStrategy.EXACT_URL, DetectionStrategy.CONTENT_SIMILARITY, DetectionStrategy.VERSION_AWARE, DetectionStrategy.FUZZY_MATCH],
    thresholds: {
      contentSimilarity: 0.8,
      fuzzyMatch: 0.7,
      versionAware: 0.85,
      combined: 0.75
    },
    fieldWeights: {
      name: 0.5,
      description: 0.3,
      url: 0.15,
      category: 0.05,
      metadata: 0.0
    },
    customRules: [],
    performance: {
      maxComparisonItems: 1000,
      enableCache: true,
      cacheSize: 10000,
      enableParallel: true,
      parallelWorkers: 4
    },
    logging: {
      enabled: false,
      level: 'info',
      includeStats: true
    }
  }
};

/**
 * Reciprocal Rank Fusion (RRF) implementation for merging search results
 */
export class ReciprocalRankFusion {
  private config: typeof DEFAULT_CONFIG;

  constructor(config: Partial<MergeConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      sourceWeights: {
        ...DEFAULT_CONFIG.sourceWeights,
        ...(config.sourceWeights || {})
      },
      duplicateDetectionConfig: {
        ...DEFAULT_CONFIG.duplicateDetectionConfig,
        ...(config.duplicateDetectionConfig || {})
      }
    };
  }

  /**
   * Merge multiple arrays of ranked results using RRF algorithm
   * 
   * @param resultsBySource Array of ranked results from different sources
   * @param config Optional merge configuration
   * @returns Merged and ranked results with RRF scores
   */
  async mergeResults(
    resultsBySource: RankedResults[],
    config?: Partial<MergeConfig>
  ): Promise<MergedResult[]> {
    // Merge config with instance config
    const mergeConfig = {
      ...this.config,
      ...config,
      sourceWeights: {
        ...this.config.sourceWeights,
        ...(config?.sourceWeights || {})
      },
      duplicateDetectionConfig: {
        ...this.config.duplicateDetectionConfig,
        ...(config?.duplicateDetectionConfig || {})
      }
    };

    // Calculate RRF scores for all results
    const rrfScores = this.calculateRRFScores(resultsBySource, mergeConfig);

    // Sort and rank the merged results
    const sortedResults = this.sortAndRank(rrfScores, mergeConfig);

    // Apply deduplication if enabled
    if (mergeConfig.enableDeduplication) {
      if (mergeConfig.useEnhancedDuplicateDetection) {
        return this.enhancedDeduplicateResults(sortedResults, mergeConfig);
      } else {
        return this.deduplicateResults(sortedResults, mergeConfig.deduplicationThreshold);
      }
    }

    return sortedResults;
  }

  /**
   * Calculate RRF scores for each unique result across all sources
   * 
   * @param resultsBySource Array of ranked results from different sources
   * @param config Merge configuration
   * @returns Map of result IDs to their RRF scores and metadata
   */
  private calculateRRFScores(
    resultsBySource: RankedResults[],
    config: typeof DEFAULT_CONFIG
  ): Map<string, MergedResult> {
    const scoreMap = new Map<string, MergedResult>();

    // Process each source's results
    for (const sourceResults of resultsBySource) {
      const source = sourceResults.source;
      const sourceWeight = config.sourceWeights[source] || 1.0;

      // Process each result in this source
      for (let rank = 0; rank < sourceResults.results.length; rank++) {
        const result = sourceResults.results[rank];
        const resultId = result.id;

        // Calculate RRF contribution: 1 / (k + rank)
        // Note: rank is 0-indexed, so we add 1 to make it 1-indexed
        const rrfContribution = 1 / (config.kValue + rank + 1);
        const weightedContribution = rrfContribution * sourceWeight;

        if (!scoreMap.has(resultId)) {
          // Create new merged result entry
          scoreMap.set(resultId, {
            id: resultId,
            score: result.score,
            payload: result.payload,
            metadata: result.metadata,
            source: result.source,
            rrfScore: weightedContribution,
            originalRankings: {
              [source]: {
                rank: rank + 1,
                score: result.score
              }
            },
            sourceCount: 1,
            finalRank: 0 // Will be set during sorting
          });
        } else {
          // Update existing merged result
          const mergedResult = scoreMap.get(resultId)!;
          mergedResult.rrfScore += weightedContribution;
          mergedResult.originalRankings[source] = {
            rank: rank + 1,
            score: result.score
          };
          mergedResult.sourceCount++;

          // Update score if this source has a higher score
          if (result.score > mergedResult.score) {
            mergedResult.score = result.score;
          }

          // Merge metadata if enabled
          if (config.preserveMetadata && result.metadata) {
            mergedResult.metadata = {
              ...mergedResult.metadata,
              ...result.metadata,
              sources: [...(mergedResult.metadata?.sources || []), source]
            };
          }
        }
      }
    }

    return scoreMap;
  }

  /**
   * Sort results by RRF score and assign final ranks
   * 
   * @param scoreMap Map of result IDs to their merged results
   * @param config Merge configuration
   * @returns Sorted and ranked array of merged results
   */
  private sortAndRank(
    scoreMap: Map<string, MergedResult>,
    config: typeof DEFAULT_CONFIG
  ): MergedResult[] {
    // Convert map to array and sort by RRF score (descending)
    const sortedResults = Array.from(scoreMap.values())
      .sort((a, b) => {
        // Primary sort: RRF score (descending)
        if (b.rrfScore !== a.rrfScore) {
          return b.rrfScore - a.rrfScore;
        }
        
        // Secondary sort: Source count (descending) - results from more sources ranked higher
        if (b.sourceCount !== a.sourceCount) {
          return b.sourceCount - a.sourceCount;
        }
        
        // Tertiary sort: Original score (descending)
        return b.score - a.score;
      })
      .slice(0, config.maxResults);

    // Assign final ranks
    sortedResults.forEach((result, index) => {
      result.finalRank = index + 1;
    });

    return sortedResults;
  }

  /**
   * Remove duplicate results based on content similarity
   *
   * @param results Array of merged results
   * @param threshold Similarity threshold for deduplication
   * @returns Deduplicated array of results
   */
  private deduplicateResults(
    results: MergedResult[],
    threshold: number
  ): MergedResult[] {
    const uniqueResults: MergedResult[] = [];
    const seenContent = new Map<string, MergedResult>();

    for (const result of results) {
      const contentHash = this.generateContentHash(result);
      
      if (seenContent.has(contentHash)) {
        const existingResult = seenContent.get(contentHash)!;
        const similarity = this.calculateContentSimilarity(result, existingResult);
        
        if (similarity >= threshold) {
          // Merge with existing result
          this.mergeWithExisting(result, existingResult);
          continue;
        }
      }
      
      seenContent.set(contentHash, result);
      uniqueResults.push(result);
    }

    // Re-rank after deduplication
    uniqueResults.forEach((result, index) => {
      result.finalRank = index + 1;
    });

    return uniqueResults;
  }

  /**
   * Enhanced duplicate detection using the dedicated duplicate detection service
   *
   * @param results Array of merged results
   * @param config Merge configuration
   * @returns Deduplicated array of results
   */
  private async enhancedDeduplicateResults(
    results: MergedResult[],
    config: typeof DEFAULT_CONFIG
  ): Promise<MergedResult[]> {
    try {
      // Convert MergedResult to SearchResultItem for duplicate detection
      const searchResultItems: SearchResultItem[] = results.map(result => ({
        id: result.id,
        score: result.score,
        payload: result.payload,
        metadata: {
          ...result.metadata,
          originalRankings: result.originalRankings,
          sourceCount: result.sourceCount,
          rrfScore: result.rrfScore
        },
        source: result.source
      }));

      // Use the enhanced duplicate detection service
      const duplicateResult = await duplicateDetectionService.detectDuplicates(
        searchResultItems,
        config.duplicateDetectionConfig
      );

      // Convert back to MergedResult format
      const deduplicatedResults: MergedResult[] = duplicateResult.deduplicatedItems.map(item => ({
        id: item.id,
        score: item.score,
        payload: item.payload,
        metadata: item.metadata,
        source: item.source,
        rrfScore: item.metadata?.rrfScore || 0,
        originalRankings: item.metadata?.originalRankings || {},
        sourceCount: item.metadata?.sourceCount || 1,
        finalRank: 0 // Will be set during re-ranking
      }));

      // Re-rank after deduplication
      deduplicatedResults.forEach((result, index) => {
        result.finalRank = index + 1;
      });

      // Log duplicate detection statistics if enabled
      if (config.duplicateDetectionConfig.logging?.enabled) {
        console.log(`[ResultMerger] Enhanced duplicate detection completed:`);
        console.log(`  - Total items: ${duplicateResult.stats.totalItems}`);
        console.log(`  - Duplicates removed: ${duplicateResult.stats.duplicatesRemoved}`);
        console.log(`  - Unique items: ${duplicateResult.stats.uniqueItems}`);
        console.log(`  - Processing time: ${duplicateResult.stats.processingTime}ms`);
        console.log(`  - Duplicate groups: ${duplicateResult.duplicateGroups.length}`);
      }

      return deduplicatedResults;
    } catch (error) {
      console.error('[ResultMerger] Enhanced duplicate detection failed, falling back to basic deduplication:', error);
      // Fallback to basic deduplication
      return this.deduplicateResults(results, config.deduplicationThreshold);
    }
  }

  /**
   * Generate content hash for a result
   * 
   * @param result The result to hash
   * @returns Content hash string
   */
  private generateContentHash(result: MergedResult): string {
    const content = [
      result.payload?.name || '',
      result.payload?.description || '',
      result.payload?.category || ''
    ].join(' ').toLowerCase();

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString();
  }

  /**
   * Calculate content similarity between two results
   * 
   * @param result1 First result
   * @param result2 Second result
   * @returns Similarity score between 0 and 1
   */
  private calculateContentSimilarity(
    result1: MergedResult,
    result2: MergedResult
  ): number {
    const name1 = (result1.payload?.name || '').toLowerCase();
    const name2 = (result2.payload?.name || '').toLowerCase();
    const desc1 = (result1.payload?.description || '').toLowerCase();
    const desc2 = (result2.payload?.description || '').toLowerCase();

    // Name similarity (70% weight)
    const nameSimilarity = name1 === name2 ? 1.0 : this.jaccardSimilarity(name1, name2);
    
    // Description similarity (30% weight)
    const descSimilarity = this.jaccardSimilarity(desc1, desc2);

    return (nameSimilarity * 0.7) + (descSimilarity * 0.3);
  }

  /**
   * Calculate Jaccard similarity between two strings
   * 
   * @param str1 First string
   * @param str2 Second string
   * @returns Jaccard similarity score
   */
  private jaccardSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 0));
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 0));
    
    if (words1.size === 0 && words2.size === 0) return 1;
    if (words1.size === 0 || words2.size === 0) return 0;
    
    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set(Array.from(words1).concat(Array.from(words2)));
    
    return intersection.size / union.size;
  }

  /**
   * Merge a duplicate result with an existing result
   * 
   * @param duplicate The duplicate result
   * @param existing The existing result to merge into
   */
  private mergeWithExisting(duplicate: MergedResult, existing: MergedResult): void {
    // Combine RRF scores
    existing.rrfScore += duplicate.rrfScore;
    
    // Merge source rankings
    Object.assign(existing.originalRankings, duplicate.originalRankings);
    existing.sourceCount += duplicate.sourceCount;
    
    // Update score if duplicate has higher score
    if (duplicate.score > existing.score) {
      existing.score = duplicate.score;
    }
    
    // Merge metadata
    if (existing.metadata && duplicate.metadata) {
      existing.metadata = {
        ...existing.metadata,
        ...duplicate.metadata,
        sources: [
          ...(existing.metadata.sources || []),
          ...(duplicate.metadata.sources || [])
        ].filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
      };
    }
  }

  /**
   * Update the merge configuration
   *
   * @param newConfig Partial configuration to merge with existing config
   */
  updateConfig(newConfig: Partial<MergeConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      sourceWeights: {
        ...this.config.sourceWeights,
        ...(newConfig.sourceWeights || {})
      },
      duplicateDetectionConfig: {
        ...this.config.duplicateDetectionConfig,
        ...(newConfig.duplicateDetectionConfig || {})
      }
    };
  }

  /**
   * Get the current configuration
   * 
   * @returns Current merge configuration
   */
  getConfig(): typeof DEFAULT_CONFIG {
    return { ...this.config };
  }

  /**
   * Validate merge configuration
   * 
   * @param config Configuration to validate
   * @returns True if configuration is valid
   */
  static validateConfig(config: Partial<MergeConfig>): boolean {
    if (config.kValue !== undefined && (config.kValue <= 0 || config.kValue > 1000)) {
      return false;
    }
    
    if (config.maxResults !== undefined && (config.maxResults <= 0 || config.maxResults > 10000)) {
      return false;
    }
    
    if (config.deduplicationThreshold !== undefined && 
        (config.deduplicationThreshold < 0 || config.deduplicationThreshold > 1)) {
      return false;
    }
    
    return true;
  }
}

// Export singleton instance
export const resultMergerService = new ReciprocalRankFusion();

// Types are already exported inline

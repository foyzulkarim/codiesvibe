/**
 * Enhanced Result Deduplication Utilities
 *
 * This module provides utilities for deduplicating search results from multiple vector types.
 * It implements various similarity-based deduplication strategies to ensure diverse and relevant results.
 * Enhanced with RRF score merging, source attribution preservation, and performance optimizations.
 */

// Source attribution for merged results
export interface SourceAttribution {
  vectorType: string;
  score: number;
  rank: number;
  weight: number;
}

// Enhanced deduplication configuration
export interface DeduplicationConfig {
  similarityThreshold: number;
  strategy: 'id_based' | 'content_based' | 'hybrid' | 'rrf_enhanced';
  fields: string[];
  weights: Record<string, number>;
  // RRF configuration
  rrfKValue: number;
  enableScoreMergin: boolean;
  enableSourceAttribution: boolean;
  // Vector type specific thresholds
  vectorTypeThresholds: Record<string, number>;
  // Performance optimization settings
  batchSize: number;
  enableParallelProcessing: boolean;
}

// Enhanced deduplication result with attribution
export interface DeduplicationResult {
  uniqueResults: any[];
  duplicatesRemoved: number;
  deduplicationTime: number;
  similarityThreshold: number;
  strategy: string;
  // Enhanced metrics
  totalResultsProcessed: number;
  averageMergedScore: number;
  sourceAttributionSummary: Record<string, number>;
}

export interface SimilarityResult {
  similarity: number;
  reason: string;
  fields: Record<string, number>;
}

// RRF merge result with attribution
export interface RRFMergeResult {
  id: string;
  result: any;
  rrfScore: number;
  weightedScore: number;
  sources: SourceAttribution[];
  mergedFromCount: number;
}

// Performance metrics for deduplication
export interface DeduplicationMetrics {
  totalProcessed: number;
  uniqueResults: number;
  duplicatesRemoved: number;
  processingTime: number;
  averageSimilarityScore: number;
  batchCount: number;
}

/**
 * Main deduplication class with multiple strategies
 */
export class ResultDeduplicator {
  private config: DeduplicationConfig;

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = {
      similarityThreshold: 0.9,
      strategy: 'hybrid',
      fields: ['name', 'description', 'category'],
      weights: {
        name: 0.7,
        description: 0.2,
        category: 0.1
      },
      // RRF configuration
      rrfKValue: 60,
      enableScoreMergin: true,
      enableSourceAttribution: true,
      // Vector type specific thresholds
      vectorTypeThresholds: {
        semantic: 0.8,
        categories: 0.9,
        functionality: 0.7,
        aliases: 0.6,
        composites: 0.5
      },
      // Performance optimization settings
      batchSize: 100,
      enableParallelProcessing: false,
      ...config
    };
  }

  /**
   * Deduplicate results using the configured strategy
   */
  deduplicate(results: any[]): DeduplicationResult {
    const startTime = Date.now();
    
    let uniqueResults: any[];
    let duplicatesRemoved = 0;

    // Use batch processing for large result sets
    if (results.length > this.config.batchSize && this.config.enableParallelProcessing) {
      ({ uniqueResults, duplicatesRemoved } = this.deduplicateBatched(results));
    } else {
      switch (this.config.strategy) {
        case 'id_based':
          ({ uniqueResults, duplicatesRemoved } = this.deduplicateById(results));
          break;
        case 'content_based':
          ({ uniqueResults, duplicatesRemoved } = this.deduplicateByContent(results));
          break;
        case 'hybrid':
          ({ uniqueResults, duplicatesRemoved } = this.deduplicateHybrid(results));
          break;
        case 'rrf_enhanced':
          ({ uniqueResults, duplicatesRemoved } = this.deduplicateRRFEnhanced(results));
          break;
        default:
          ({ uniqueResults, duplicatesRemoved } = this.deduplicateHybrid(results));
      }
    }

    const deduplicationTime = Date.now() - startTime;

    // Calculate enhanced metrics
    const totalResultsProcessed = results.length;
    const averageMergedScore = this.calculateAverageMergedScore(uniqueResults);
    const sourceAttributionSummary = this.calculateSourceAttributionSummary(uniqueResults);

    return {
      uniqueResults,
      duplicatesRemoved,
      deduplicationTime,
      similarityThreshold: this.config.similarityThreshold,
      strategy: this.config.strategy,
      totalResultsProcessed,
      averageMergedScore,
      sourceAttributionSummary
    };
  }

  /**
   * Batched deduplication for large result sets with performance optimization
   */
  private deduplicateBatched(results: any[]): { uniqueResults: any[]; duplicatesRemoved: number } {
    const batches = this.createBatches(results, this.config.batchSize);
    const allUniqueResults: any[] = [];
    let totalDuplicatesRemoved = 0;

    // Process batches sequentially for now (can be enhanced with parallel processing)
    for (const batch of batches) {
      let batchUniqueResults: any[];
      let batchDuplicatesRemoved: number;

      switch (this.config.strategy) {
        case 'id_based':
          ({ uniqueResults: batchUniqueResults, duplicatesRemoved: batchDuplicatesRemoved } = this.deduplicateById(batch));
          break;
        case 'content_based':
          ({ uniqueResults: batchUniqueResults, duplicatesRemoved: batchDuplicatesRemoved } = this.deduplicateByContent(batch));
          break;
        case 'hybrid':
          ({ uniqueResults: batchUniqueResults, duplicatesRemoved: batchDuplicatesRemoved } = this.deduplicateHybrid(batch));
          break;
        case 'rrf_enhanced':
          ({ uniqueResults: batchUniqueResults, duplicatesRemoved: batchDuplicatesRemoved } = this.deduplicateRRFEnhanced(batch));
          break;
        default:
          ({ uniqueResults: batchUniqueResults, duplicatesRemoved: batchDuplicatesRemoved } = this.deduplicateHybrid(batch));
      }

      // Deduplicate batch results against existing results
      const mergedResult = this.mergeBatchResults(allUniqueResults, batchUniqueResults);
      allUniqueResults.push(...mergedResult.newResults);
      totalDuplicatesRemoved += batchDuplicatesRemoved + mergedResult.duplicatesRemoved;
    }

    return {
      uniqueResults: allUniqueResults,
      duplicatesRemoved: totalDuplicatesRemoved
    };
  }

  /**
   * Create batches from results for processing
   */
  private createBatches(results: any[], batchSize: number): any[][] {
    const batches: any[][] = [];
    for (let i = 0; i < results.length; i += batchSize) {
      batches.push(results.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Merge batch results with existing unique results
   */
  private mergeBatchResults(existingResults: any[], newResults: any[]): { newResults: any[]; duplicatesRemoved: number } {
    const finalNewResults: any[] = [];
    let duplicatesRemoved = 0;

    for (const newResult of newResults) {
      let isDuplicate = false;
      
      for (const existingResult of existingResults) {
        const similarity = this.calculateContentSimilarity(newResult, existingResult);
        
        if (similarity >= this.config.similarityThreshold) {
          isDuplicate = true;
          duplicatesRemoved++;
          
          // Enhance existing result with new result's data if needed
          this.enhanceExistingResult(existingResult, newResult);
          break;
        }
      }
      
      if (!isDuplicate) {
        finalNewResults.push(newResult);
      }
    }

    return { newResults: finalNewResults, duplicatesRemoved };
  }

  /**
   * Enhance existing result with data from duplicate result
   */
  private enhanceExistingResult(existingResult: any, duplicateResult: any): void {
    // Merge scores if enabled
    if (this.config.enableScoreMergin) {
      if (duplicateResult.rrfScore && existingResult.rrfScore) {
        existingResult.rrfScore = Math.max(existingResult.rrfScore, duplicateResult.rrfScore);
      }
      if (duplicateResult.weightedScore && existingResult.weightedScore) {
        existingResult.weightedScore = Math.max(existingResult.weightedScore, duplicateResult.weightedScore);
      }
      if (duplicateResult.finalScore && existingResult.finalScore) {
        existingResult.finalScore = Math.max(existingResult.finalScore, duplicateResult.finalScore);
      }
    }
    
    // Merge source attribution
    if (this.config.enableSourceAttribution && duplicateResult.sources) {
      existingResult.sources = [...(existingResult.sources || []), ...duplicateResult.sources];
      existingResult.mergedFromCount = (existingResult.mergedFromCount || 1) + (duplicateResult.mergedFromCount || 1);
    }
  }

  /**
   * ID-based deduplication (fastest)
   */
  private deduplicateById(results: any[]): { uniqueResults: any[]; duplicatesRemoved: number } {
    const uniqueResults: any[] = [];
    const seenIds = new Set<string>();
    let duplicatesRemoved = 0;

    for (const result of results) {
      const resultId = this.extractId(result);
      
      if (resultId && !seenIds.has(resultId)) {
        seenIds.add(resultId);
        uniqueResults.push(result);
      } else if (resultId) {
        duplicatesRemoved++;
      } else {
        // No ID found, add to unique results
        uniqueResults.push(result);
      }
    }

    return { uniqueResults, duplicatesRemoved };
  }

  /**
   * Content-based deduplication using similarity analysis
   */
  private deduplicateByContent(results: any[]): { uniqueResults: any[]; duplicatesRemoved: number } {
    const uniqueResults: any[] = [];
    const contentHashes = new Map<string, any>();
    let duplicatesRemoved = 0;

    for (const result of results) {
      const contentHash = this.generateContentHash(result);
      
      if (contentHashes.has(contentHash)) {
        const existingResult = contentHashes.get(contentHash);
        const similarity = this.calculateContentSimilarity(result, existingResult);
        
        if (similarity < this.config.similarityThreshold) {
          uniqueResults.push(result);
          contentHashes.set(contentHash, result);
        } else {
          duplicatesRemoved++;
        }
      } else {
        contentHashes.set(contentHash, result);
        uniqueResults.push(result);
      }
    }

    return { uniqueResults, duplicatesRemoved };
  }

  /**
   * Hybrid deduplication combining ID and content-based approaches
   */
  private deduplicateHybrid(results: any[]): { uniqueResults: any[]; duplicatesRemoved: number } {
    const uniqueResults: any[] = [];
    const seenIds = new Set<string>();
    const contentHashes = new Map<string, any>();
    let duplicatesRemoved = 0;

    for (const result of results) {
      const resultId = this.extractId(result);
      const contentHash = this.generateContentHash(result);
      
      let isDuplicate = false;
      
      // Check ID-based duplication first
      if (resultId && seenIds.has(resultId)) {
        isDuplicate = true;
        duplicatesRemoved++;
      } else if (resultId) {
        seenIds.add(resultId);
      }
      
      // Check content-based duplication
      if (!isDuplicate && contentHashes.has(contentHash)) {
        const existingResult = contentHashes.get(contentHash);
        const similarity = this.calculateContentSimilarity(result, existingResult);
        
        if (similarity >= this.config.similarityThreshold) {
          isDuplicate = true;
          duplicatesRemoved++;
        } else {
          contentHashes.set(contentHash, result);
        }
      } else if (!isDuplicate) {
        contentHashes.set(contentHash, result);
      }
      
      if (!isDuplicate) {
        uniqueResults.push(result);
      }
    }

    return { uniqueResults, duplicatesRemoved };
  }

  /**
   * RRF Enhanced deduplication with score merging and source attribution
   */
  private deduplicateRRFEnhanced(results: any[]): { uniqueResults: any[]; duplicatesRemoved: number } {
    const uniqueResults: any[] = [];
    const seenIds = new Set<string>();
    const mergeMap: Record<string, RRFMergeResult> = {};
    let duplicatesRemoved = 0;

    // Group results by ID for RRF merging
    for (const result of results) {
      const resultId = this.extractId(result);
      
      if (!resultId) {
        // No ID found, add directly to unique results
        uniqueResults.push(result);
        continue;
      }

      if (!seenIds.has(resultId)) {
        seenIds.add(resultId);
        
        // Initialize merge result
        mergeMap[resultId] = {
          id: resultId,
          result: { ...result },
          rrfScore: 0,
          weightedScore: 0,
          sources: [],
          mergedFromCount: 0
        };
      }

      // Update merge result with current result
      const mergeResult = mergeMap[resultId];
      const vectorType = result.vectorType || 'unknown';
      const rank = result.rank || 1;
      const score = result.score || 0;
      
      // Calculate RRF contribution
      const rrfContribution = 1 / (this.config.rrfKValue + rank);
      mergeResult.rrfScore += rrfContribution;
      
      // Calculate weighted contribution
      const weight = this.getVectorTypeWeight(vectorType);
      const weightedContribution = rrfContribution * weight;
      mergeResult.weightedScore += weightedContribution;
      
      // Add source attribution
      if (this.config.enableSourceAttribution) {
        mergeResult.sources.push({
          vectorType,
          score,
          rank,
          weight
        });
      }
      
      mergeResult.mergedFromCount++;
      
      // Merge result data (prefer higher score)
      if (score > (mergeResult.result.score || 0)) {
        mergeResult.result = { ...result };
      }
    }

    // Convert merge results to final results with enhanced attributes
    for (const mergeResult of Object.values(mergeMap)) {
      const finalResult = mergeResult.result;
      
      // Add merged scores and attribution
      if (this.config.enableScoreMergin) {
        finalResult.rrfScore = mergeResult.rrfScore;
        finalResult.weightedScore = mergeResult.weightedScore;
        finalResult.finalScore = mergeResult.weightedScore;
      }
      
      if (this.config.enableSourceAttribution) {
        finalResult.sources = mergeResult.sources;
        finalResult.mergedFromCount = mergeResult.mergedFromCount;
      }
      
      uniqueResults.push(finalResult);
    }

    // Apply content-based deduplication as secondary check
    if (this.config.similarityThreshold > 0) {
      return this.applyContentBasedFiltering(uniqueResults);
    }

    return { uniqueResults, duplicatesRemoved };
  }

  /**
   * Apply content-based filtering to remove near-duplicates
   */
  private applyContentBasedFiltering(results: any[]): { uniqueResults: any[]; duplicatesRemoved: number } {
    const uniqueResults: any[] = [];
    let duplicatesRemoved = 0;

    for (const result of results) {
      let isDuplicate = false;
      
      for (const existingResult of uniqueResults) {
        const similarity = this.calculateContentSimilarity(result, existingResult);
        
        // Use vector type specific threshold if available
        const vectorType = result.vectorType || 'default';
        const threshold = this.config.vectorTypeThresholds[vectorType] || this.config.similarityThreshold;
        
        if (similarity >= threshold) {
          isDuplicate = true;
          duplicatesRemoved++;
          
          // Merge scores if enabled
          if (this.config.enableScoreMergin && existingResult.rrfScore && result.rrfScore) {
            existingResult.rrfScore = Math.max(existingResult.rrfScore, result.rrfScore);
            existingResult.weightedScore = Math.max(existingResult.weightedScore, result.weightedScore);
            existingResult.finalScore = Math.max(existingResult.finalScore, result.finalScore);
          }
          
          // Merge source attribution
          if (this.config.enableSourceAttribution && result.sources) {
            existingResult.sources = [...(existingResult.sources || []), ...result.sources];
            existingResult.mergedFromCount = (existingResult.mergedFromCount || 1) + (result.mergedFromCount || 1);
          }
          
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueResults.push(result);
      }
    }

    return { uniqueResults, duplicatesRemoved };
  }

  /**
   * Get weight for a specific vector type
   */
  private getVectorTypeWeight(vectorType: string): number {
    const defaultWeights = {
      semantic: 1.0,
      categories: 0.8,
      functionality: 0.7,
      aliases: 0.6,
      composites: 0.5
    };
    
    return defaultWeights[vectorType] || 0.5;
  }

  /**
   * Calculate average merged score for metrics
   */
  private calculateAverageMergedScore(results: any[]): number {
    if (results.length === 0) return 0;
    
    const totalScore = results.reduce((sum, result) => {
      return sum + (result.finalScore || result.weightedScore || result.score || 0);
    }, 0);
    
    return totalScore / results.length;
  }

  /**
   * Calculate source attribution summary for metrics
   */
  private calculateSourceAttributionSummary(results: any[]): Record<string, number> {
    const summary: Record<string, number> = {};
    
    for (const result of results) {
      if (result.sources && Array.isArray(result.sources)) {
        for (const source of result.sources) {
          summary[source.vectorType] = (summary[source.vectorType] || 0) + 1;
        }
      }
    }
    
    return summary;
  }

  /**
   * Extract ID from a result object
   */
  private extractId(result: any): string | null {
    return result.id || result.payload?.id || result._id || null;
  }

  /**
   * Generate content hash for similarity comparison
   */
  private generateContentHash(result: any): string {
    const content = this.config.fields
      .map(field => this.getFieldValue(result, field))
      .filter(value => value && value.trim().length > 0)
      .join(' ')
      .toLowerCase();

    return this.hashString(content);
  }

  /**
   * Get field value from result object
   */
  public getFieldValue(result: any, field: string): string {
    if (result.payload && result.payload[field]) {
      return String(result.payload[field]);
    }
    if (result[field]) {
      return String(result[field]);
    }
    return '';
  }

  /**
   * Calculate content similarity between two results
   */
  private calculateContentSimilarity(result1: any, result2: any): number {
    let totalSimilarity = 0;
    let totalWeight = 0;

    for (const field of this.config.fields) {
      const value1 = this.getFieldValue(result1, field);
      const value2 = this.getFieldValue(result2, field);
      const weight = this.config.weights[field] || 1.0;

      if (value1 && value2) {
        const similarity = this.calculateFieldSimilarity(value1, value2, field);
        totalSimilarity += similarity * weight;
        totalWeight += weight;
      } else if (totalWeight === 0) {
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? totalSimilarity / totalWeight : 0;
  }

  /**
   * Calculate similarity between two field values
   */
  public calculateFieldSimilarity(value1: string, value2: string, field: string): number {
    const normalized1 = value1.toLowerCase().trim();
    const normalized2 = value2.toLowerCase().trim();

    if (normalized1 === normalized2) {
      return 1.0;
    }

    switch (field) {
      case 'name':
        // Exact match is more important for names
        return this.calculateJaccardSimilarity(normalized1, normalized2) * 0.8 +
               this.calculateLevenshteinSimilarity(normalized1, normalized2) * 0.2;
      
      case 'description':
        // Use text similarity for descriptions
        return this.calculateJaccardSimilarity(normalized1, normalized2) * 0.6 +
               this.calculateSemanticSimilarity(normalized1, normalized2) * 0.4;
      
      case 'category':
        // Exact match is very important for categories
        return normalized1 === normalized2 ? 1.0 : 0.0;
      
      default:
        return this.calculateJaccardSimilarity(normalized1, normalized2);
    }
  }

  /**
   * Calculate Jaccard similarity (word-based)
   */
  private calculateJaccardSimilarity(str1: string, str2: string): number {
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
   * Calculate Levenshtein distance-based similarity
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return maxLength > 0 ? 1 - (distance / maxLength) : 1;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate semantic similarity (placeholder for more sophisticated NLP)
   */
  private calculateSemanticSimilarity(str1: string, str2: string): number {
    // This is a simplified version - in a real implementation, you might use
    // word embeddings, cosine similarity, or other NLP techniques
    
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let commonWords = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 || this.areSynonyms(word1, word2)) {
          commonWords++;
          break;
        }
      }
    }
    
    const totalWords = Math.max(words1.length, words2.length);
    return totalWords > 0 ? commonWords / totalWords : 0;
  }

  /**
   * Simple synonym detection (placeholder)
   */
  private areSynonyms(word1: string, word2: string): boolean {
    // This is a very basic implementation - in practice, you'd use a thesaurus
    // or word embedding similarity
    
    const synonyms: Record<string, string[]> = {
      'js': ['javascript'],
      'ts': ['typescript'],
      'react': ['reactjs'],
      'vue': ['vuejs'],
      'api': ['interface', 'endpoint'],
      'lib': ['library'],
      'framework': ['lib', 'library']
    };
    
    const lower1 = word1.toLowerCase();
    const lower2 = word2.toLowerCase();
    
    if (lower1 === lower2) return true;
    
    for (const [base, synonymsList] of Object.entries(synonyms)) {
      if ((lower1 === base || synonymsList.includes(lower1)) &&
          (lower2 === base || synonymsList.includes(lower2))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Simple string hashing
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DeduplicationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): DeduplicationConfig {
    return { ...this.config };
  }
}

/**
 * Convenience function for quick deduplication
 */
export function deduplicateResults(
  results: any[],
  config: Partial<DeduplicationConfig> = {}
): DeduplicationResult {
  const deduplicator = new ResultDeduplicator(config);
  return deduplicator.deduplicate(results);
}

/**
 * Calculate similarity between two results with detailed breakdown
 */
export function calculateResultSimilarity(
  result1: any,
  result2: any,
  fields: string[] = ['name', 'description', 'category'],
  weights: Record<string, number> = { name: 0.7, description: 0.2, category: 0.1 }
): SimilarityResult {
  const deduplicator = new ResultDeduplicator({ fields, weights });
  
  const fieldSimilarities: Record<string, number> = {};
  let totalSimilarity = 0;
  let totalWeight = 0;
  const reasons: string[] = [];

  for (const field of fields) {
    const value1 = deduplicator.getFieldValue(result1, field);
    const value2 = deduplicator.getFieldValue(result2, field);
    const weight = weights[field] || 1.0;

    if (value1 && value2) {
      const similarity = deduplicator.calculateFieldSimilarity(value1, value2, field);
      fieldSimilarities[field] = similarity;
      totalSimilarity += similarity * weight;
      totalWeight += weight;
      
      if (similarity > 0.8) {
        reasons.push(`${field}: ${Math.round(similarity * 100)}% match`);
      }
    }
  }

  const overallSimilarity = totalWeight > 0 ? totalSimilarity / totalWeight : 0;
  
  return {
    similarity: overallSimilarity,
    reason: reasons.join(', ') || 'Low similarity',
    fields: fieldSimilarities
  };
}


/**
 * Merge results using RRF with enhanced attribution
 */
export function mergeResultsWithRRF(
  resultsByVectorType: Record<string, any[]>,
  kValue: number = 60,
  vectorWeights: Record<string, number> = { semantic: 1.0, categories: 0.8, functionality: 0.7 },
  enableSourceAttribution: boolean = true
): RRFMergeResult[] {
  const scoreMap: Record<string, RRFMergeResult> = {};

  // Calculate RRF scores for each result
  Object.entries(resultsByVectorType).forEach(([vectorType, vectorResults]) => {
    const weight = vectorWeights[vectorType] || 0.5;
    
    vectorResults.forEach((result, rank) => {
      const resultId = result.id || result.payload?.id || `temp_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!scoreMap[resultId]) {
        scoreMap[resultId] = {
          id: resultId,
          result: { ...result },
          rrfScore: 0,
          weightedScore: 0,
          sources: [],
          mergedFromCount: 0
        };
      }

      const rrfContribution = 1 / (kValue + rank + 1);
      const weightedContribution = rrfContribution * weight;
      
      scoreMap[resultId].rrfScore += rrfContribution;
      scoreMap[resultId].weightedScore += weightedContribution;
      scoreMap[resultId].mergedFromCount++;
      
      if (enableSourceAttribution) {
        scoreMap[resultId].sources.push({
          vectorType,
          score: result.score || 0,
          rank: rank + 1,
          weight
        });
      }
      
      // Keep the result with highest score
      if ((result.score || 0) > (scoreMap[resultId].result.score || 0)) {
        scoreMap[resultId].result = { ...result };
      }
    });
  });

  // Sort by weighted score and return
  return Object.values(scoreMap)
    .sort((a, b) => b.weightedScore - a.weightedScore);
}

/**
 * Create enhanced deduplication configuration for multi-vector search
 */
export function createMultiVectorDeduplicationConfig(
  options: {
    similarityThreshold?: number;
    rrfKValue?: number;
    enableScoreMerging?: boolean;
    enableSourceAttribution?: boolean;
    batchSize?: number;
    enableParallelProcessing?: boolean;
  } = {}
): DeduplicationConfig {
  return {
    similarityThreshold: options.similarityThreshold || 0.8,
    strategy: 'rrf_enhanced',
    fields: ['name', 'description', 'category'],
    weights: {
      name: 0.7,
      description: 0.2,
      category: 0.1
    },
    rrfKValue: options.rrfKValue || 60,
    enableScoreMergin: options.enableScoreMerging !== false,
    enableSourceAttribution: options.enableSourceAttribution !== false,
    vectorTypeThresholds: {
      semantic: 0.8,
      categories: 0.9,
      functionality: 0.7,
      aliases: 0.6,
      composites: 0.5
    },
    batchSize: options.batchSize || 100,
    enableParallelProcessing: options.enableParallelProcessing || false
  };
}

/**
 * Performance monitoring for deduplication operations
 */
export class DeduplicationPerformanceMonitor {
  private metrics: DeduplicationMetrics[] = [];

  recordMetrics(metrics: DeduplicationMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  getAverageMetrics(): DeduplicationMetrics | null {
    if (this.metrics.length === 0) return null;

    const total = this.metrics.reduce((acc, metric) => ({
      totalProcessed: acc.totalProcessed + metric.totalProcessed,
      uniqueResults: acc.uniqueResults + metric.uniqueResults,
      duplicatesRemoved: acc.duplicatesRemoved + metric.duplicatesRemoved,
      processingTime: acc.processingTime + metric.processingTime,
      averageSimilarityScore: acc.averageSimilarityScore + metric.averageSimilarityScore,
      batchCount: acc.batchCount + metric.batchCount
    }), {
      totalProcessed: 0,
      uniqueResults: 0,
      duplicatesRemoved: 0,
      processingTime: 0,
      averageSimilarityScore: 0,
      batchCount: 0
    });

    const count = this.metrics.length;
    return {
      totalProcessed: Math.round(total.totalProcessed / count),
      uniqueResults: Math.round(total.uniqueResults / count),
      duplicatesRemoved: Math.round(total.duplicatesRemoved / count),
      processingTime: Math.round(total.processingTime / count),
      averageSimilarityScore: total.averageSimilarityScore / count,
      batchCount: Math.round(total.batchCount / count)
    };
  }

  getMetrics(): DeduplicationMetrics[] {
    return [...this.metrics];
  }

  clear(): void {
    this.metrics = [];
  }
}

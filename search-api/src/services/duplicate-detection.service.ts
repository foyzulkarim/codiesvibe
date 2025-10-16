/**
 * Enhanced Duplicate Detection Service
 * 
 * This service provides advanced duplicate detection capabilities for search results
 * across multiple sources, implementing various detection strategies and algorithms.
 */

import { 
  DetectionStrategy, 
  DuplicateType, 
  DuplicateDetectionConfig, 
  DuplicateDetectionRule,
  DuplicateResult,
  DuplicateGroup,
  DuplicateDetectionStats,
  DuplicateDetectionResult,
  SimilarityCalculator,
  SimilarityCacheEntry,
  DEFAULT_DUPLICATE_DETECTION_CONFIG
} from './duplicate-detection.interfaces';
import { SearchResultItem, MergedResult } from './result-merger.service';

/**
 * Enhanced Duplicate Detection Service
 */
export class DuplicateDetectionService {
  private config: Required<DuplicateDetectionConfig>;
  private similarityCache: Map<string, SimilarityCacheEntry>;
  private customRules: Map<string, DuplicateDetectionRule>;
  private calculators: Map<DetectionStrategy, SimilarityCalculator>;

  constructor(config: Partial<DuplicateDetectionConfig> = {}) {
    this.config = {
      ...DEFAULT_DUPLICATE_DETECTION_CONFIG,
      ...config,
      thresholds: {
        ...DEFAULT_DUPLICATE_DETECTION_CONFIG.thresholds,
        ...(config.thresholds || {})
      },
      fieldWeights: {
        ...DEFAULT_DUPLICATE_DETECTION_CONFIG.fieldWeights,
        ...(config.fieldWeights || {})
      },
      performance: {
        ...DEFAULT_DUPLICATE_DETECTION_CONFIG.performance,
        ...(config.performance || {})
      },
      logging: {
        ...DEFAULT_DUPLICATE_DETECTION_CONFIG.logging,
        ...(config.logging || {})
      }
    };

    this.similarityCache = new Map();
    this.customRules = new Map();
    this.calculators = new Map();
    
    this.initializeCalculators();
    this.initializeCustomRules();
  }

  /**
   * Detect and remove duplicates from search results
   * 
   * @param items Array of search result items
   * @param config Optional configuration override
   * @returns Duplicate detection result with deduplicated items
   */
  async detectDuplicates(
    items: SearchResultItem[],
    config?: Partial<DuplicateDetectionConfig>
  ): Promise<DuplicateDetectionResult> {
    const startTime = Date.now();
    const effectiveConfig = this.mergeConfig(config);
    
    if (!effectiveConfig.enabled || items.length === 0) {
      return {
        deduplicatedItems: items,
        duplicateGroups: [],
        stats: this.createEmptyStats(items.length, Date.now() - startTime),
        config: effectiveConfig
      };
    }

    this.log('info', `Starting duplicate detection for ${items.length} items`);

    // Initialize statistics
    const stats = this.initializeStats();
    
    // Find all duplicate groups
    const duplicateGroups = await this.findDuplicateGroups(items, effectiveConfig, stats);
    
    // Select representative items from each group
    const deduplicatedItems = this.selectRepresentativeItems(duplicateGroups);
    
    // Finalize statistics
    stats.processingTime = Date.now() - startTime;
    stats.totalItems = items.length;
    stats.duplicateGroups = duplicateGroups.length;
    stats.duplicatesRemoved = items.length - deduplicatedItems.length;
    stats.uniqueItems = deduplicatedItems.length;

    this.log('info', `Duplicate detection completed: ${stats.duplicatesRemoved} duplicates removed from ${stats.totalItems} items`);

    return {
      deduplicatedItems,
      duplicateGroups,
      stats,
      config: effectiveConfig
    };
  }

  /**
   * Check if two items are duplicates
   * 
   * @param item1 First item
   * @param item2 Second item
   * @param config Optional configuration override
   * @returns Duplicate detection result
   */
  async areDuplicates(
    item1: SearchResultItem,
    item2: SearchResultItem,
    config?: Partial<DuplicateDetectionConfig>
  ): Promise<DuplicateResult> {
    const effectiveConfig = this.mergeConfig(config);
    
    if (!effectiveConfig.enabled) {
      return { isDuplicate: false };
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(item1, item2);
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) {
      return {
        isDuplicate: cached >= (effectiveConfig.thresholds.combined || 0.75),
        similarityScore: cached,
        detectedBy: DetectionStrategy.COMBINED,
        duplicateType: this.determineDuplicateType(cached),
        confidence: cached
      };
    }

    // Apply detection strategies in order
    for (const strategy of effectiveConfig.strategies) {
      const result = await this.applyStrategy(item1, item2, strategy, effectiveConfig);
      
      if (result.isDuplicate) {
        // Cache the result
        this.cacheResult(cacheKey, result.similarityScore || 0);
        return result;
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Find groups of duplicate items
   * 
   * @param items Array of items to analyze
   * @param config Configuration
   * @param stats Statistics object to update
   * @returns Array of duplicate groups
   */
  private async findDuplicateGroups(
    items: SearchResultItem[],
    config: Required<DuplicateDetectionConfig>,
    stats: DuplicateDetectionStats
  ): Promise<DuplicateGroup[]> {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();
    
    // Limit comparison items for performance
    const itemsToCompare = items.slice(0, config.performance.maxComparisonItems);
    
    for (let i = 0; i < itemsToCompare.length; i++) {
      const item1 = itemsToCompare[i];
      
      if (processed.has(item1.id)) {
        continue;
      }
      
      const duplicateItems: SearchResultItem[] = [item1];
      processed.add(item1.id);
      
      for (let j = i + 1; j < itemsToCompare.length; j++) {
        const item2 = itemsToCompare[j];
        
        if (processed.has(item2.id)) {
          continue;
        }
        
        const result = await this.areDuplicates(item1, item2, config);
        
        if (result.isDuplicate) {
          duplicateItems.push(item2);
          processed.add(item2.id);
          
          // Update strategy statistics
          if (result.detectedBy && stats.strategyStats[result.detectedBy]) {
            stats.strategyStats[result.detectedBy].detections++;
            stats.strategyStats[result.detectedBy].avgConfidence = 
              (stats.strategyStats[result.detectedBy].avgConfidence + (result.confidence || 0)) / 2;
          }
        }
      }
      
      // Create group if we found duplicates
      if (duplicateItems.length > 1) {
        const group = this.createDuplicateGroup(duplicateItems, stats);
        groups.push(group);
      }
    }
    
    return groups;
  }

  /**
   * Apply a specific detection strategy
   * 
   * @param item1 First item
   * @param item2 Second item
   * @param strategy Strategy to apply
   * @param config Configuration
   * @returns Detection result
   */
  private async applyStrategy(
    item1: SearchResultItem,
    item2: SearchResultItem,
    strategy: DetectionStrategy,
    config: Required<DuplicateDetectionConfig>
  ): Promise<DuplicateResult> {
    const threshold = config.thresholds[this.getThresholdKey(strategy)];
    
    switch (strategy) {
      case DetectionStrategy.EXACT_ID:
        return this.exactIdMatch(item1, item2, threshold);
        
      case DetectionStrategy.EXACT_URL:
        return this.exactUrlMatch(item1, item2, threshold);
        
      case DetectionStrategy.CONTENT_SIMILARITY:
        return this.contentSimilarityMatch(item1, item2, threshold, config.fieldWeights);
        
      case DetectionStrategy.VERSION_AWARE:
        return this.versionAwareMatch(item1, item2, threshold, config.fieldWeights);
        
      case DetectionStrategy.FUZZY_MATCH:
        return this.fuzzyMatch(item1, item2, threshold, config.fieldWeights);
        
      case DetectionStrategy.COMBINED:
        return this.combinedMatch(item1, item2, threshold, config);
        
      default:
        return { isDuplicate: false };
    }
  }

  /**
   * Exact ID matching strategy
   */
  private exactIdMatch(item1: SearchResultItem, item2: SearchResultItem, threshold: number): DuplicateResult {
    const isDuplicate = item1.id === item2.id;
    
    return {
      isDuplicate,
      duplicateType: DuplicateType.EXACT,
      detectedBy: DetectionStrategy.EXACT_ID,
      similarityScore: isDuplicate ? 1.0 : 0,
      confidence: 1.0,
      reason: isDuplicate ? 'Exact ID match' : 'No ID match'
    };
  }

  /**
   * Exact URL matching strategy
   */
  private exactUrlMatch(item1: SearchResultItem, item2: SearchResultItem, threshold: number): DuplicateResult {
    const url1 = this.extractUrl(item1);
    const url2 = this.extractUrl(item2);
    
    if (!url1 || !url2) {
      return { isDuplicate: false };
    }
    
    const isDuplicate = url1 === url2;
    
    return {
      isDuplicate,
      duplicateType: DuplicateType.EXACT,
      detectedBy: DetectionStrategy.EXACT_URL,
      similarityScore: isDuplicate ? 1.0 : 0,
      confidence: 0.95,
      reason: isDuplicate ? 'Exact URL match' : 'No URL match'
    };
  }

  /**
   * Content similarity matching strategy
   */
  private contentSimilarityMatch(
    item1: SearchResultItem,
    item2: SearchResultItem,
    threshold: number,
    fieldWeights: Required<DuplicateDetectionConfig>['fieldWeights']
  ): DuplicateResult {
    const fieldMatches = this.calculateFieldSimilarities(item1, item2, fieldWeights);
    const overallSimilarity = this.calculateWeightedSimilarity(fieldMatches, fieldWeights);
    
    return {
      isDuplicate: overallSimilarity >= threshold,
      duplicateType: overallSimilarity >= 0.9 ? DuplicateType.EXACT : DuplicateType.NEAR,
      detectedBy: DetectionStrategy.CONTENT_SIMILARITY,
      similarityScore: overallSimilarity,
      fieldMatches,
      confidence: Math.min(overallSimilarity + 0.1, 1.0),
      reason: `Content similarity: ${overallSimilarity.toFixed(3)}`
    };
  }

  /**
   * Version-aware matching strategy
   */
  private versionAwareMatch(
    item1: SearchResultItem,
    item2: SearchResultItem,
    threshold: number,
    fieldWeights: Required<DuplicateDetectionConfig>['fieldWeights']
  ): DuplicateResult {
    // First check if they're likely the same tool with different versions
    const name1 = this.extractName(item1).toLowerCase();
    const name2 = this.extractName(item2).toLowerCase();
    const version1 = this.extractVersion(item1);
    const version2 = this.extractVersion(item2);
    
    // Normalize names for comparison
    const normalized1 = this.normalizeToolName(name1);
    const normalized2 = this.normalizeToolName(name2);
    
    if (normalized1 !== normalized2) {
      return { isDuplicate: false };
    }
    
    // Calculate similarity ignoring version differences
    const fieldMatches = this.calculateFieldSimilarities(item1, item2, fieldWeights, true);
    const overallSimilarity = this.calculateWeightedSimilarity(fieldMatches, fieldWeights);
    
    return {
      isDuplicate: overallSimilarity >= threshold,
      duplicateType: DuplicateType.VERSIONED,
      detectedBy: DetectionStrategy.VERSION_AWARE,
      similarityScore: overallSimilarity,
      fieldMatches,
      confidence: Math.min(overallSimilarity + 0.15, 1.0),
      reason: version1 !== version2 ? 
        `Same tool, different versions (${version1} vs ${version2})` : 
        `Version-aware match: ${overallSimilarity.toFixed(3)}`
    };
  }

  /**
   * Fuzzy matching strategy
   */
  private fuzzyMatch(
    item1: SearchResultItem,
    item2: SearchResultItem,
    threshold: number,
    fieldWeights: Required<DuplicateDetectionConfig>['fieldWeights']
  ): DuplicateResult {
    // Use more lenient matching with fuzzy string comparison
    const fieldMatches = this.calculateFuzzySimilarities(item1, item2, fieldWeights);
    const overallSimilarity = this.calculateWeightedSimilarity(fieldMatches, fieldWeights);
    
    return {
      isDuplicate: overallSimilarity >= threshold,
      duplicateType: overallSimilarity >= 0.7 ? DuplicateType.NEAR : DuplicateType.PARTIAL,
      detectedBy: DetectionStrategy.FUZZY_MATCH,
      similarityScore: overallSimilarity,
      fieldMatches,
      confidence: Math.min(overallSimilarity + 0.05, 1.0),
      reason: `Fuzzy match: ${overallSimilarity.toFixed(3)}`
    };
  }

  /**
   * Combined matching strategy using multiple methods
   */
  private async combinedMatch(
    item1: SearchResultItem,
    item2: SearchResultItem,
    threshold: number,
    config: Required<DuplicateDetectionConfig>
  ): Promise<DuplicateResult> {
    const results: DuplicateResult[] = [];
    
    // Apply all enabled strategies
    for (const strategy of config.strategies) {
      if (strategy === DetectionStrategy.COMBINED) continue;
      
      const result = await this.applyStrategy(item1, item2, strategy, config);
      if (result.isDuplicate) {
        results.push(result);
      }
    }
    
    if (results.length === 0) {
      return { isDuplicate: false };
    }
    
    // Calculate combined confidence
    const avgSimilarity = results.reduce((sum, r) => sum + (r.similarityScore || 0), 0) / results.length;
    const maxConfidence = Math.max(...results.map(r => r.confidence || 0));
    
    return {
      isDuplicate: avgSimilarity >= threshold,
      duplicateType: this.determineDuplicateType(avgSimilarity),
      detectedBy: DetectionStrategy.COMBINED,
      similarityScore: avgSimilarity,
      confidence: maxConfidence,
      reason: `Combined match: ${results.length} strategies agree`
    };
  }

  /**
   * Calculate similarities between fields
   */
  private calculateFieldSimilarities(
    item1: SearchResultItem,
    item2: SearchResultItem,
    fieldWeights: Required<DuplicateDetectionConfig>['fieldWeights'],
    ignoreVersion: boolean = false
  ): { [field: string]: number } {
    const similarities: { [field: string]: number } = {};
    
    // Name similarity
    const name1 = this.extractName(item1, ignoreVersion);
    const name2 = this.extractName(item2, ignoreVersion);
    similarities.name = this.stringSimilarity(name1, name2);
    
    // Description similarity
    const desc1 = this.extractDescription(item1);
    const desc2 = this.extractDescription(item2);
    similarities.description = this.stringSimilarity(desc1, desc2);
    
    // URL similarity
    const url1 = this.extractUrl(item1);
    const url2 = this.extractUrl(item2);
    if (url1 && url2) {
      similarities.url = this.stringSimilarity(url1, url2);
    } else {
      similarities.url = 0;
    }
    
    // Category similarity
    const cat1 = this.extractCategory(item1);
    const cat2 = this.extractCategory(item2);
    similarities.category = cat1 === cat2 ? 1.0 : 0.0;
    
    return similarities;
  }

  /**
   * Calculate fuzzy similarities between fields
   */
  private calculateFuzzySimilarities(
    item1: SearchResultItem,
    item2: SearchResultItem,
    fieldWeights: Required<DuplicateDetectionConfig>['fieldWeights']
  ): { [field: string]: number } {
    const similarities = this.calculateFieldSimilarities(item1, item2, fieldWeights);
    
    // Apply more lenient scoring for fuzzy matching
    Object.keys(similarities).forEach(field => {
      if (field === 'category') {
        // Category needs exact match even for fuzzy
        return;
      }
      similarities[field] = Math.min(similarities[field] * 1.2, 1.0);
    });
    
    return similarities;
  }

  /**
   * Calculate weighted similarity from field similarities
   */
  private calculateWeightedSimilarity(
    fieldMatches: { [field: string]: number },
    fieldWeights: Required<DuplicateDetectionConfig>['fieldWeights']
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;
    
    Object.entries(fieldMatches).forEach(([field, similarity]) => {
      const weight = fieldWeights[field] || 0;
      totalWeight += weight;
      weightedSum += similarity * weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * String similarity using Jaccard similarity with improvements
   */
  private stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return str1 === str2 ? 1.0 : 0.0;
    
    // Exact match gets 1.0
    if (str1 === str2) return 1.0;
    
    // Normalize strings
    const normalized1 = str1.toLowerCase().trim();
    const normalized2 = str2.toLowerCase().trim();
    
    // Get word sets
    const words1 = new Set(normalized1.split(/\s+/).filter(w => w.length > 0));
    const words2 = new Set(normalized2.split(/\s+/).filter(w => w.length > 0));
    
    if (words1.size === 0 && words2.size === 0) return 1.0;
    if (words1.size === 0 || words2.size === 0) return 0.0;
    
    // Calculate Jaccard similarity
    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set(Array.from(words1).concat(Array.from(words2)));
    const jaccard = intersection.size / union.size;
    
    // Boost for common prefixes/suffixes
    const prefixBonus = this.calculatePrefixBonus(normalized1, normalized2);
    const suffixBonus = this.calculateSuffixBonus(normalized1, normalized2);
    
    return Math.min(jaccard + prefixBonus + suffixBonus, 1.0);
  }

  /**
   * Calculate prefix similarity bonus
   */
  private calculatePrefixBonus(str1: string, str2: string): number {
    const minLength = Math.min(str1.length, str2.length);
    if (minLength === 0) return 0;
    
    let commonPrefix = 0;
    for (let i = 0; i < minLength; i++) {
      if (str1[i] === str2[i]) {
        commonPrefix++;
      } else {
        break;
      }
    }
    
    return commonPrefix > 3 ? (commonPrefix / minLength) * 0.1 : 0;
  }

  /**
   * Calculate suffix similarity bonus
   */
  private calculateSuffixBonus(str1: string, str2: string): number {
    const minLength = Math.min(str1.length, str2.length);
    if (minLength === 0) return 0;
    
    let commonSuffix = 0;
    for (let i = 1; i <= minLength; i++) {
      if (str1[str1.length - i] === str2[str2.length - i]) {
        commonSuffix++;
      } else {
        break;
      }
    }
    
    return commonSuffix > 3 ? (commonSuffix / minLength) * 0.1 : 0;
  }

  /**
   * Extract name from item
   */
  private extractName(item: SearchResultItem, ignoreVersion: boolean = false): string {
    let name = item.payload?.name || item.metadata?.name || item.id;
    
    if (ignoreVersion) {
      // Remove version information from name
      name = name.replace(/\s*v?\d+(\.\d+)*(\s*[\-\+]?\w*)?$/i, '').trim();
    }
    
    return name;
  }

  /**
   * Extract description from item
   */
  private extractDescription(item: SearchResultItem): string {
    return item.payload?.description || item.metadata?.description || '';
  }

  /**
   * Extract URL from item
   */
  private extractUrl(item: SearchResultItem): string {
    return item.payload?.url || item.metadata?.url || item.payload?.website || item.metadata?.website || '';
  }

  /**
   * Extract category from item
   */
  private extractCategory(item: SearchResultItem): string {
    return item.payload?.category || item.metadata?.category || '';
  }

  /**
   * Extract version from item
   */
  private extractVersion(item: SearchResultItem): string {
    const version = item.payload?.version || item.metadata?.version || '';
    
    // Try to extract version from name if not found in payload
    if (!version) {
      const name = this.extractName(item);
      const versionMatch = name.match(/v?(\d+(\.\d+)*(\s*[\-\+]?\w*)?)$/i);
      return versionMatch ? versionMatch[1] : '';
    }
    
    return version;
  }

  /**
   * Normalize tool name for comparison
   */
  private normalizeToolName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\s*v?\d+(\.\d+)*(\s*[\-\+]?\w*)?$/i, '') // Remove version
      .trim();
  }

  /**
   * Select representative items from duplicate groups
   */
  private selectRepresentativeItems(groups: DuplicateGroup[]): SearchResultItem[] {
    return groups.map(group => group.representative);
  }

  /**
   * Create duplicate group from items
   */
  private createDuplicateGroup(items: SearchResultItem[], stats: DuplicateDetectionStats): DuplicateGroup {
    // Find the best item as representative (highest score, most sources)
    const representative = items.reduce((best, current) => {
      const bestScore = best.score + (best.source ? Object.keys(best.source).length : 0) * 0.1;
      const currentScore = current.score + (current.source ? Object.keys(current.source).length : 0) * 0.1;
      return currentScore > bestScore ? current : best;
    });
    
    const uniqueSources = new Set(items.map(item => item.source).filter(Boolean));
    const avgSimilarity = this.calculateGroupAverageSimilarity(items);
    
    return {
      id: `group_${representative.id}_${Date.now()}`,
      type: this.determineDuplicateType(avgSimilarity),
      detectedBy: DetectionStrategy.COMBINED, // Inferred from the process
      items,
      representative,
      metadata: {
        itemCount: items.length,
        sourceCount: uniqueSources.size,
        avgSimilarity,
        createdAt: new Date()
      }
    };
  }

  /**
   * Calculate average similarity within a group
   */
  private calculateGroupAverageSimilarity(items: SearchResultItem[]): number {
    if (items.length < 2) return 1.0;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const fieldMatches = this.calculateFieldSimilarities(items[i], items[j], this.config.fieldWeights);
        const similarity = this.calculateWeightedSimilarity(fieldMatches, this.config.fieldWeights);
        totalSimilarity += similarity;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Determine duplicate type from similarity score
   */
  private determineDuplicateType(similarity: number): DuplicateType {
    if (similarity >= 0.95) return DuplicateType.EXACT;
    if (similarity >= 0.8) return DuplicateType.NEAR;
    if (similarity >= 0.6) return DuplicateType.VERSIONED;
    return DuplicateType.PARTIAL;
  }

  /**
   * Initialize similarity calculators
   */
  private initializeCalculators(): void {
    // Register built-in calculators
    // (Can be extended with custom calculators)
  }

  /**
   * Initialize custom rules
   */
  private initializeCustomRules(): void {
    // Register default custom rules
    this.config.customRules.forEach(rule => {
      this.customRules.set(rule.id, rule);
    });
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config?: Partial<DuplicateDetectionConfig>): Required<DuplicateDetectionConfig> {
    if (!config) return this.config;
    
    return {
      ...this.config,
      ...config,
      thresholds: {
        ...this.config.thresholds,
        ...(config.thresholds || {})
      },
      fieldWeights: {
        ...this.config.fieldWeights,
        ...(config.fieldWeights || {})
      },
      performance: {
        ...this.config.performance,
        ...(config.performance || {})
      },
      logging: {
        ...this.config.logging,
        ...(config.logging || {})
      }
    };
  }

  /**
   * Initialize statistics object
   */
  private initializeStats(): DuplicateDetectionStats {
    return {
      totalItems: 0,
      duplicateGroups: 0,
      duplicatesRemoved: 0,
      uniqueItems: 0,
      processingTime: 0,
      strategyStats: {
        [DetectionStrategy.EXACT_ID]: { detections: 0, avgConfidence: 0, processingTime: 0 },
        [DetectionStrategy.EXACT_URL]: { detections: 0, avgConfidence: 0, processingTime: 0 },
        [DetectionStrategy.CONTENT_SIMILARITY]: { detections: 0, avgConfidence: 0, processingTime: 0 },
        [DetectionStrategy.VERSION_AWARE]: { detections: 0, avgConfidence: 0, processingTime: 0 },
        [DetectionStrategy.FUZZY_MATCH]: { detections: 0, avgConfidence: 0, processingTime: 0 },
        [DetectionStrategy.COMBINED]: { detections: 0, avgConfidence: 0, processingTime: 0 }
      }
    };
  }

  /**
   * Create empty statistics
   */
  private createEmptyStats(itemCount: number, processingTime: number): DuplicateDetectionStats {
    return {
      totalItems: itemCount,
      duplicateGroups: 0,
      duplicatesRemoved: 0,
      uniqueItems: itemCount,
      processingTime,
      strategyStats: {
        [DetectionStrategy.EXACT_ID]: { detections: 0, avgConfidence: 0, processingTime: 0 },
        [DetectionStrategy.EXACT_URL]: { detections: 0, avgConfidence: 0, processingTime: 0 },
        [DetectionStrategy.CONTENT_SIMILARITY]: { detections: 0, avgConfidence: 0, processingTime: 0 },
        [DetectionStrategy.VERSION_AWARE]: { detections: 0, avgConfidence: 0, processingTime: 0 },
        [DetectionStrategy.FUZZY_MATCH]: { detections: 0, avgConfidence: 0, processingTime: 0 },
        [DetectionStrategy.COMBINED]: { detections: 0, avgConfidence: 0, processingTime: 0 }
      }
    };
  }

  /**
   * Get threshold key for strategy
   */
  private getThresholdKey(strategy: DetectionStrategy): string {
    const keyMap = {
      [DetectionStrategy.EXACT_ID]: 'contentSimilarity',
      [DetectionStrategy.EXACT_URL]: 'contentSimilarity',
      [DetectionStrategy.CONTENT_SIMILARITY]: 'contentSimilarity',
      [DetectionStrategy.VERSION_AWARE]: 'versionAware',
      [DetectionStrategy.FUZZY_MATCH]: 'fuzzyMatch',
      [DetectionStrategy.COMBINED]: 'combined'
    };
    
    return keyMap[strategy] || 'contentSimilarity';
  }

  /**
   * Generate cache key for two items
   */
  private generateCacheKey(item1: SearchResultItem, item2: SearchResultItem): string {
    const id1 = item1.id < item2.id ? item1.id : item2.id;
    const id2 = item1.id < item2.id ? item2.id : item1.id;
    return `${id1}_${id2}`;
  }

  /**
   * Get similarity from cache
   */
  private getFromCache(key: string): number | null {
    if (!this.config.performance.enableCache) {
      return null;
    }
    
    const entry = this.similarityCache.get(key);
    if (!entry) {
      return null;
    }
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.similarityCache.delete(key);
      return null;
    }
    
    return entry.score;
  }

  /**
   * Cache similarity result
   */
  private cacheResult(key: string, score: number): void {
    if (!this.config.performance.enableCache) {
      return;
    }
    
    // Check cache size limit
    if (this.similarityCache.size >= this.config.performance.cacheSize) {
      // Remove oldest entry
      const firstKey = this.similarityCache.keys().next().value;
      this.similarityCache.delete(firstKey);
    }
    
    this.similarityCache.set(key, {
      score,
      timestamp: new Date(),
      ttl: 300000 // 5 minutes
    });
  }

  /**
   * Log message if logging is enabled
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.config.logging.enabled) {
      return;
    }
    
    const allowedLevels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = allowedLevels.indexOf(this.config.logging.level);
    const messageLevelIndex = allowedLevels.indexOf(level);
    
    if (messageLevelIndex >= currentLevelIndex) {
      console.log(`[DuplicateDetection] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Add custom rule
   */
  public addCustomRule(rule: DuplicateDetectionRule): void {
    this.customRules.set(rule.id, rule);
    this.config.customRules.push(rule);
  }

  /**
   * Remove custom rule
   */
  public removeCustomRule(ruleId: string): boolean {
    const removed = this.customRules.delete(ruleId);
    if (removed) {
      this.config.customRules = this.config.customRules.filter(rule => rule.id !== ruleId);
    }
    return removed;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<DuplicateDetectionConfig>): void {
    this.config = this.mergeConfig(config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): Required<DuplicateDetectionConfig> {
    return { ...this.config };
  }

  /**
   * Clear similarity cache
   */
  public clearCache(): void {
    this.similarityCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    // TODO: Implement hit rate tracking
    return {
      size: this.similarityCache.size,
      hitRate: 0
    };
  }
}

// Export singleton instance
export const duplicateDetectionService = new DuplicateDetectionService();

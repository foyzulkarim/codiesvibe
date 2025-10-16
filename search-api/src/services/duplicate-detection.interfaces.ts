/**
 * Interfaces for Enhanced Duplicate Detection
 * 
 * This file defines the interfaces and types used by the enhanced duplicate
 * detection system for search results across multiple sources.
 */

import { SearchResultItem, MergedResult } from './result-merger.service';

/**
 * Enum for different duplicate detection strategies
 */
export enum DetectionStrategy {
  /** Exact match based on ID */
  EXACT_ID = 'exact_id',
  /** Exact match based on URL */
  EXACT_URL = 'exact_url',
  /** Content similarity using text comparison */
  CONTENT_SIMILARITY = 'content_similarity',
  /** Fuzzy matching for near-duplicates */
  FUZZY_MATCH = 'fuzzy_match',
  /** Version-aware matching for tools with different versions */
  VERSION_AWARE = 'version_aware',
  /** Combined strategy using multiple methods */
  COMBINED = 'combined'
}

/**
 * Enum for duplicate types
 */
export enum DuplicateType {
  /** Exact duplicate (same content, same ID) */
  EXACT = 'exact',
  /** Near duplicate (similar content but different IDs/URLs) */
  NEAR = 'near',
  /** Versioned duplicate (same tool with different versions) */
  VERSIONED = 'versioned',
  /** Partial duplicate (some content overlap) */
  PARTIAL = 'partial'
}

/**
 * Configuration for duplicate detection
 */
export interface DuplicateDetectionConfig {
  /** Enable/disable duplicate detection */
  enabled?: boolean;
  /** Strategies to use for detection (in order of priority) */
  strategies?: DetectionStrategy[];
  /** Similarity thresholds for different strategies */
  thresholds?: {
    /** Threshold for content similarity (0-1) */
    contentSimilarity?: number;
    /** Threshold for fuzzy matching (0-1) */
    fuzzyMatch?: number;
    /** Threshold for version-aware matching (0-1) */
    versionAware?: number;
    /** Overall threshold for combined strategy (0-1) */
    combined?: number;
  };
  /** Weights for different fields in similarity calculation */
  fieldWeights?: {
    /** Weight for name/title field */
    name?: number;
    /** Weight for description field */
    description?: number;
    /** Weight for URL field */
    url?: number;
    /** Weight for category field */
    category?: number;
    /** Weight for other metadata fields */
    metadata?: number;
  };
  /** Custom rules for duplicate detection */
  customRules?: DuplicateDetectionRule[];
  /** Performance settings */
  performance?: {
    /** Maximum number of items to compare against */
    maxComparisonItems?: number;
    /** Enable caching for similarity calculations */
    enableCache?: boolean;
    /** Cache size limit */
    cacheSize?: number;
    /** Enable parallel processing */
    enableParallel?: boolean;
    /** Number of parallel workers */
    parallelWorkers?: number;
  };
  /** Logging and statistics */
  logging?: {
    /** Enable detailed logging */
    enabled?: boolean;
    /** Log level */
    level?: 'debug' | 'info' | 'warn' | 'error';
    /** Include statistics in logs */
    includeStats?: boolean;
  };
}

/**
 * Custom rule for duplicate detection
 */
export interface DuplicateDetectionRule {
  /** Unique rule identifier */
  id: string;
  /** Rule name/description */
  name: string;
  /** Strategy this rule applies to */
  strategy: DetectionStrategy;
  /** Rule priority (higher = more important) */
  priority: number;
  /** Rule handler function */
  handler: (item1: SearchResultItem, item2: SearchResultItem) => boolean;
  /** Whether this rule is enabled */
  enabled?: boolean;
}

/**
 * Result of duplicate detection
 */
export interface DuplicateResult {
  /** Whether duplicates were found */
  isDuplicate: boolean;
  /** Type of duplicate */
  duplicateType?: DuplicateType;
  /** Strategy that detected the duplicate */
  detectedBy?: DetectionStrategy;
  /** Similarity score (0-1) */
  similarityScore?: number;
  /** Matched fields and their similarity scores */
  fieldMatches?: {
    [fieldName: string]: number;
  };
  /** Reason for detection */
  reason?: string;
  /** Confidence in the detection (0-1) */
  confidence?: number;
}

/**
 * Group of duplicate items
 */
export interface DuplicateGroup {
  /** Unique group identifier */
  id: string;
  /** Type of duplicates in this group */
  type: DuplicateType;
  /** Strategy that created this group */
  detectedBy: DetectionStrategy;
  /** All items in this group */
  items: SearchResultItem[];
  /** Representative/best item from the group */
  representative: SearchResultItem;
  /** Metadata about the group */
  metadata: {
    /** Total number of items in group */
    itemCount: number;
    /** Number of unique sources */
    sourceCount: number;
    /** Average similarity score */
    avgSimilarity: number;
    /** Creation timestamp */
    createdAt: Date;
  };
}

/**
 * Statistics for duplicate detection
 */
export interface DuplicateDetectionStats {
  /** Total items processed */
  totalItems: number;
  /** Number of duplicate groups found */
  duplicateGroups: number;
  /** Number of items removed as duplicates */
  duplicatesRemoved: number;
  /** Number of unique items remaining */
  uniqueItems: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Strategy-specific statistics */
  strategyStats: {
    [strategy in DetectionStrategy]: {
      /** Number of detections by this strategy */
      detections: number;
      /** Average confidence score */
      avgConfidence: number;
      /** Processing time for this strategy */
      processingTime: number;
    };
  };
  /** Cache statistics */
  cacheStats?: {
    /** Cache hit rate */
    hitRate: number;
    /** Cache size */
    size: number;
  };
}

/**
 * Result of duplicate detection process
 */
export interface DuplicateDetectionResult {
  /** Deduplicated items */
  deduplicatedItems: SearchResultItem[];
  /** Groups of duplicates that were found */
  duplicateGroups: DuplicateGroup[];
  /** Statistics about the process */
  stats: DuplicateDetectionStats;
  /** Configuration used */
  config: DuplicateDetectionConfig;
}

/**
 * Interface for similarity calculation methods
 */
export interface SimilarityCalculator {
  /** Calculate similarity between two items */
  calculate(item1: SearchResultItem, item2: SearchResultItem): number;
  /** Get the name of this calculator */
  getName(): string;
  /** Get the strategy this calculator supports */
  getStrategy(): DetectionStrategy;
}

/**
 * Cache entry for similarity calculations
 */
export interface SimilarityCacheEntry {
  /** Similarity score */
  score: number;
  /** Timestamp when cached */
  timestamp: Date;
  /** TTL for this entry */
  ttl: number;
}

/**
 * Default configuration for duplicate detection
 */
export const DEFAULT_DUPLICATE_DETECTION_CONFIG: Required<DuplicateDetectionConfig> = {
  enabled: true,
  strategies: [
    DetectionStrategy.EXACT_ID,
    DetectionStrategy.EXACT_URL,
    DetectionStrategy.CONTENT_SIMILARITY,
    DetectionStrategy.VERSION_AWARE,
    DetectionStrategy.FUZZY_MATCH
  ],
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
};

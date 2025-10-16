// Export all services for easy importing
export { mongoDBService } from './mongodb.service';
export { qdrantService } from './qdrant.service';
export { embeddingService } from './embedding.service';
export { vectorIndexingService } from './vector-indexing.service';
export { vectorSeedingService } from './vector-seeding.service';
export { contextEnrichmentService } from './context-enrichment.service';
export { localNLPService } from './local-nlp.service';
export { multiVectorSearchService } from './multi-vector-search.service';
export { resultMergerService } from './result-merger.service';
export { duplicateDetectionService, DuplicateDetectionService } from './duplicate-detection.service';
export { enhancedSearchService, EnhancedSearchService } from './enhanced-search.service';

// Export types if needed
export type { ToolData, IndexingProgress, HealthReport } from './vector-indexing.service';
export type { SeedingProgress, SeedingStats, SeedingOptions } from './vector-seeding.service';
export type { ContextEnrichmentConfig, LocalNLPConfig, MultiVectorSearchConfig } from '@/config/enhanced-search-config';
export type { NLPResultsSchema, VectorSearchStateSchema } from '@/types/enhanced-state';
export type { SearchResultItem, RankedResults, MergedResult, MergeConfig } from './result-merger.service';
export type {
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

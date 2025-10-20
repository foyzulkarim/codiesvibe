// Export all services for easy importing
export { mongoDBService } from './mongodb.service';
export { qdrantService, QdrantService } from './qdrant.service';
export { embeddingService } from './embedding.service';
export { vectorIndexingService, VectorIndexingService } from './vector-indexing.service';
export { vectorSeedingService } from './vector-seeding.service';
// export { contextEnrichmentService } from './context-enrichment.service'; // Temporarily disabled
export { localNLPService } from './local-nlp.service';
// export { multiVectorSearchService } from './multi-vector-search.service'; // Temporarily disabled
export { resultMergerService } from './result-merger.service';
export { duplicateDetectionService, DuplicateDetectionService } from './duplicate-detection.service';

// Export new multi-collection services
export { CollectionConfigService } from './collection-config.service';
export { ContentGeneratorFactory } from './content-generator-factory.service';
export { VectorTypeRegistryService } from './vector-type-registry.service';
export { MultiCollectionOrchestrator } from './multi-collection-orchestrator.service';
// export { QueryAnalysisService } from './query-analysis.service'; // Temporarily disabled

// Export types if needed
export type { IndexingProgress, HealthReport, CollectionProgress, CollectionHealth } from './vector-indexing.service';
export type { ToolData, ToolDataValidator, PricingModelEnum, ToolStatus } from '../types/tool.types';
export type { CollectionConfig } from './collection-config.service';
export type { ContentGenerator, WeightedContentPart } from './content-generator-factory.service';
export type { VectorTypeMetadata, VectorTypeCombination } from './vector-type-registry.service';
export type {
  MultiCollectionRequest,
  MultiCollectionResult,
  CollectionStats,
  QueryAnalysis,
  RoutingInfo,
  ProcessingOptions
} from './multi-collection-orchestrator.service';
// export type {
//   QueryAnalysis as QueryAnalysisResult,
//   QueryIntent,
//   QueryComplexity,
//   QueryEntity,
//   EntityType,
//   QueryRouting,
//   RoutingStrategy,
//   QueryMetadata,
//   QueryAnalysisOptions,
//   QueryPerformanceMetrics
// } from './query-analysis.service'; // Temporarily disabled
export type {
  CollectionInfo,
  MultiCollectionStats,
  CollectionOperationResult
} from './qdrant.service';
export type {
  SeedingProgress,
  SeedingStats,
  SeedingOptions,
  CollectionSeedingProgress,
  CollectionSeedingStats
} from './vector-seeding.service';
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

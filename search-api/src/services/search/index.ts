/**
 * Search Services
 * Re-exports all search-related services
 */

// Multi-Collection Orchestrator Service
export { MultiCollectionOrchestrator } from './multi-collection-orchestrator.service.js';
export type {
  MultiCollectionRequest,
  MultiCollectionResult,
  CollectionStats,
  QueryAnalysis,
  RoutingInfo,
  ProcessingOptions,
} from './multi-collection-orchestrator.service.js';

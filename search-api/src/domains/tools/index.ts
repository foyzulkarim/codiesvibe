/**
 * Tools Domain - Main Export
 *
 * Central export point for all tools domain code.
 * This includes schema, filters, validators, and constants.
 *
 * @module domains/tools
 */

// Export schema
export {
  toolsSchema,
  defineToolsSchema,
  TOOLS_VOCABULARY_MAPPINGS,
  TOOLS_PRICE_OPERATORS,
} from './tools.schema.js';

// Export filter mapping functions
export {
  buildToolsFilters,
  hasFilterConstraints,
  sanitizePrice,
  type FilterObject,
} from './tools.filters.js';

// Export validation functions
export {
  validateToolsQueryPlan,
  getRecommendedEmbeddingType,
  getRecommendedTopK,
  getRecommendedFusionMethod,
  isCollectionEnabled,
  getEnabledCollections,
} from './tools.validators.js';

// Import for convenient namespace
import {
  toolsSchema,
  TOOLS_VOCABULARY_MAPPINGS,
  TOOLS_PRICE_OPERATORS,
} from './tools.schema.js';
import {
  buildToolsFilters,
  hasFilterConstraints,
  sanitizePrice,
} from './tools.filters.js';
import {
  validateToolsQueryPlan,
  getRecommendedEmbeddingType,
  getRecommendedTopK,
  getRecommendedFusionMethod,
  isCollectionEnabled,
  getEnabledCollections,
} from './tools.validators.js';

// Re-export as convenient namespace
export const ToolsDomain = {
  // Schema
  schema: toolsSchema,
  vocabularyMappings: TOOLS_VOCABULARY_MAPPINGS,
  priceOperators: TOOLS_PRICE_OPERATORS,

  // Filters
  buildFilters: buildToolsFilters,
  hasFilterConstraints,
  sanitizePrice,

  // Validators
  validateQueryPlan: validateToolsQueryPlan,
  getRecommendedEmbeddingType,
  getRecommendedTopK,
  getRecommendedFusionMethod,
  isCollectionEnabled,
  getEnabledCollections,
} as const;

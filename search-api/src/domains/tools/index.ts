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
} from './tools.schema';

// Export filter mapping functions
export {
  buildToolsFilters,
  hasFilterConstraints,
  sanitizePrice,
} from './tools.filters';

// Export validation functions
export {
  validateToolsQueryPlan,
  getRecommendedEmbeddingType,
  getRecommendedTopK,
  getRecommendedFusionMethod,
  isCollectionEnabled,
  getEnabledCollections,
} from './tools.validators';

// Re-export as convenient namespace
export const ToolsDomain = {
  // Schema
  schema: require('./tools.schema').toolsSchema,
  vocabularyMappings: require('./tools.schema').TOOLS_VOCABULARY_MAPPINGS,
  priceOperators: require('./tools.schema').TOOLS_PRICE_OPERATORS,

  // Filters
  buildFilters: require('./tools.filters').buildToolsFilters,
  hasFilterConstraints: require('./tools.filters').hasFilterConstraints,
  sanitizePrice: require('./tools.filters').sanitizePrice,

  // Validators
  validateQueryPlan: require('./tools.validators').validateToolsQueryPlan,
  getRecommendedEmbeddingType: require('./tools.validators')
    .getRecommendedEmbeddingType,
  getRecommendedTopK: require('./tools.validators').getRecommendedTopK,
  getRecommendedFusionMethod: require('./tools.validators')
    .getRecommendedFusionMethod,
  isCollectionEnabled: require('./tools.validators').isCollectionEnabled,
  getEnabledCollections: require('./tools.validators').getEnabledCollections,
} as const;

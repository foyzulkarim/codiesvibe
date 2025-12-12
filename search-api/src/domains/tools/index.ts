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

// Export CRUD service
export { toolCrudService } from './tool-crud.service.js';
export type { ToolCrudService } from './tool-crud.service.js';

// Import for convenient namespace and backward-compatible exports
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

// ============================================================================
// VOCABULARY EXPORTS
// Single source of truth: toolsSchema.vocabularies
// ============================================================================

/**
 * Enum values for embedding service
 * Provides key aliases (e.g., pricingModel → pricingModels) for compatibility
 */
export const enumValues = {
  categories: toolsSchema.vocabularies.categories,
  functionality: toolsSchema.vocabularies.functionality,
  userTypes: toolsSchema.vocabularies.userTypes,
  interface: toolsSchema.vocabularies.interface,
  deployment: toolsSchema.vocabularies.deployment,
  pricingModel: toolsSchema.vocabularies.pricingModels,
  industries: toolsSchema.vocabularies.industries,
  billingPeriods: toolsSchema.vocabularies.billingPeriods,
};

// Re-export as convenient namespace
export const ToolsDomain = {
  // Schema
  schema: toolsSchema,
  vocabularies: toolsSchema.vocabularies,
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

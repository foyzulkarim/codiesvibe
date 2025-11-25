/**
 * Pipeline Initialization
 *
 * Initializes the semantic search pipeline with schema and domain handlers.
 * This module validates the schema and wires together all domain-specific logic.
 *
 * @module core/pipeline.init
 */

import { validateSchema, assertValidSchema } from './validators/schema.validator';
import { toolsSchema, buildToolsFilters, validateToolsQueryPlan } from '../domains/tools';
import { DomainSchema } from './types/schema.types';
import { StateAnnotation } from '../types/state';

/**
 * Initialize pipeline configuration with schema and domain handlers
 *
 * This function:
 * 1. Validates the domain schema
 * 2. Wires domain-specific handlers (filters, validators)
 * 3. Returns partial state ready for graph initialization
 *
 * @returns Partial state with schema and domain handlers
 * @throws Error if schema validation fails
 */
export function initializePipeline(): Partial<typeof StateAnnotation.State> {
  // Validate schema at startup
  console.log('🔧 Initializing semantic search pipeline...');
  console.log(`📋 Schema: ${toolsSchema.name} v${toolsSchema.version}`);

  assertValidSchema(toolsSchema);

  console.log('✅ Schema validation passed');
  console.log(`📊 Vocabularies: ${Object.keys(toolsSchema.vocabularies).length} categories`);
  console.log(`🎯 Intent fields: ${toolsSchema.intentFields.length}`);
  console.log(`📦 Vector collections: ${toolsSchema.vectorCollections.length} (${toolsSchema.vectorCollections.filter(c => c.enabled !== false).length} enabled)`);

  // Wire domain handlers
  const domainHandlers = {
    buildFilters: buildToolsFilters,
    validateQueryPlan: validateToolsQueryPlan,
  };

  console.log('🔌 Domain handlers wired: buildFilters, validateQueryPlan');
  console.log('✨ Pipeline initialization complete!\n');

  return {
    schema: toolsSchema,
    domainHandlers,
  };
}

/**
 * Get the current domain schema
 * Useful for accessing schema outside of pipeline
 *
 * @returns The tools domain schema
 */
export function getSchema(): DomainSchema {
  return toolsSchema;
}

/**
 * Validate a custom schema without initializing pipeline
 * Useful for testing schema definitions
 *
 * @param schema - Schema to validate
 * @returns Validation result
 */
export function validateCustomSchema(schema: DomainSchema) {
  return validateSchema(schema);
}

/**
 * Prompt Generator - Schema-Driven Prompt Generation
 *
 * Generates LLM prompts dynamically from domain schemas.
 * This decouples prompt content from code, making the system schema-driven.
 *
 * @module core/prompts/generator
 */

import { DomainSchema, IntentFieldDefinition } from '#core/types/schema.types.js';
import {
  INTENT_EXTRACTION_TEMPLATE,
  QUERY_PLANNING_TEMPLATE,
  PRICE_EXTRACTION_RULES,
  INTENT_EXTRACTION_EXAMPLES,
  FUSION_METHODS_DESCRIPTION,
} from './templates.js';

/**
 * Generate Intent Extraction system prompt from schema
 *
 * @param schema - The domain schema
 * @returns Formatted system prompt for intent extraction
 */
export function generateIntentExtractionPrompt(schema: DomainSchema): string {
  let prompt = INTENT_EXTRACTION_TEMPLATE;

  // Generate intent fields JSON schema
  const intentFieldsSchema = generateIntentFieldsSchema(schema.intentFields);
  prompt = prompt.replace('{{INTENT_FIELDS_SCHEMA}}', intentFieldsSchema);

  // Generate vocabulary definitions
  const vocabularyDefinitions = generateVocabularyDefinitions(schema.vocabularies);
  prompt = prompt.replace('{{VOCABULARY_DEFINITIONS}}', vocabularyDefinitions);

  // Insert fixed price extraction rules
  prompt = prompt.replace('{{PRICE_EXTRACTION_RULES}}', PRICE_EXTRACTION_RULES);

  // Insert examples (TODO: make these schema-specific in future)
  prompt = prompt.replace('{{EXAMPLES}}', INTENT_EXTRACTION_EXAMPLES);

  return prompt;
}

/**
 * Generate Query Planning system prompt from schema
 *
 * @param schema - The domain schema
 * @param enabledCollections - Optional filter for enabled collections
 * @returns Formatted system prompt for query planning
 */
export function generateQueryPlanningPrompt(
  schema: DomainSchema,
  enabledCollections?: string[]
): string {
  let prompt = QUERY_PLANNING_TEMPLATE;

  // Filter to enabled collections if specified
  const collections = enabledCollections
    ? schema.vectorCollections.filter((col) => enabledCollections.includes(col.name))
    : schema.vectorCollections.filter((col) => col.enabled !== false);

  // Generate collection definitions
  const collectionDefinitions = generateCollectionDefinitions(collections);
  prompt = prompt.replace('{{COLLECTION_DEFINITIONS}}', collectionDefinitions);

  // Generate collection strategies
  const collectionStrategies = generateCollectionStrategies(collections);
  prompt = prompt.replace('{{COLLECTION_STRATEGIES}}', collectionStrategies);

  // Generate MongoDB filter definitions
  const mongodbFilters = generateMongoDBFilters(schema);
  prompt = prompt.replace('{{MONGODB_FILTERS}}', mongodbFilters);

  // Insert fusion methods
  prompt = prompt.replace('{{FUSION_METHODS}}', FUSION_METHODS_DESCRIPTION);

  // Generate query plan schema (simplified JSON structure description)
  const queryPlanSchema = generateQueryPlanSchema();
  prompt = prompt.replace('{{QUERY_PLAN_SCHEMA}}', queryPlanSchema);

  return prompt;
}

/**
 * Generate JSON schema structure for intent fields
 */
function generateIntentFieldsSchema(fields: IntentFieldDefinition[]): string {
  const fieldLines = fields.map((field) => {
    let typeStr: string = field.type;

    if (field.type === 'enum' && field.enumValues) {
      typeStr = field.enumValues.map((v) => `"${v}"`).join(' | ');
    } else if (field.type === 'array') {
      typeStr = field.children ? 'object[]' : 'string[]';
    } else if (field.type === 'object' && field.children) {
      // Nested object - show structure
      const childFields = field.children
        .map((child) => `    "${child.name}": ${child.type}${child.required ? '' : ' | null'}`)
        .join(',\n');
      return `  "${field.name}": {\n${childFields}\n  }${field.required ? '' : ' | null'}`;
    }

    return `  "${field.name}": ${typeStr}${field.required ? '' : ' | null'}`;
  });

  return `{\n${fieldLines.join(',\n')}\n}`;
}

/**
 * Generate vocabulary constraint definitions
 */
function generateVocabularyDefinitions(vocabularies: DomainSchema['vocabularies']): string {
  const lines: string[] = [];

  if (vocabularies.categories.length > 0) {
    lines.push(
      `- "category" can be one of: ${vocabularies.categories.map((c) => `"${c}"`).join(', ')}`
    );
  }

  if (vocabularies.interface.length > 0) {
    lines.push(
      `- "interface" can be one of: ${vocabularies.interface.map((i) => `"${i}"`).join(', ')}`
    );
  }

  if (vocabularies.functionality.length > 0) {
    lines.push(
      `- "functionality" can include: ${vocabularies.functionality.map((f) => `"${f}"`).join(', ')}`
    );
  }

  if (vocabularies.deployment.length > 0) {
    lines.push(
      `- "deployment" can be one of: ${vocabularies.deployment.map((d) => `"${d}"`).join(', ')}`
    );
  }

  if (vocabularies.industries.length > 0) {
    lines.push(
      `- "industry" can be one of: ${vocabularies.industries.map((i) => `"${i}"`).join(', ')}`
    );
  }

  if (vocabularies.userTypes.length > 0) {
    lines.push(
      `- "userType" can be one of: ${vocabularies.userTypes.map((u) => `"${u}"`).join(', ')}`
    );
  }

  if (vocabularies.pricingModels.length > 0) {
    lines.push(
      `- "pricingModel" can be one of: ${vocabularies.pricingModels.map((p) => `"${p}"`).join(', ')}`
    );
  }

  if (vocabularies.billingPeriods.length > 0) {
    lines.push(
      `- "billingPeriod" can be one of: ${vocabularies.billingPeriods.map((b) => `"${b}"`).join(', ')}`
    );
  }

  return lines.join('\n');
}

/**
 * Generate collection definitions for query planning
 */
function generateCollectionDefinitions(
  collections: DomainSchema['vectorCollections']
): string {
  return collections
    .map((col, index) => {
      return `${index + 1}. "${col.name}" Collection
   - Purpose: ${col.description}
   - Embedding field: ${col.embeddingField}
   - Dimension: ${col.dimension}`;
    })
    .join('\n\n');
}

/**
 * Generate collection selection strategies
 */
function generateCollectionStrategies(
  collections: DomainSchema['vectorCollections']
): string {
  // For now, generate generic strategies based on available collections
  // TODO: Make this more sophisticated based on schema metadata
  const collectionNames = collections.map((c) => c.name);

  const strategies: string[] = [];

  // Identity-focused strategy (if 'tools' collection exists)
  if (collectionNames.includes('tools')) {
    strategies.push(`For "identity-focused" queries (tool names, basic discovery):
- Primary: "tools" (weight: 1.0)
- Secondary: ${collectionNames.includes('functionality') ? '"functionality" (weight: 0.3)' : 'other collections (weight: 0.3)'}`);
  }

  // Capability-focused strategy (if 'functionality' collection exists)
  if (collectionNames.includes('functionality')) {
    strategies.push(`For "capability-focused" queries (features, functionality):
- Primary: "functionality" (weight: 1.0)
- Secondary: ${collectionNames.includes('tools') ? '"tools" (weight: 0.6)' : 'other collections (weight: 0.6)'}
- Tertiary: ${collectionNames.includes('usecases') ? '"usecases" (weight: 0.4)' : 'other collections (weight: 0.4)'}`);
  }

  // Use case-focused strategy
  if (collectionNames.includes('usecases')) {
    strategies.push(`For "usecase-focused" queries (applications, scenarios):
- Primary: "usecases" (weight: 1.0)
- Secondary: ${collectionNames.includes('functionality') ? '"functionality" (weight: 0.7)' : 'other collections (weight: 0.7)'}
- Tertiary: ${collectionNames.includes('tools') ? '"tools" (weight: 0.5)' : 'other collections (weight: 0.5)'}`);
  }

  // Technical-focused strategy
  if (collectionNames.includes('interface')) {
    strategies.push(`For "technical-focused" queries (deployment, interface):
- Primary: "interface" (weight: 1.0)
- Secondary: ${collectionNames.includes('tools') ? '"tools" (weight: 0.6)' : 'other collections (weight: 0.6)'}
- Tertiary: ${collectionNames.includes('functionality') ? '"functionality" (weight: 0.4)' : 'other collections (weight: 0.4)'}`);
  }

  // Multi-collection hybrid
  strategies.push(`For "multi-collection-hybrid" queries (complex, multi-faceted):
- Use all ${collections.length} collections with adaptive weighting
- Weights determined by query analysis and intent
- Apply RRF fusion for optimal result merging`);

  // Adaptive weighted
  strategies.push(`For "adaptive-weighted" queries (unclear intent):
- Start with primary collections: ${collectionNames.slice(0, 2).map((n) => `"${n}"`).join(', ')}
- Dynamically expand based on initial results
- Use confidence-based collection expansion`);

  return strategies.join('\n\n');
}

/**
 * Generate MongoDB filter field definitions
 */
function generateMongoDBFilters(schema: DomainSchema): string {
  const lines: string[] = [];

  if (schema.vocabularies.pricingModels.length > 0) {
    lines.push(
      `- "pricingModel" - EXACT values only: [${schema.vocabularies.pricingModels.map((p) => `"${p}"`).join(', ')}]`
    );
  }

  if (schema.vocabularies.categories.length > 0) {
    lines.push(
      `- "categories" - EXACT values only: [${schema.vocabularies.categories.map((c) => `"${c}"`).join(', ')}]`
    );
  }

  if (schema.vocabularies.industries.length > 0) {
    lines.push(
      `- "industries" - EXACT values only: [${schema.vocabularies.industries.map((i) => `"${i}"`).join(', ')}]`
    );
  }

  if (schema.vocabularies.userTypes.length > 0) {
    lines.push(
      `- "userTypes" - EXACT values only: [${schema.vocabularies.userTypes.map((u) => `"${u}"`).join(', ')}]`
    );
  }

  if (schema.vocabularies.interface.length > 0) {
    lines.push(
      `- "interface" - EXACT values only: [${schema.vocabularies.interface.map((i) => `"${i}"`).join(', ')}]`
    );
  }

  if (schema.vocabularies.functionality.length > 0) {
    lines.push(
      `- "functionality" - EXACT values only: [${schema.vocabularies.functionality.map((f) => `"${f}"`).join(', ')}]`
    );
  }

  if (schema.vocabularies.deployment.length > 0) {
    lines.push(
      `- "deployment" - EXACT values only: [${schema.vocabularies.deployment.map((d) => `"${d}"`).join(', ')}]`
    );
  }

  // Add standard filterable fields from structured database
  lines.push('- "status" - Tool status: "active" | "beta" | "deprecated" | "discontinued"');
  lines.push('- "popularity" - Number for popularity filtering');
  lines.push('- "rating" - Number for rating filtering');

  return lines.join('\n');
}

/**
 * Generate query plan schema description
 */
function generateQueryPlanSchema(): string {
  return `{
  "strategy": "hybrid" | "multi-vector" | "vector-only" | "metadata-only" | "semantic-kg",
  "vectorSources": [{
    "collection": string,
    "embeddingType": string,
    "queryVectorSource": "query_text" | "reference_tool_embedding" | "semantic_variant",
    "topK": number (1-200)
  }],
  "structuredSources": [{
    "source": string,
    "filters": [{ "field": string, "operator": string, "value": any }],
    "limit": number
  }],
  "reranker": {
    "type": "cross-encoder" | "LTR" | "none",
    "model": string | null,
    "maxCandidates": number | null
  },
  "fusion": "rrf" | "weighted_sum" | "concat" | "none",
  "maxRefinementCycles": number (0-5),
  "explanation": string,
  "confidence": number (0-1)
}`;
}

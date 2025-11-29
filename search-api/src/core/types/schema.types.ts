/**
 * Core Schema Type Definitions
 *
 * These types define the structure for domain schemas that drive the semantic search pipeline.
 * Domain schemas are configuration objects that specify vocabularies, intent fields, and
 * collection configurations for a specific domain (e.g., tools, products, documents).
 *
 * @module core/types/schema
 */

/**
 * Defines an intent field that the LLM should extract from user queries
 */
export interface IntentFieldDefinition {
  /** Field name in the intent JSON structure */
  name: string;

  /** Data type of the field */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';

  /** Allowed values for enum types */
  enumValues?: string[];

  /** Whether this field is required in the intent extraction */
  required: boolean;

  /** Description of what this field represents (used in prompt generation) */
  description: string;

  /** For nested objects, define child fields */
  children?: IntentFieldDefinition[];
}

/**
 * Defines a vector collection configuration for Qdrant
 */
export interface VectorCollectionDefinition {
  /** Collection name in Qdrant */
  name: string;

  /** Field path in the embedding (e.g., 'semantic', 'entities.categories') */
  embeddingField: string;

  /** Vector dimension size */
  dimension: number;

  /** Human-readable description of what this collection stores */
  description: string;

  /** Whether this collection should be used by default in searches */
  enabled?: boolean;
}

/**
 * Defines the structured database configuration
 */
export interface StructuredDatabaseDefinition {
  /** Primary collection/table name */
  collection: string;

  /** Fields that should be searched with text queries */
  searchFields: string[];

  /** Fields that can be used for filtering */
  filterableFields: string[];

  /** Database type (for future multi-DB support) */
  type?: 'mongodb' | 'postgres' | 'mysql';
}

/**
 * Controlled vocabularies for a domain
 * These drive prompt generation and validation
 */
export interface DomainVocabularies {
  /** Tool/item categories */
  categories: string[];

  /** Functional capabilities or features */
  functionality: string[];

  /** Target user types */
  userTypes: string[];

  /** Interface types (Web, CLI, API, etc.) */
  interface: string[];

  /** Deployment models */
  deployment: string[];

  /** Industry verticals */
  industries: string[];

  /** Pricing models */
  pricingModels: string[];

  /** Billing periods */
  billingPeriods: string[];
}

/**
 * Main domain schema definition
 *
 * This is the core configuration object that drives the entire semantic search pipeline.
 * It defines:
 * - What vocabularies are valid for this domain
 * - What intent fields should be extracted from queries
 * - What vector collections are available for search
 * - How the structured database is configured
 *
 * @example
 * ```typescript
 * const toolsSchema: DomainSchema = {
 *   name: 'tools',
 *   version: '1.0.0',
 *   vocabularies: {
 *     categories: ['AI Tools', 'Code Editor', ...],
 *     functionality: ['Code Generation', 'Testing', ...],
 *     // ...
 *   },
 *   intentFields: [
 *     { name: 'primaryGoal', type: 'enum', enumValues: ['find', 'compare'], required: true, description: 'User goal' },
 *     // ...
 *   ],
 *   vectorCollections: [
 *     { name: 'tools', embeddingField: 'semantic', dimension: 768, description: 'Semantic embeddings' },
 *     // ...
 *   ],
 *   structuredDatabase: {
 *     collection: 'tools',
 *     searchFields: ['name', 'description'],
 *     filterableFields: ['pricingSummary', 'categories']
 *   }
 * };
 * ```
 */
export interface DomainSchema {
  /** Domain name (e.g., 'tools', 'products', 'documents') */
  name: string;

  /** Schema version (semver) */
  version: string;

  /** Controlled vocabularies for this domain */
  vocabularies: DomainVocabularies;

  /** Intent field definitions for LLM extraction */
  intentFields: IntentFieldDefinition[];

  /** Vector collection configurations */
  vectorCollections: VectorCollectionDefinition[];

  /** Structured database configuration */
  structuredDatabase: StructuredDatabaseDefinition;

  /** Optional metadata */
  metadata?: {
    description?: string;
    author?: string;
    createdAt?: string;
    tags?: string[];
  };
}

/**
 * Result of schema validation
 */
export interface SchemaValidationResult {
  /** Whether the schema is valid */
  valid: boolean;

  /** Validation error messages */
  errors: string[];

  /** Optional warnings (non-blocking) */
  warnings?: string[];
}

/**
 * Type guard to check if an object is a valid DomainSchema
 */
export function isDomainSchema(obj: any): obj is DomainSchema {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    obj.vocabularies &&
    Array.isArray(obj.intentFields) &&
    Array.isArray(obj.vectorCollections) &&
    obj.structuredDatabase
  );
}

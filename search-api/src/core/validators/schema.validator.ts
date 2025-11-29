/**
 * Schema Validator
 *
 * Validates DomainSchema objects to ensure they meet all requirements
 * for driving the semantic search pipeline.
 *
 * @module core/validators
 */

import {
  DomainSchema,
  SchemaValidationResult,
  IntentFieldDefinition,
  VectorCollectionDefinition,
} from '../types/schema.types';

/**
 * Validates a domain schema
 *
 * Checks:
 * - Required fields are present
 * - Vocabularies are non-empty
 * - Intent fields are properly defined
 * - Vector collections are configured correctly
 * - Structured database is configured
 *
 * @param schema - The domain schema to validate
 * @returns Validation result with errors and warnings
 */
export function validateSchema(schema: DomainSchema): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ============================================================================
  // BASIC METADATA VALIDATION
  // ============================================================================
  if (!schema.name || typeof schema.name !== 'string' || schema.name.trim().length === 0) {
    errors.push('Schema name is required and must be a non-empty string');
  }

  if (!schema.version || typeof schema.version !== 'string') {
    errors.push('Schema version is required');
  } else if (!/^\d+\.\d+\.\d+/.test(schema.version)) {
    warnings.push(`Schema version "${schema.version}" does not follow semver format (e.g., "1.0.0")`);
  }

  // ============================================================================
  // VOCABULARIES VALIDATION
  // ============================================================================
  if (!schema.vocabularies) {
    errors.push('Vocabularies object is required');
  } else {
    const requiredVocabularies = [
      'categories',
      'functionality',
      'userTypes',
      'interface',
      'deployment',
      'industries',
      'pricingModels',
      'billingPeriods',
    ] as const;

    for (const vocabKey of requiredVocabularies) {
      const vocab = schema.vocabularies[vocabKey];

      if (!vocab) {
        errors.push(`Vocabulary "${vocabKey}" is required`);
      } else if (!Array.isArray(vocab)) {
        errors.push(`Vocabulary "${vocabKey}" must be an array`);
      } else if (vocab.length === 0) {
        warnings.push(`Vocabulary "${vocabKey}" is empty - this may limit search capabilities`);
      } else {
        // Check for duplicates
        const duplicates = vocab.filter((item, index) => vocab.indexOf(item) !== index);
        if (duplicates.length > 0) {
          warnings.push(
            `Vocabulary "${vocabKey}" contains duplicates: ${[...new Set(duplicates)].join(', ')}`
          );
        }

        // Check for empty strings
        if (vocab.some((item) => !item || item.trim().length === 0)) {
          errors.push(`Vocabulary "${vocabKey}" contains empty or whitespace-only values`);
        }
      }
    }
  }

  // ============================================================================
  // INTENT FIELDS VALIDATION
  // ============================================================================
  if (!schema.intentFields) {
    errors.push('Intent fields array is required');
  } else if (!Array.isArray(schema.intentFields)) {
    errors.push('Intent fields must be an array');
  } else if (schema.intentFields.length === 0) {
    errors.push('At least one intent field is required');
  } else {
    const fieldNames = new Set<string>();

    schema.intentFields.forEach((field, index) => {
      const fieldErrors = validateIntentField(field, index);
      errors.push(...fieldErrors);

      // Check for duplicate field names
      if (field.name) {
        if (fieldNames.has(field.name)) {
          errors.push(`Duplicate intent field name: "${field.name}"`);
        }
        fieldNames.add(field.name);
      }
    });

    // Check for required standard fields
    const standardFields = ['primaryGoal', 'functionality', 'confidence'];
    for (const fieldName of standardFields) {
      if (!fieldNames.has(fieldName)) {
        warnings.push(`Standard intent field "${fieldName}" is missing`);
      }
    }
  }

  // ============================================================================
  // VECTOR COLLECTIONS VALIDATION
  // ============================================================================
  if (!schema.vectorCollections) {
    errors.push('Vector collections array is required');
  } else if (!Array.isArray(schema.vectorCollections)) {
    errors.push('Vector collections must be an array');
  } else if (schema.vectorCollections.length === 0) {
    errors.push('At least one vector collection is required');
  } else {
    const collectionNames = new Set<string>();

    schema.vectorCollections.forEach((collection, index) => {
      const collectionErrors = validateVectorCollection(collection, index);
      errors.push(...collectionErrors);

      // Check for duplicate collection names
      if (collection.name) {
        if (collectionNames.has(collection.name)) {
          errors.push(`Duplicate vector collection name: "${collection.name}"`);
        }
        collectionNames.add(collection.name);
      }
    });

    // Check if at least one collection is enabled
    const enabledCollections = schema.vectorCollections.filter(
      (col) => col.enabled !== false
    );
    if (enabledCollections.length === 0) {
      warnings.push('No vector collections are enabled - searches may not use vector search');
    }
  }

  // ============================================================================
  // STRUCTURED DATABASE VALIDATION
  // ============================================================================
  if (!schema.structuredDatabase) {
    errors.push('Structured database configuration is required');
  } else {
    if (!schema.structuredDatabase.collection || schema.structuredDatabase.collection.trim().length === 0) {
      errors.push('Structured database collection name is required');
    }

    if (!schema.structuredDatabase.searchFields || !Array.isArray(schema.structuredDatabase.searchFields)) {
      errors.push('Structured database searchFields must be an array');
    } else if (schema.structuredDatabase.searchFields.length === 0) {
      warnings.push('Structured database has no searchFields defined');
    }

    if (!schema.structuredDatabase.filterableFields || !Array.isArray(schema.structuredDatabase.filterableFields)) {
      errors.push('Structured database filterableFields must be an array');
    } else if (schema.structuredDatabase.filterableFields.length === 0) {
      warnings.push('Structured database has no filterableFields defined');
    }

    // Validate database type if specified
    if (schema.structuredDatabase.type) {
      const validTypes = ['mongodb', 'postgres', 'mysql'];
      if (!validTypes.includes(schema.structuredDatabase.type)) {
        errors.push(
          `Invalid database type "${schema.structuredDatabase.type}". Must be one of: ${validTypes.join(', ')}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a single intent field definition
 */
function validateIntentField(field: IntentFieldDefinition, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Intent field [${index}]`;

  if (!field.name || typeof field.name !== 'string' || field.name.trim().length === 0) {
    errors.push(`${prefix}: name is required and must be a non-empty string`);
  }

  const validTypes = ['string', 'number', 'boolean', 'array', 'object', 'enum'];
  if (!field.type || !validTypes.includes(field.type)) {
    errors.push(`${prefix} "${field.name}": type must be one of: ${validTypes.join(', ')}`);
  }

  // Enum fields must have enumValues
  if (field.type === 'enum') {
    if (!field.enumValues || !Array.isArray(field.enumValues)) {
      errors.push(`${prefix} "${field.name}": enum type requires enumValues array`);
    } else if (field.enumValues.length === 0) {
      errors.push(`${prefix} "${field.name}": enumValues array cannot be empty`);
    }
  }

  if (typeof field.required !== 'boolean') {
    errors.push(`${prefix} "${field.name}": required must be a boolean`);
  }

  if (!field.description || typeof field.description !== 'string' || field.description.trim().length === 0) {
    errors.push(`${prefix} "${field.name}": description is required`);
  }

  // Validate children for object types
  if (field.type === 'object' && field.children) {
    if (!Array.isArray(field.children)) {
      errors.push(`${prefix} "${field.name}": children must be an array`);
    } else {
      field.children.forEach((child, childIndex) => {
        const childErrors = validateIntentField(child, childIndex);
        errors.push(
          ...childErrors.map((err) => `${prefix} "${field.name}" > ${err}`)
        );
      });
    }
  }

  return errors;
}

/**
 * Validates a single vector collection definition
 */
function validateVectorCollection(collection: VectorCollectionDefinition, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Vector collection [${index}]`;

  if (!collection.name || typeof collection.name !== 'string' || collection.name.trim().length === 0) {
    errors.push(`${prefix}: name is required and must be a non-empty string`);
  }

  if (!collection.embeddingField || typeof collection.embeddingField !== 'string') {
    errors.push(`${prefix} "${collection.name}": embeddingField is required`);
  }

  if (typeof collection.dimension !== 'number') {
    errors.push(`${prefix} "${collection.name}": dimension must be a number`);
  } else if (collection.dimension <= 0) {
    errors.push(`${prefix} "${collection.name}": dimension must be positive`);
  } else if (!Number.isInteger(collection.dimension)) {
    errors.push(`${prefix} "${collection.name}": dimension must be an integer`);
  }

  // Common vector dimensions for validation
  const commonDimensions = [128, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096];
  if (!commonDimensions.includes(collection.dimension)) {
    // This is just a warning, not an error
    // Some models use non-standard dimensions
  }

  if (!collection.description || typeof collection.description !== 'string') {
    errors.push(`${prefix} "${collection.name}": description is required`);
  }

  return errors;
}

/**
 * Type guard to validate schema structure (runtime check)
 */
export function isValidSchemaStructure(obj: any): obj is DomainSchema {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check required top-level properties
  const hasRequiredProps =
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    obj.vocabularies !== undefined &&
    Array.isArray(obj.intentFields) &&
    Array.isArray(obj.vectorCollections) &&
    obj.structuredDatabase !== undefined;

  return hasRequiredProps;
}

/**
 * Throws an error if schema is invalid
 * Useful for startup validation
 */
export function assertValidSchema(schema: DomainSchema): void {
  const result = validateSchema(schema);

  if (!result.valid) {
    const errorMessage = [
      'Schema validation failed:',
      ...result.errors.map((err) => `  - ${err}`),
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings but don't throw
  if (result.warnings && result.warnings.length > 0) {
    console.warn('Schema validation warnings:');
    result.warnings.forEach((warning) => {
      console.warn(`  - ${warning}`);
    });
  }
}

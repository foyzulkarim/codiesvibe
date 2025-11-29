/**
 * Tools Domain - Query Plan Validators
 *
 * Domain-specific validation and enhancement logic for query plans.
 * This ensures query plans are valid for the tools domain.
 *
 * @module domains/tools
 */

/**
 * Validate query plan for tools domain
 *
 * Checks that:
 * - Vector sources use valid collection names
 * - Embedding types are appropriate for collections
 * - topK values are within reasonable ranges
 * - Filters reference valid fields
 *
 * @param plan - The query plan to validate
 * @param schema - The tools domain schema
 * @returns Validation result with errors
 */
export function validateToolsQueryPlan(
  plan: any,
  schema: any
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate vector sources
  if (plan.vectorSources && Array.isArray(plan.vectorSources)) {
    const validCollectionNames = schema.vectorCollections.map((c: any) => c.name);

    plan.vectorSources.forEach((source: any, index: number) => {
      // Check collection exists in schema
      if (!validCollectionNames.includes(source.collection)) {
        errors.push(
          `Vector source [${index}]: Collection "${source.collection}" not defined in schema`
        );
      }

      // Check topK is reasonable
      if (source.topK && (source.topK < 1 || source.topK > 200)) {
        warnings.push(
          `Vector source [${index}]: topK=${source.topK} is outside recommended range (1-200)`
        );
      }

      // Check embedding type
      const validEmbeddingTypes = [
        'semantic',
        'entities.categories',
        'entities.functionality',
        'entities.interface',
        'entities.industries',
        'entities.userTypes',
        'entities.aliases',
        'composites.toolType',
      ];

      if (
        source.embeddingType &&
        !validEmbeddingTypes.includes(source.embeddingType)
      ) {
        errors.push(
          `Vector source [${index}]: Invalid embeddingType "${source.embeddingType}"`
        );
      }
    });
  }

  // Validate structured sources
  if (plan.structuredSources && Array.isArray(plan.structuredSources)) {
    plan.structuredSources.forEach((source: any, index: number) => {
      // Check filters are properly formatted
      if (source.filters && !Array.isArray(source.filters)) {
        errors.push(
          `Structured source [${index}]: filters must be an array, got ${typeof source.filters}`
        );
      }

      // Validate filter fields
      if (source.filters && Array.isArray(source.filters)) {
        source.filters.forEach((filter: any, filterIndex: number) => {
          if (!filter.field) {
            errors.push(
              `Structured source [${index}], filter [${filterIndex}]: Missing 'field' property`
            );
          }
          if (!filter.operator) {
            errors.push(
              `Structured source [${index}], filter [${filterIndex}]: Missing 'operator' property`
            );
          }
          if (filter.value === undefined) {
            errors.push(
              `Structured source [${index}], filter [${filterIndex}]: Missing 'value' property`
            );
          }
        });
      }
    });
  }

  // Validate strategy
  const validStrategies = [
    'hybrid',
    'multi-vector',
    'vector-only',
    'metadata-only',
    'semantic-kg',
    'multi-collection-hybrid',
    'identity-focused',
    'capability-focused',
    'usecase-focused',
    'technical-focused',
    'adaptive-weighted',
  ];

  if (plan.strategy && !validStrategies.includes(plan.strategy)) {
    warnings.push(
      `Strategy "${plan.strategy}" is not a standard strategy. Valid strategies: ${validStrategies.join(', ')}`
    );
  }

  // Validate fusion method
  const validFusionMethods = ['rrf', 'weighted_sum', 'concat', 'none'];
  if (plan.fusion && !validFusionMethods.includes(plan.fusion)) {
    warnings.push(
      `Fusion method "${plan.fusion}" is not standard. Valid methods: ${validFusionMethods.join(', ')}`
    );
  }

  // Validate confidence
  if (plan.confidence !== undefined) {
    if (typeof plan.confidence !== 'number') {
      errors.push('Confidence must be a number');
    } else if (plan.confidence < 0 || plan.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Determine appropriate embedding type for a collection
 *
 * @param collectionName - Name of the collection
 * @returns Recommended embedding type
 */
export function getRecommendedEmbeddingType(collectionName: string): string {
  const embeddingTypeMap: Record<string, string> = {
    tools: 'semantic',
    functionality: 'entities.functionality',
    interface: 'entities.interface',
    usecases: 'semantic',
    categories: 'entities.categories',
    industries: 'entities.industries',
    userTypes: 'entities.userTypes',
    aliases: 'entities.aliases',
    toolType: 'composites.toolType',
  };

  return embeddingTypeMap[collectionName] || 'semantic';
}

/**
 * Determine appropriate topK value based on collection priority
 *
 * @param isPrimary - Whether this is a primary collection
 * @param isSecondary - Whether this is a secondary collection
 * @returns Recommended topK value
 */
export function getRecommendedTopK(
  isPrimary: boolean,
  isSecondary: boolean
): number {
  if (isPrimary) {
    return 70; // Higher for primary collections
  } else if (isSecondary) {
    return 40; // Lower for secondary collections
  }
  return 50; // Default
}

/**
 * Determine appropriate fusion method based on number of sources
 *
 * @param numVectorSources - Number of vector sources
 * @returns Recommended fusion method
 */
export function getRecommendedFusionMethod(numVectorSources: number): string {
  if (numVectorSources > 2) {
    return 'rrf'; // Best for multiple collections
  } else if (numVectorSources === 2) {
    return 'weighted_sum'; // Good for two sources
  } else if (numVectorSources === 1) {
    return 'none'; // No fusion needed
  }
  return 'concat'; // Fallback
}

/**
 * Validate that collection is enabled in the schema
 *
 * @param collectionName - Collection name to check
 * @param schema - Domain schema
 * @returns True if collection is enabled
 */
export function isCollectionEnabled(
  collectionName: string,
  schema: any
): boolean {
  const collection = schema.vectorCollections.find(
    (c: any) => c.name === collectionName
  );

  if (!collection) {
    return false;
  }

  // If enabled field is not specified, default to true
  return collection.enabled !== false;
}

/**
 * Get list of enabled collection names from schema
 *
 * @param schema - Domain schema
 * @returns Array of enabled collection names
 */
export function getEnabledCollections(schema: any): string[] {
  return schema.vectorCollections
    .filter((c: any) => c.enabled !== false)
    .map((c: any) => c.name);
}

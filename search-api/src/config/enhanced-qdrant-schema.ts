export interface NamedVectorConfig {
  size: number;
  distance: "Cosine" | "Euclid" | "Dot";
}


/**
 * Get all enabled vector types
 */
export function getEnabledVectorTypes(): string[] {
  return ['semantic', 'entities.categories', 'entities.functionality', 'entities.aliases', 'composites.toolType'];
}

/**
 * Check if a vector type is supported in the enhanced schema
 */
export function isEnhancedVectorTypeSupported(vectorType: string): boolean {
  const supportedTypes = ['semantic', 'entities.categories', 'entities.functionality', 'entities.aliases', 'composites.toolType'];
  return supportedTypes.includes(vectorType);
}

/**
/**
 * Get vector configuration for a specific vector type
 */
export function getVectorConfig(vectorType: string): NamedVectorConfig | null {
  // Hardcoded configurations for supported vector types
  const configs: { [key: string]: NamedVectorConfig } = {
    'semantic': { size: 1536, distance: 'Cosine' },
    'entities.categories': { size: 384, distance: 'Cosine' },
    'entities.functionality': { size: 384, distance: 'Cosine' },
    'entities.aliases': { size: 384, distance: 'Cosine' },
    'composites.toolType': { size: 768, distance: 'Cosine' }
  };
  
  return configs[vectorType] || null;
}

export function validateEnhancedVectors(vectors: { [vectorType: string]: number[] }): void {
  if (!vectors || typeof vectors !== 'object') {
    throw new Error('Vectors must be an object');
  }

  if (Object.keys(vectors).length === 0) {
    throw new Error('At least one vector must be provided');
  }

  // Validate each vector
  for (const [vectorType, embedding] of Object.entries(vectors)) {
    if (!isEnhancedVectorTypeSupported(vectorType)) {
      throw new Error(`Unsupported vector type: ${vectorType}`);
    }

    const config = getVectorConfig(vectorType);
    if (!config) {
      throw new Error(`No configuration found for vector type: ${vectorType}`);
    }

    // Validate embedding dimensions
    if (!Array.isArray(embedding)) {
      throw new Error(`Embedding for ${vectorType} must be an array`);
    }

    if (embedding.length !== config.size) {
      throw new Error(
        `Embedding for ${vectorType} must have exactly ${config.size} dimensions, got ${embedding.length}`
      );
    }

    // Validate embedding values
    for (let i = 0; i < embedding.length; i++) {
      if (typeof embedding[i] !== 'number' || !isFinite(embedding[i])) {
        throw new Error(
          `Embedding value at index ${i} for ${vectorType} is not a valid number: ${embedding[i]}`
        );
      }
    }
  }
}



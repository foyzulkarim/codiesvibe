/**
 * Enhanced Qdrant collection schema with multiple named vectors
 * This configuration enables storing multiple vector types in a single collection
 * instead of using separate collections for each vector type.
 */

export interface NamedVectorConfig {
  size: number;
  distance: "Cosine" | "Euclid" | "Dot";
}

export interface EnhancedCollectionConfig {
  vectors_config: {
    [vectorName: string]: NamedVectorConfig;
  };
}

/**
 * Enhanced collection configuration with named vectors
 * Each tool will have multiple named vectors in the same collection
 */
export const enhancedCollectionConfig: EnhancedCollectionConfig = {
  vectors_config: {
    // Primary semantic vector for overall tool similarity
    semantic: {
      size: 1024,
      distance: "Cosine",
    },
    
    // Entity-specific vectors for contextual search
    "entities.categories": {
      size: 1024,
      distance: "Cosine",
    },
    
    "entities.functionality": {
      size: 1024,
      distance: "Cosine",
    },
    
    "entities.aliases": {
      size: 1024,
      distance: "Cosine",
    },
    
    // Composite vectors for advanced search strategies
    "composites.toolType": {
      size: 1024,
      distance: "Cosine",
    },
  },
};

/**
 * Collection names for enhanced schema
 */
export const enhancedCollectionNames = {
  primary: process.env.QDRANT_ENHANCED_COLLECTION_NAME || "tools_enhanced",
  legacy: process.env.QDRANT_COLLECTION_NAME || "tools", // Keep reference to legacy collection
};

/**
 * Vector type definitions with metadata
 */
export interface VectorTypeDefinition {
  name: string;
  description: string;
  useCase: string;
  priority: number; // For search result ordering
  enabled: boolean;
}

export const vectorTypeDefinitions: Record<string, VectorTypeDefinition> = {
  semantic: {
    name: "semantic",
    description: "Primary semantic similarity vector for overall tool relevance",
    useCase: "General similarity search and relevance ranking",
    priority: 1,
    enabled: true,
  },
  
  "entities.categories": {
    name: "entities.categories",
    description: "Category-based embeddings for domain-specific searches",
    useCase: "Finding tools in specific categories or domains",
    priority: 2,
    enabled: true,
  },
  
  "entities.functionality": {
    name: "entities.functionality",
    description: "Functionality embeddings for feature-based searches",
    useCase: "Finding tools with specific features or capabilities",
    priority: 3,
    enabled: true,
  },
  
  "entities.aliases": {
    name: "entities.aliases",
    description: "Alias and alternative name embeddings",
    useCase: "Finding tools by alternative names or synonyms",
    priority: 4,
    enabled: true,
  },
  
  "composites.toolType": {
    name: "composites.toolType",
    description: "Tool type classification embeddings",
    useCase: "Finding tools of specific types or classifications",
    priority: 5,
    enabled: true,
  },
};

/**
 * Get all enabled vector types
 */
export function getEnabledVectorTypes(): string[] {
  return Object.entries(vectorTypeDefinitions)
    .filter(([_, definition]) => definition.enabled)
    .map(([name, _]) => name);
}

/**
 * Get vector type definition
 */
export function getVectorTypeDefinition(vectorType: string): VectorTypeDefinition | null {
  return vectorTypeDefinitions[vectorType] || null;
}

/**
 * Check if a vector type is supported in the enhanced schema
 */
export function isEnhancedVectorTypeSupported(vectorType: string): boolean {
  return vectorType in enhancedCollectionConfig.vectors_config;
}

/**
 * Get vector configuration for a specific type
 */
export function getVectorConfig(vectorType: string): NamedVectorConfig | null {
  return enhancedCollectionConfig.vectors_config[vectorType] || null;
}

/**
 * Validation schema for enhanced collection operations
 */
export interface EnhancedVectorValidation {
  vectorType: string;
  embedding: number[];
  validateDimensions?: boolean;
  validateValues?: boolean;
}

/**
 * Validate multiple vectors for enhanced operations
 */
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

/**
 * Collection creation options for enhanced schema
 */
export interface EnhancedCollectionOptions {
  vectors_config: { [vectorName: string]: NamedVectorConfig };
  shard_number?: number;
  replication_factor?: number;
  write_consistency_factor?: number;
  on_disk?: boolean;
  hnsw_config?: {
    m?: number;
    ef_construct?: number;
    full_scan_threshold?: number;
    max_indexing_threads?: number;
    on_disk?: boolean;
  };
  wal_config?: {
    wal_capacity_mb?: number;
    wal_segments_ahead?: number;
  };
  optimizers_config?: {
    deleted_threshold?: number;
    vacuum_min_vector_number?: number;
    default_segment_number?: number;
    max_segment_size?: number;
    memmap_threshold?: number;
    indexing_threshold?: number;
    flush_interval_sec?: number;
    max_optimization_threads?: number;
  };
}

/**
 * Default enhanced collection creation options
 */
export const defaultEnhancedCollectionOptions: EnhancedCollectionOptions = {
  ...enhancedCollectionConfig,
  shard_number: 1,
  replication_factor: 1,
  write_consistency_factor: 1,
  on_disk: false,
  hnsw_config: {
    m: 16,
    ef_construct: 100,
    full_scan_threshold: 10000,
    max_indexing_threads: 4,
    on_disk: false,
  },
  wal_config: {
    wal_capacity_mb: 32,
    wal_segments_ahead: 2,
  },
  optimizers_config: {
    deleted_threshold: 0.2,
    vacuum_min_vector_number: 1000,
    default_segment_number: 2,
    max_segment_size: 200000,
    memmap_threshold: 50000,
    indexing_threshold: 20000,
    flush_interval_sec: 5,
    max_optimization_threads: 1,
  },
};

/**
 * Migration configuration for moving from separate collections to enhanced schema
 */
export interface MigrationConfig {
  sourceCollections: { [vectorType: string]: string };
  targetCollection: string;
  batchSize: number;
  maxConcurrency: number;
  preserveSource: boolean;
  validationEnabled: boolean;
}

export const defaultMigrationConfig: MigrationConfig = {
  sourceCollections: {
    semantic: process.env.QDRANT_COLLECTION_SEMANTIC || "tools_semantic",
    "entities.categories": process.env.QDRANT_COLLECTION_CATEGORIES || "tools_categories",
    "entities.functionality": process.env.QDRANT_COLLECTION_FUNCTIONALITY || "tools_functionality",
    "entities.aliases": process.env.QDRANT_COLLECTION_ALIASES || "tools_aliases",
    "composites.toolType": process.env.QDRANT_COLLECTION_TOOL_TYPE || "tools_tool_type",
  },
  targetCollection: enhancedCollectionNames.primary,
  batchSize: 100,
  maxConcurrency: 4,
  preserveSource: true,
  validationEnabled: true,
};

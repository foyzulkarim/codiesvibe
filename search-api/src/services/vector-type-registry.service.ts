import { QdrantCollectionConfigService } from './qdrant-collection-config.service.js';

export interface VectorTypeMetadata {
  name: string;
  description: string;
  targetCollections: string[];
  contentGenerator: string;
  weight: number;
  ollamaOptimized: boolean;
  category: 'semantic' | 'entity' | 'composite' | 'domain';
  deprecated?: boolean;
  deprecationMessage?: string;
}

export interface VectorTypeCombination {
  types: string[];
  description: string;
  useCase: string;
  collections: string[];
}

export class VectorTypeRegistryService {
  private readonly vectorTypes: VectorTypeMetadata[] = [
    // Core semantic vector
    {
      name: 'semantic',
      description: 'Core semantic understanding of tool content',
      targetCollections: ['tools', 'functionality', 'usecases', 'interface'],
      contentGenerator: 'semantic',
      weight: 1.0,
      ollamaOptimized: true,
      category: 'semantic'
    },

    // Entity-based vectors
    {
      name: 'entities.functionality',
      description: 'Specific functionality and feature entities',
      targetCollections: ['functionality'],
      contentGenerator: 'functionality',
      weight: 1.2,
      ollamaOptimized: true,
      category: 'entity'
    },
    {
      name: 'entities.industries',
      description: 'Industry and sector entities',
      targetCollections: ['usecases'],
      contentGenerator: 'industries',
      weight: 1.1,
      ollamaOptimized: true,
      category: 'entity'
    },
    {
      name: 'entities.userTypes',
      description: 'User type and role entities',
      targetCollections: ['usecases'],
      contentGenerator: 'userTypes',
      weight: 1.1,
      ollamaOptimized: true,
      category: 'entity'
    },
    {
      name: 'entities.interface',
      description: 'Technical interface entities',
      targetCollections: ['interface'],
      contentGenerator: 'interface',
      weight: 1.1,
      ollamaOptimized: true,
      category: 'entity'
    },

    // Composite vectors for enhanced search
    {
      name: 'composites.identity',
      description: 'Combined identity information (name + description)',
      targetCollections: ['tools'],
      contentGenerator: 'identity',
      weight: 1.3,
      ollamaOptimized: true,
      category: 'composite'
    },
    {
      name: 'composites.capabilities',
      description: 'Combined capabilities and features',
      targetCollections: ['functionality'],
      contentGenerator: 'capabilities',
      weight: 1.4,
      ollamaOptimized: true,
      category: 'composite'
    },
    {
      name: 'composites.usecase',
      description: 'Combined use case information',
      targetCollections: ['usecases'],
      contentGenerator: 'usecase',
      weight: 1.3,
      ollamaOptimized: true,
      category: 'composite'
    },
    {
      name: 'composites.technical',
      description: 'Combined technical specifications',
      targetCollections: ['interface'],
      contentGenerator: 'technical',
      weight: 1.2,
      ollamaOptimized: true,
      category: 'composite'
    },

    // Domain-specific vectors
    {
      name: 'domain.pricing',
      description: 'Pricing and business model information',
      targetCollections: ['interface'],
      contentGenerator: 'pricing',
      weight: 0.8,
      ollamaOptimized: false,
      category: 'domain'
    },
    {
      name: 'domain.deployment',
      description: 'Deployment and infrastructure information',
      targetCollections: ['usecases', 'interface'],
      contentGenerator: 'deployment',
      weight: 0.9,
      ollamaOptimized: false,
      category: 'domain'
    },

    // Legacy vectors (deprecated)
    {
      name: 'legacy.categories',
      description: 'Legacy category-based vectors (deprecated)',
      targetCollections: ['functionality'],
      contentGenerator: 'legacy',
      weight: 0.5,
      ollamaOptimized: false,
      category: 'entity',
      deprecated: true,
      deprecationMessage: 'Use entities.functionality instead'
    }
  ];

  // Predefined vector type combinations for common use cases
  private readonly combinations: VectorTypeCombination[] = [
    {
      types: ['semantic', 'composites.identity'],
      description: 'General tool discovery',
      useCase: 'Users searching for tools by name or general description',
      collections: ['tools']
    },
    {
      types: ['semantic', 'entities.functionality', 'composites.capabilities'],
      description: 'Feature-specific search',
      useCase: 'Users looking for specific capabilities or features',
      collections: ['functionality']
    },
    {
      types: ['semantic', 'entities.industries', 'entities.userTypes', 'composites.usecase'],
      description: 'Industry and role-based search',
      useCase: 'Users in specific industries or roles looking for relevant tools',
      collections: ['usecases']
    },
    {
      types: ['semantic', 'entities.interface', 'composites.technical'],
      description: 'Technical implementation search',
      useCase: 'Developers looking for specific technical requirements',
      collections: ['interface']
    },
    {
      types: ['semantic'],
      description: 'Quick semantic search',
      useCase: 'General queries across all content types',
      collections: ['tools', 'functionality', 'usecases', 'interface']
    },
    {
      types: ['semantic', 'entities.functionality', 'entities.industries'],
      description: 'Industry-specific feature search',
      useCase: 'Users looking for features in specific industries',
      collections: ['functionality', 'usecases']
    }
  ];

  constructor(private readonly collectionConfig: QdrantCollectionConfigService) {}

  /**
   * Get all available vector types
   */
  getVectorTypes(): VectorTypeMetadata[] {
    return this.vectorTypes.filter(vectorType => !vectorType.deprecated);
  }

  /**
   * Get all vector types including deprecated ones
   */
  getAllVectorTypes(): VectorTypeMetadata[] {
    return [...this.vectorTypes];
  }

  /**
   * Get vector types for a specific collection
   */
  getVectorTypesForCollection(collectionName: string): VectorTypeMetadata[] {
    return this.getVectorTypes().filter(vectorType =>
      vectorType.targetCollections.includes(collectionName)
    );
  }

  /**
   * Get vector type by name
   */
  getVectorTypeByName(name: string): VectorTypeMetadata | null {
    return this.getVectorTypes().find(vectorType => vectorType.name === name) || null;
  }

  /**
   * Get vector type by name (including deprecated)
   */
  getVectorTypeByNameIncludingDeprecated(name: string): VectorTypeMetadata | null {
    return this.vectorTypes.find(vectorType => vectorType.name === name) || null;
  }

  /**
   * Get vector types by category
   */
  getVectorTypesByCategory(category: 'semantic' | 'entity' | 'composite' | 'domain'): VectorTypeMetadata[] {
    return this.getVectorTypes().filter(vectorType => vectorType.category === category);
  }

  /**
   * Get Ollama-optimized vector types
   */
  getOllamaOptimizedVectorTypes(): VectorTypeMetadata[] {
    return this.getVectorTypes().filter(vectorType => vectorType.ollamaOptimized);
  }

  /**
   * Validate vector type combination
   */
  validateVectorTypeCombination(types: string[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!types || types.length === 0) {
      issues.push('Vector type combination cannot be empty');
      return { valid: false, issues };
    }

    // Check if all types exist
    for (const type of types) {
      const vectorType = this.getVectorTypeByName(type);
      if (!vectorType) {
        issues.push(`Vector type '${type}' not found or is deprecated`);
      }
    }

    // Check for duplicates
    const uniqueTypes = new Set(types);
    if (uniqueTypes.size !== types.length) {
      issues.push('Duplicate vector types in combination');
    }

    // Check for compatibility issues
    const semanticTypes = types.filter(t => t.startsWith('semantic'));
    // const entityTypes = types.filter(t => t.startsWith('entities.'));
    // const compositeTypes = types.filter(t => t.startsWith('composites.'));

    // Semantic should generally be included
    if (semanticTypes.length === 0 && types.length > 1) {
      issues.push('Multi-vector combinations should include semantic type for best results');
    }

    // Check collection compatibility
    const collectionSets = types.map(type => {
      const vectorType = this.getVectorTypeByName(type);
      return vectorType ? new Set(vectorType.targetCollections) : new Set();
    });

    // Find intersection of all target collections
    const commonCollections = collectionSets.reduce((intersection, set) => {
      return new Set([...intersection].filter(x => set.has(x)));
    }, collectionSets[0] || new Set());

    if (commonCollections.size === 0) {
      issues.push('Vector types have no common target collections');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get vector type combinations
   */
  getVectorTypeCombinations(): VectorTypeCombination[] {
    return [...this.combinations];
  }

  /**
   * Get combination by use case
   */
  getCombinationByUseCase(useCase: string): VectorTypeCombination | null {
    return this.combinations.find(combination =>
      combination.useCase.toLowerCase().includes(useCase.toLowerCase())
    ) || null;
  }

  /**
   * Get recommended vector types for a query
   */
  getRecommendedVectorTypes(query: string, collections?: string[]): string[] {
    const queryLower = query.toLowerCase();
    let recommendedTypes: string[] = ['semantic']; // Always include semantic

    // Analyze query content to recommend specific vector types
    if (this.matchesKeywords(queryLower, ['feature', 'functionality', 'capability', 'can', 'able to'])) {
      recommendedTypes.push('entities.functionality', 'composites.capabilities');
    }

    if (this.matchesKeywords(queryLower, ['industry', 'sector', 'healthcare', 'finance', 'education'])) {
      recommendedTypes.push('entities.industries');
    }

    if (this.matchesKeywords(queryLower, ['developer', 'designer', 'business', 'student', 'teacher'])) {
      recommendedTypes.push('entities.userTypes');
    }

    if (this.matchesKeywords(queryLower, ['api', 'sdk', 'library', 'framework', 'interface'])) {
      recommendedTypes.push('entities.interface', 'composites.technical');
    }

    if (this.matchesKeywords(queryLower, ['price', 'cost', 'free', 'pricing', 'subscription'])) {
      recommendedTypes.push('domain.pricing');
    }

    if (this.matchesKeywords(queryLower, ['deploy', 'host', 'cloud', 'on-premise', 'server'])) {
      recommendedTypes.push('domain.deployment');
    }

    // Filter by specified collections
    if (collections && collections.length > 0) {
      recommendedTypes = recommendedTypes.filter(type => {
        const vectorType = this.getVectorTypeByName(type);
        return vectorType && vectorType.targetCollections.some(col => collections!.includes(col));
      });
    }

    // Remove duplicates and return
    return [...new Set(recommendedTypes)];
  }

  /**
   * Get vector types with weights
   */
  getVectorTypesWithWeights(types: string[]): Record<string, number> {
    const weightedTypes: Record<string, number> = {};

    for (const type of types) {
      const vectorType = this.getVectorTypeByName(type);
      if (vectorType) {
        weightedTypes[type] = vectorType.weight;
      }
    }

    return weightedTypes;
  }

  /**
   * Get vector type statistics
   */
  getVectorTypeStats(): {
    total: number;
    byCategory: Record<string, number>;
    ollamaOptimized: number;
    deprecated: number;
    byCollection: Record<string, number>;
  } {
    const activeTypes = this.getVectorTypes();

    const byCategory = activeTypes.reduce((acc, type) => {
      acc[type.category] = (acc[type.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCollection = activeTypes.reduce((acc, type) => {
      for (const collection of type.targetCollections) {
        acc[collection] = (acc[collection] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      total: activeTypes.length,
      byCategory,
      ollamaOptimized: activeTypes.filter(t => t.ollamaOptimized).length,
      deprecated: this.vectorTypes.filter(t => t.deprecated).length,
      byCollection
    };
  }

  /**
   * Check if vector type exists
   */
  isValidVectorType(type: string): boolean {
    return this.getVectorTypeByName(type) !== null;
  }

  /**
   * Get deprecation warnings for vector types
   */
  getDeprecationWarnings(types: string[]): string[] {
    const warnings: string[] = [];

    for (const type of types) {
      const vectorType = this.getVectorTypeByNameIncludingDeprecated(type);
      if (vectorType?.deprecated && vectorType.deprecationMessage) {
        warnings.push(`${type}: ${vectorType.deprecationMessage}`);
      }
    }

    return warnings;
  }

  /**
   * Helper method to check if query matches keywords
   */
  private matchesKeywords(query: string, keywords: string[]): boolean {
    return keywords.some(keyword => query.includes(keyword));
  }
}
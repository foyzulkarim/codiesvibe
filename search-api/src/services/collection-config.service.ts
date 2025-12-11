export interface CollectionConfig {
  name: string;
  description: string;
  purpose: 'identity' | 'capability' | 'usecase' | 'technical';
  vectorTypes: string[];
  contentFields: string[];
  weightings: Record<string, number>;
  enabled: boolean;
}

export interface CollectionHealth {
  name: string;
  vectorCount: number;
  expectedCount: number;
  syncPercentage: number;
  lastUpdated: Date;
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
}

export class CollectionConfigService {
  private readonly collections: CollectionConfig[] = [
    {
      name: 'tools',
      description: 'Core tool information (name, description, longDescription, tagline)',
      purpose: 'identity',
      vectorTypes: ['semantic'],
      contentFields: ['name', 'description', 'longDescription', 'tagline'],
      weightings: {
        name: 3.0,
        description: 2.0,
        longDescription: 1.5,
        tagline: 1.0
      },
      enabled: true
    },
    {
      name: 'functionality',
      description: 'Tool capabilities and features (functionality, categories)',
      purpose: 'capability',
      vectorTypes: ['semantic', 'entities.functionality'],
      contentFields: ['functionality', 'categories'],
      weightings: {
        functionality: 2.5,
        categories: 2.0
      },
      enabled: true
    },
    {
      name: 'usecases',
      description: 'Industry and deployment targeting (industries, userTypes, deployment)',
      purpose: 'usecase',
      vectorTypes: ['semantic', 'entities.industries', 'entities.userTypes'],
      contentFields: ['industries', 'userTypes', 'deployment'],
      weightings: {
        industries: 2.0,
        userTypes: 2.0,
        deployment: 1.5
      },
      enabled: true
    },
    {
      name: 'interface',
      description: 'Technical implementation details (interface, pricingModel, status)',
      purpose: 'technical',
      vectorTypes: ['semantic', 'entities.interface'],
      contentFields: ['interface', 'pricingModel', 'status'],
      weightings: {
        interface: 2.0,
        pricingModel: 1.5,
        status: 1.0
      },
      enabled: true
    }
  ];

  constructor() {}

  /**
   * Get all available collections
   */
  getCollections(): CollectionConfig[] {
    return [...this.collections];
  }

  /**
   * Get enabled collections only
   */
  getEnabledCollections(): CollectionConfig[] {
    return this.collections.filter(collection => collection.enabled);
  }

  /**
   * Get collection by name
   */
  getCollectionByName(name: string): CollectionConfig | null {
    return this.collections.find(collection => collection.name === name) || null;
  }

  /**
   * Get collections by purpose
   */
  getCollectionsByPurpose(purpose: string): CollectionConfig[] {
    return this.collections.filter(collection => collection.purpose === purpose);
  }

  /**
   * Get collection names
   */
  getCollectionNames(): string[] {
    return this.collections.map(collection => collection.name);
  }

  /**
   * Get enabled collection names
   */
  getEnabledCollectionNames(): string[] {
    return this.getEnabledCollections().map(collection => collection.name);
  }

  /**
   * Validate collection configuration
   */
  validateCollectionConfig(config: CollectionConfig): boolean {
    try {
      // Check required fields
      if (!config.name || !config.description || !config.purpose) {
        return false;
      }

      // Check valid purpose
      const validPurposes = ['identity', 'capability', 'usecase', 'technical'];
      if (!validPurposes.includes(config.purpose)) {
        return false;
      }

      // Check vector types
      if (!Array.isArray(config.vectorTypes) || config.vectorTypes.length === 0) {
        return false;
      }

      // Check content fields
      if (!Array.isArray(config.contentFields) || config.contentFields.length === 0) {
        return false;
      }

      // Check weightings
      if (!config.weightings || typeof config.weightings !== 'object') {
        return false;
      }

      // Check that all content fields have weightings
      for (const field of config.contentFields) {
        if (!(field in config.weightings)) {
          return false;
        }
      }

      // Check that all weightings are positive numbers
      for (const [, weight] of Object.entries(config.weightings)) {
        if (typeof weight !== 'number' || weight <= 0) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating collection config:', error);
      return false;
    }
  }

  /**
   * Get weightings for a specific collection
   */
  getCollectionWeightings(collectionName: string): Record<string, number> {
    const collection = this.getCollectionByName(collectionName);
    return collection?.weightings || {};
  }

  /**
   * Get content fields for a specific collection
   */
  getCollectionContentFields(collectionName: string): string[] {
    const collection = this.getCollectionByName(collectionName);
    return collection?.contentFields || [];
  }

  /**
   * Get vector types for a specific collection
   */
  getCollectionVectorTypes(collectionName: string): string[] {
    const collection = this.getCollectionByName(collectionName);
    return collection?.vectorTypes || [];
  }

  /**
   * Check if a collection exists and is enabled
   */
  isCollectionEnabled(collectionName: string): boolean {
    const collection = this.getCollectionByName(collectionName);
    return collection?.enabled || false;
  }

  /**
   * Get default collection for general queries
   */
  getDefaultCollection(): CollectionConfig | null {
    return this.getCollectionByName('tools');
  }

  /**
   * Get all collections for a specific set of vector types
   */
  getCollectionsForVectorTypes(vectorTypes: string[]): CollectionConfig[] {
    return this.collections.filter(collection =>
      vectorTypes.some(vectorType => collection.vectorTypes.includes(vectorType))
    );
  }

  /**
   * Validate that collection names are valid
   */
  validateCollectionNames(collectionNames: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const name of collectionNames) {
      if (this.getCollectionByName(name)) {
        valid.push(name);
      } else {
        invalid.push(name);
      }
    }

    return { valid, invalid };
  }

  /**
   * Get collection configuration summary
   */
  getCollectionSummary(): Record<string, unknown> {
    return {
      totalCollections: this.collections.length,
      enabledCollections: this.getEnabledCollections().length,
      collectionsByPurpose: this.collections.reduce((acc, collection) => {
        acc[collection.purpose] = (acc[collection.purpose] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalVectorTypes: [...new Set(this.collections.flatMap(c => c.vectorTypes))].length,
      totalContentFields: [...new Set(this.collections.flatMap(c => c.contentFields))].length
    };
  }

  /**
   * Get the primary vector type for a collection
   * This helps prevent confusion between collection names and vector types
   */
  getPrimaryVectorTypeForCollection(collectionName: string): string {
    const collection = this.getCollectionByName(collectionName);
    if (!collection || collection.vectorTypes.length === 0) {
      return 'semantic'; // Default fallback
    }
    
    // Return the most specific vector type (entities.* types are more specific than 'semantic')
    const specificTypes = collection.vectorTypes.filter(type => type.startsWith('entities.'));
    return specificTypes.length > 0 ? specificTypes[0] : collection.vectorTypes[0];
  }

  /**
   * Map collection name to appropriate vector type for upserting
   */
  getVectorTypeForCollection(collectionName: string): string {
    const mapping: Record<string, string> = {
      'tools': 'semantic',
      'functionality': 'entities.functionality',
      'usecases': 'entities.industries', // Use first entities type
      'interface': 'entities.interface'
    };

    return mapping[collectionName] || 'semantic';
  }

  /**
   * Map collection name to physical Qdrant collection name
   * Uses simple collection names created during server startup
   */
  getPhysicalCollectionName(collectionName: string): string {
    // Return the simple collection names created by qdrantService.createMultiCollections()
    return collectionName;
  }
}
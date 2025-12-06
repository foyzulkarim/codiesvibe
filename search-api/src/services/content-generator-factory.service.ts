import { ToolData, ToolDataValidator } from '../types/tool.types';
import { CollectionConfigService } from './collection-config.service';

export interface ContentGenerator {
  generate(tool: ToolData): string;
  getCollectionType(): string;
  getWeightings(): Record<string, number>;
  getFields(): string[];
  validate(tool: ToolData): { valid: boolean; missingFields: string[] };
}

export interface WeightedContentPart {
  content: string;
  weight: number;
  source: string;
}

export class ContentGeneratorFactory {
  private readonly generators: Map<string, ContentGenerator> = new Map();

  constructor(private readonly collectionConfig: CollectionConfigService) {
    this.initializeGenerators();
  }

  /**
   * Create a content generator for a specific collection type
   */
  createGenerator(collectionType: string): ContentGenerator {
    const generator = this.generators.get(collectionType);
    if (!generator) {
      throw new Error(`No content generator available for collection type: ${collectionType}`);
    }
    return generator;
  }

  /**
   * Get all available generator types
   */
  getAvailableGenerators(): string[] {
    return Array.from(this.generators.keys());
  }

  /**
   * Validate a generator implementation
   */
  validateGenerator(generator: ContentGenerator): boolean {
    try {
      // Check required methods exist
      if (typeof generator.generate !== 'function') return false;
      if (typeof generator.getCollectionType !== 'function') return false;
      if (typeof generator.getWeightings !== 'function') return false;
      if (typeof generator.getFields !== 'function') return false;
      if (typeof generator.validate !== 'function') return false;

      // Check collection type is registered
      const collectionType = generator.getCollectionType();
      return this.collectionConfig.getCollectionByName(collectionType) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Generate content for multiple collections
   */
  generateForCollections(tool: ToolData, collections: string[]): Record<string, string> {
    const results: Record<string, string> = {};

    for (const collectionName of collections) {
      try {
        const generator = this.createGenerator(collectionName);
        results[collectionName] = generator.generate(tool);
      } catch (error) {
        console.error(`Error generating content for collection ${collectionName}:`, error);
        results[collectionName] = '';
      }
    }

    return results;
  }

  /**
   * Validate tool data for all collections
   */
  validateForCollections(tool: ToolData, collections: string[]): Record<string, { valid: boolean; missingFields: string[] }> {
    const results: Record<string, { valid: boolean; missingFields: string[] }> = {};

    for (const collectionName of collections) {
      try {
        const generator = this.createGenerator(collectionName);
        results[collectionName] = generator.validate(tool);
      } catch (error) {
        console.error(`Error validating tool for collection ${collectionName}:`, error);
        results[collectionName] = { valid: false, missingFields: ['Generator not available'] };
      }
    }

    return results;
  }

  /**
   * Get content statistics for a tool
   */
  getContentStats(tool: ToolData, collections: string[]): Record<string, {
    length: number;
    wordCount: number;
    fieldsUsed: string[];
    weightingApplied: boolean;
  }> {
    const stats: Record<string, any> = {};

    for (const collectionName of collections) {
      try {
        const generator = this.createGenerator(collectionName);
        const content = generator.generate(tool);
        const fields = generator.getFields();
        const weightings = generator.getWeightings();

        stats[collectionName] = {
          length: content.length,
          wordCount: content.split(/\s+/).length,
          fieldsUsed: fields.filter(field => tool[field as keyof ToolData]),
          weightingApplied: Object.keys(weightings).length > 0
        };
      } catch (error) {
        console.error(`Error getting stats for collection ${collectionName}:`, error);
        stats[collectionName] = {
          length: 0,
          wordCount: 0,
          fieldsUsed: [],
          weightingApplied: false
        };
      }
    }

    return stats;
  }

  /**
   * Initialize all content generators
   */
  private initializeGenerators(): void {
    this.generators.set('tools', new ToolsContentGenerator());
    this.generators.set('functionality', new FunctionalityContentGenerator());
    this.generators.set('usecases', new UsecasesContentGenerator());
    this.generators.set('interface', new InterfaceContentGenerator());
  }
}

/**
 * Tools Collection Content Generator
 * Focuses on core tool identity and basic functionality
 */
class ToolsContentGenerator implements ContentGenerator {
  generate(tool: ToolData): string {
    const contentParts: string[] = [];

    // Add weighted content using CollectionConfigService weightings
    this.addWeighted([tool.name], 3.0, contentParts);
    this.addWeighted([tool.description], 2.0, contentParts);
    this.addWeighted([tool.longDescription].filter(Boolean), 1.5, contentParts);
    this.addWeighted([tool.tagline].filter(Boolean), 1.0, contentParts);

    return contentParts.join(' ');
  }

  getCollectionType(): string {
    return 'tools';
  }

  getWeightings(): Record<string, number> {
    return {
      name: 3.0,
      description: 2.0,
      longDescription: 1.5,
      tagline: 1.0
    };
  }

  getFields(): string[] {
    return ['name', 'description', 'longDescription', 'tagline'];
  }

  validate(tool: ToolData): { valid: boolean; missingFields: string[] } {
    const requiredFields = ['name', 'description'];
    const missingFields = requiredFields.filter(field => !tool[field as keyof ToolData]);

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  private addWeighted(contents: string[], weight: number, parts: string[]): void {
    for (const content of contents) {
      if (content && content.trim()) {
        // Weighted content is repeated according to weight for emphasis
        const repeatCount = Math.floor(weight);
        for (let i = 0; i < repeatCount; i++) {
          parts.push(content);
        }
        // Add partial weight if needed
        if (weight % 1 !== 0) {
          parts.push(content);
        }
      }
    }
  }
}

/**
 * Functionality Collection Content Generator
 * Focuses on tool capabilities and features
 */
class FunctionalityContentGenerator implements ContentGenerator {
  generate(tool: ToolData): string {
    const contentParts: string[] = [];

    this.addWeighted(tool.functionality, 2.5, contentParts);
    this.addWeighted(tool.categories, 2.0, contentParts);

    // Add enhanced descriptions for functionality
    if (tool.functionality.length > 0) {
      contentParts.push(`Features: ${tool.functionality.join(', ')}`);
    }
    if (tool.categories.length > 0) {
      contentParts.push(`Categories: ${tool.categories.join(', ')}`);
    }

    return contentParts.join(' ');
  }

  getCollectionType(): string {
    return 'functionality';
  }

  getWeightings(): Record<string, number> {
    return {
      functionality: 2.5,
      categories: 2.0
    };
  }

  getFields(): string[] {
    return ['functionality', 'categories'];
  }

  validate(tool: ToolData): { valid: boolean; missingFields: string[] } {
    const requiredFields = ['functionality', 'categories'];
    const missingFields = requiredFields.filter(field => {
      const value = tool[field as keyof ToolData] as string[];
      return !value || value.length === 0;
    });

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  private addWeighted(contents: string[], weight: number, parts: string[]): void {
    for (const content of contents) {
      if (content && content.trim()) {
        const repeatCount = Math.floor(weight);
        for (let i = 0; i < repeatCount; i++) {
          parts.push(content);
        }
        if (weight % 1 !== 0) {
          parts.push(content);
        }
      }
    }
  }
}

/**
 * Usecases Collection Content Generator
 * Focuses on industry and deployment targeting
 */
class UsecasesContentGenerator implements ContentGenerator {
  generate(tool: ToolData): string {
    const contentParts: string[] = [];

    this.addWeighted(tool.industries, 2.0, contentParts);
    this.addWeighted(tool.userTypes, 2.0, contentParts);
    this.addWeighted(tool.deployment, 1.5, contentParts);

    // Add contextual information
    if (tool.industries.length > 0 && tool.userTypes.length > 0) {
      contentParts.push(`Designed for ${tool.userTypes.join(' and ')} in ${tool.industries.join(', ')} industries`);
    }
    if (tool.deployment.length > 0) {
      contentParts.push(`Deployment options: ${tool.deployment.join(', ')}`);
    }

    return contentParts.join(' ');
  }

  getCollectionType(): string {
    return 'usecases';
  }

  getWeightings(): Record<string, number> {
    return {
      industries: 2.0,
      userTypes: 2.0,
      deployment: 1.5
    };
  }

  getFields(): string[] {
    return ['industries', 'userTypes', 'deployment'];
  }

  validate(tool: ToolData): { valid: boolean; missingFields: string[] } {
    const requiredFields = ['industries', 'userTypes', 'deployment'];
    const missingFields = requiredFields.filter(field => {
      const value = tool[field as keyof ToolData] as string[];
      return !value || value.length === 0;
    });

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  private addWeighted(contents: string[], weight: number, parts: string[]): void {
    for (const content of contents) {
      if (content && content.trim()) {
        const repeatCount = Math.floor(weight);
        for (let i = 0; i < repeatCount; i++) {
          parts.push(content);
        }
        if (weight % 1 !== 0) {
          parts.push(content);
        }
      }
    }
  }
}

/**
 * Interface Collection Content Generator
 * Focuses on technical implementation details
 */
class InterfaceContentGenerator implements ContentGenerator {
  generate(tool: ToolData): string {
    const contentParts: string[] = [];

    this.addWeighted(tool.interface, 2.0, contentParts);
    this.addWeighted(tool.pricingModel, 1.5, contentParts);
    this.addWeighted([tool.status], 1.0, contentParts);

    // Add technical context
    if (tool.interface.length > 0) {
      contentParts.push(`Available interfaces: ${tool.interface.join(', ')}`);
    }
    if (tool.pricingModel && tool.pricingModel.length > 0) {
      contentParts.push(`Pricing model: ${tool.pricingModel.join(', ')}`);
    }
    if (tool.status) {
      contentParts.push(`Current status: ${tool.status}`);
    }

    return contentParts.join(' ');
  }

  getCollectionType(): string {
    return 'interface';
  }

  getWeightings(): Record<string, number> {
    return {
      interface: 2.0,
      pricingModel: 1.5,
      status: 1.0
    };
  }

  getFields(): string[] {
    return ['interface', 'pricingModel', 'status'];
  }

  validate(tool: ToolData): { valid: boolean; missingFields: string[] } {
    const requiredFields = ['interface', 'pricingModel', 'status'];
    const missingFields = requiredFields.filter(field => !tool[field as keyof ToolData]);

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  private addWeighted(contents: string[], weight: number, parts: string[]): void {
    for (const content of contents) {
      if (content && content.trim()) {
        const repeatCount = Math.floor(weight);
        for (let i = 0; i < repeatCount; i++) {
          parts.push(content);
        }
        if (weight % 1 !== 0) {
          parts.push(content);
        }
      }
    }
  }
}
// Tool data types aligned with backend/src/tools/schemas/tool.schema.ts
// This file ensures consistency across all search services

export interface PricingTier {
  tier: string;
  billingPeriod: string;
  price: number;
}

export enum PricingModelEnum {
  Free = 'Free',
  Freemium = 'Freemium',
  Paid = 'Paid'
}

export enum ToolStatus {
  Active = 'active',
  Beta = 'beta',
  Deprecated = 'deprecated',
  Discontinued = 'discontinued'
}

export interface ToolData {
  // MongoDB document ID
  _id: { $oid: string } | string;

  // Identity fields (required in backend)
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  tagline?: string;
  createdBy: string; // ObjectId as string

  // Flattened categorization (v2.0) - all required arrays
  categories: string[];
  industries: string[];
  userTypes: string[];

  // Pricing (exact match with backend schema)
  pricing: PricingTier[];
  pricingModel: PricingModelEnum;
  pricingUrl?: string;

  // Technical specifications - all required arrays (exact match with backend)
  interface: string[];
  functionality: string[];
  deployment: string[];

  // Metadata (exact match with backend)
  logoUrl?: string;
  website?: string;
  documentation?: string;
  status: ToolStatus;
  contributor: string;
  dateAdded: Date | string;
  lastUpdated?: Date | string;

  // MongoDB timestamps (automatically added by Mongoose)
  createdAt?: Date | string;
  updatedAt?: Date | string;

  // Allow additional fields for flexibility
  [key: string]: any;
}

// Validation utilities for ToolData
export class ToolDataValidator {
  /**
   * Validate that tool data matches backend schema requirements
   */
  static validate(toolData: Partial<ToolData>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required identity fields
    if (!toolData.id) errors.push('id is required');
    if (!toolData.name) errors.push('name is required');
    if (!toolData.slug) errors.push('slug is required');
    if (!toolData.description) errors.push('description is required');
    if (!toolData.createdBy) errors.push('createdBy is required');

    // Required categorization arrays
    if (!toolData.categories || !Array.isArray(toolData.categories) || toolData.categories.length === 0) {
      errors.push('categories must be a non-empty array');
    }
    if (!toolData.industries || !Array.isArray(toolData.industries) || toolData.industries.length === 0) {
      errors.push('industries must be a non-empty array');
    }
    if (!toolData.userTypes || !Array.isArray(toolData.userTypes) || toolData.userTypes.length === 0) {
      errors.push('userTypes must be a non-empty array');
    }

    // Required technical arrays
    if (!toolData.interface || !Array.isArray(toolData.interface) || toolData.interface.length === 0) {
      errors.push('interface must be a non-empty array');
    }
    if (!toolData.functionality || !Array.isArray(toolData.functionality) || toolData.functionality.length === 0) {
      errors.push('functionality must be a non-empty array');
    }
    if (!toolData.deployment || !Array.isArray(toolData.deployment) || toolData.deployment.length === 0) {
      errors.push('deployment must be a non-empty array');
    }

    // Required pricing
    if (!toolData.pricing || !Array.isArray(toolData.pricing) || toolData.pricing.length === 0) {
      errors.push('pricing must be a non-empty array');
    }
    if (!toolData.pricingModel) errors.push('pricingModel is required');

    // Required metadata
    if (!toolData.status) errors.push('status is required');
    if (!toolData.contributor) errors.push('contributor is required');
    if (!toolData.dateAdded) errors.push('dateAdded is required');

    // Validate pricing structure
    if (toolData.pricing) {
      for (const [index, pricing] of toolData.pricing.entries()) {
        if (!pricing.tier) errors.push(`pricing[${index}].tier is required`);
        if (!pricing.billingPeriod) errors.push(`pricing[${index}].billingPeriod is required`);
        if (typeof pricing.price !== 'number' || pricing.price < 0) {
          errors.push(`pricing[${index}].price must be a non-negative number`);
        }
      }
    }

    // Validate URLs if provided
    const urlFields = ['logoUrl', 'website', 'documentation', 'pricingUrl'];
    for (const field of urlFields) {
      const value = toolData[field as keyof ToolData] as string;
      if (value && !this.isValidUrl(value)) {
        errors.push(`${field} must be a valid URL`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if tool data has all required fields for collection processing
   */
  static hasRequiredFields(toolData: Partial<ToolData>): boolean {
    const requiredFields = [
      'id', 'name', 'slug', 'description', 'createdBy',
      'categories', 'industries', 'userTypes',
      'interface', 'functionality', 'deployment',
      'pricing', 'pricingModel', 'status', 'contributor', 'dateAdded'
    ];

    return requiredFields.every(field => {
      const value = toolData[field as keyof ToolData];
      return value !== undefined && value !== null && value !== '';
    });
  }

  /**
   * Get fields relevant for specific collections
   */
  static getFieldsForCollection(collectionName: string): string[] {
    const collectionFields: Record<string, string[]> = {
      'tools': ['name', 'description', 'longDescription', 'tagline'],
      'functionality': ['functionality', 'categories'],
      'usecases': ['industries', 'userTypes', 'deployment'],
      'interface': ['interface', 'pricingModel', 'status']
    };

    return collectionFields[collectionName] || [];
  }

  /**
   * Extract collection-specific content from tool data
   */
  static extractCollectionContent(toolData: ToolData, collectionName: string): Record<string, any> {
    const fields = this.getFieldsForCollection(collectionName);
    const content: Record<string, any> = {};

    for (const field of fields) {
      if (toolData[field as keyof ToolData] !== undefined) {
        content[field] = toolData[field as keyof ToolData];
      }
    }

    return content;
  }

  /**
   * Derive a stable tool ID for vector indexing
   */
  public generateToolId(toolData: Partial<ToolData>): string {
    // Prefer MongoDB _id if present
    const mongoId = typeof toolData._id === 'string'
      ? toolData._id
      : (toolData._id && typeof toolData._id === 'object' && (toolData._id as any).$oid) || undefined;

    let id = (mongoId || toolData.id || toolData.slug || toolData.name || '').toString().trim();

    if (!id) {
      const base = [toolData.name, toolData.slug].filter(Boolean).join('-') || 'tool';
      id = `${base}-${Date.now()}`;
    }

    // Slugify for safety in downstream systems
    id = id.toLowerCase()
      .replace(/[^a-z0-9\-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Limit length to avoid oversized IDs
    if (id.length > 128) id = id.slice(0, 128);

    return id;
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
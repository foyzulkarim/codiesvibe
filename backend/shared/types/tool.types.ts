

// Core tool interfaces shared between frontend and backend

// Enum for pricing models
export type PricingModelEnum = 'Free' | 'Freemium' | 'Paid';

export interface Pricing {
  tier: string;
  price: number;
  billingPeriod: string;
}

// Base tool interface (shared between frontend and backend)
export interface BaseTool {
  // Identity fields
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  tagline?: string;

  // Flattened categorization (v2.0)
  categories: string[];
  industries: string[];
  userTypes: string[];

  // Pricing (simplified)
  pricing: Pricing[];
  pricingModel: PricingModelEnum;
  pricingUrl?: string;

  // Legacy fields (maintained for compatibility)
  interface: string[];
  functionality: string[];
  deployment: string[];
  
  // Metadata
  logoUrl?: string;
  website?: string;
  documentation?: string;
  status: 'active' | 'beta' | 'deprecated' | 'discontinued';
  contributor: string;
  dateAdded: string;
  lastUpdated: string;
}

// Frontend-specific tool type (same as BaseTool for now)
export type AITool = BaseTool;

// Backend response type (extends base with backend-specific fields)
export interface ToolDocument extends BaseTool {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Enhanced tool interface with v2.0 relationship fields
export interface EnhancedTool extends BaseTool {
  // Enhanced entity relationships (v2.0)
  toolTypes: string[];
  domains: string[];
  capabilities: string[];

  // Search optimization fields (v2.0)
  aliases?: string[];
  synonyms?: string[];

  // Context relationships (v2.0)
  similarTo?: string[];
  alternativesFor?: string[];
  worksWith?: string[];

  // Usage patterns (v2.0)
  commonUseCases: string[];
}

// Create tool payload (for API requests)
export interface CreateToolPayload {
  // Identity fields
  name: string;
  description: string;
  longDescription?: string;
  tagline?: string;
  slug?: string; // Auto-generated if not provided

  // Flattened categorization (v2.0)
  categories: string[];
  industries: string[];
  userTypes: string[];

  // Pricing (simplified)
  pricing: Pricing[];
  pricingModel: PricingModelEnum;
  pricingUrl?: string;

  // Legacy fields (for backward compatibility)
  interface: string[];
  functionality: string[];
  deployment: string[];
  popularity?: number;
  rating?: number;
  reviewCount?: number;

  // Metadata
  logoUrl?: string;
  website?: string;
  documentation?: string;
  status?: 'active' | 'beta' | 'deprecated' | 'discontinued';

  // Enhanced entity relationships (v2.0)
  toolTypes: string[];
  domains: string[];
  capabilities: string[];

  // Search optimization fields (v2.0)
  aliases?: string[];
  synonyms?: string[];

  // Context relationships (v2.0)
  similarTo?: string[];
  alternativesFor?: string[];
  worksWith?: string[];

  // Usage patterns (v2.0)
  commonUseCases: string[];
}

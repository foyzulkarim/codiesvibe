// Core tool interfaces shared between frontend and backend

// Enum for pricing models
export type PricingModelEnum = 'free' | 'freemium' | 'paid';

// Categories structure (replaces ToolTags)
export interface Categories {
  primary: string[];
  secondary: string[];
  industries: string[];
  userTypes: string[];
}

// AI Features capabilities
export interface AIFeatures {
  codeGeneration: boolean;
  imageGeneration: boolean;
  dataAnalysis: boolean;
  voiceInteraction: boolean;
  multimodal: boolean;
  thinkingMode: boolean;
}

// Technical capabilities
export interface TechnicalFeatures {
  apiAccess: boolean;
  webHooks: boolean;
  sdkAvailable: boolean;
  offlineMode: boolean;
}

// Integration capabilities
export interface Integrations {
  platforms: string[];
  thirdParty: string[];
  protocols: string[];
}

// Complete capabilities structure
export interface Capabilities {
  core: string[];
  aiFeatures: AIFeatures;
  technical: TechnicalFeatures;
  integrations: Integrations;
}

// Pricing summary structure
export interface PricingSummary {
  lowestMonthlyPrice: number;
  highestMonthlyPrice: number;
  currency: string;
  hasFreeTier: boolean;
  hasCustomPricing: boolean;
  billingPeriods: string[];
  pricingModel: PricingModelEnum[];
}

// Pricing tier structure for detailed pricing information
export interface PricingTier {
  id: string;
  name: string;
  price: number;
  billing: string;
  features: string[];
  limitations?: string[];
  maxUsers?: number;
  isPopular?: boolean;
  sortOrder: number;
}

// Use cases structure
export interface UseCase {
  name: string;
  description: string;
  industries: string[];
  userTypes: string[];
  scenarios: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
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

  // Categorization
  categories: Categories;

  // Pricing
  pricingSummary: PricingSummary;
  pricingDetails: PricingTier[];
  pricingUrl?: string;

  // Capabilities
  capabilities: Capabilities;

  // Use cases
  useCases: UseCase[];

  // Search optimization
  searchKeywords: string[];
  semanticTags: string[];
  aliases: string[];

  // Legacy fields (maintained for compatibility)
  interface: string[];
  functionality: string[];
  deployment: string[];
  popularity: number;
  rating: number;
  reviewCount: number;

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

// Create tool payload (for API requests)
export interface CreateToolPayload {
  // Identity fields
  name: string;
  description: string;
  longDescription?: string;
  tagline?: string;
  slug?: string; // Auto-generated if not provided

  // Categorization
  categories: Categories;

  // Pricing
  pricingSummary: PricingSummary;
  pricingDetails: PricingTier[];
  pricingUrl?: string;

  // Capabilities
  capabilities: Capabilities;

  // Use cases
  useCases: UseCase[];

  // Search optimization
  searchKeywords: string[];
  semanticTags: string[];
  aliases: string[];

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
}

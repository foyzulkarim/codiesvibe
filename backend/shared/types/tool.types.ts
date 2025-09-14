// Core tool interfaces shared between frontend and backend

// Tags structure
export interface ToolTags {
  primary: string[];
  secondary: string[];
}

// Pricing tier structure for detailed pricing information
export interface PricingTier {
  price: number | string;
  billing?: string;
  features: string[];
  limitations?: string[];
  additionalCosts?: string;
  maxUsers?: number;
  customPricing?: boolean;
  [key: string]: string | number | boolean | string[] | undefined; // Allow for additional flexible properties
}

// Base tool interface (shared between frontend and backend)
export interface BaseTool {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  pricing: string[];
  interface: string[];
  functionality: string[];
  deployment: string[];
  popularity: number;
  rating: number;
  reviewCount: number;
  lastUpdated: string;
  logoUrl: string;
  features: Record<string, boolean>;
  searchKeywords: string[];
  tags: ToolTags;
  
  // Enhanced fields from data analysis
  integrations?: string[];
  languages?: string[];
  pricingDetails?: Record<string, PricingTier>;
  pros?: string[];
  cons?: string[];
  useCases?: string[];
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
  name: string;
  description: string;
  longDescription?: string;
  pricing: string[];
  interface: string[];
  functionality: string[];
  deployment: string[];
  popularity?: number;
  rating?: number;
  reviewCount?: number;
  logoUrl: string;
  features?: Record<string, boolean>;
  searchKeywords: string[];
  tags: ToolTags;
  
  // Enhanced optional fields
  integrations?: string[];
  languages?: string[];
  pricingDetails?: Record<string, PricingTier>;
  pros?: string[];
  cons?: string[];
  useCases?: string[];
}
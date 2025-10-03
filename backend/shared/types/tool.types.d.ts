export interface ToolTags {
  primary: string[];
  secondary: string[];
}
export interface PricingTier {
  price: number | string;
  billing?: string;
  features: string[];
  limitations?: string[];
  additionalCosts?: string;
  maxUsers?: number;
  customPricing?: boolean;
  [key: string]: string | number | boolean | string[] | undefined;
}
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
  integrations?: string[];
  languages?: string[];
  pricingDetails?: Record<string, PricingTier>;
  pros?: string[];
  cons?: string[];
  useCases?: string[];
}
export type AITool = BaseTool;
export interface ToolDocument extends BaseTool {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
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
  integrations?: string[];
  languages?: string[];
  pricingDetails?: Record<string, PricingTier>;
  pros?: string[];
  cons?: string[];
  useCases?: string[];
}

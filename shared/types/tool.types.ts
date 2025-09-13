// Core tool interfaces shared between frontend and backend

// Tags structure
export interface ToolTags {
  primary: string[];
  secondary: string[];
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
}

// Frontend-specific tool type (extends base with any frontend-only fields)
export interface AITool extends BaseTool {
  // Add any frontend-specific fields here if needed
}

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
}
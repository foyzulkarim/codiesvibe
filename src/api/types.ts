import { AITool } from '@/data/tools';
import { SortOption as SortOptionType } from '@/lib/config';

// Import v2.0 shared types
import { BaseTool, Categories, PricingSummary, Capabilities, UseCase, ApiResponse, PaginatedResponse } from '@shared/types';

// Re-export shared types for backward compatibility
export type { ApiResponse, PaginatedResponse } from '@shared/types';

// Tool API Types (v2.0)
// Use shared interface for consistency
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ToolResponseDto extends BaseTool {
  // Backend-specific fields (already included in BaseTool v2.0)
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Query Parameters Types - Enhanced for v2.0
export interface ToolsQueryParams {
  search?: string;
  functionality?: string;
  tags?: string;
  deployment?: string;
  pricing?: string;
  interface?: string;
  minRating?: number;
  maxRating?: number;
  sortBy?: 'popularity' | 'rating' | 'reviewCount' | 'createdAt' | 'dateAdded' | 'relevance';

  // v2.0 category filters
  primaryCategory?: string;
  secondaryCategory?: string;
  industry?: string;
  userType?: string;

  // v2.0 pricing filters
  hasFreeTier?: boolean;
  hasCustomPricing?: boolean;
  minPrice?: number;
  maxPrice?: number;
  pricingModel?: string;

  // v2.0 capability filters
  codeGeneration?: boolean;
  imageGeneration?: boolean;
  dataAnalysis?: boolean;
  voiceInteraction?: boolean;
  multimodal?: boolean;
  thinkingMode?: boolean;
  apiAccess?: boolean;
  offlineMode?: boolean;

  // v2.0 metadata filters
  status?: string;
  complexity?: string;
}

export interface FilterState {
  pricing: string[];
  interface: string[];
  functionality: string[];
  deployment: string[];

  // v2.0 category filters
  primaryCategories: string[];
  secondaryCategories: string[];
  industries: string[];
  userTypes: string[];

  // v2.0 capability filters
  aiFeatures: string[];
  technicalFeatures: string[];

  // v2.0 metadata filters
  status: string[];
  complexity: string[];
  pricingModels: string[];
}

// Hook Return Types
export interface UseToolsReturn {
  data: AITool[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export interface UseToolReturn {
  data: AITool | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// Error Types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

// Utility Types
export type SortDirection = 'asc' | 'desc';

export interface SortOptionUI {
  value: SortOptionType;
  label: string;
  direction: SortDirection;
}

// Available sort options for UI - Updated for v2.0
export const SORT_OPTIONS_UI: SortOptionUI[] = [
  { value: 'popularity', label: 'Most Popular', direction: 'desc' },
  { value: 'rating', label: 'Highest Rated', direction: 'desc' },
  { value: 'reviewCount', label: 'Most Reviewed', direction: 'desc' },
  { value: 'name', label: 'Name A-Z', direction: 'asc' },
  { value: 'createdAt', label: 'Newest', direction: 'desc' },
  { value: 'dateAdded', label: 'Recently Added', direction: 'desc' },
  { value: 'relevance', label: 'Most Relevant', direction: 'desc' }
];

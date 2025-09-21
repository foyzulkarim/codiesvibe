import { AITool } from '@/data/tools';
import { SortOption as SortOptionType } from '@/lib/config';

// Import shared types
import { BaseTool, ToolTags, ApiResponse, PaginatedResponse } from '@shared/types';

// Re-export shared types for backward compatibility
export type { ApiResponse, PaginatedResponse } from '@shared/types';

// Tool API Types
// Use shared interface for consistency
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ToolResponseDto extends BaseTool {
  // Backend-specific fields can be added here if needed
}

// Query Parameters Types
export interface ToolsQueryParams {
  search?: string;
  functionality?: string;
  tags?: string;
  deployment?: string;
  pricing?: string;
  interface?: string;
  minRating?: number;
  maxRating?: number;
  sortBy?: 'popularity' | 'rating' | 'reviewCount' | 'createdAt' | 'relevance';
}

export interface FilterState {
  pricing: string[];
  interface: string[];
  functionality: string[];
  deployment: string[];
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

// Available sort options for UI
export const SORT_OPTIONS_UI: SortOptionUI[] = [
  { value: 'popularity', label: 'Most Popular', direction: 'desc' },
  { value: 'rating', label: 'Highest Rated', direction: 'desc' },
  { value: 'reviewCount', label: 'Most Reviewed', direction: 'desc' },
  { value: 'name', label: 'Name A-Z', direction: 'asc' },
  { value: 'createdAt', label: 'Newest', direction: 'desc' },
  { value: 'relevance', label: 'Most Relevant', direction: 'desc' }
];

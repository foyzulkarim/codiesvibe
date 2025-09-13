import { AITool } from '@/data/tools';
import { SortOption as SortOptionType } from '@/lib/config';

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tool API Types
export interface ToolResponseDto {
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
  tags: {
    primary: string[];
    secondary: string[];
  };
}

// Query Parameters Types
export interface ToolsQueryParams {
  search?: string;
  functionality?: string | string[];
  tags?: string | string[];
  deployment?: string | string[];
  minRating?: number;
  maxRating?: number;
  sortBy?: SortOptionType;
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
  { value: 'popularity', label: 'Popularity', direction: 'desc' },
  { value: 'rating', label: 'Rating', direction: 'desc' },
  { value: 'reviewCount', label: 'Review Count', direction: 'desc' },
  { value: 'createdAt', label: 'Created Date', direction: 'desc' },
  { value: 'relevance', label: 'Relevance', direction: 'desc' },
];

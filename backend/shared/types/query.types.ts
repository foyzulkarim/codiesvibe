// Query and filter types shared between frontend and backend

export type SortOption = 'popularity' | 'rating' | 'reviewCount' | 'createdAt' | 'relevance';

export interface BaseQueryParams {
  search?: string;
  functionality?: string | string[];
  tags?: string | string[];
  deployment?: string | string[];
  minRating?: number;
  maxRating?: number;
  sortBy?: SortOption;
}

export interface FilterState {
  pricing: string[];
  interface: string[];
  functionality: string[];
  deployment: string[];
}

// Search filters for backend
export interface SearchFilters {
  functionality?: string[];
  tags?: string[];
  deployment?: string[];
  minRating?: number;
  maxRating?: number;
}

// Search options for backend
export interface SearchOptions {
  sortBy?: SortOption;
  limit?: number;
  skip?: number;
}

// Hook return types
export interface UseToolsReturn {
  data: any[]; // Will be typed as AITool[] in frontend
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export interface UseToolReturn {
  data: any | null; // Will be typed as AITool | null in frontend
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}
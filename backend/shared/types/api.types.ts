// API-related types shared between frontend and backend

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

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

// Utility types
export type SortDirection = "asc" | "desc";

export interface SortOptionUI {
  value: string;
  label: string;
  direction: SortDirection;
}

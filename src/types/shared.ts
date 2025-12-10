/**
 * Shared Types
 *
 * Cross-cutting types used throughout the application.
 * These are generic types not specific to any domain entity.
 */

// ============================================
// PAGINATION TYPES
// ============================================

/**
 * Standard pagination metadata
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

/**
 * API error shape
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

// ============================================
// UTILITY TYPES
// ============================================

export type SortDirection = 'asc' | 'desc';

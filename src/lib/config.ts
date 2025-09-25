// API Configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Environment detection
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// API Endpoints
export const API_ENDPOINTS = {
  tools: '/tools',
  tool: (id: string) => `/tools/${id}`,
  health: '/health',
};

// Default pagination settings
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
};

// Default sorting options
export const SORT_OPTIONS = {
  POPULARITY: 'popularity',
  RATING: 'rating',
  REVIEW_COUNT: 'reviewCount',
  NAME: 'name',
  CREATED_AT: 'createdAt',
  RELEVANCE: 'relevance',
} as const;

export type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS];

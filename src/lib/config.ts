// Environment detection
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// API Endpoints
export const API_ENDPOINTS = {
  tools: '/tools',
  tool: (id: string) => `/tools/${id}`,
  search: '/search',
  vocabularies: '/tools/vocabularies',
  myTools: '/tools/my-tools',
  adminTools: '/tools/admin',
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
  DATE_ADDED: 'dateAdded',
  RELEVANCE: 'relevance',
} as const;

export type SortOption = (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS];

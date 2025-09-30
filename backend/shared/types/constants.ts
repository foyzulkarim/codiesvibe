// Shared constants for frontend and backend

import { SortOptionUI } from './api.types';

// Filter options (shared between frontend and backend)
export const FILTER_OPTIONS = {
  pricing: ['Free', 'Freemium', 'Paid'],
  interface: ['Web', 'API', 'Mobile', 'CLI', 'IDE Extension', "IDE", "Desktop"],
  deployment: ['Cloud', 'Local'],
};

// Sort options for UI
export const SORT_OPTIONS_UI: SortOptionUI[] = [
  { value: 'popularity', label: 'Most Popular', direction: 'desc' },
  { value: 'rating', label: 'Highest Rated', direction: 'desc' },
  { value: 'reviewCount', label: 'Most Reviewed', direction: 'desc' },
  { value: 'name', label: 'Name A-Z', direction: 'asc' },
  { value: 'createdAt', label: 'Newest', direction: 'desc' },
  { value: 'relevance', label: 'Most Relevant', direction: 'desc' },
];

// Default pagination settings
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};

// API endpoints (can be used by frontend)
export const API_ENDPOINTS = {
  TOOLS: '/api/tools',
  TOOL_BY_ID: (id: string) => `/api/tools/${id}`,
};

/**
 * API Types
 *
 * Types specific to API responses and UI hooks.
 * Core types like Tool, ApiResponse are imported from @/types.
 */

import type { SortOption as SortOptionType } from '@/lib/config';
import type { AITool, BaseTool, SortDirection } from '@/types';

// Re-export shared types for backward compatibility
export type { ApiResponse, PaginatedResponse, ApiError, SortDirection } from '@/types';

// ============================================
// TOOL RESPONSE TYPES
// ============================================

/**
 * Tool response DTO from API
 */
export interface ToolResponseDto extends BaseTool {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// FILTER TYPES
// ============================================

/**
 * UI filter state for search/filtering
 */
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

// ============================================
// AI SEARCH TYPES
// ============================================

/**
 * AI search reasoning metadata
 */
export interface AiSearchReasoning {
  query: string;
  intentState: Record<string, unknown>;
  executionPlan: Record<string, unknown>;
  candidates: Record<string, unknown>[];
  executionStats: Record<string, unknown>;
  executionTime: string;
  phase: string;
  strategy: string;
  explanation: string;
}

// ============================================
// HOOK RETURN TYPES
// ============================================

export interface UseToolsReturn {
  data: AITool[];
  reasoning?: AiSearchReasoning;
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

// ============================================
// SORT UI TYPES
// ============================================

export interface SortOptionUI {
  value: SortOptionType;
  label: string;
  direction: SortDirection;
}

/**
 * Available sort options for UI
 */
export const SORT_OPTIONS_UI: SortOptionUI[] = [
  { value: 'popularity', label: 'Most Popular', direction: 'desc' },
  { value: 'rating', label: 'Highest Rated', direction: 'desc' },
  { value: 'reviewCount', label: 'Most Reviewed', direction: 'desc' },
  { value: 'name', label: 'Name A-Z', direction: 'asc' },
  { value: 'createdAt', label: 'Newest', direction: 'desc' },
  { value: 'dateAdded', label: 'Recently Added', direction: 'desc' },
  { value: 'relevance', label: 'Most Relevant', direction: 'desc' }
];

/**
 * Query Parameter Builder Utilities
 *
 * Provides consistent URL parameter construction for API requests.
 */

import type { ToolsQueryParams } from '@/hooks/api/useToolsAdmin';

/**
 * Build URLSearchParams from ToolsQueryParams
 *
 * Handles:
 * - Default values for page and limit
 * - Filtering out undefined/null/empty values
 * - Type conversion to strings
 *
 * @param params - Query parameters object
 * @returns URLSearchParams instance
 *
 * @example
 * ```ts
 * const params = buildToolsQueryParams({ page: 1, search: 'ai' });
 * fetch(`/tools?${params.toString()}`);
 * ```
 */
export function buildToolsQueryParams(params: ToolsQueryParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  const entries: Record<string, unknown> = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    status: params.status,
    category: params.category,
    industry: params.industry,
    pricingModel: params.pricingModel,
    approvalStatus: params.approvalStatus,
    contributor: params.contributor,
  };

  Object.entries(entries).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return searchParams;
}

/**
 * Build URLSearchParams from a generic object
 *
 * @param params - Key-value pairs to convert
 * @returns URLSearchParams instance
 */
export function buildQueryParams(params: Record<string, unknown>): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return searchParams;
}

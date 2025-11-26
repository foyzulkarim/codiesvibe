/**
 * Tools Domain - Filter Mapping Logic
 *
 * Domain-specific logic for mapping intent state to MongoDB filter queries.
 * This is extracted from query-planner.node.ts to keep domain logic separate.
 *
 * @module domains/tools
 */

import { TOOLS_PRICE_OPERATORS } from './tools.schema';

/**
 * Build MongoDB filters from intent state
 *
 * This function contains tools-domain-specific logic for converting
 * intent fields into MongoDB filter queries.
 *
 * @param intentState - The extracted intent from user query
 * @returns Array of MongoDB filter objects
 */
export function buildToolsFilters(intentState: any): any[] {
  const filters: any[] = [];

  // ============================================================================
  // PRICE RANGE FILTERS
  // ============================================================================
  if (intentState.priceRange) {
    const { min, max, billingPeriod } = intentState.priceRange;

    // Create base filter for pricing array
    const priceFilter: any = {
      field: 'pricing',
      operator: 'elemMatch',
      value: {},
    };

    // Add billing period filter if specified
    if (billingPeriod) {
      priceFilter.value.billingPeriod = billingPeriod;
    }

    // Add price range conditions (sanitize negative values to 0)
    const sanitizedMin = min !== null && min !== undefined ? Math.max(0, min) : null;
    const sanitizedMax = max !== null && max !== undefined ? Math.max(0, max) : null;

    if (sanitizedMin !== null && sanitizedMax !== null) {
      priceFilter.value.price = { $gte: sanitizedMin, $lte: sanitizedMax };
    } else if (sanitizedMin !== null) {
      priceFilter.value.price = { $gte: sanitizedMin };
    } else if (sanitizedMax !== null) {
      priceFilter.value.price = { $lte: sanitizedMax };
    }

    filters.push(priceFilter);
  }

  // ============================================================================
  // PRICE COMPARISON FILTERS
  // ============================================================================
  if (intentState.priceComparison) {
    const { operator, value, billingPeriod } = intentState.priceComparison;

    // Sanitize negative price values to 0
    const sanitizedValue = Math.max(0, value);

    const priceFilter: any = {
      field: 'pricing',
      operator: 'elemMatch',
      value: {},
    };

    // Add billing period filter if specified
    if (billingPeriod) {
      priceFilter.value.billingPeriod = billingPeriod;
    }

    // Add price comparison based on operator
    switch (operator) {
      case TOOLS_PRICE_OPERATORS.LESS_THAN:
        priceFilter.value.price = { $lt: sanitizedValue };
        break;
      case TOOLS_PRICE_OPERATORS.LESS_THAN_OR_EQUAL:
        priceFilter.value.price = { $lte: sanitizedValue };
        break;
      case TOOLS_PRICE_OPERATORS.GREATER_THAN:
        priceFilter.value.price = { $gt: sanitizedValue };
        break;
      case TOOLS_PRICE_OPERATORS.GREATER_THAN_OR_EQUAL:
        priceFilter.value.price = { $gte: sanitizedValue };
        break;
      case TOOLS_PRICE_OPERATORS.EQUAL:
        priceFilter.value.price = sanitizedValue;
        break;
      case TOOLS_PRICE_OPERATORS.NOT_EQUAL:
        priceFilter.value.price = { $ne: sanitizedValue };
        break;
      case TOOLS_PRICE_OPERATORS.AROUND:
        // ±10% range for "around" operator
        const rangePercent = 0.1; // 10%
        const lowerBound = sanitizedValue * (1 - rangePercent);
        const upperBound = sanitizedValue * (1 + rangePercent);
        priceFilter.value.price = {
          $gte: Math.round(lowerBound),
          $lte: Math.round(upperBound),
        };
        break;
      case TOOLS_PRICE_OPERATORS.BETWEEN:
        // BETWEEN should use priceRange instead, but handle gracefully
        priceFilter.value.price = { $gte: 0, $lte: sanitizedValue };
        break;
      default:
        // Unknown operator - use equality as fallback
        console.warn(`Unknown price comparison operator: ${operator}, using equality`);
        priceFilter.value.price = sanitizedValue;
        break;
    }

    filters.push(priceFilter);
  }

  // ============================================================================
  // CATEGORY FILTER
  // ============================================================================
  if (intentState.category || intentState.categories) {
    const categoryValue = intentState.categories || intentState.category;
    // Skip if empty array
    if (Array.isArray(categoryValue) && categoryValue.length === 0) {
      // Skip empty array
    } else {
      filters.push({
        field: 'categories.primary',
        operator: 'in',
        value: Array.isArray(categoryValue) ? categoryValue : [categoryValue],
      });
    }
  }

  // ============================================================================
  // INTERFACE FILTER
  // ============================================================================
  if (intentState.interface) {
    // Skip if empty array
    if (Array.isArray(intentState.interface) && intentState.interface.length === 0) {
      // Skip empty array
    } else {
      filters.push({
        field: 'interface',
        operator: 'in',
        value: Array.isArray(intentState.interface) ? intentState.interface : [intentState.interface],
      });
    }
  }

  // ============================================================================
  // DEPLOYMENT FILTER
  // ============================================================================
  if (intentState.deployment) {
    // Skip if empty array
    if (Array.isArray(intentState.deployment) && intentState.deployment.length === 0) {
      // Skip empty array
    } else {
      filters.push({
        field: 'deployment',
        operator: 'in',
        value: Array.isArray(intentState.deployment) ? intentState.deployment : [intentState.deployment],
      });
    }
  }

  // ============================================================================
  // FUNCTIONALITY FILTER
  // ============================================================================
  if (intentState.functionality) {
    filters.push({
      field: 'capabilities.core',
      operator: 'in',
      value: [intentState.functionality],
    });
  }

  // ============================================================================
  // PRICING MODEL FILTER
  // ============================================================================
  if (intentState.pricing) {
    filters.push({
      field: 'pricingSummary.pricingModel',
      operator: 'in',
      value: [intentState.pricing],
    });
  }

  // ============================================================================
  // PRICING MODEL FILTER (alternative field name)
  // ============================================================================
  if (intentState.pricingModel) {
    filters.push({
      field: 'pricingSummary.pricingModel',
      operator: 'in',
      value: [intentState.pricingModel],
    });
  }

  return filters;
}

/**
 * Check if intent state has any constraints that require filtering
 *
 * @param intentState - The extracted intent
 * @returns True if filters should be applied
 */
export function hasFilterConstraints(intentState: any): boolean {
  return !!(
    intentState.priceRange ||
    intentState.priceComparison ||
    intentState.category ||
    intentState.interface ||
    intentState.deployment ||
    intentState.functionality ||
    intentState.pricing ||
    intentState.pricingModel
  );
}

/**
 * Sanitize price value to ensure non-negative
 *
 * @param value - Price value to sanitize
 * @returns Sanitized price (minimum 0)
 */
export function sanitizePrice(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Math.max(0, value);
}

/**
 * Schema and Domain Handlers Test Fixtures
 *
 * Provides mock schema and domain handlers for testing the LangGraph pipeline.
 * These fixtures allow tests to run without requiring actual domain imports.
 */

import { DomainSchema } from '../../core/types/schema.types';
import { IntentState } from '../../types/intent-state';
import { QueryPlan } from '../../types/query-plan';

/**
 * Mock Tools Domain Schema
 * Simplified version for testing
 */
export const mockToolsSchema: DomainSchema = {
  name: 'tools',
  version: '1.0.0',

  vocabularies: {
    categories: ['AI', 'Development', 'Code Editor', 'IDE'],
    functionality: ['Code Generation', 'Code Completion', 'AI Assistant'],
    userTypes: ['Developers', 'Software Engineers'],
    interface: ['Web', 'CLI', 'Desktop', 'API'],
    deployment: ['Cloud', 'Local', 'Self-Hosted'],
    industries: ['Technology', 'Software Development'],
    pricingModels: ['Free', 'Paid'],
    billingPeriods: ['Monthly', 'Yearly'],
  },

  intentFields: [
    {
      name: 'primaryGoal',
      type: 'enum',
      enumValues: ['find', 'compare', 'recommend', 'explore'],
      required: true,
      description: 'Primary user goal',
    },
    {
      name: 'functionality',
      type: 'string',
      required: true,
      description: 'Functional capabilities',
    },
  ],

  vectorCollections: [
    {
      name: 'tools',
      embeddingField: 'semantic',
      dimension: 768,
      description: 'Semantic tool embeddings',
      enabled: true,
    },
    {
      name: 'functionality',
      embeddingField: 'entities.functionality',
      dimension: 768,
      description: 'Functionality embeddings',
      enabled: true,
    },
  ],

  structuredDatabase: {
    collection: 'tools',
    type: 'mongodb',
    searchFields: ['name', 'description'],
    filterableFields: ['pricingSummary', 'categories', 'functionality'],
  },
};

/**
 * Mock Domain Handlers
 * Simplified versions for testing
 */
export const mockDomainHandlers = {
  /**
   * Build MongoDB filters from intent state
   */
  buildFilters: (intentState: IntentState): any[] => {
    const filters: any[] = [];

    // Price range filters
    if (intentState.priceRange) {
      const { min, max, billingPeriod } = intentState.priceRange;
      const priceFilter: any = {
        field: 'pricing',
        operator: 'elemMatch',
        value: {},
      };

      // Add billing period if specified
      if (billingPeriod) {
        priceFilter.value.billingPeriod = billingPeriod;
      }

      // Sanitize negative values to 0
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

    // Price comparison filters
    if (intentState.priceComparison) {
      const { operator, value, billingPeriod } = intentState.priceComparison;
      const priceFilter: any = {
        field: 'pricing',
        operator: 'elemMatch',
        value: {},
      };

      // Add billing period if specified
      if (billingPeriod) {
        priceFilter.value.billingPeriod = billingPeriod;
      }

      // Sanitize negative values to 0
      const sanitizedValue = Math.max(0, value);

      if (operator === 'less_than') {
        priceFilter.value.price = { $lt: sanitizedValue };
      } else if (operator === 'greater_than') {
        priceFilter.value.price = { $gt: sanitizedValue };
      } else if (operator === 'around') {
        const margin = sanitizedValue * 0.1;
        priceFilter.value.price = {
          $gte: Math.max(0, sanitizedValue - margin),
          $lte: sanitizedValue + margin
        };
      }

      filters.push(priceFilter);
    }

    // Category filters
    if (intentState.category) {
      filters.push({
        field: 'categories',
        operator: 'in',
        value: [intentState.category],
      });
    }

    // Interface filters
    if (intentState.interface) {
      filters.push({
        field: 'interface',
        operator: 'in',
        value: [intentState.interface],
      });
    }

    // Functionality filters
    if (intentState.functionality) {
      filters.push({
        field: 'functionality',
        operator: 'in',
        value: [intentState.functionality],
      });
    }

    // Deployment filters
    if (intentState.deployment) {
      filters.push({
        field: 'deployment',
        operator: 'in',
        value: [intentState.deployment],
      });
    }

    return filters;
  },

  /**
   * Validate query plan
   */
  validateQueryPlan: (
    plan: QueryPlan,
    intentState: IntentState
  ): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!plan.strategy) {
      errors.push('Query plan missing strategy');
    }

    // Validate vector sources
    if (plan.vectorSources && plan.vectorSources.length > 0) {
      const validCollections = ['tools', 'functionality', 'usecases', 'interface'];
      plan.vectorSources.forEach((source, index) => {
        if (!validCollections.includes(source.collection)) {
          warnings.push(
            `Vector source ${index}: Unknown collection "${source.collection}"`
          );
        }

        if (source.topK && (source.topK < 1 || source.topK > 200)) {
          warnings.push(
            `Vector source ${index}: topK ${source.topK} outside recommended range (1-200)`
          );
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

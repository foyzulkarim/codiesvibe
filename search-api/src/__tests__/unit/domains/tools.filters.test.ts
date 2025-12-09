/**
 * Tools Filters - Unit Tests
 *
 * Tests the domain-specific filter building logic for MongoDB queries
 */

import { buildToolsFilters } from '../../../domains/tools/tools.filters.js';
import { TOOLS_PRICE_OPERATORS } from '../../../domains/tools/tools.schema.js';

describe('Tools Filters - Unit Tests', () => {
  describe('1. Price Range Filters', () => {
    test('1.1 Price range with both min and max - should build $gte and $lte filter', () => {
      const intentState = {
        priceRange: {
          min: 20,
          max: 100,
          billingPeriod: 'Monthly',
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].field).toBe('pricing');
      expect(filters[0].operator).toBe('elemMatch');
      expect(filters[0].value.price).toHaveProperty('$gte', 20);
      expect(filters[0].value.price).toHaveProperty('$lte', 100);
      expect(filters[0].value.billingPeriod).toBe('Monthly');
    });

    test('1.2 Price range with min only - should build $gte filter', () => {
      const intentState = {
        priceRange: {
          min: 50,
          max: null,
          billingPeriod: 'Monthly',
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price).toHaveProperty('$gte', 50);
      expect(filters[0].value.price).not.toHaveProperty('$lte');
    });

    test('1.3 Price range with max only - should build $lte filter', () => {
      const intentState = {
        priceRange: {
          min: null,
          max: 200,
          billingPeriod: 'Yearly',
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price).toHaveProperty('$lte', 200);
      expect(filters[0].value.price).not.toHaveProperty('$gte');
      expect(filters[0].value.billingPeriod).toBe('Yearly');
    });

    test('1.4 Price range without billing period - should build filter without billingPeriod', () => {
      const intentState = {
        priceRange: {
          min: 10,
          max: 50,
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price).toHaveProperty('$gte', 10);
      expect(filters[0].value.price).toHaveProperty('$lte', 50);
      expect(filters[0].value.billingPeriod).toBeUndefined();
    });
  });

  describe('2. Price Comparison Filters', () => {
    test('2.1 LESS_THAN operator - should build $lt filter', () => {
      const intentState = {
        priceComparison: {
          operator: TOOLS_PRICE_OPERATORS.LESS_THAN,
          value: 50,
          billingPeriod: 'Monthly',
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price).toHaveProperty('$lt', 50);
    });

    test('2.2 GREATER_THAN operator - should build $gt filter', () => {
      const intentState = {
        priceComparison: {
          operator: TOOLS_PRICE_OPERATORS.GREATER_THAN,
          value: 100,
          billingPeriod: 'Monthly',
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price).toHaveProperty('$gt', 100);
    });

    test('2.3 EQUAL operator - should build exact match filter', () => {
      const intentState = {
        priceComparison: {
          operator: TOOLS_PRICE_OPERATORS.EQUAL,
          value: 99,
          billingPeriod: 'Monthly',
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price).toBe(99);
    });

    test('2.4 AROUND operator - should build range filter (±10%)', () => {
      const intentState = {
        priceComparison: {
          operator: TOOLS_PRICE_OPERATORS.AROUND,
          value: 30,
          billingPeriod: 'Monthly',
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price).toHaveProperty('$gte');
      expect(filters[0].value.price).toHaveProperty('$lte');
      // Around 30 should be roughly 27-33 (±10%)
      expect(filters[0].value.price.$gte).toBeGreaterThanOrEqual(26);
      expect(filters[0].value.price.$gte).toBeLessThanOrEqual(28);
      expect(filters[0].value.price.$lte).toBeGreaterThanOrEqual(32);
      expect(filters[0].value.price.$lte).toBeLessThanOrEqual(34);
    });

    test('2.5 LESS_THAN_OR_EQUAL operator - should build $lte filter', () => {
      const intentState = {
        priceComparison: {
          operator: TOOLS_PRICE_OPERATORS.LESS_THAN_OR_EQUAL,
          value: 75,
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price).toHaveProperty('$lte', 75);
    });

    test('2.6 GREATER_THAN_OR_EQUAL operator - should build $gte filter', () => {
      const intentState = {
        priceComparison: {
          operator: TOOLS_PRICE_OPERATORS.GREATER_THAN_OR_EQUAL,
          value: 25,
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price).toHaveProperty('$gte', 25);
    });
  });

  describe('3. Category Filters', () => {
    test('3.1 Single category - should build $in filter', () => {
      const intentState = {
        category: 'AI',
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].field).toBe('categories.primary');
      expect(filters[0].operator).toBe('in');
      expect(filters[0].value).toEqual(['AI']);
    });

    test('3.2 Array of categories - should build $in filter', () => {
      const intentState = {
        categories: ['AI', 'Development', 'Productivity'],
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value).toEqual(['AI', 'Development', 'Productivity']);
    });
  });

  describe('4. Interface Filters', () => {
    test('4.1 Single interface - should build $in filter', () => {
      const intentState = {
        interface: 'CLI',
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].field).toBe('interface');
      expect(filters[0].operator).toBe('in');
      expect(filters[0].value).toEqual(['CLI']);
    });

    test('4.2 Array of interfaces - should build $in filter', () => {
      const intentState = {
        interface: ['Web', 'Desktop', 'Mobile'],
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value).toEqual(['Web', 'Desktop', 'Mobile']);
    });
  });

  describe('5. Deployment Filters', () => {
    test('5.1 Single deployment type - should build $in filter', () => {
      const intentState = {
        deployment: 'Self-Hosted',
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].field).toBe('deployment');
      expect(filters[0].operator).toBe('in');
      expect(filters[0].value).toEqual(['Self-Hosted']);
    });

    test('5.2 Array of deployment types - should build $in filter', () => {
      const intentState = {
        deployment: ['Cloud', 'Self-Hosted'],
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value).toEqual(['Cloud', 'Self-Hosted']);
    });
  });

  describe('6. Functionality Filters', () => {
    test('6.1 Single functionality - should build $in filter', () => {
      const intentState = {
        functionality: 'Code Generation',
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].field).toBe('capabilities.core');
      expect(filters[0].operator).toBe('in');
      expect(filters[0].value).toEqual(['Code Generation']);
    });
  });

  describe('7. Multiple Filters Combined', () => {
    test('7.1 Price range + category - should build both filters', () => {
      const intentState = {
        priceRange: {
          min: 10,
          max: 50,
          billingPeriod: 'Monthly',
        },
        category: 'AI',
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(2);
      expect(filters.some(f => f.field === 'pricing')).toBe(true);
      expect(filters.some(f => f.field === 'categories.primary')).toBe(true);
    });

    test('7.2 Category + interface + deployment - should build all filters', () => {
      const intentState = {
        category: 'Development',
        interface: 'CLI',
        deployment: 'Self-Hosted',
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(3);
      expect(filters.some(f => f.field === 'categories.primary')).toBe(true);
      expect(filters.some(f => f.field === 'interface')).toBe(true);
      expect(filters.some(f => f.field === 'deployment')).toBe(true);
    });

    test('7.3 Price comparison + category + interface - should build all filters', () => {
      const intentState = {
        priceComparison: {
          operator: TOOLS_PRICE_OPERATORS.LESS_THAN,
          value: 30,
          billingPeriod: 'Monthly',
        },
        category: 'Code Editor',
        interface: ['Web', 'Desktop'],
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(3);
    });
  });

  describe('8. Edge Cases', () => {
    test('8.1 Empty intent state - should return empty filters', () => {
      const intentState = {};

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(0);
    });

    test('8.2 Null values - should skip those filters', () => {
      const intentState = {
        category: null,
        interface: null,
        priceRange: null,
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(0);
    });

    test('8.3 Undefined values - should skip those filters', () => {
      const intentState = {
        category: undefined,
        interface: undefined,
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(0);
    });

    test('8.4 Negative price values - should sanitize to 0', () => {
      const intentState = {
        priceRange: {
          min: -10,
          max: 100,
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price.$gte).toBeGreaterThanOrEqual(0);
    });

    test('8.5 Very large price values - should accept them', () => {
      const intentState = {
        priceComparison: {
          operator: TOOLS_PRICE_OPERATORS.LESS_THAN,
          value: 999999,
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price.$lt).toBe(999999);
    });

    test('8.6 Zero price - should build valid filter', () => {
      const intentState = {
        priceComparison: {
          operator: TOOLS_PRICE_OPERATORS.EQUAL,
          value: 0,
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(1);
      expect(filters[0].value.price).toBe(0);
    });

    test('8.7 Empty array values - should skip filter', () => {
      const intentState = {
        categories: [],
        interface: [],
      };

      const filters = buildToolsFilters(intentState);

      expect(filters).toHaveLength(0);
    });
  });

  describe('9. Filter Structure Validation', () => {
    test('9.1 All filters should have required fields', () => {
      const intentState = {
        category: 'AI',
        interface: 'Web',
        deployment: 'Cloud',
      };

      const filters = buildToolsFilters(intentState);

      filters.forEach(filter => {
        expect(filter).toHaveProperty('field');
        expect(filter).toHaveProperty('operator');
        expect(filter).toHaveProperty('value');
        expect(typeof filter.field).toBe('string');
        expect(typeof filter.operator).toBe('string');
      });
    });

    test('9.2 Filters should be array - not object', () => {
      const intentState = {
        category: 'AI',
      };

      const filters = buildToolsFilters(intentState);

      expect(Array.isArray(filters)).toBe(true);
      expect(filters).toBeInstanceOf(Array);
    });

    test('9.3 Price filters should use elemMatch operator', () => {
      const intentState = {
        priceRange: {
          min: 10,
          max: 50,
        },
      };

      const filters = buildToolsFilters(intentState);

      expect(filters[0].operator).toBe('elemMatch');
    });

    test('9.4 Non-price filters should use "in" operator', () => {
      const intentState = {
        category: 'AI',
        interface: 'Web',
      };

      const filters = buildToolsFilters(intentState);

      filters.forEach(filter => {
        expect(filter.operator).toBe('in');
      });
    });
  });
});

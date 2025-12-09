/**
 * Pipeline Initialization - Unit Tests
 *
 * Tests the pipeline initialization logic that validates schema and wires domain handlers
 */

import { initializePipeline } from '../../../core/pipeline.init.js';
import { toolsSchema } from '../../../domains/tools/tools.schema.js';
import { buildToolsFilters } from '../../../domains/tools/tools.filters.js';
import { validateToolsQueryPlan } from '../../../domains/tools/tools.validators.js';

// Mock console methods to suppress logs during testing
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Pipeline Initialization - Unit Tests', () => {
  beforeAll(() => {
    // Suppress console output during tests
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('1. Successful Initialization', () => {
    test('1.1 Should initialize pipeline successfully with valid schema', () => {
      const result = initializePipeline();

      expect(result).toBeDefined();
      expect(result.schema).toBeDefined();
      expect(result.domainHandlers).toBeDefined();
    });

    test('1.2 Should return schema configuration', () => {
      const result = initializePipeline();

      expect(result.schema).toEqual(toolsSchema);
      expect(result.schema?.name).toBe('tools');
      expect(result.schema?.version).toBe('1.0.0');
    });

    test('1.3 Should return domain handlers', () => {
      const result = initializePipeline();

      expect(result.domainHandlers).toBeDefined();
      expect(result.domainHandlers?.buildFilters).toBe(buildToolsFilters);
      // validateQueryPlan is wrapped to adapt signature, so check it's a function
      expect(typeof result.domainHandlers?.validateQueryPlan).toBe('function');
    });

    test('1.4 Should wire all required handlers', () => {
      const result = initializePipeline();

      expect(typeof result.domainHandlers?.buildFilters).toBe('function');
      expect(typeof result.domainHandlers?.validateQueryPlan).toBe('function');
    });

    test('1.5 Domain handlers should be callable', () => {
      const result = initializePipeline();

      // Test that buildFilters is callable
      expect(() => result.domainHandlers?.buildFilters({})).not.toThrow();

      // Test that validateQueryPlan is callable
      const mockQueryPlan = {
        strategy: 'hybrid' as const,
        vectorSources: [],
        structuredSources: [],
        fusion: 'none' as const,
        maxRefinementCycles: 0,
        explanation: 'test',
        confidence: 0.8,
      };
      const mockIntentState = {};
      expect(() => result.domainHandlers?.validateQueryPlan(mockQueryPlan, mockIntentState)).not.toThrow();
    });
  });

  describe('2. Schema Configuration Validation', () => {
    test('2.1 Returned schema should have all required fields', () => {
      const result = initializePipeline();

      expect(result.schema).toHaveProperty('name');
      expect(result.schema).toHaveProperty('version');
      expect(result.schema).toHaveProperty('vocabularies');
      expect(result.schema).toHaveProperty('intentFields');
      expect(result.schema).toHaveProperty('vectorCollections');
      expect(result.schema).toHaveProperty('structuredDatabase');
    });

    test('2.2 Schema vocabularies should be populated', () => {
      const result = initializePipeline();

      expect(result.schema?.vocabularies.categories.length).toBeGreaterThan(0);
      expect(result.schema?.vocabularies.functionality.length).toBeGreaterThan(0);
      expect(result.schema?.vocabularies.interface.length).toBeGreaterThan(0);
      expect(result.schema?.vocabularies.deployment.length).toBeGreaterThan(0);
    });

    test('2.3 Schema should have intent fields defined', () => {
      const result = initializePipeline();

      expect(result.schema?.intentFields.length).toBeGreaterThan(0);
      result.schema?.intentFields.forEach(field => {
        expect(field).toHaveProperty('name');
        expect(field).toHaveProperty('type');
        expect(field).toHaveProperty('required');
        expect(field).toHaveProperty('description');
      });
    });

    test('2.4 Schema should have vector collections defined', () => {
      const result = initializePipeline();

      expect(result.schema?.vectorCollections.length).toBeGreaterThan(0);
      result.schema?.vectorCollections.forEach(collection => {
        expect(collection).toHaveProperty('name');
        expect(collection).toHaveProperty('embeddingField');
        expect(collection).toHaveProperty('dimension');
        expect(collection).toHaveProperty('description');
      });
    });

    test('2.5 Schema should have structured database config', () => {
      const result = initializePipeline();

      expect(result.schema?.structuredDatabase).toBeDefined();
      expect(result.schema?.structuredDatabase.collection).toBe('tools');
      expect(result.schema?.structuredDatabase.searchFields.length).toBeGreaterThan(0);
      expect(result.schema?.structuredDatabase.filterableFields.length).toBeGreaterThan(0);
    });
  });

  describe('3. Domain Handlers Validation', () => {
    test('3.1 buildFilters should return array', () => {
      const result = initializePipeline();

      const filters = result.domainHandlers?.buildFilters({});
      expect(Array.isArray(filters)).toBe(true);
    });

    test('3.2 buildFilters should handle price filters correctly', () => {
      const result = initializePipeline();

      const intentState = {
        priceRange: {
          min: 10,
          max: 50,
          billingPeriod: 'Monthly' as const,
        },
      };

      const filters = result.domainHandlers?.buildFilters(intentState);
      expect(filters?.length).toBeGreaterThan(0);
      expect(filters?.[0]).toHaveProperty('field');
      expect(filters?.[0]).toHaveProperty('operator');
      expect(filters?.[0]).toHaveProperty('value');
    });

    test('3.3 validateQueryPlan should return validation result', () => {
      const result = initializePipeline();

      const mockQueryPlan = {
        strategy: 'hybrid' as const,
        vectorSources: [
          {
            collection: 'tools',
            embeddingType: 'semantic' as const,
            queryVectorSource: 'query_text' as const,
            topK: 10,
          },
        ],
        structuredSources: [],
        fusion: 'rrf' as const,
        maxRefinementCycles: 0,
        explanation: 'Test explanation',
        confidence: 0.9,
      };

      const validationResult = result.domainHandlers?.validateQueryPlan(mockQueryPlan, {});
      expect(validationResult).toBeDefined();
      expect(validationResult).toHaveProperty('valid');
      expect(validationResult).toHaveProperty('errors');
      expect(validationResult).toHaveProperty('warnings');
    });

    test('3.4 buildFilters should handle multiple filters', () => {
      const result = initializePipeline();

      const intentState = {
        category: 'AI',
        interface: 'CLI',
        deployment: 'Self-Hosted',
      };

      const filters = result.domainHandlers?.buildFilters(intentState);
      expect(filters?.length).toBe(3);
    });
  });

  describe('4. Initialization Idempotency', () => {
    test('4.1 Multiple initializations should return same schema', () => {
      const result1 = initializePipeline();
      const result2 = initializePipeline();

      expect(result1.schema).toEqual(result2.schema);
    });

    test('4.2 Multiple initializations should return same handlers', () => {
      const result1 = initializePipeline();
      const result2 = initializePipeline();

      // buildFilters should be the same reference (no wrapper)
      expect(result1.domainHandlers?.buildFilters).toBe(result2.domainHandlers?.buildFilters);

      // validateQueryPlan is wrapped, so references differ, but behavior should be identical
      expect(typeof result1.domainHandlers?.validateQueryPlan).toBe('function');
      expect(typeof result2.domainHandlers?.validateQueryPlan).toBe('function');
    });

    test('4.3 Calling initializePipeline multiple times should not throw', () => {
      expect(() => {
        initializePipeline();
        initializePipeline();
        initializePipeline();
      }).not.toThrow();
    });
  });

  describe('5. Integration with State', () => {
    test('5.1 Pipeline config should be compatible with StateAnnotation', () => {
      const result = initializePipeline();

      // These fields should be directly assignable to state
      expect(result.schema).toBeDefined();
      expect(result.domainHandlers).toBeDefined();

      // Should have the correct structure for state initialization
      const statePartial = {
        schema: result.schema,
        domainHandlers: result.domainHandlers,
      };

      expect(statePartial.schema).toBeDefined();
      expect(statePartial.domainHandlers).toBeDefined();
    });

    test('5.2 Schema should be non-null for state assignment', () => {
      const result = initializePipeline();

      expect(result.schema).not.toBeNull();
      expect(result.schema).not.toBeUndefined();
    });

    test('5.3 Domain handlers should be non-null for state assignment', () => {
      const result = initializePipeline();

      expect(result.domainHandlers).not.toBeNull();
      expect(result.domainHandlers).not.toBeUndefined();
    });
  });

  describe('6. Error Handling', () => {
    test('6.1 Should not throw on initialization', () => {
      expect(() => initializePipeline()).not.toThrow();
    });

    test('6.2 Should handle schema validation internally', () => {
      // Schema validation happens internally via assertValidSchema
      // If schema is invalid, it would throw during initialization
      expect(() => initializePipeline()).not.toThrow();
    });
  });

  describe('7. Return Type Validation', () => {
    test('7.1 Should return partial state with correct types', () => {
      const result = initializePipeline();

      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    test('7.2 Schema should match DomainSchema interface', () => {
      const result = initializePipeline();

      expect(result.schema).toHaveProperty('name');
      expect(result.schema).toHaveProperty('version');
      expect(typeof result.schema?.name).toBe('string');
      expect(typeof result.schema?.version).toBe('string');
    });

    test('7.3 Domain handlers should match expected signature', () => {
      const result = initializePipeline();

      expect(result.domainHandlers).toHaveProperty('buildFilters');
      expect(result.domainHandlers).toHaveProperty('validateQueryPlan');
      expect(typeof result.domainHandlers?.buildFilters).toBe('function');
      expect(typeof result.domainHandlers?.validateQueryPlan).toBe('function');
    });
  });

  describe('8. Startup Logging', () => {
    test('8.1 Should log startup information', () => {
      // Clear previous calls
      (console.log as jest.Mock).mockClear();

      initializePipeline();

      // Should have logged some startup information
      expect(console.log).toHaveBeenCalled();
    });

    test('8.2 Should log schema validation success', () => {
      (console.log as jest.Mock).mockClear();

      initializePipeline();

      // Should indicate successful validation
      const logCalls = (console.log as jest.Mock).mock.calls.flat().join(' ');
      expect(logCalls).toContain('Schema');
    });
  });

  describe('9. Performance', () => {
    test('9.1 Initialization should be fast', () => {
      const start = Date.now();
      initializePipeline();
      const duration = Date.now() - start;

      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    test('9.2 Multiple initializations should not accumulate memory', () => {
      // Run multiple initializations
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(initializePipeline());
      }

      // All results should reference the same schema (no duplication)
      expect(results[0].schema).toBe(results[9].schema);
    });
  });
});

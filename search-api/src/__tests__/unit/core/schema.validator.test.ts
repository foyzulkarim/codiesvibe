/**
 * Schema Validator - Unit Tests
 *
 * Tests the schema validation logic that runs at pipeline startup
 */

import { validateSchema, assertValidSchema } from '../../../core/validators/schema.validator';
import { DomainSchema } from '../../../core/types/schema.types';
import { toolsSchema } from '../../../domains/tools/tools.schema';

describe('Schema Validator - Unit Tests', () => {
  describe('1. Valid Schema Tests', () => {
    test('1.1 Valid tools schema - should pass validation', () => {
      const result = validateSchema(toolsSchema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('1.2 assertValidSchema with valid schema - should not throw', () => {
      expect(() => assertValidSchema(toolsSchema)).not.toThrow();
    });

    test('1.3 Minimal valid schema - should pass', () => {
      const minimalSchema: DomainSchema = {
        name: 'test',
        version: '1.0.0',
        vocabularies: {
          categories: ['Test'],
          functionality: ['Test'],
          userTypes: ['Users'],
          interface: ['Web'],
          deployment: ['Cloud'],
          industries: ['Tech'],
          pricingModels: ['Free'],
          billingPeriods: ['Monthly'],
        },
        intentFields: [
          {
            name: 'primaryGoal',
            type: 'string',
            required: true,
            description: 'User goal',
          },
        ],
        vectorCollections: [
          {
            name: 'test',
            embeddingField: 'semantic',
            dimension: 1536,
            description: 'Test collection',
            enabled: true,
          },
        ],
        structuredDatabase: {
          collection: 'test',
          searchFields: ['name'],
          filterableFields: ['category'],
          type: 'mongodb',
        },
      };

      const result = validateSchema(minimalSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('2. Invalid Metadata Tests', () => {
    test('2.1 Missing name - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        name: '',
      };

      const result = validateSchema(invalidSchema as DomainSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    test('2.2 Missing version - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        version: '',
      };

      const result = validateSchema(invalidSchema as DomainSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });

    test('2.3 Invalid version format - should produce warning', () => {
      const invalidSchema = {
        ...toolsSchema,
        version: 'invalid',
      };

      const result = validateSchema(invalidSchema as DomainSchema);
      expect(result.valid).toBe(true); // Still valid, just warns
      expect(result.warnings.some(w => w.includes('version'))).toBe(true);
    });
  });

  describe('3. Invalid Vocabularies Tests', () => {
    test('3.1 Empty categories - should produce warning', () => {
      const invalidSchema = {
        ...toolsSchema,
        vocabularies: {
          ...toolsSchema.vocabularies,
          categories: [],
        },
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(true); // Still valid, just warns
      expect(result.warnings.some(w => w.includes('categories'))).toBe(true);
    });

    test('3.2 Empty functionality - should produce warning', () => {
      const invalidSchema = {
        ...toolsSchema,
        vocabularies: {
          ...toolsSchema.vocabularies,
          functionality: [],
        },
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(true); // Still valid, just warns
      expect(result.warnings.some(w => w.includes('functionality'))).toBe(true);
    });

    test('3.3 Missing required vocabulary field - should fail', () => {
      const invalidSchema = {
        ...toolsSchema,
        vocabularies: {
          ...toolsSchema.vocabularies,
          interface: undefined as any,
        },
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('4. Invalid Intent Fields Tests', () => {
    test('4.1 Empty intent fields array - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        intentFields: [],
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('intent field'))).toBe(true);
    });

    test('4.2 Intent field missing name - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        intentFields: [
          {
            name: '',
            type: 'string' as const,
            required: true,
            description: 'Test',
          },
        ],
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
    });

    test('4.3 Intent field with invalid type - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        intentFields: [
          {
            name: 'test',
            type: 'invalid' as any,
            required: true,
            description: 'Test',
          },
        ],
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
    });

    test('4.4 Enum field without enumValues - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        intentFields: [
          {
            name: 'test',
            type: 'enum' as const,
            required: true,
            description: 'Test',
            // Missing enumValues
          },
        ],
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
    });

    test('4.5 Enum field with empty enumValues - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        intentFields: [
          {
            name: 'test',
            type: 'enum' as const,
            enumValues: [],
            required: true,
            description: 'Test',
          },
        ],
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('5. Invalid Vector Collections Tests', () => {
    test('5.1 Empty vector collections array - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        vectorCollections: [],
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('vector collection'))).toBe(true);
    });

    test('5.2 Collection missing name - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        vectorCollections: [
          {
            name: '',
            embeddingField: 'semantic',
            dimension: 1536,
            description: 'Test',
          },
        ],
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
    });

    test('5.3 Collection with invalid dimension - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        vectorCollections: [
          {
            name: 'test',
            embeddingField: 'semantic',
            dimension: -1, // Invalid negative dimension
            description: 'Test',
          },
        ],
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
    });

    test('5.4 Collection missing embeddingField - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        vectorCollections: [
          {
            name: 'test',
            embeddingField: '',
            dimension: 1536,
            description: 'Test',
          },
        ],
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('6. Invalid Structured Database Tests', () => {
    test('6.1 Missing collection name - should fail validation', () => {
      const invalidSchema = {
        ...toolsSchema,
        structuredDatabase: {
          collection: '',
          searchFields: ['name'],
          filterableFields: ['category'],
        },
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
    });

    test('6.2 Empty searchFields array - should produce warning', () => {
      const invalidSchema = {
        ...toolsSchema,
        structuredDatabase: {
          collection: 'test',
          searchFields: [],
          filterableFields: ['category'],
        },
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(true); // Still valid, just warns
      expect(result.warnings.some(w => w.includes('searchFields'))).toBe(true);
    });

    test('6.3 Empty filterableFields array - should produce warning', () => {
      const invalidSchema = {
        ...toolsSchema,
        structuredDatabase: {
          collection: 'test',
          searchFields: ['name'],
          filterableFields: [],
        },
      };

      const result = validateSchema(invalidSchema);
      expect(result.valid).toBe(true); // Still valid, just warns
      expect(result.warnings.some(w => w.includes('filterableFields'))).toBe(true);
    });
  });

  describe('7. assertValidSchema Error Throwing', () => {
    test('7.1 Should throw error with validation details', () => {
      const invalidSchema = {
        ...toolsSchema,
        name: '',
        version: '',
      };

      expect(() => assertValidSchema(invalidSchema as DomainSchema)).toThrow();
      expect(() => assertValidSchema(invalidSchema as DomainSchema)).toThrow(/Schema validation failed/);
    });

    test('7.2 Should include all validation errors in thrown error', () => {
      const invalidSchema = {
        ...toolsSchema,
        name: '',
        intentFields: [],
        vectorCollections: [],
      };

      try {
        assertValidSchema(invalidSchema as DomainSchema);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('name');
        expect(error.message).toContain('intent field'); // Actual error message
        expect(error.message).toContain('vector collection'); // Actual error message
      }
    });
  });

  describe('8. Edge Cases', () => {
    test('8.1 Schema with metadata but missing required fields - should fail', () => {
      const invalidSchema = {
        name: 'test',
        version: '1.0.0',
        vocabularies: toolsSchema.vocabularies,
        // Missing intentFields, vectorCollections, structuredDatabase
      };

      const result = validateSchema(invalidSchema as any);
      expect(result.valid).toBe(false);
    });

    test('8.2 Schema with null values - should fail', () => {
      const invalidSchema = {
        ...toolsSchema,
        intentFields: null,
      };

      const result = validateSchema(invalidSchema as any);
      expect(result.valid).toBe(false);
    });

    test('8.3 Schema with undefined values - should fail', () => {
      const invalidSchema = {
        ...toolsSchema,
        vectorCollections: undefined,
      };

      const result = validateSchema(invalidSchema as any);
      expect(result.valid).toBe(false);
    });
  });
});

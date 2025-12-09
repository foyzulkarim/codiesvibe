/**
 * Prompt Generator - Unit Tests
 *
 * Tests the dynamic prompt generation from schema definitions
 */

import { generateIntentExtractionPrompt, generateQueryPlanningPrompt } from '../../../core/prompts/prompt.generator.js';
import { toolsSchema } from '../../../domains/tools/tools.schema.js';
import { DomainSchema } from '../../../core/types/schema.types.js';

describe('Prompt Generator - Unit Tests', () => {
  describe('1. Intent Extraction Prompt Generation', () => {
    test('1.1 Should generate valid intent extraction prompt from tools schema', () => {
      const prompt = generateIntentExtractionPrompt(toolsSchema);

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    test('1.2 Should include domain name in prompt', () => {
      const prompt = generateIntentExtractionPrompt(toolsSchema);

      expect(prompt).toContain('tools');
    });

    test('1.3 Should include all vocabulary categories in prompt', () => {
      const prompt = generateIntentExtractionPrompt(toolsSchema);

      // Check that vocabulary fields are mentioned in the prompt
      expect(prompt).toContain('category');
      expect(prompt).toContain('functionality');
      expect(prompt).toContain('interface');
      expect(prompt).toContain('deployment');
    });

    test('1.4 Should include vocabulary values in prompt', () => {
      const prompt = generateIntentExtractionPrompt(toolsSchema);

      // Check for sample values from each vocabulary
      expect(prompt).toContain('AI');
      expect(prompt).toContain('Code Generation');
      expect(prompt).toContain('CLI');
      expect(prompt).toContain('Cloud');
    });

    test('1.5 Should include intent field definitions in prompt', () => {
      const prompt = generateIntentExtractionPrompt(toolsSchema);

      // Check for key intent fields
      expect(prompt).toContain('primaryGoal');
      expect(prompt).toContain('referenceTool');
      expect(prompt).toContain('priceRange');
    });

    test('1.6 Should include JSON structure guidance', () => {
      const prompt = generateIntentExtractionPrompt(toolsSchema);

      expect(prompt).toContain('JSON');
      expect(prompt).toContain('structure');
    });

    test('1.7 Should work with minimal schema', () => {
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
            name: 'goal',
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
          },
        ],
        structuredDatabase: {
          collection: 'test',
          searchFields: ['name'],
          filterableFields: ['category'],
        },
      };

      const prompt = generateIntentExtractionPrompt(minimalSchema);

      expect(prompt).toBeDefined();
      // Check that vocabulary value "Test" is included (case-sensitive)
      expect(prompt).toContain('Test');
      expect(prompt).toContain('goal');
    });

    test('1.8 Should handle enum fields correctly', () => {
      const schemaWithEnum: DomainSchema = {
        ...toolsSchema,
        intentFields: [
          {
            name: 'status',
            type: 'enum',
            enumValues: ['active', 'inactive', 'pending'],
            required: true,
            description: 'Status field',
          },
        ],
      };

      const prompt = generateIntentExtractionPrompt(schemaWithEnum);

      expect(prompt).toContain('status');
      expect(prompt).toContain('active');
      expect(prompt).toContain('inactive');
      expect(prompt).toContain('pending');
    });

    test('1.9 Should handle nested object fields', () => {
      const prompt = generateIntentExtractionPrompt(toolsSchema);

      // priceRange is a nested object in tools schema
      expect(prompt).toContain('priceRange');
      expect(prompt).toContain('min');
      expect(prompt).toContain('max');
    });
  });

  describe('2. Query Planning Prompt Generation', () => {
    test('2.1 Should generate valid query planning prompt from tools schema', () => {
      const enabledCollections = toolsSchema.vectorCollections.filter(c => c.enabled !== false).map(c => c.name);
      const prompt = generateQueryPlanningPrompt(toolsSchema, enabledCollections);

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    test('2.2 Should include domain name in prompt', () => {
      const enabledCollections = toolsSchema.vectorCollections.filter(c => c.enabled !== false).map(c => c.name);
      const prompt = generateQueryPlanningPrompt(toolsSchema, enabledCollections);

      expect(prompt).toContain('tools');
    });

    test('2.3 Should include enabled vector collections', () => {
      const enabledCollections = toolsSchema.vectorCollections.filter(c => c.enabled !== false).map(c => c.name);
      const prompt = generateQueryPlanningPrompt(toolsSchema, enabledCollections);

      // Check that enabled collections are mentioned
      enabledCollections.forEach(collection => {
        expect(prompt).toContain(collection);
      });
    });

    test('2.4 Should include collection descriptions', () => {
      const enabledCollectionObjects = toolsSchema.vectorCollections.filter(c => c.enabled !== false);
      const enabledCollections = enabledCollectionObjects.map(c => c.name);
      const prompt = generateQueryPlanningPrompt(toolsSchema, enabledCollections);

      // Should include descriptions for enabled collections
      enabledCollectionObjects.slice(0, 3).forEach(collection => {
        if (collection.description) {
          expect(prompt).toContain(collection.description);
        }
      });
    });

    test('2.5 Should include strategy guidance', () => {
      const enabledCollections = toolsSchema.vectorCollections.filter(c => c.enabled !== false).map(c => c.name);
      const prompt = generateQueryPlanningPrompt(toolsSchema, enabledCollections);

      expect(prompt).toContain('strategy');
    });

    test('2.6 Should work with single collection', () => {
      const singleCollection = [toolsSchema.vectorCollections[0].name];
      const prompt = generateQueryPlanningPrompt(toolsSchema, singleCollection);

      expect(prompt).toBeDefined();
      expect(prompt).toContain(singleCollection[0]);
    });

    test('2.7 Should work with empty collections array', () => {
      const prompt = generateQueryPlanningPrompt(toolsSchema, []);

      expect(prompt).toBeDefined();
      // Should still generate a valid prompt even without collections
      expect(prompt.length).toBeGreaterThan(50);
    });

    test('2.8 Should include structured database information', () => {
      const enabledCollections = toolsSchema.vectorCollections.filter(c => c.enabled !== false).map(c => c.name);
      const prompt = generateQueryPlanningPrompt(toolsSchema, enabledCollections);

      expect(prompt).toContain(toolsSchema.structuredDatabase.collection);
    });
  });

  describe('3. Prompt Content Validation', () => {
    test('3.1 Intent prompt should not have placeholder remnants', () => {
      const prompt = generateIntentExtractionPrompt(toolsSchema);

      // Should not contain unreplaced template placeholders
      expect(prompt).not.toContain('{{');
      expect(prompt).not.toContain('}}');
    });

    test('3.2 Query planning prompt should not have placeholder remnants', () => {
      const enabledCollections = toolsSchema.vectorCollections.filter(c => c.enabled !== false).map(c => c.name);
      const prompt = generateQueryPlanningPrompt(toolsSchema, enabledCollections);

      expect(prompt).not.toContain('{{');
      expect(prompt).not.toContain('}}');
    });

    test('3.3 Intent prompt should be well-formatted', () => {
      const prompt = generateIntentExtractionPrompt(toolsSchema);

      // Should have proper structure
      expect(prompt.split('\n').length).toBeGreaterThan(10);
      // Should not have excessive blank lines
      expect(prompt).not.toMatch(/\n\n\n\n/);
    });

    test('3.4 Query planning prompt should be well-formatted', () => {
      const enabledCollections = toolsSchema.vectorCollections.filter(c => c.enabled !== false).map(c => c.name);
      const prompt = generateQueryPlanningPrompt(toolsSchema, enabledCollections);

      expect(prompt.split('\n').length).toBeGreaterThan(10);
      expect(prompt).not.toMatch(/\n\n\n\n/);
    });
  });

  describe('4. Edge Cases', () => {
    test('4.1 Should handle schema with special characters in vocabularies', () => {
      const schemaWithSpecialChars: DomainSchema = {
        ...toolsSchema,
        vocabularies: {
          ...toolsSchema.vocabularies,
          categories: ['AI & ML', 'C++', 'Node.js'],
        },
      };

      const prompt = generateIntentExtractionPrompt(schemaWithSpecialChars);

      expect(prompt).toContain('AI & ML');
      expect(prompt).toContain('C++');
      expect(prompt).toContain('Node.js');
    });

    test('4.2 Should handle long vocabulary lists', () => {
      const schemaWithLongList: DomainSchema = {
        ...toolsSchema,
        vocabularies: {
          ...toolsSchema.vocabularies,
          categories: Array.from({ length: 50 }, (_, i) => `Category${i}`),
        },
      };

      const prompt = generateIntentExtractionPrompt(schemaWithLongList);

      expect(prompt).toBeDefined();
      expect(prompt).toContain('Category0');
      expect(prompt).toContain('Category49');
    });

    test('4.3 Should handle schema with Unicode characters', () => {
      const schemaWithUnicode: DomainSchema = {
        ...toolsSchema,
        vocabularies: {
          ...toolsSchema.vocabularies,
          categories: ['機械学習', 'Développement', 'Разработка'],
        },
      };

      const prompt = generateIntentExtractionPrompt(schemaWithUnicode);

      expect(prompt).toContain('機械学習');
      expect(prompt).toContain('Développement');
      expect(prompt).toContain('Разработка');
    });

    test('4.4 Should handle array type intent fields', () => {
      const schemaWithArray: DomainSchema = {
        ...toolsSchema,
        intentFields: [
          ...toolsSchema.intentFields,
          {
            name: 'tags',
            type: 'array',
            required: false,
            description: 'Array of tags',
          },
        ],
      };

      const prompt = generateIntentExtractionPrompt(schemaWithArray);

      expect(prompt).toContain('tags');
      expect(prompt).toContain('string[]');
    });

    test('4.5 Should handle deeply nested object fields', () => {
      const schemaWithNested: DomainSchema = {
        ...toolsSchema,
        intentFields: [
          {
            name: 'nested',
            type: 'object',
            required: false,
            description: 'Nested object',
            children: [
              {
                name: 'level1',
                type: 'object',
                required: false,
                description: 'Level 1',
                children: [
                  {
                    name: 'level2',
                    type: 'string',
                    required: false,
                    description: 'Level 2',
                  },
                ],
              },
            ],
          },
        ],
      };

      const prompt = generateIntentExtractionPrompt(schemaWithNested);

      expect(prompt).toContain('nested');
      expect(prompt).toContain('level1');
    });
  });

  describe('5. Consistency Tests', () => {
    test('5.1 Generating same prompt twice should be identical', () => {
      const prompt1 = generateIntentExtractionPrompt(toolsSchema);
      const prompt2 = generateIntentExtractionPrompt(toolsSchema);

      expect(prompt1).toBe(prompt2);
    });

    test('5.2 Query planning prompts should be consistent', () => {
      const enabledCollections = toolsSchema.vectorCollections.filter(c => c.enabled !== false).map(c => c.name);
      const prompt1 = generateQueryPlanningPrompt(toolsSchema, enabledCollections);
      const prompt2 = generateQueryPlanningPrompt(toolsSchema, enabledCollections);

      expect(prompt1).toBe(prompt2);
    });

    test('5.3 Different schemas should generate different prompts', () => {
      const schema1: DomainSchema = {
        ...toolsSchema,
        vocabularies: {
          ...toolsSchema.vocabularies,
          categories: ['Category1'],
        },
      };

      const schema2: DomainSchema = {
        ...toolsSchema,
        vocabularies: {
          ...toolsSchema.vocabularies,
          categories: ['Category2'],
        },
      };

      const prompt1 = generateIntentExtractionPrompt(schema1);
      const prompt2 = generateIntentExtractionPrompt(schema2);

      expect(prompt1).not.toBe(prompt2);
    });
  });
});

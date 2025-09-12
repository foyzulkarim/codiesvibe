import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateToolDto } from '../../src/tools/dto/create-tool.dto';
import { UpdateToolDto } from '../../src/tools/dto/update-tool.dto';

describe('Complex Object Validation', () => {
  describe('Features Object Validation', () => {
    it('should pass validation with valid boolean features', async () => {
      const validFeatures = {
        apiAccess: true,
        freeTier: false,
        multiLanguage: true,
        codeExecution: false,
        analytics: true,
        customFeature: false
      };

      const validTool = {
        name: 'Features Test Tool',
        description: 'Tool for testing features validation',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        features: validFeatures,
        searchKeywords: ['features'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, validTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.features).toEqual(validFeatures);
    });

    it('should transform non-boolean values to boolean in features', async () => {
      const mixedFeatures = {
        apiAccess: true,
        freeTier: 'false', // String
        multiLanguage: 1, // Number
        codeExecution: 0, // Number
        analytics: null, // Null
        customFeature: undefined, // Undefined
        anotherFeature: 'true' // String
      };

      const validTool = {
        name: 'Transform Test Tool',
        description: 'Tool for testing features transformation',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        features: mixedFeatures,
        searchKeywords: ['transform'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, validTool);
      
      // Check transformations
      expect(dto.features.apiAccess).toBe(true);
      expect(dto.features.freeTier).toBe(true); // 'false' is truthy
      expect(dto.features.multiLanguage).toBe(true); // 1 is truthy
      expect(dto.features.codeExecution).toBe(false); // 0 is falsy
      expect(dto.features.analytics).toBe(false); // null is falsy
      expect(dto.features.customFeature).toBe(false); // undefined is falsy
      expect(dto.features.anotherFeature).toBe(true); // 'true' is truthy

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle empty features object', async () => {
      const validTool = {
        name: 'Empty Features Tool',
        description: 'Tool with empty features',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        features: {}, // Empty object should be valid
        searchKeywords: ['empty'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, validTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.features).toEqual({});
    });

    it('should apply default empty object when features is undefined', async () => {
      const validTool = {
        name: 'Default Features Tool',
        description: 'Tool with default features',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        // features is undefined
        searchKeywords: ['default'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, validTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.features).toEqual({});
    });

    it('should fail validation with non-object features', async () => {
      const invalidTools = [
        {
          name: 'Invalid Features Array',
          description: 'Tool with array features',
          features: ['not', 'an', 'object'] // Array instead of object
        },
        {
          name: 'Invalid Features String',
          description: 'Tool with string features',
          features: 'not an object' // String instead of object
        },
        {
          name: 'Invalid Features Number',
          description: 'Tool with number features',
          features: 123 // Number instead of object
        }
      ];

      for (const invalidToolData of invalidTools) {
        const invalidTool = {
          ...invalidToolData,
          pricing: ['Free'],
          interface: ['Web'],
          functionality: ['Text Generation'],
          deployment: ['Cloud'],
          logoUrl: 'https://example.com/logo.png',
          searchKeywords: ['invalid'],
          tags: {
            primary: ['AI'],
            secondary: []
          }
        };

        const dto = plainToClass(CreateToolDto, invalidTool);
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const featuresError = errors.find(error => error.property === 'features');
        expect(featuresError?.constraints).toHaveProperty('isObject');
      }
    });
  });

  describe('Tags Object Validation', () => {
    it('should pass validation with valid tags structure', async () => {
      const validTagsCombinations = [
        {
          primary: ['AI'],
          secondary: []
        },
        {
          primary: ['AI', 'Productivity'],
          secondary: ['Development']
        },
        {
          primary: ['Category'],
          secondary: ['Sub1', 'Sub2', 'Sub3']
        },
        {
          primary: ['Single'],
          secondary: ['Multiple', 'Secondary', 'Tags', 'Here']
        }
      ];

      for (const tags of validTagsCombinations) {
        const validTool = {
          name: 'Tags Test Tool',
          description: 'Tool for testing tags validation',
          pricing: ['Free'],
          interface: ['Web'],
          functionality: ['Text Generation'],
          deployment: ['Cloud'],
          logoUrl: 'https://example.com/logo.png',
          searchKeywords: ['tags'],
          tags
        };

        const dto = plainToClass(CreateToolDto, validTool);
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
        expect(dto.tags).toEqual(tags);
      }
    });

    it('should fail validation with empty primary tags', async () => {
      const invalidTags = {
        primary: [], // Empty primary array should fail
        secondary: ['Development']
      };

      const invalidTool = {
        name: 'Invalid Tags Tool',
        description: 'Tool with invalid tags',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['invalid'],
        tags: invalidTags
      };

      const dto = plainToClass(CreateToolDto, invalidTool);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const tagsError = errors.find(error => error.property === 'tags');
      expect(tagsError?.constraints).toBeDefined();
    });

    it('should fail validation with missing required tag properties', async () => {
      const invalidTagsStructures = [
        {
          primary: ['AI']
          // Missing secondary property
        },
        {
          secondary: ['Development']
          // Missing primary property
        },
        {
          // Missing both properties
        }
      ];

      for (const invalidTags of invalidTagsStructures) {
        const invalidTool = {
          name: 'Invalid Structure Tool',
          description: 'Tool with invalid tags structure',
          pricing: ['Free'],
          interface: ['Web'],
          functionality: ['Text Generation'],
          deployment: ['Cloud'],
          logoUrl: 'https://example.com/logo.png',
          searchKeywords: ['invalid'],
          tags: invalidTags
        };

        const dto = plainToClass(CreateToolDto, invalidTool);
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should fail validation with non-array tag values', async () => {
      const invalidTagsStructures = [
        {
          primary: 'not an array', // String instead of array
          secondary: []
        },
        {
          primary: ['AI'],
          secondary: 'not an array' // String instead of array
        },
        {
          primary: 123, // Number instead of array
          secondary: []
        },
        {
          primary: ['AI'],
          secondary: { invalid: 'object' } // Object instead of array
        }
      ];

      for (const invalidTags of invalidTagsStructures) {
        const invalidTool = {
          name: 'Non-Array Tags Tool',
          description: 'Tool with non-array tag values',
          pricing: ['Free'],
          interface: ['Web'],
          functionality: ['Text Generation'],
          deployment: ['Cloud'],
          logoUrl: 'https://example.com/logo.png',
          searchKeywords: ['invalid'],
          tags: invalidTags
        };

        const dto = plainToClass(CreateToolDto, invalidTool);
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should fail validation with non-string elements in tag arrays', async () => {
      const invalidTagsStructures = [
        {
          primary: ['AI', 123], // Number in primary array
          secondary: []
        },
        {
          primary: ['AI'],
          secondary: ['Valid', null] // Null in secondary array
        },
        {
          primary: ['AI', true], // Boolean in primary array
          secondary: []
        },
        {
          primary: ['AI'],
          secondary: ['Valid', undefined] // Undefined in secondary array
        }
      ];

      for (const invalidTags of invalidTagsStructures) {
        const invalidTool = {
          name: 'Non-String Elements Tool',
          description: 'Tool with non-string tag elements',
          pricing: ['Free'],
          interface: ['Web'],
          functionality: ['Text Generation'],
          deployment: ['Cloud'],
          logoUrl: 'https://example.com/logo.png',
          searchKeywords: ['invalid'],
          tags: invalidTags
        };

        const dto = plainToClass(CreateToolDto, invalidTool);
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Complex Object Validation in UpdateToolDto', () => {
    it('should allow partial features updates', async () => {
      const partialUpdates = [
        {
          features: {
            apiAccess: true
            // Only updating one feature
          }
        },
        {
          features: {
            apiAccess: false,
            freeTier: true,
            newFeature: true
          }
        },
        {
          features: {} // Empty features update
        }
      ];

      for (const update of partialUpdates) {
        const dto = plainToClass(UpdateToolDto, update);
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should allow partial tags updates', async () => {
      const partialUpdates = [
        {
          tags: {
            primary: ['Updated Primary']
            // Secondary not specified
          }
        },
        {
          tags: {
            primary: ['AI'],
            secondary: ['Updated Secondary']
          }
        },
        {
          tags: {
            primary: ['Single Update'],
            secondary: []
          }
        }
      ];

      for (const update of partialUpdates) {
        const dto = plainToClass(UpdateToolDto, update);
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should validate complex nested updates', async () => {
      const complexUpdate = {
        name: 'Updated Tool',
        features: {
          apiAccess: true,
          freeTier: false,
          newFeature: true
        },
        tags: {
          primary: ['Updated AI'],
          secondary: ['Updated Secondary']
        },
        popularity: 95000
      };

      const dto = plainToClass(UpdateToolDto, complexUpdate);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.features).toEqual(complexUpdate.features);
      expect(dto.tags).toEqual(complexUpdate.tags);
    });

    it('should fail validation with invalid nested objects in updates', async () => {
      const invalidUpdates = [
        {
          features: 'not an object' // Invalid features type
        },
        {
          tags: 'not an object' // Invalid tags type
        },
        {
          features: {
            invalidFeature: 'not a boolean after transform'
          },
          tags: {
            primary: 'not an array' // Invalid primary type
          }
        }
      ];

      for (const invalidUpdate of invalidUpdates) {
        const dto = plainToClass(UpdateToolDto, invalidUpdate);
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases for Complex Objects', () => {
    it('should handle deeply nested feature names', async () => {
      const complexFeatures = {
        'api-access': true,
        'free_tier': false,
        'multi.language': true,
        'code-execution-v2': false,
        'analytics_dashboard_enabled': true,
        'experimental.feature.beta': false
      };

      const validTool = {
        name: 'Complex Features Tool',
        description: 'Tool with complex feature names',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        features: complexFeatures,
        searchKeywords: ['complex'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, validTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.features).toEqual(complexFeatures);
    });

    it('should handle special characters in tag values', async () => {
      const specialTags = {
        primary: ['AI/ML', 'Natural Language Processing', 'Machine Learning'],
        secondary: ['Dev Tools', 'API & Integration', 'Real-time Processing']
      };

      const validTool = {
        name: 'Special Tags Tool',
        description: 'Tool with special character tags',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['special'],
        tags: specialTags
      };

      const dto = plainToClass(CreateToolDto, validTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.tags).toEqual(specialTags);
    });

    it('should handle large numbers of features and tags', async () => {
      const manyFeatures: Record<string, boolean> = {};
      for (let i = 0; i < 50; i++) {
        manyFeatures[`feature${i}`] = i % 2 === 0;
      }

      const manyTags = {
        primary: Array.from({ length: 10 }, (_, i) => `Primary${i}`),
        secondary: Array.from({ length: 20 }, (_, i) => `Secondary${i}`)
      };

      const validTool = {
        name: 'Many Features Tool',
        description: 'Tool with many features and tags',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        features: manyFeatures,
        searchKeywords: ['many'],
        tags: manyTags
      };

      const dto = plainToClass(CreateToolDto, validTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(Object.keys(dto.features)).toHaveLength(50);
      expect(dto.tags.primary).toHaveLength(10);
      expect(dto.tags.secondary).toHaveLength(20);
    });
  });
});
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateToolDto } from '../../src/tools/dto/create-tool.dto';
import { UpdateToolDto } from '../../src/tools/dto/update-tool.dto';

describe('Array Field Validation', () => {
  describe('Required Array Fields in CreateToolDto', () => {
    it('should pass validation with valid array fields', async () => {
      const validTool = {
        name: 'Array Test Tool',
        description: 'Tool for testing array validation',
        pricing: ['Free', 'Paid', 'Enterprise'],
        interface: ['Web', 'API', 'Mobile', 'Desktop'],
        functionality: ['Text Generation', 'Translation', 'Code Generation'],
        deployment: ['Cloud', 'On-premise', 'Hybrid'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['keyword1', 'keyword2', 'longer-keyword-test'],
        tags: {
          primary: ['AI', 'Productivity'],
          secondary: ['Development', 'Communication']
        }
      };

      const dto = plainToClass(CreateToolDto, validTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with empty pricing array', async () => {
      const invalidTool = {
        name: 'Invalid Tool',
        description: 'Tool with empty pricing',
        pricing: [], // Empty array violates minItems: 1
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['valid'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, invalidTool);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const pricingError = errors.find(error => error.property === 'pricing');
      expect(pricingError?.constraints).toHaveProperty('arrayNotEmpty');
    });

    it('should fail validation with empty interface array', async () => {
      const invalidTool = {
        name: 'Invalid Tool',
        description: 'Tool with empty interface',
        pricing: ['Free'],
        interface: [], // Empty array violates minItems: 1
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['valid'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, invalidTool);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const interfaceError = errors.find(error => error.property === 'interface');
      expect(interfaceError?.constraints).toHaveProperty('arrayNotEmpty');
    });

    it('should fail validation with empty functionality array', async () => {
      const invalidTool = {
        name: 'Invalid Tool',
        description: 'Tool with empty functionality',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: [], // Empty array violates minItems: 1
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['valid'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, invalidTool);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const functionalityError = errors.find(error => error.property === 'functionality');
      expect(functionalityError?.constraints).toHaveProperty('arrayNotEmpty');
    });

    it('should fail validation with empty deployment array', async () => {
      const invalidTool = {
        name: 'Invalid Tool',
        description: 'Tool with empty deployment',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: [], // Empty array violates minItems: 1
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['valid'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, invalidTool);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const deploymentError = errors.find(error => error.property === 'deployment');
      expect(deploymentError?.constraints).toHaveProperty('arrayNotEmpty');
    });

    it('should fail validation with empty searchKeywords array', async () => {
      const invalidTool = {
        name: 'Invalid Tool',
        description: 'Tool with empty searchKeywords',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: [], // Empty array violates minItems: 1
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, invalidTool);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const searchKeywordsError = errors.find(error => error.property === 'searchKeywords');
      expect(searchKeywordsError?.constraints).toHaveProperty('arrayNotEmpty');
    });

    it('should fail validation with non-string values in string arrays', async () => {
      const invalidTool = {
        name: 'Invalid Tool',
        description: 'Tool with non-string array values',
        pricing: ['Free', 123, null], // Non-string values
        interface: ['Web', true], // Non-string values
        functionality: ['Text Generation', undefined], // Non-string values
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['valid', 456], // Non-string values
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, invalidTool);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      
      // Should have validation errors for arrays with non-string elements
      const pricingError = errors.find(error => error.property === 'pricing');
      const interfaceError = errors.find(error => error.property === 'interface');
      const functionalityError = errors.find(error => error.property === 'functionality');
      const searchKeywordsError = errors.find(error => error.property === 'searchKeywords');
      
      expect([pricingError, interfaceError, functionalityError, searchKeywordsError]
        .some(error => error && error.constraints && Object.keys(error.constraints).length > 0)).toBe(true);
    });
  });

  describe('SearchKeywords Special Validation', () => {
    it('should fail validation with keywords exceeding 256 characters', async () => {
      const longKeyword = 'a'.repeat(257); // Exceeds maxLength: 256
      const invalidTool = {
        name: 'Invalid Tool',
        description: 'Tool with oversized keywords',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['valid', longKeyword],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, invalidTool);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass validation with keywords at maximum length', async () => {
      const maxLengthKeyword = 'a'.repeat(256); // Exactly maxLength: 256
      const validTool = {
        name: 'Valid Tool',
        description: 'Tool with max-length keywords',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['short', maxLengthKeyword],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, validTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle keyword transformation correctly', async () => {
      const originalKeywords = ['keyword1', 'a'.repeat(300), 'keyword3'];
      const validTool = {
        name: 'Transform Tool',
        description: 'Tool with transformed keywords',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: originalKeywords,
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, validTool);
      // The transform should truncate the long keyword to 256 chars
      expect(dto.searchKeywords[1]).toHaveLength(256);
      expect(dto.searchKeywords[0]).toBe('keyword1');
      expect(dto.searchKeywords[2]).toBe('keyword3');
    });
  });

  describe('Tags Array Validation', () => {
    it('should pass validation with non-empty primary tags', async () => {
      const validTool = {
        name: 'Valid Tool',
        description: 'Tool with valid tags',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['valid'],
        tags: {
          primary: ['AI', 'Productivity'],
          secondary: [] // Empty secondary is allowed
        }
      };

      const dto = plainToClass(CreateToolDto, validTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with empty primary tags', async () => {
      const invalidTool = {
        name: 'Invalid Tool',
        description: 'Tool with empty primary tags',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['valid'],
        tags: {
          primary: [], // Empty primary array should fail
          secondary: ['Development']
        }
      };

      const dto = plainToClass(CreateToolDto, invalidTool);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const tagsError = errors.find(error => error.property === 'tags');
      expect(tagsError?.constraints).toBeDefined();
    });

    it('should allow various tag combinations', async () => {
      const tagCombinations = [
        {
          primary: ['AI'],
          secondary: []
        },
        {
          primary: ['AI', 'Productivity'],
          secondary: ['Development']
        },
        {
          primary: ['Category1'],
          secondary: ['Sub1', 'Sub2', 'Sub3']
        }
      ];

      for (const tags of tagCombinations) {
        const validTool = {
          name: 'Tag Test Tool',
          description: 'Tool for tag testing',
          pricing: ['Free'],
          interface: ['Web'],
          functionality: ['Text Generation'],
          deployment: ['Cloud'],
          logoUrl: 'https://example.com/logo.png',
          searchKeywords: ['test'],
          tags
        };

        const dto = plainToClass(CreateToolDto, validTool);
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Array Field Validation in UpdateToolDto', () => {
    it('should allow empty arrays in updates', async () => {
      // Update DTO allows empty arrays since updates are partial
      const partialUpdate = {
        pricing: [], // Should be allowed in updates
        interface: [], // Should be allowed in updates
        searchKeywords: ['updated-keyword'] // Non-empty is fine too
      };

      const dto = plainToClass(UpdateToolDto, partialUpdate);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate array element types in updates', async () => {
      const invalidUpdate = {
        pricing: ['Free', 123], // Non-string element
        functionality: ['Valid', null], // Non-string element
        searchKeywords: ['valid', undefined] // Non-string element
      };

      const dto = plainToClass(UpdateToolDto, invalidUpdate);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle partial tags updates', async () => {
      const tagsUpdate = {
        tags: {
          primary: ['Updated Primary']
          // secondary is optional in updates
        }
      };

      const dto = plainToClass(UpdateToolDto, tagsUpdate);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Duplicate Values in Arrays', () => {
    it('should allow duplicate values in arrays', async () => {
      // Business requirement: duplicates might be allowed
      const toolWithDuplicates = {
        name: 'Duplicate Test Tool',
        description: 'Tool with duplicate array values',
        pricing: ['Free', 'Free'], // Duplicates
        interface: ['Web', 'Web'], // Duplicates
        functionality: ['Text Generation', 'Text Generation'], // Duplicates
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['duplicate', 'duplicate'], // Duplicates
        tags: {
          primary: ['AI', 'AI'], // Duplicates
          secondary: ['Test']
        }
      };

      const dto = plainToClass(CreateToolDto, toolWithDuplicates);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateToolDto } from '../../src/tools/dto/create-tool.dto';
import { UpdateToolDto } from '../../src/tools/dto/update-tool.dto';

describe('Field Validation Rules', () => {
  describe('CreateToolDto Validation', () => {
    it('should pass validation with valid complete tool data', async () => {
      const validTool = {
        name: 'ChatGPT',
        description: 'Advanced AI chatbot for natural conversations',
        longDescription: 'ChatGPT is an advanced language model developed by OpenAI...',
        pricing: ['Free', 'Paid', 'API'],
        interface: ['Web', 'API', 'Mobile'],
        functionality: ['Text Generation', 'Translation', 'Code Generation'],
        deployment: ['Cloud', 'On-premise'],
        popularity: 85000,
        rating: 4.5,
        reviewCount: 1250,
        logoUrl: 'https://example.com/chatgpt-logo.png',
        features: {
          apiAccess: true,
          freeTier: true,
          multiLanguage: true,
          codeExecution: false
        },
        searchKeywords: ['chatbot', 'AI assistant', 'natural language', 'conversation'],
        tags: {
          primary: ['AI', 'Chatbot'],
          secondary: ['Productivity', 'Communication', 'Language']
        }
      };

      const dto = plainToClass(CreateToolDto, validTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid name length', async () => {
      const invalidTool = {
        name: 'a'.repeat(101), // Exceeds maxLength: 100
        description: 'Valid description',
        pricing: ['Free'],
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
      expect(errors[0].constraints).toHaveProperty('length');
    });

    it('should fail validation with invalid description length', async () => {
      const invalidTool = {
        name: 'Valid Name',
        description: 'a'.repeat(501), // Exceeds maxLength: 500
        pricing: ['Free'],
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
      const descriptionError = errors.find(error => error.property === 'description');
      expect(descriptionError?.constraints).toHaveProperty('length');
    });

    it('should fail validation with invalid longDescription length', async () => {
      const invalidTool = {
        name: 'Valid Name',
        description: 'Valid description',
        longDescription: 'a'.repeat(2001), // Exceeds maxLength: 2000
        pricing: ['Free'],
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
      const longDescriptionError = errors.find(error => error.property === 'longDescription');
      expect(longDescriptionError?.constraints).toHaveProperty('length');
    });

    it('should fail validation with invalid URL format', async () => {
      const invalidTool = {
        name: 'Valid Name',
        description: 'Valid description',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'not-a-valid-url', // Invalid URL
        searchKeywords: ['valid'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, invalidTool);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const logoUrlError = errors.find(error => error.property === 'logoUrl');
      expect(logoUrlError?.constraints).toHaveProperty('isUrl');
    });

    it('should fail validation with invalid numeric ranges', async () => {
      const invalidTool = {
        name: 'Valid Name',
        description: 'Valid description',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        popularity: -1, // Below minimum: 0
        rating: 5.1, // Above maximum: 5
        reviewCount: 1000001, // Above maximum: 1000000
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
      
      const popularityError = errors.find(error => error.property === 'popularity');
      expect(popularityError?.constraints).toHaveProperty('min');
      
      const ratingError = errors.find(error => error.property === 'rating');
      expect(ratingError?.constraints).toHaveProperty('max');
      
      const reviewCountError = errors.find(error => error.property === 'reviewCount');
      expect(reviewCountError?.constraints).toHaveProperty('max');
    });

    it('should pass validation with minimum required fields', async () => {
      const minimalTool = {
        name: 'Minimal Tool',
        description: 'Minimal description',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['minimal'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, minimalTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should apply default values for optional fields', async () => {
      const toolWithDefaults = {
        name: 'Default Tool',
        description: 'Tool with defaults',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['default'],
        tags: {
          primary: ['AI'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, toolWithDefaults);
      expect(dto.popularity).toBe(0);
      expect(dto.rating).toBe(0);
      expect(dto.reviewCount).toBe(0);
      expect(dto.features).toEqual({});
    });
  });

  describe('UpdateToolDto Validation', () => {
    it('should pass validation with partial valid updates', async () => {
      const partialUpdate = {
        name: 'Updated Name',
        popularity: 95000,
        rating: 4.7
      };

      const dto = plainToClass(UpdateToolDto, partialUpdate);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid partial updates', async () => {
      const invalidUpdate = {
        name: 'a'.repeat(101), // Too long
        rating: 5.1, // Above maximum
        logoUrl: 'invalid-url' // Invalid URL
      };

      const dto = plainToClass(UpdateToolDto, invalidUpdate);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow empty update (all fields optional)', async () => {
      const emptyUpdate = {};

      const dto = plainToClass(UpdateToolDto, emptyUpdate);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate nested objects in partial updates', async () => {
      const nestedUpdate = {
        tags: {
          primary: ['Updated Primary']
          // secondary is optional in updates
        },
        features: {
          apiAccess: true,
          newFeature: false
        }
      };

      const dto = plainToClass(UpdateToolDto, nestedUpdate);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values correctly', async () => {
      const toolWithNulls = {
        name: 'Valid Name',
        description: 'Valid description',
        longDescription: null, // Should be allowed
        pricing: ['Free'],
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

      const dto = plainToClass(CreateToolDto, toolWithNulls);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle special characters in string fields', async () => {
      const specialCharTool = {
        name: 'Tool with Special Chars: @#$%',
        description: 'Description with émojis 🚀 and special chars',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        logoUrl: 'https://example.com/special-logo.png',
        searchKeywords: ['special-chars', 'émojis-test'],
        tags: {
          primary: ['Special'],
          secondary: ['Testing']
        }
      };

      const dto = plainToClass(CreateToolDto, specialCharTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle boundary values for numeric fields', async () => {
      const boundaryTool = {
        name: 'Boundary Tool',
        description: 'Tool with boundary values',
        pricing: ['Free'],
        interface: ['Web'],
        functionality: ['Text Generation'],
        deployment: ['Cloud'],
        popularity: 0, // Minimum
        rating: 5, // Maximum
        reviewCount: 1000000, // Maximum
        logoUrl: 'https://example.com/logo.png',
        searchKeywords: ['boundary'],
        tags: {
          primary: ['Test'],
          secondary: []
        }
      };

      const dto = plainToClass(CreateToolDto, boundaryTool);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
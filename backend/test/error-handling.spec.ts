import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateToolEnhancedDto } from '../src/tools/dto/create-tool-enhanced.dto';
import { VALIDATION_FIXTURES } from './fixtures/validation-fixtures';

describe('Error Handling in Tool Validation', () => {
  describe('DTO Validation Errors', () => {
    it('should handle missing required fields gracefully', async () => {
      const invalidTool = {
        name: 'Test Tool',
        // Missing description, pricing, etc.
      };

      const dto = plainToInstance(CreateToolEnhancedDto, invalidTool);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'description')).toBe(true);
    });

    it('should handle invalid URL format', async () => {
      const invalidTool = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        logoUrl: 'not-a-valid-url'
      };

      const dto = plainToInstance(CreateToolEnhancedDto, invalidTool);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'logoUrl')).toBe(true);
    });

    it('should handle empty required arrays', async () => {
      const invalidTool = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        pricing: []
      };

      const dto = plainToInstance(CreateToolEnhancedDto, invalidTool);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'pricing')).toBe(true);
    });

    it('should handle invalid numeric values', async () => {
      const invalidTool = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        popularity: -1
      };

      const dto = plainToInstance(CreateToolEnhancedDto, invalidTool);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'popularity')).toBe(true);
    });

    it('should handle invalid string lengths', async () => {
      const invalidTool = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        name: 'a'.repeat(101) // Exceeds 100 character limit
      };

      const dto = plainToInstance(CreateToolEnhancedDto, invalidTool);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'name')).toBe(true);
    });
  });
});
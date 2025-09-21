import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateToolEnhancedDto } from '../src/tools/dto/create-tool-enhanced.dto';
import { VALIDATION_FIXTURES } from './fixtures/validation-fixtures';

describe('DTO Validation', () => {
  describe('CreateToolEnhancedDto', () => {
    it('should validate valid complete tool successfully', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.validCompleteTool,
      );
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate valid minimal tool successfully', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.validMinimalTool,
      );
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject tool with missing name', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.invalidData.missingName,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'name')).toBe(true);
    });

    it('should reject tool with missing description', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.invalidData.missingDescription,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'description')).toBe(
        true,
      );
    });

    it('should reject tool with empty pricing array', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.invalidData.emptyPricing,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'pricing')).toBe(true);
    });

    it('should reject tool with empty interface array', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.invalidData.emptyInterface,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'interface')).toBe(true);
    });

    it('should reject tool with empty functionality array', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.invalidData.emptyFunctionality,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'functionality')).toBe(
        true,
      );
    });

    it('should reject tool with negative popularity', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.invalidData.negativePopularity,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'popularity')).toBe(
        true,
      );
    });

    it('should reject tool with popularity too high', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.invalidData.popularityTooHigh,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'popularity')).toBe(
        true,
      );
    });

    it('should reject tool with rating too high', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.invalidData.ratingTooHigh,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'rating')).toBe(true);
    });

    it('should reject tool with invalid logo URL', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.invalidData.invalidLogoUrl,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'logoUrl')).toBe(true);
    });

    it('should reject tool with invalid features values', async () => {
      const dto = plainToInstance(
        CreateToolEnhancedDto,
        VALIDATION_FIXTURES.invalidData.invalidFeaturesValues,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'features')).toBe(true);
    });

    it('should accept edge case values', async () => {
      const edgeCaseTool = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        name: VALIDATION_FIXTURES.edgeCases.maxLengthName,
        description: VALIDATION_FIXTURES.edgeCases.maxLengthDescription,
        popularity: VALIDATION_FIXTURES.edgeCases.maxPopularity,
        rating: VALIDATION_FIXTURES.edgeCases.maxRating,
      };

      const dto = plainToInstance(CreateToolEnhancedDto, edgeCaseTool);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject tool with name exceeding max length', async () => {
      const toolWithLongName = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        name: 'a'.repeat(101), // Exceeds 100 character limit
      };

      const dto = plainToInstance(CreateToolEnhancedDto, toolWithLongName);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'name')).toBe(true);
    });

    it('should reject tool with description exceeding max length', async () => {
      const toolWithLongDescription = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        description: 'a'.repeat(501), // Exceeds 500 character limit
      };

      const dto = plainToInstance(
        CreateToolEnhancedDto,
        toolWithLongDescription,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'description')).toBe(
        true,
      );
    });

    it('should handle array validation correctly', async () => {
      const toolWithEmptyTags = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        tags: { primary: [], secondary: [] }, // Both arrays empty - should fail custom validation
      };

      const dto = plainToInstance(CreateToolEnhancedDto, toolWithEmptyTags);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'tags')).toBe(true);
    });

    it('should validate nested object properties', async () => {
      const toolWithInvalidFeatures = {
        ...VALIDATION_FIXTURES.validMinimalTool,
        features: {
          hasAPI: 'not-a-boolean', // Should be boolean
          hasFreeTier: true,
          hasCustomization: false,
        },
      };

      const dto = plainToInstance(
        CreateToolEnhancedDto,
        toolWithInvalidFeatures,
      );
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'features')).toBe(true);
    });
  });
});

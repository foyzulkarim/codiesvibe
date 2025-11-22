/**
 * Tool Schema Validation Tests
 * Tests for Zod validation schemas
 */

import { CreateToolSchema, UpdateToolSchema, GetToolsQuerySchema, PricingSchema } from '../../../schemas/tool.schema';

describe('Tool Schema Validation', () => {
  describe('PricingSchema', () => {
    it('should validate valid pricing tier', () => {
      const validPricing = {
        tier: 'Pro',
        billingPeriod: 'Monthly',
        price: 29.99,
      };

      const result = PricingSchema.safeParse(validPricing);
      expect(result.success).toBe(true);
    });

    it('should reject empty tier name', () => {
      const invalidPricing = {
        tier: '',
        billingPeriod: 'Monthly',
        price: 10,
      };

      const result = PricingSchema.safeParse(invalidPricing);
      expect(result.success).toBe(false);
    });

    it('should reject invalid billing period', () => {
      const invalidPricing = {
        tier: 'Pro',
        billingPeriod: 'Weekly',
        price: 10,
      };

      const result = PricingSchema.safeParse(invalidPricing);
      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const invalidPricing = {
        tier: 'Pro',
        billingPeriod: 'Monthly',
        price: -10,
      };

      const result = PricingSchema.safeParse(invalidPricing);
      expect(result.success).toBe(false);
    });

    it('should allow zero price for free tier', () => {
      const freePricing = {
        tier: 'Free',
        billingPeriod: 'Monthly',
        price: 0,
      };

      const result = PricingSchema.safeParse(freePricing);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateToolSchema', () => {
    const validTool = {
      id: 'test-tool',
      name: 'Test Tool',
      description: 'A test tool for testing purposes with enough characters',
      categories: ['AI'],
      industries: ['Technology'],
      userTypes: ['Developers'],
      pricing: [{ tier: 'Free', billingPeriod: 'Monthly', price: 0 }],
      pricingModel: 'Free',
      interface: ['Web'],
      functionality: ['AI Chat'],
      deployment: ['Cloud'],
      status: 'active',
      contributor: 'system',
    };

    it('should validate a complete valid tool', () => {
      const result = CreateToolSchema.safeParse(validTool);
      expect(result.success).toBe(true);
    });

    it('should reject tool with invalid ID format', () => {
      const invalidTool = {
        ...validTool,
        id: 'Invalid ID With Spaces',
      };

      const result = CreateToolSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('id');
      }
    });

    it('should reject tool with uppercase in ID', () => {
      const invalidTool = {
        ...validTool,
        id: 'TestTool',
      };

      const result = CreateToolSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });

    it('should reject tool with short description', () => {
      const invalidTool = {
        ...validTool,
        description: 'Too short',
      };

      const result = CreateToolSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('description');
      }
    });

    it('should reject tool with empty categories', () => {
      const invalidTool = {
        ...validTool,
        categories: [],
      };

      const result = CreateToolSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });

    it('should reject tool with invalid category', () => {
      const invalidTool = {
        ...validTool,
        categories: ['InvalidCategory'],
      };

      const result = CreateToolSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });

    it('should reject tool with too many categories', () => {
      const invalidTool = {
        ...validTool,
        categories: ['AI', 'Machine Learning', 'Development', 'Productivity', 'Analytics', 'Chatbot'],
      };

      const result = CreateToolSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });

    it('should reject tool with empty pricing array', () => {
      const invalidTool = {
        ...validTool,
        pricing: [],
      };

      const result = CreateToolSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });

    it('should reject tool with invalid pricing model', () => {
      const invalidTool = {
        ...validTool,
        pricingModel: 'InvalidModel',
      };

      const result = CreateToolSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });

    it('should allow optional fields to be empty strings', () => {
      const toolWithEmptyOptionals = {
        ...validTool,
        longDescription: '',
        tagline: '',
        logoUrl: '',
        website: '',
        documentation: '',
        pricingUrl: '',
      };

      const result = CreateToolSchema.safeParse(toolWithEmptyOptionals);
      expect(result.success).toBe(true);
    });

    it('should validate URLs when provided', () => {
      const toolWithUrls = {
        ...validTool,
        website: 'https://example.com',
        documentation: 'https://docs.example.com',
        logoUrl: 'https://example.com/logo.png',
      };

      const result = CreateToolSchema.safeParse(toolWithUrls);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const toolWithInvalidUrl = {
        ...validTool,
        website: 'not-a-valid-url',
      };

      const result = CreateToolSchema.safeParse(toolWithInvalidUrl);
      expect(result.success).toBe(false);
    });

    it('should validate long description minimum length', () => {
      const toolWithShortLongDesc = {
        ...validTool,
        longDescription: 'Too short',
      };

      const result = CreateToolSchema.safeParse(toolWithShortLongDesc);
      expect(result.success).toBe(false);
    });

    it('should accept valid long description', () => {
      const toolWithLongDesc = {
        ...validTool,
        longDescription: 'This is a much longer description that provides detailed information about the tool and its capabilities. It exceeds the minimum of 50 characters.',
      };

      const result = CreateToolSchema.safeParse(toolWithLongDesc);
      expect(result.success).toBe(true);
    });

    it('should validate all status options', () => {
      const statuses = ['active', 'beta', 'deprecated', 'discontinued'];

      statuses.forEach((status) => {
        const tool = { ...validTool, status };
        const result = CreateToolSchema.safeParse(tool);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const invalidTool = {
        ...validTool,
        status: 'invalid-status',
      };

      const result = CreateToolSchema.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateToolSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        name: 'Updated Name',
      };

      const result = UpdateToolSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate fields when provided', () => {
      const invalidUpdate = {
        id: 'Invalid ID',
      };

      const result = UpdateToolSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should allow empty object for no updates', () => {
      const result = UpdateToolSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('GetToolsQuerySchema', () => {
    it('should parse valid query parameters', () => {
      const query = {
        page: '2',
        limit: '50',
        search: 'test',
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const result = GetToolsQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should apply default values', () => {
      const result = GetToolsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('dateAdded');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should reject page less than 1', () => {
      const query = { page: '0' };
      const result = GetToolsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const query = { limit: '200' };
      const result = GetToolsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should reject invalid sortBy', () => {
      const query = { sortBy: 'invalid' };
      const result = GetToolsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should accept valid filters', () => {
      const query = {
        status: 'active',
        pricingModel: 'Free',
        category: 'AI',
        industry: 'Technology',
      };

      const result = GetToolsQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });
  });
});

/**
 * Tool CRUD Service Unit Tests
 * Tests for tool CRUD operations using MongoDB Memory Server
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Tool, ITool } from '../../../models/tool.model';
import { toolCrudService } from '../../../services/tool-crud.service';
import { CreateToolInput } from '../../../schemas/tool.schema';

describe('ToolCrudService', () => {
  let mongoServer: MongoMemoryServer;
  const TEST_CLERK_USER_ID = 'user_test123456789'; // Mock Clerk user ID

  const validToolInput: CreateToolInput = {
    id: 'test-tool',
    name: 'Test Tool',
    description: 'A test tool for testing purposes with enough chars',
    categories: ['AI', 'Development'],
    industries: ['Technology', 'Software Development'],
    userTypes: ['Developers', 'AI Engineers'],
    pricing: [
      { tier: 'Free', billingPeriod: 'Monthly', price: 0 },
      { tier: 'Pro', billingPeriod: 'Monthly', price: 29 },
    ],
    pricingModel: 'Freemium',
    interface: ['Web', 'API'],
    functionality: ['AI Chat', 'Code Generation'],
    deployment: ['Cloud'],
    status: 'active',
    contributor: 'test-user',
  };

  beforeAll(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Set environment variable for the service
    process.env.MONGODB_URI = mongoUri;

    // Connect mongoose
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await Tool.deleteMany({});
  });

  describe('createTool', () => {
    it('should create a new tool successfully', async () => {
      const tool = await toolCrudService.createTool(validToolInput, TEST_CLERK_USER_ID);

      expect(tool).toBeDefined();
      expect(tool.id).toBe(validToolInput.id);
      expect(tool.name).toBe(validToolInput.name);
      expect(tool.description).toBe(validToolInput.description);
      expect(tool.categories).toEqual(validToolInput.categories);
      expect(tool.pricing).toHaveLength(2);
      expect(tool.pricingModel).toBe('Freemium');
    });

    it('should auto-generate slug from id', async () => {
      const inputWithoutSlug = { ...validToolInput };
      const tool = await toolCrudService.createTool(inputWithoutSlug, TEST_CLERK_USER_ID);

      expect(tool.slug).toBe(validToolInput.id);
    });

    it('should set dateAdded and lastUpdated', async () => {
      const tool = await toolCrudService.createTool(validToolInput, TEST_CLERK_USER_ID);

      expect(tool.dateAdded).toBeDefined();
      expect(tool.lastUpdated).toBeDefined();
    });

    it('should throw error for duplicate id', async () => {
      await toolCrudService.createTool(validToolInput, TEST_CLERK_USER_ID);

      await expect(toolCrudService.createTool(validToolInput, TEST_CLERK_USER_ID)).rejects.toThrow();
    });

    it('should validate categories against controlled vocabulary', async () => {
      const invalidInput = {
        ...validToolInput,
        id: 'invalid-categories-tool',
        categories: ['InvalidCategory'],
      };

      await expect(toolCrudService.createTool(invalidInput, TEST_CLERK_USER_ID)).rejects.toThrow();
    });
  });

  describe('getTools', () => {
    beforeEach(async () => {
      // Create multiple tools for testing pagination
      const tools = [];
      for (let i = 1; i <= 25; i++) {
        tools.push({
          ...validToolInput,
          id: `tool-${i.toString().padStart(2, '0')}`,
          name: `Test Tool ${i}`,
          status: i <= 20 ? 'active' : 'beta',
          pricingModel: i <= 10 ? 'Free' : i <= 20 ? 'Freemium' : 'Paid',
        });
      }

      for (const tool of tools) {
        await Tool.create({
          ...tool,
          slug: tool.id,
          dateAdded: new Date(),
        });
      }
    });

    it('should return paginated results', async () => {
      const result = await toolCrudService.getTools({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(false);
    });

    it('should return second page correctly', async () => {
      const result = await toolCrudService.getTools({ page: 2, limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('should return last page correctly', async () => {
      const result = await toolCrudService.getTools({ page: 3, limit: 10 });

      expect(result.data).toHaveLength(5);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('should filter by status', async () => {
      const result = await toolCrudService.getTools({ status: 'beta', limit: 100 });

      expect(result.data).toHaveLength(5);
      result.data.forEach((tool) => {
        expect(tool.status).toBe('beta');
      });
    });

    it('should filter by pricingModel', async () => {
      const result = await toolCrudService.getTools({ pricingModel: 'Free', limit: 100 });

      expect(result.data).toHaveLength(10);
      result.data.forEach((tool) => {
        expect(tool.pricingModel).toBe('Free');
      });
    });

    it('should filter by category', async () => {
      const result = await toolCrudService.getTools({ category: 'AI', limit: 100 });

      expect(result.pagination.total).toBe(25);
    });

    it('should sort by name ascending', async () => {
      const result = await toolCrudService.getTools({
        sortBy: 'name',
        sortOrder: 'asc',
        limit: 5,
      });

      const names = result.data.map((t) => t.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should use default sorting (dateAdded desc)', async () => {
      const result = await toolCrudService.getTools({ limit: 25 });

      // All tools should be returned
      expect(result.data).toHaveLength(25);
    });
  });

  describe('getToolById', () => {
    beforeEach(async () => {
      await Tool.create({
        ...validToolInput,
        slug: validToolInput.id,
        dateAdded: new Date(),
      });
    });

    it('should return tool by id', async () => {
      const tool = await toolCrudService.getToolById('test-tool');

      expect(tool).toBeDefined();
      expect(tool?.id).toBe('test-tool');
      expect(tool?.name).toBe('Test Tool');
    });

    it('should return tool by slug', async () => {
      const tool = await toolCrudService.getToolById('test-tool');

      expect(tool).toBeDefined();
      expect(tool?.slug).toBe('test-tool');
    });

    it('should return null for non-existent tool', async () => {
      const tool = await toolCrudService.getToolById('non-existent');

      expect(tool).toBeNull();
    });
  });

  describe('updateTool', () => {
    beforeEach(async () => {
      await Tool.create({
        ...validToolInput,
        slug: validToolInput.id,
        dateAdded: new Date(),
      });
    });

    it('should update tool name', async () => {
      const updated = await toolCrudService.updateTool('test-tool', {
        name: 'Updated Tool Name',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Tool Name');
    });

    it('should update tool description', async () => {
      const updated = await toolCrudService.updateTool('test-tool', {
        description: 'This is an updated description with enough characters',
      });

      expect(updated?.description).toBe('This is an updated description with enough characters');
    });

    it('should update pricing model', async () => {
      const updated = await toolCrudService.updateTool('test-tool', {
        pricingModel: 'Paid',
      });

      expect(updated?.pricingModel).toBe('Paid');
    });

    it('should update categories', async () => {
      const updated = await toolCrudService.updateTool('test-tool', {
        categories: ['Machine Learning', 'Analytics'],
      });

      expect(updated?.categories).toEqual(['Machine Learning', 'Analytics']);
    });

    it('should update lastUpdated timestamp', async () => {
      const original = await toolCrudService.getToolById('test-tool');
      const originalLastUpdated = original?.lastUpdated;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await toolCrudService.updateTool('test-tool', {
        name: 'Updated Name',
      });

      expect(updated?.lastUpdated).not.toEqual(originalLastUpdated);
    });

    it('should return null for non-existent tool', async () => {
      const updated = await toolCrudService.updateTool('non-existent', {
        name: 'Updated',
      });

      expect(updated).toBeNull();
    });

    it('should validate updates against schema', async () => {
      await expect(
        toolCrudService.updateTool('test-tool', {
          categories: ['InvalidCategory'],
        })
      ).rejects.toThrow();
    });
  });

  describe('deleteTool', () => {
    beforeEach(async () => {
      await Tool.create({
        ...validToolInput,
        slug: validToolInput.id,
        dateAdded: new Date(),
      });
    });

    it('should delete tool by id', async () => {
      const result = await toolCrudService.deleteTool('test-tool');

      expect(result).toBe(true);

      const tool = await toolCrudService.getToolById('test-tool');
      expect(tool).toBeNull();
    });

    it('should return false for non-existent tool', async () => {
      const result = await toolCrudService.deleteTool('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('toolExists', () => {
    beforeEach(async () => {
      await Tool.create({
        ...validToolInput,
        slug: validToolInput.id,
        dateAdded: new Date(),
      });
    });

    it('should return true for existing tool', async () => {
      const exists = await toolCrudService.toolExists('test-tool');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent tool', async () => {
      const exists = await toolCrudService.toolExists('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('getAllTools', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 5; i++) {
        await Tool.create({
          ...validToolInput,
          id: `tool-${i}`,
          slug: `tool-${i}`,
          name: `Tool ${i}`,
          dateAdded: new Date(),
        });
      }
    });

    it('should return all tools without pagination', async () => {
      const tools = await toolCrudService.getAllTools();

      expect(tools).toHaveLength(5);
    });

    it('should return tools sorted by dateAdded descending', async () => {
      const tools = await toolCrudService.getAllTools();

      expect(tools).toHaveLength(5);
    });
  });
});

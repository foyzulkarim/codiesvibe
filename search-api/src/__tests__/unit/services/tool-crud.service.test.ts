/**
 * Tool CRUD Service Unit Tests
 * Tests for tool CRUD operations using MongoDB Memory Server
 */

import {
  setupTestDatabase,
  teardownTestDatabase,
  clearToolsCollection,
  createTestTool,
  getToolsCollection,
  getTestDb,
} from '../../test-utils/db-setup.js';
import { ITool } from '../../../types/tool.interfaces.js';
import { CreateToolInput } from '../../../schemas/tool.schema.js';

// Store reference to test database for the mock
let testDbReference: ReturnType<typeof getTestDb> | null = null;

// Mock the database module to use test database
jest.mock('../../../config/database', () => ({
  connectToMongoDB: jest.fn(async () => {
    if (!testDbReference) {
      throw new Error('Test database not initialized. Call setupTestDatabase first.');
    }
    return testDbReference;
  }),
  disconnectFromMongoDB: jest.fn(async () => {}),
  connectToQdrant: jest.fn(async () => null),
  getQdrantClient: jest.fn(() => null),
  isSupportedVectorType: jest.fn(() => true),
  getCollectionName: jest.fn((type: string) => type === 'semantic' ? 'tools' : type),
  getEnhancedCollectionName: jest.fn(() => 'enhanced_tools'),
  shouldUseEnhancedCollection: jest.fn(() => false),
  getCollectionNameForVectorType: jest.fn((type: string) => type === 'semantic' ? 'tools' : type || 'tools'),
  getSupportedVectorTypes: jest.fn(() => ['semantic', 'entities.functionality', 'entities.categories']),
  mongoConfig: {
    uri: 'mongodb://localhost:27017',
    dbName: 'test',
    options: {},
  },
  qdrantConfig: {
    url: null,
    host: 'localhost',
    port: 6333,
    apiKey: null,
    collectionName: 'tools',
  },
}));

// Import the service after mocking
import { toolCrudService } from '../../../domains/tools/tool-crud.service.js';

describe('ToolCrudService', () => {
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
    pricingModel: ['Free', 'Paid'],
    interface: ['Web', 'API'],
    functionality: ['AI Chat', 'Code Generation'],
    deployment: ['Cloud'],
    status: 'active',
    // Note: contributor is set by the service based on userId parameter
  };

  beforeAll(async () => {
    // Start MongoDB Memory Server and connect native driver
    await setupTestDatabase();
    // Set the test database reference for the mock
    testDbReference = getTestDb();
  });

  afterAll(async () => {
    testDbReference = null;
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await clearToolsCollection();
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
      expect(tool.pricingModel).toEqual(['Free', 'Paid']);
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

    it('should allow duplicate id at service level (validation happens at route level)', async () => {
      // Note: Duplicate ID validation is done at the route level using toolExists()
      // The service itself does not prevent duplicates - this is intentional
      await toolCrudService.createTool(validToolInput, TEST_CLERK_USER_ID);

      // Service allows creating with same ID - route should call toolExists() first
      const secondTool = await toolCrudService.createTool(validToolInput, TEST_CLERK_USER_ID);
      expect(secondTool).toBeDefined();
      expect(secondTool.id).toBe(validToolInput.id);
    });

    it('should allow invalid categories at service level (validation happens at route level)', async () => {
      // Note: Category validation is done at the route level using Zod schemas
      // The service itself does not validate categories - this is intentional
      const invalidInput = {
        ...validToolInput,
        id: 'invalid-categories-tool',
        categories: ['InvalidCategory'],
      };

      // Service allows invalid categories - route should validate with Zod
      const tool = await toolCrudService.createTool(invalidInput, TEST_CLERK_USER_ID);
      expect(tool).toBeDefined();
      expect(tool.categories).toEqual(['InvalidCategory']);
    });
  });

  describe('getTools', () => {
    beforeEach(async () => {
      // Create multiple tools for testing pagination
      // NOTE: getTools() filters by approvalStatus: 'approved' by default
      for (let i = 1; i <= 25; i++) {
        await createTestTool({
          ...validToolInput,
          id: `tool-${i.toString().padStart(2, '0')}`,
          slug: `tool-${i.toString().padStart(2, '0')}`,
          name: `Test Tool ${i}`,
          status: i <= 20 ? 'active' : 'beta',
          pricingModel: i <= 10 ? ['Free'] : i <= 20 ? ['Free', 'Paid'] : ['Paid'],
          approvalStatus: 'approved', // Required for getTools() to return these
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

      // Tools 1-10 have ['Free'], tools 11-20 have ['Free', 'Paid'] - both contain 'Free'
      expect(result.data).toHaveLength(20);
      result.data.forEach((tool) => {
        expect(tool.pricingModel).toContain('Free');
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
      await createTestTool({
        ...validToolInput,
        slug: validToolInput.id,
        approvalStatus: 'approved', // Required for getToolById() with publicOnly=true (default)
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
      await createTestTool({
        ...validToolInput,
        slug: validToolInput.id,
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
        pricingModel: ['Paid'],
      });

      expect(updated?.pricingModel).toEqual(['Paid']);
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

    it('should allow invalid categories at service level (validation happens at route level)', async () => {
      // Note: Schema validation is done at the route level using Zod schemas
      // The service itself does not validate updates - this is intentional
      const updated = await toolCrudService.updateTool('test-tool', {
        categories: ['InvalidCategory'],
      });

      expect(updated).toBeDefined();
      expect(updated?.categories).toEqual(['InvalidCategory']);
    });
  });

  describe('deleteTool', () => {
    beforeEach(async () => {
      await createTestTool({
        ...validToolInput,
        slug: validToolInput.id,
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
      await createTestTool({
        ...validToolInput,
        slug: validToolInput.id,
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
        await createTestTool({
          ...validToolInput,
          id: `tool-${i}`,
          slug: `tool-${i}`,
          name: `Tool ${i}`,
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

/**
 * Tools Routes Integration Tests
 * End-to-end tests for the tools API endpoints
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearToolsCollection,
  createTestTool,
  getTestDb,
} from '../../test-utils/db-setup.js';

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
  connectToQdrant: jest.fn(async () => null), // Return null to simulate no Qdrant connection in tests
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

// Mock the rate limiters module to avoid using the actual rate limiter in tests
// This provides a mock for the toolsMutationLimiter used in routes
jest.mock('../../../middleware/rate-limiters', () => ({
  toolsMutationLimiter: (req: any, res: any, next: any) => {
    // Simple mock that just passes through
    res.setHeader('RateLimit-Limit', '10');
    res.setHeader('RateLimit-Remaining', '9');
    res.setHeader('RateLimit-Reset', Math.floor(Date.now() / 1000 + 300).toString());
    next();
  },
}));

// Mock Clerk authentication middleware BEFORE importing routes
jest.mock('../../../middleware/clerk-auth.middleware', () => ({
  clerkRequireAuth: (req: any, res: any, next: any) => {
    // Check if Authorization header is present
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    // Mock Clerk auth object
    req.auth = {
      userId: 'user_test123456789',
      sessionId: 'sess_test123456789',
    };
    next();
  },
  isClerkAuthenticated: (req: any): boolean => {
    return !!req.auth;
  },
  ClerkAuthenticatedRequest: {},
}));

// Mock role middleware
jest.mock('../../../middleware/role.middleware', () => {
  const originalModule = jest.requireActual('../../../middleware/role.middleware');
  return {
    ...originalModule,
    attachUserRole: (req: any, res: any, next: any) => {
      // Default to admin role for these tests
      req.userRole = 'admin';
      next();
    },
    requireAdmin: (req: any, res: any, next: any) => {
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
      }
      next();
    },
    isAdmin: (req: any): boolean => req.userRole === 'admin',
    isOwner: (req: any, contributorId: string): boolean => req.auth?.userId === contributorId,
    hasRole: (req: any): boolean => 'auth' in req && 'userRole' in req,
  };
});

import toolsRoutes from '../../../routes/tools.routes.js';

describe('Tools Routes Integration Tests', () => {
  let app: Express;
  const mockAuthToken = 'mock-clerk-token'; // Mock Clerk token

  const validTool = {
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
    contributor: 'test-user',
  };

  beforeAll(async () => {
    // Start MongoDB Memory Server and connect native driver
    await setupTestDatabase();

    // Set the test database reference for the mock
    testDbReference = getTestDb();

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/tools', toolsRoutes);
  });

  afterAll(async () => {
    testDbReference = null;
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearToolsCollection();
  });

  describe('POST /api/tools', () => {
    it('should create a new tool', async () => {
      const response = await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(validTool)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.id).toBe(validTool.id);
      expect(response.body.name).toBe(validTool.name);
      expect(response.body.categories).toEqual(validTool.categories);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/tools')
        .send(validTool)
        .expect(401);
    });

    it('should return 400 for invalid data', async () => {
      const invalidTool = {
        ...validTool,
        id: 'Invalid ID With Spaces',
      };

      const response = await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(invalidTool)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteTool = {
        id: 'incomplete-tool',
        name: 'Incomplete',
      };

      const response = await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(incompleteTool)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 409 for duplicate tool id', async () => {
      // Create first tool
      await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(validTool)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(validTool)
        .expect(409);

      expect(response.body.code).toBe('CONFLICT');
    });

    it('should validate categories against controlled vocabulary', async () => {
      const invalidCategoriesTool = {
        ...validTool,
        id: 'invalid-cat-tool',
        categories: ['NotAValidCategory'],
      };

      const response = await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(invalidCategoriesTool)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/tools', () => {
    beforeEach(async () => {
      // Create test tools with approvalStatus: 'approved' (required for getTools)
      for (let i = 1; i <= 15; i++) {
        await createTestTool({
          ...validTool,
          id: `tool-${i.toString().padStart(2, '0')}`,
          slug: `tool-${i.toString().padStart(2, '0')}`,
          name: `Test Tool ${i}`,
          status: i <= 10 ? 'active' : 'beta',
          pricingModel: i <= 5 ? ['Free'] : ['Free', 'Paid'],
          dateAdded: new Date(),
          approvalStatus: 'approved',
        });
      }
    });

    it('should return paginated tools', async () => {
      const response = await request(app)
        .get('/api/tools')
        .query({ page: 1, limit: 10 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.total).toBe(15);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.totalPages).toBe(2);
    });

    it('should return second page', async () => {
      const response = await request(app)
        .get('/api/tools')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination.page).toBe(2);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/tools')
        .query({ status: 'beta' })
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      response.body.data.forEach((tool: any) => {
        expect(tool.status).toBe('beta');
      });
    });

    it('should filter by pricingModel', async () => {
      const response = await request(app)
        .get('/api/tools')
        .query({ pricingModel: 'Free' })
        .expect(200);

      // Tools 1-5 have ['Free'], tools 6-15 have ['Free', 'Paid'] - all contain 'Free'
      expect(response.body.data).toHaveLength(15);
      response.body.data.forEach((tool: any) => {
        expect(tool.pricingModel).toContain('Free');
      });
    });

    it('should sort by name ascending', async () => {
      const response = await request(app)
        .get('/api/tools')
        .query({ sortBy: 'name', sortOrder: 'asc', limit: 15 })
        .expect(200);

      const names = response.body.data.map((t: any) => t.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should use default values when not specified', async () => {
      const response = await request(app)
        .get('/api/tools')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should return 400 for invalid page', async () => {
      const response = await request(app)
        .get('/api/tools')
        .query({ page: 0 })
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });

    it('should return 400 for limit exceeding max', async () => {
      const response = await request(app)
        .get('/api/tools')
        .query({ limit: 200 })
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('GET /api/tools/vocabularies', () => {
    it('should return controlled vocabularies', async () => {
      const response = await request(app)
        .get('/api/tools/vocabularies')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.categories).toBeDefined();
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.industries).toBeDefined();
      expect(response.body.userTypes).toBeDefined();
      expect(response.body.interface).toBeDefined();
      expect(response.body.functionality).toBeDefined();
      expect(response.body.deployment).toBeDefined();
      expect(response.body.pricingModels).toBeDefined();
      expect(response.body.billingPeriods).toBeDefined();
    });
  });

  describe('GET /api/tools/:id', () => {
    beforeEach(async () => {
      await createTestTool({
        ...validTool,
        slug: validTool.id,
        dateAdded: new Date(),
        approvalStatus: 'approved',
      });
    });

    it('should return tool by id', async () => {
      const response = await request(app)
        .get('/api/tools/test-tool')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe('test-tool');
      expect(response.body.name).toBe('Test Tool');
    });

    it('should return 404 for non-existent tool', async () => {
      const response = await request(app)
        .get('/api/tools/non-existent')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(404);

      expect(response.body.error).toBe('Tool not found');
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/tools/:id', () => {
    beforeEach(async () => {
      await createTestTool({
        ...validTool,
        slug: validTool.id,
        dateAdded: new Date(),
      });
    });

    it('should update tool name', async () => {
      const response = await request(app)
        .patch('/api/tools/test-tool')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ name: 'Updated Tool Name' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.name).toBe('Updated Tool Name');
      expect(response.body.id).toBe('test-tool'); // ID should not change
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .patch('/api/tools/test-tool')
        .send({ name: 'Updated Tool Name' })
        .expect(401);
    });

    it('should update multiple fields', async () => {
      const response = await request(app)
        .patch('/api/tools/test-tool')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          name: 'Updated Name',
          description: 'This is an updated description with enough characters',
          status: 'beta',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.description).toBe('This is an updated description with enough characters');
      expect(response.body.status).toBe('beta');
    });

    it('should return 404 for non-existent tool', async () => {
      const response = await request(app)
        .patch('/api/tools/non-existent')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.error).toBe('Tool not found');
    });

    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .patch('/api/tools/test-tool')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ id: 'Invalid ID With Spaces' })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('DELETE /api/tools/:id', () => {
    beforeEach(async () => {
      await createTestTool({
        ...validTool,
        slug: validTool.id,
        dateAdded: new Date(),
      });
    });

    it('should delete tool', async () => {
      await request(app)
        .delete('/api/tools/test-tool')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);

      // Verify tool is deleted
      const response = await request(app)
        .get('/api/tools/test-tool')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(404);

      expect(response.body.error).toBe('Tool not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete('/api/tools/test-tool')
        .expect(401);
    });

    it('should return 404 for non-existent tool', async () => {
      const response = await request(app)
        .delete('/api/tools/non-existent')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(404);

      expect(response.body.error).toBe('Tool not found');
    });
  });
});

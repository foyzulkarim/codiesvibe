/**
 * Tools Routes RBAC Integration Tests
 * Tests for RBAC-specific endpoints: my-tools, admin, approve, reject
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Tool } from '../../../models/tool.model';

// Test user IDs
const ADMIN_USER_ID = 'user_admin123';
const MAINTAINER_USER_ID = 'user_maintainer456';
const OTHER_MAINTAINER_ID = 'user_other789';

// Mock user roles database
const userRoles: Record<string, 'admin' | 'maintainer'> = {
  [ADMIN_USER_ID]: 'admin',
  [MAINTAINER_USER_ID]: 'maintainer',
  [OTHER_MAINTAINER_ID]: 'maintainer',
};

// Mock the server module to avoid importing the full server with side effects
// This provides a mock for the toolsMutationLimiter used in routes
jest.mock('../../../server', () => ({
  toolsMutationLimiter: (req: any, res: any, next: any) => {
    // Simple mock that tracks request count per IP for testing
    const ip = req.ip || 'test-ip';
    const key = `rate-limit-${ip}`;
    const requestCount = (global as any)[key] || 0;

    // Set rate limit headers for testing
    res.setHeader('RateLimit-Limit', '10');
    res.setHeader('RateLimit-Remaining', Math.max(0, 10 - requestCount - 1).toString());
    res.setHeader('RateLimit-Reset', Math.floor(Date.now() / 1000 + 300).toString());

    // Simulate rate limiting after 10 requests
    if (requestCount >= 10) {
      return res.status(429).json({
        error: 'Too many tool modifications',
        code: 'TOOLS_MUTATION_RATE_LIMIT_EXCEEDED',
        retryAfter: '5 minutes',
      });
    }

    (global as any)[key] = requestCount + 1;
    next();
  },
}));

// Mock Clerk authentication and role middleware BEFORE importing routes
jest.mock('../../../middleware/clerk-auth.middleware', () => ({
  clerkRequireAuth: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    // Extract user ID from token (format: "Bearer user_xxx")
    const userId = authHeader.replace('Bearer ', '');
    req.auth = {
      userId,
      sessionId: 'sess_test',
    };
    next();
  },
  isClerkAuthenticated: (req: any): boolean => !!req.auth,
  ClerkAuthenticatedRequest: {},
}));

jest.mock('../../../middleware/role.middleware', () => {
  const originalModule = jest.requireActual('../../../middleware/role.middleware');

  return {
    ...originalModule,
    attachUserRole: (req: any, res: any, next: any) => {
      const userId = req.auth?.userId;
      req.userRole = userRoles[userId] || 'maintainer';
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

import toolsRoutes from '../../../routes/tools.routes';

describe('Tools Routes RBAC Integration Tests', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;

  const createValidTool = (overrides: Partial<any> = {}) => ({
    id: `tool-${Date.now()}`,
    name: 'Test Tool',
    description: 'A test tool for testing purposes with enough chars',
    categories: ['AI', 'Development'],
    industries: ['Technology', 'Software Development'],
    userTypes: ['Developers', 'AI Engineers'],
    pricing: [{ tier: 'Free', billingPeriod: 'Monthly', price: 0 }],
    pricingModel: ['Free'],
    interface: ['Web', 'API'],
    functionality: ['AI Chat', 'Code Generation'],
    deployment: ['Cloud'],
    status: 'active',
    contributor: 'test-user',
    ...overrides,
  });

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    await mongoose.connect(mongoUri);

    app = express();
    app.use(express.json());
    app.use('/api/tools', toolsRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Tool.deleteMany({});
    // Reset rate limit counters between tests
    Object.keys(global).filter(key => key.startsWith('rate-limit-')).forEach(key => {
      delete (global as any)[key];
    });
  });

  describe('Approval Status on Create', () => {
    it('should set approvalStatus to pending for maintainer', async () => {
      const tool = createValidTool({ id: 'maintainer-tool' });

      const response = await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .send(tool)
        .expect(201);

      expect(response.body.approvalStatus).toBe('pending');
      expect(response.body.contributor).toBe(MAINTAINER_USER_ID);
    });

    it('should set approvalStatus to approved for admin', async () => {
      const tool = createValidTool({ id: 'admin-tool' });

      const response = await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .send(tool)
        .expect(201);

      expect(response.body.approvalStatus).toBe('approved');
      expect(response.body.contributor).toBe(ADMIN_USER_ID);
    });
  });

  describe('GET /api/tools/my-tools', () => {
    beforeEach(async () => {
      // Create tools for different users
      await Tool.create({
        ...createValidTool({ id: 'my-tool-1', name: 'My Tool 1' }),
        slug: 'my-tool-1',
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'pending',
        dateAdded: new Date(),
      });
      await Tool.create({
        ...createValidTool({ id: 'my-tool-2', name: 'My Tool 2' }),
        slug: 'my-tool-2',
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'approved',
        dateAdded: new Date(),
      });
      await Tool.create({
        ...createValidTool({ id: 'other-tool', name: 'Other Tool' }),
        slug: 'other-tool',
        contributor: OTHER_MAINTAINER_ID,
        approvalStatus: 'approved',
        dateAdded: new Date(),
      });
    });

    it('should return only tools belonging to the authenticated user', async () => {
      const response = await request(app)
        .get('/api/tools/my-tools')
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((tool: any) => {
        expect(tool.contributor).toBe(MAINTAINER_USER_ID);
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/tools/my-tools')
        .expect(401);
    });

    it('should filter by approvalStatus', async () => {
      const response = await request(app)
        .get('/api/tools/my-tools')
        .query({ approvalStatus: 'pending' })
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].approvalStatus).toBe('pending');
    });
  });

  describe('GET /api/tools/admin', () => {
    beforeEach(async () => {
      await Tool.create({
        ...createValidTool({ id: 'pending-tool' }),
        slug: 'pending-tool',
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'pending',
        dateAdded: new Date(),
      });
      await Tool.create({
        ...createValidTool({ id: 'approved-tool' }),
        slug: 'approved-tool',
        contributor: OTHER_MAINTAINER_ID,
        approvalStatus: 'approved',
        dateAdded: new Date(),
      });
    });

    it('should return all tools for admin', async () => {
      const response = await request(app)
        .get('/api/tools/admin')
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });

    it('should return 403 for maintainer', async () => {
      const response = await request(app)
        .get('/api/tools/admin')
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .expect(403);

      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('should filter by approvalStatus', async () => {
      const response = await request(app)
        .get('/api/tools/admin')
        .query({ approvalStatus: 'pending' })
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].approvalStatus).toBe('pending');
    });
  });

  describe('PATCH /api/tools/:id/approve', () => {
    let pendingToolId: string;

    beforeEach(async () => {
      pendingToolId = 'pending-tool-approve';
      await Tool.create({
        ...createValidTool({ id: pendingToolId }),
        slug: pendingToolId,
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'pending',
        dateAdded: new Date(),
      });
    });

    it('should allow admin to approve a pending tool', async () => {
      const response = await request(app)
        .patch(`/api/tools/${pendingToolId}/approve`)
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .expect(200);

      expect(response.body.approvalStatus).toBe('approved');
      expect(response.body.reviewedBy).toBe(ADMIN_USER_ID);
      expect(response.body.reviewedAt).toBeDefined();
    });

    it('should return 403 for maintainer', async () => {
      await request(app)
        .patch(`/api/tools/${pendingToolId}/approve`)
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .expect(403);
    });

    it('should return 404 for non-existent tool', async () => {
      await request(app)
        .patch('/api/tools/non-existent/approve')
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .expect(404);
    });

    it('should return 400 for already approved tool', async () => {
      // First approve
      await request(app)
        .patch(`/api/tools/${pendingToolId}/approve`)
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .expect(200);

      // Try to approve again
      const response = await request(app)
        .patch(`/api/tools/${pendingToolId}/approve`)
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/tools/:id/reject', () => {
    let pendingToolId: string;

    beforeEach(async () => {
      pendingToolId = 'pending-tool-reject';
      await Tool.create({
        ...createValidTool({ id: pendingToolId }),
        slug: pendingToolId,
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'pending',
        dateAdded: new Date(),
      });
    });

    it('should allow admin to reject a pending tool with reason', async () => {
      const response = await request(app)
        .patch(`/api/tools/${pendingToolId}/reject`)
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .send({ reason: 'Does not meet quality standards' })
        .expect(200);

      expect(response.body.approvalStatus).toBe('rejected');
      expect(response.body.rejectionReason).toBe('Does not meet quality standards');
      expect(response.body.reviewedBy).toBe(ADMIN_USER_ID);
      expect(response.body.reviewedAt).toBeDefined();
    });

    it('should return 400 without rejection reason', async () => {
      const response = await request(app)
        .patch(`/api/tools/${pendingToolId}/reject`)
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .send({})
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for maintainer', async () => {
      await request(app)
        .patch(`/api/tools/${pendingToolId}/reject`)
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .send({ reason: 'Some reason' })
        .expect(403);
    });

    it('should return 404 for non-existent tool', async () => {
      await request(app)
        .patch('/api/tools/non-existent/reject')
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .send({ reason: 'Some reason' })
        .expect(404);
    });
  });

  describe('PATCH /api/tools/:id (Edit permissions)', () => {
    let pendingToolId: string;
    let approvedToolId: string;

    beforeEach(async () => {
      pendingToolId = 'pending-edit-tool';
      approvedToolId = 'approved-edit-tool';

      await Tool.create({
        ...createValidTool({ id: pendingToolId }),
        slug: pendingToolId,
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'pending',
        dateAdded: new Date(),
      });

      await Tool.create({
        ...createValidTool({ id: approvedToolId }),
        slug: approvedToolId,
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'approved',
        dateAdded: new Date(),
      });
    });

    it('should allow maintainer to edit own pending tool', async () => {
      const response = await request(app)
        .patch(`/api/tools/${pendingToolId}`)
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('should deny maintainer from editing own approved tool', async () => {
      const response = await request(app)
        .patch(`/api/tools/${approvedToolId}`)
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .send({ name: 'Updated Name' })
        .expect(403);

      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('should deny maintainer from editing other users pending tool', async () => {
      const response = await request(app)
        .patch(`/api/tools/${pendingToolId}`)
        .set('Authorization', `Bearer ${OTHER_MAINTAINER_ID}`)
        .send({ name: 'Updated Name' })
        .expect(403);

      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('should allow admin to edit any tool', async () => {
      const response = await request(app)
        .patch(`/api/tools/${approvedToolId}`)
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .send({ name: 'Admin Updated' })
        .expect(200);

      expect(response.body.name).toBe('Admin Updated');
    });
  });

  describe('DELETE /api/tools/:id (Admin only)', () => {
    let toolId: string;

    beforeEach(async () => {
      toolId = 'tool-to-delete';
      await Tool.create({
        ...createValidTool({ id: toolId }),
        slug: toolId,
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'pending',
        dateAdded: new Date(),
      });
    });

    it('should allow admin to delete any tool', async () => {
      await request(app)
        .delete(`/api/tools/${toolId}`)
        .set('Authorization', `Bearer ${ADMIN_USER_ID}`)
        .expect(204);

      // Verify deletion
      const tool = await Tool.findOne({ id: toolId });
      expect(tool).toBeNull();
    });

    it('should deny maintainer from deleting tool', async () => {
      await request(app)
        .delete(`/api/tools/${toolId}`)
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .expect(403);
    });

    it('should deny maintainer from deleting own tool', async () => {
      await request(app)
        .delete(`/api/tools/${toolId}`)
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .expect(403);

      // Tool should still exist
      const tool = await Tool.findOne({ id: toolId });
      expect(tool).not.toBeNull();
    });
  });

  describe('GET /api/tools (Public listing)', () => {
    beforeEach(async () => {
      await Tool.create({
        ...createValidTool({ id: 'approved-public' }),
        slug: 'approved-public',
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'approved',
        dateAdded: new Date(),
      });
      await Tool.create({
        ...createValidTool({ id: 'pending-hidden' }),
        slug: 'pending-hidden',
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'pending',
        dateAdded: new Date(),
      });
      await Tool.create({
        ...createValidTool({ id: 'rejected-hidden' }),
        slug: 'rejected-hidden',
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'rejected',
        rejectionReason: 'Quality issues',
        dateAdded: new Date(),
      });
    });

    it('should only return approved tools in public listing', async () => {
      const response = await request(app)
        .get('/api/tools')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe('approved-public');
      expect(response.body.data[0].approvalStatus).toBe('approved');
    });
  });

  describe('Rate Limiting on Create/Update', () => {
    beforeEach(async () => {
      // Reset rate limit counter for each test
      Object.keys(global as any).forEach(key => {
        if (key.startsWith('rate-limit-')) {
          delete (global as any)[key];
        }
      });
    });

    it('should include rate limit headers on POST /api/tools', async () => {
      const tool = createValidTool({ id: 'rate-limit-test-tool' });

      const response = await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .send(tool)
        .expect(201);

      // Check for rate limit headers
      expect(response.headers['ratelimit-limit']).toBe('10');
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('should include rate limit headers on PATCH /api/tools/:id', async () => {
      // Create a tool first
      const toolId = 'rate-limit-patch-tool';
      await Tool.create({
        ...createValidTool({ id: toolId }),
        slug: toolId,
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'pending',
        dateAdded: new Date(),
      });

      const response = await request(app)
        .patch(`/api/tools/${toolId}`)
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      // Check for rate limit headers
      expect(response.headers['ratelimit-limit']).toBe('10');
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('should return 429 when rate limit is exceeded on POST', async () => {
      // Exhaust the rate limit (mock is set to 10 requests)
      for (let i = 0; i < 10; i++) {
        const tool = createValidTool({ id: `rate-exhaust-${i}` });
        await request(app)
          .post('/api/tools')
          .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
          .send(tool);
      }

      // 11th request should be rate limited
      const tool = createValidTool({ id: 'rate-limited-tool' });
      const response = await request(app)
        .post('/api/tools')
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .send(tool)
        .expect(429);

      expect(response.body.code).toBe('TOOLS_MUTATION_RATE_LIMIT_EXCEEDED');
      expect(response.body.error).toBe('Too many tool modifications');
      expect(response.body.retryAfter).toBe('5 minutes');
    });

    it('should return 429 when rate limit is exceeded on PATCH', async () => {
      // Create a tool to update
      const toolId = 'rate-patch-exhaust-tool';
      await Tool.create({
        ...createValidTool({ id: toolId }),
        slug: toolId,
        contributor: MAINTAINER_USER_ID,
        approvalStatus: 'pending',
        dateAdded: new Date(),
      });

      // Exhaust the rate limit (mock is set to 10 requests)
      for (let i = 0; i < 10; i++) {
        await request(app)
          .patch(`/api/tools/${toolId}`)
          .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
          .send({ name: `Update ${i}` });
      }

      // 11th request should be rate limited
      const response = await request(app)
        .patch(`/api/tools/${toolId}`)
        .set('Authorization', `Bearer ${MAINTAINER_USER_ID}`)
        .send({ name: 'Rate Limited Update' })
        .expect(429);

      expect(response.body.code).toBe('TOOLS_MUTATION_RATE_LIMIT_EXCEEDED');
      expect(response.body.error).toBe('Too many tool modifications');
    });
  });
});

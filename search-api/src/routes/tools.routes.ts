import { Router, Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodIssue } from 'zod';
import { toolCrudService } from '../services/tool-crud.service.js';
import {
  CreateToolSchema,
  UpdateToolSchema,
  GetToolsQuerySchema,
  GetMyToolsQuerySchema,
  GetAdminToolsQuerySchema,
  RejectToolSchema,
  type GetToolsQuery,
  type GetMyToolsQuery,
  type GetAdminToolsQuery,
} from '../schemas/tool.schema.js';
import { searchLogger } from '../config/logger.js';
import { SearchRequest } from '../middleware/correlation.middleware.js';
import { CONTROLLED_VOCABULARIES } from '../shared/constants/controlled-vocabularies.js';
import { clerkRequireAuth } from '../middleware/clerk-auth.middleware.js';
import {
  attachUserRole,
  requireAdmin,
  RoleAuthenticatedRequest,
  isAdmin,
  isOwner,
} from '../middleware/role.middleware.js';
import { toolsMutationLimiter } from '../middleware/rate-limiters.js';
import { getErrorMessage } from '#utils/error-handling.js';

const router = Router();

/**
 * Middleware to validate request body with Zod schema
 */
const validateBody = (schema: z.ZodSchema<unknown>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      const searchReq = req as SearchRequest;

      if (error instanceof ZodError) {
        searchLogger.logSecurityEvent('Validation failed', {
          correlationId: searchReq.correlationId,
          service: 'tools-api',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          errors: error.errors,
          body: req.body,
          timestamp: new Date().toISOString(),
        }, 'warn');

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((err: ZodIssue) => ({
            field: err.path?.join('.') || 'unknown',
            message: err.message,
          })),
        });
      }

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: [{ message: getErrorMessage(error) }],
      });
    }
  };
};

/**
 * Middleware to validate query parameters with Zod schema
 */
const validateQuery = <T>(schema: z.ZodSchema<T>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedQuery = schema.parse(req.query);
      // Store validated query in a custom property instead of overwriting req.query
      (req as Request & { validatedQuery: T }).validatedQuery = validatedQuery;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((err: ZodIssue) => ({
            field: err.path?.join('.') || 'unknown',
            message: err.message,
          })),
        });
      }

      return res.status(400).json({
        error: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: [{ message: getErrorMessage(error) }],
      });
    }
  };
};

/**
 * GET /api/tools - List tools with pagination and filtering (public)
 * Returns only approved tools - no authentication required
 */
router.get('/', validateQuery(GetToolsQuerySchema), async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;
  const startTime = Date.now();

  try {
    const query = (req as Request & { validatedQuery: GetToolsQuery }).validatedQuery;
    const result = await toolCrudService.getTools(query);

    searchLogger.info('Tools list retrieved', {
      service: 'tools-api',
      correlationId: searchReq.correlationId,
      page: query.page,
      limit: query.limit,
      total: result.pagination.total,
      executionTimeMs: Date.now() - startTime,
    });

    res.json(result);
  } catch (error) {
    searchLogger.error('Failed to retrieve tools', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'tools-api',
      correlationId: searchReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed to retrieve tools',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/tools/vocabularies - Get controlled vocabularies for forms (protected)
 */
router.get('/vocabularies', clerkRequireAuth, attachUserRole, (_req: Request, res: Response) => {
  res.json({
    categories: CONTROLLED_VOCABULARIES.categories,
    industries: CONTROLLED_VOCABULARIES.industries,
    userTypes: CONTROLLED_VOCABULARIES.userTypes,
    interface: CONTROLLED_VOCABULARIES.interface,
    functionality: CONTROLLED_VOCABULARIES.functionality,
    deployment: CONTROLLED_VOCABULARIES.deployment,
    pricingModels: CONTROLLED_VOCABULARIES.pricingModels,
    billingPeriods: CONTROLLED_VOCABULARIES.billingPeriods,
  });
});

/**
 * GET /api/tools/my-tools - Get authenticated user's own tools
 * NOTE: This route MUST be defined before /:id to avoid matching "my-tools" as an ID
 */
router.get('/my-tools', clerkRequireAuth, attachUserRole, validateQuery(GetMyToolsQuerySchema), async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const startTime = Date.now();

  try {
    const query = (req as Request & { validatedQuery: GetMyToolsQuery }).validatedQuery;
    const result = await toolCrudService.getToolsByContributor(authReq.auth.userId, query);

    searchLogger.info('User tools retrieved', {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      userId: authReq.auth.userId,
      total: result.pagination.total,
      executionTimeMs: Date.now() - startTime,
    });

    res.json(result);
  } catch (error) {
    searchLogger.error('Failed to retrieve user tools', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'tools-api',
      correlationId: authReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed to retrieve tools',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/tools/admin - Admin dashboard: list all tools with full filtering
 * NOTE: This route MUST be defined before /:id to avoid matching "admin" as an ID
 */
router.get('/admin', clerkRequireAuth, attachUserRole, requireAdmin, validateQuery(GetAdminToolsQuerySchema), async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const startTime = Date.now();

  try {
    const query = (req as Request & { validatedQuery: GetAdminToolsQuery }).validatedQuery;
    const result = await toolCrudService.getAdminTools(query);

    searchLogger.info('Admin tools list retrieved', {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      userId: authReq.auth.userId,
      page: query.page,
      limit: query.limit,
      approvalStatus: query.approvalStatus,
      total: result.pagination.total,
      executionTimeMs: Date.now() - startTime,
    });

    res.json(result);
  } catch (error) {
    searchLogger.error('Failed to retrieve admin tools', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'tools-api',
      correlationId: authReq.correlationId,
    });

    res.status(500).json({
      error: 'Failed to retrieve tools',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/tools/:id - Get a single tool by ID (protected)
 * - Admins can view any tool regardless of approval status
 * - Maintainers can view their own tools regardless of approval status
 * - For other tools, only approved tools are returned
 */
router.get('/:id', clerkRequireAuth, attachUserRole, async (req: Request, res: Response) => {
  const searchReq = req as RoleAuthenticatedRequest & SearchRequest;
  const { id } = req.params;

  try {
    // First, try to get the tool without approval filter to check ownership
    const tool = await toolCrudService.getToolById(id, false);

    if (!tool) {
      return res.status(404).json({
        error: 'Tool not found',
        code: 'NOT_FOUND',
      });
    }

    // Check access permissions
    const userIsAdmin = isAdmin(searchReq);
    const userIsOwner = isOwner(searchReq, tool.contributor);

    // If tool is not approved, only admin or owner can view it
    if (tool.approvalStatus !== 'approved' && !userIsAdmin && !userIsOwner) {
      return res.status(404).json({
        error: 'Tool not found',
        code: 'NOT_FOUND',
      });
    }

    res.json(tool);
  } catch (error) {
    searchLogger.error('Failed to retrieve tool', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'tools-api',
      correlationId: searchReq.correlationId,
      toolId: id,
    });

    res.status(500).json({
      error: 'Failed to retrieve tool',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/tools - Create a new tool (protected, rate limited)
 * - Maintainers: Tool created in 'pending' state
 * - Admins: Tool created in 'approved' state
 * - Rate limit: 10 requests per 5 minutes
 */
router.post('/', clerkRequireAuth, attachUserRole, toolsMutationLimiter, validateBody(CreateToolSchema), async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const startTime = Date.now();

  try {
    // Check if tool with same ID already exists
    const exists = await toolCrudService.toolExists(req.body.id);
    if (exists) {
      return res.status(409).json({
        error: 'Tool with this ID already exists',
        code: 'CONFLICT',
        field: 'id',
      });
    }

    // Admin-created tools are auto-approved
    const userIsAdmin = isAdmin(req);
    const tool = await toolCrudService.createTool(req.body, authReq.auth.userId, userIsAdmin);

    searchLogger.info('Tool created', {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: tool.id,
      toolName: tool.name,
      userId: authReq.auth.userId,
      userRole: authReq.userRole,
      approvalStatus: tool.approvalStatus,
      executionTimeMs: Date.now() - startTime,
    });

    res.status(201).json(tool);
  } catch (error) {
    searchLogger.error('Failed to create tool', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      body: req.body,
    });

    // Handle MongoDB duplicate key errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      const mongoError = error as { keyPattern?: Record<string, unknown> };
      const field = Object.keys(mongoError.keyPattern || {})[0] || 'unknown';
      return res.status(409).json({
        error: `Tool with this ${field} already exists`,
        code: 'CONFLICT',
        field,
      });
    }

    res.status(500).json({
      error: 'Failed to create tool',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PATCH /api/tools/:id - Update a tool (protected, rate limited)
 * - Maintainers: Can only edit their own tools while in 'pending' status
 * - Admins: Can edit any tool
 * - Rate limit: 10 requests per 5 minutes
 */
router.patch('/:id', clerkRequireAuth, attachUserRole, toolsMutationLimiter, validateBody(UpdateToolSchema), async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const { id } = req.params;

  try {
    // First, get the tool to check ownership and status
    const existingTool = await toolCrudService.getToolById(id, false); // false = don't filter by approval status

    if (!existingTool) {
      return res.status(404).json({
        error: 'Tool not found',
        code: 'NOT_FOUND',
      });
    }

    // Check permissions
    const userIsAdmin = isAdmin(req);
    const userIsOwner = isOwner(req, existingTool.contributor);

    if (!userIsAdmin) {
      // Maintainers can only edit their own tools
      if (!userIsOwner) {
        searchLogger.logSecurityEvent('Unauthorized tool update attempt', {
          service: 'tools-api',
          correlationId: authReq.correlationId,
          userId: authReq.auth.userId,
          toolId: id,
          toolOwner: existingTool.contributor,
        }, 'warn');

        return res.status(403).json({
          error: 'You can only edit your own tools',
          code: 'FORBIDDEN',
        });
      }

      // Maintainers can only edit tools in 'pending' status
      if (existingTool.approvalStatus !== 'pending') {
        return res.status(403).json({
          error: 'You can only edit tools that are pending approval',
          code: 'FORBIDDEN',
          approvalStatus: existingTool.approvalStatus,
        });
      }
    }

    const tool = await toolCrudService.updateTool(id, req.body);

    searchLogger.info('Tool updated', {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: id,
      userId: authReq.auth.userId,
      userRole: authReq.userRole,
    });

    res.json(tool);
  } catch (error) {
    searchLogger.error('Failed to update tool', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: id,
    });

    res.status(500).json({
      error: 'Failed to update tool',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * DELETE /api/tools/:id - Delete a tool (admin only)
 */
router.delete('/:id', clerkRequireAuth, attachUserRole, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const { id } = req.params;

  try {
    const deleted = await toolCrudService.deleteTool(id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Tool not found',
        code: 'NOT_FOUND',
      });
    }

    searchLogger.info('Tool deleted', {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: id,
      userId: authReq.auth.userId,
      userRole: authReq.userRole,
    });

    res.status(204).send();
  } catch (error) {
    searchLogger.error('Failed to delete tool', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: id,
    });

    res.status(500).json({
      error: 'Failed to delete tool',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PATCH /api/tools/:id/approve - Approve a tool (admin only)
 */
router.patch('/:id/approve', clerkRequireAuth, attachUserRole, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const { id } = req.params;

  try {
    // First check if tool exists and its current status
    const existingTool = await toolCrudService.getToolById(id, false);

    if (!existingTool) {
      return res.status(404).json({
        error: 'Tool not found',
        code: 'NOT_FOUND',
      });
    }

    // Check if tool is already approved
    if (existingTool.approvalStatus === 'approved') {
      return res.status(400).json({
        error: 'Tool is already approved',
        code: 'VALIDATION_ERROR',
        currentStatus: existingTool.approvalStatus,
      });
    }

    const tool = await toolCrudService.approveTool(id, authReq.auth.userId);

    searchLogger.info('Tool approved', {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: id,
      approvedBy: authReq.auth.userId,
    });

    res.json(tool);
  } catch (error) {
    searchLogger.error('Failed to approve tool', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: id,
    });

    res.status(500).json({
      error: 'Failed to approve tool',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PATCH /api/tools/:id/reject - Reject a tool (admin only)
 */
router.patch('/:id/reject', clerkRequireAuth, attachUserRole, requireAdmin, validateBody(RejectToolSchema), async (req: Request, res: Response) => {
  const authReq = req as RoleAuthenticatedRequest & SearchRequest;
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const tool = await toolCrudService.rejectTool(id, authReq.auth.userId, reason);

    if (!tool) {
      return res.status(404).json({
        error: 'Tool not found',
        code: 'NOT_FOUND',
      });
    }

    searchLogger.info('Tool rejected', {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: id,
      rejectedBy: authReq.auth.userId,
      reason,
    });

    res.json(tool);
  } catch (error) {
    searchLogger.error('Failed to reject tool', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: id,
    });

    res.status(500).json({
      error: 'Failed to reject tool',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;

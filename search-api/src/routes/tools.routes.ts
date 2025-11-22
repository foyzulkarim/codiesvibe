import { Router, Request, Response, NextFunction } from 'express';
import { toolCrudService } from '../services/tool-crud.service';
import { CreateToolSchema, UpdateToolSchema, GetToolsQuerySchema } from '../schemas/tool.schema';
import { searchLogger } from '../config/logger';
import { SearchRequest } from '../middleware/correlation.middleware';
import { CONTROLLED_VOCABULARIES } from '../shared/constants/controlled-vocabularies';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * Middleware to validate request body with Zod schema
 */
const validateBody = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error: any) {
      const searchReq = req as SearchRequest;
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
        details: error.errors?.map((err: any) => ({
          field: err.path?.join('.') || 'unknown',
          message: err.message,
        })) || [{ message: error.message }],
      });
    }
  };
};

/**
 * Middleware to validate query parameters with Zod schema
 */
const validateQuery = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery;
      next();
    } catch (error: any) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: error.errors?.map((err: any) => ({
          field: err.path?.join('.') || 'unknown',
          message: err.message,
        })) || [{ message: error.message }],
      });
    }
  };
};

/**
 * GET /api/tools - List tools with pagination and filtering
 */
router.get('/', validateQuery(GetToolsQuerySchema), async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;
  const startTime = Date.now();

  try {
    const query = req.query as any;
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
 * GET /api/tools/vocabularies - Get controlled vocabularies for forms
 */
router.get('/vocabularies', (_req: Request, res: Response) => {
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
 * GET /api/tools/:id - Get a single tool by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;
  const { id } = req.params;

  try {
    const tool = await toolCrudService.getToolById(id);

    if (!tool) {
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
 * POST /api/tools - Create a new tool (protected)
 */
router.post('/', authenticateJWT, validateBody(CreateToolSchema), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
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

    const tool = await toolCrudService.createTool(req.body);

    searchLogger.info('Tool created', {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: tool.id,
      toolName: tool.name,
      userId: authReq.user?.userId,
      executionTimeMs: Date.now() - startTime,
    });

    res.status(201).json(tool);
  } catch (error: any) {
    searchLogger.error('Failed to create tool', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      body: req.body,
    });

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const details = Object.entries(error.errors || {}).map(([field, err]: [string, any]) => ({
        field,
        message: err.message,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'unknown';
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
 * PATCH /api/tools/:id - Update a tool (protected)
 */
router.patch('/:id', authenticateJWT, validateBody(UpdateToolSchema), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    const tool = await toolCrudService.updateTool(id, req.body);

    if (!tool) {
      return res.status(404).json({
        error: 'Tool not found',
        code: 'NOT_FOUND',
      });
    }

    searchLogger.info('Tool updated', {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: id,
      userId: authReq.user?.userId,
    });

    res.json(tool);
  } catch (error: any) {
    searchLogger.error('Failed to update tool', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'tools-api',
      correlationId: authReq.correlationId,
      toolId: id,
    });

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const details = Object.entries(error.errors || {}).map(([field, err]: [string, any]) => ({
        field,
        message: err.message,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      });
    }

    res.status(500).json({
      error: 'Failed to update tool',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * DELETE /api/tools/:id - Delete a tool (protected)
 */
router.delete('/:id', authenticateJWT, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
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
      userId: authReq.user?.userId,
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

export default router;

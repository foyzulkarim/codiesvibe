import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authService } from '../services/auth.service';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
} from '../schemas/auth.schema';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { searchLogger } from '../config/logger';
import { SearchRequest } from '../middleware/correlation.middleware';

const router = Router();

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per 15 minutes
  message: {
    error: 'Too many authentication attempts',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const searchReq = req as SearchRequest;
    searchLogger.logSecurityEvent('Auth rate limit exceeded', {
      correlationId: searchReq.correlationId,
      service: 'auth-api',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    }, 'warn');
    res.status(429).json({
      error: 'Too many authentication attempts',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes',
    });
  },
});

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
      searchLogger.logSecurityEvent('Auth validation failed', {
        correlationId: searchReq.correlationId,
        service: 'auth-api',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        errors: error.errors,
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
 * POST /api/auth/register - Register a new user
 */
router.post('/register', authLimiter, validateBody(RegisterSchema), async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;
  const startTime = Date.now();

  try {
    const result = await authService.register(req.body);

    searchLogger.info('User registration successful', {
      service: 'auth-api',
      correlationId: searchReq.correlationId,
      userId: result.user.id,
      email: result.user.email,
      executionTimeMs: Date.now() - startTime,
    });

    res.status(201).json(result);
  } catch (error: any) {
    searchLogger.error('User registration failed', error, {
      service: 'auth-api',
      correlationId: searchReq.correlationId,
      email: req.body.email,
    });

    // Handle duplicate email error
    if (error.message === 'User with this email already exists') {
      return res.status(409).json({
        error: 'Registration failed',
        code: 'EMAIL_EXISTS',
        message: 'A user with this email already exists',
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An error occurred during registration'
        : error.message,
    });
  }
});

/**
 * POST /api/auth/login - Login user
 */
router.post('/login', authLimiter, validateBody(LoginSchema), async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;
  const startTime = Date.now();

  try {
    const result = await authService.login(req.body);

    searchLogger.info('User login successful', {
      service: 'auth-api',
      correlationId: searchReq.correlationId,
      userId: result.user.id,
      email: result.user.email,
      executionTimeMs: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    searchLogger.logSecurityEvent('Login failed', {
      correlationId: searchReq.correlationId,
      service: 'auth-api',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body.email,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, 'warn');

    // Generic error message to prevent user enumeration
    res.status(401).json({
      error: 'Authentication failed',
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  }
});

/**
 * POST /api/auth/logout - Logout user (invalidate refresh token)
 */
router.post('/logout', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const searchReq = req as SearchRequest;

  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    await authService.logout(req.user.userId);

    searchLogger.info('User logout successful', {
      service: 'auth-api',
      correlationId: searchReq.correlationId,
      userId: req.user.userId,
    });

    res.json({
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    searchLogger.error('Logout failed', error, {
      service: 'auth-api',
      correlationId: searchReq.correlationId,
      userId: req.user?.userId,
    });

    res.status(500).json({
      error: 'Logout failed',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/auth/me - Get current user profile
 */
router.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const searchReq = req as SearchRequest;

  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    res.json(user);
  } catch (error: any) {
    searchLogger.error('Failed to get user profile', error, {
      service: 'auth-api',
      correlationId: searchReq.correlationId,
      userId: req.user?.userId,
    });

    res.status(500).json({
      error: 'Failed to retrieve profile',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/auth/refresh - Refresh access token
 */
router.post('/refresh', validateBody(RefreshTokenSchema), async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;

  try {
    const tokens = await authService.refreshToken(req.body.refreshToken);

    searchLogger.info('Token refresh successful', {
      service: 'auth-api',
      correlationId: searchReq.correlationId,
    });

    res.json(tokens);
  } catch (error: any) {
    searchLogger.logSecurityEvent('Token refresh failed', {
      correlationId: searchReq.correlationId,
      service: 'auth-api',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error.message,
      timestamp: new Date().toISOString(),
    }, 'warn');

    res.status(401).json({
      error: 'Token refresh failed',
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid or expired refresh token',
    });
  }
});

/**
 * PATCH /api/auth/profile - Update user profile
 */
router.patch('/profile', authenticateJWT, validateBody(UpdateProfileSchema), async (req: AuthenticatedRequest, res: Response) => {
  const searchReq = req as SearchRequest;

  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    const user = await authService.updateProfile(req.user.userId, req.body);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    searchLogger.info('User profile updated', {
      service: 'auth-api',
      correlationId: searchReq.correlationId,
      userId: req.user.userId,
    });

    res.json(user);
  } catch (error: any) {
    searchLogger.error('Failed to update profile', error, {
      service: 'auth-api',
      correlationId: searchReq.correlationId,
      userId: req.user?.userId,
    });

    if (error.message === 'Email is already in use') {
      return res.status(409).json({
        error: 'Update failed',
        code: 'EMAIL_EXISTS',
        message: 'Email is already in use',
      });
    }

    res.status(500).json({
      error: 'Failed to update profile',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/auth/change-password - Change user password
 */
router.post('/change-password', authenticateJWT, validateBody(ChangePasswordSchema), async (req: AuthenticatedRequest, res: Response) => {
  const searchReq = req as SearchRequest;

  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    await authService.changePassword(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword
    );

    searchLogger.info('User password changed', {
      service: 'auth-api',
      correlationId: searchReq.correlationId,
      userId: req.user.userId,
    });

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    searchLogger.error('Failed to change password', error, {
      service: 'auth-api',
      correlationId: searchReq.correlationId,
      userId: req.user?.userId,
    });

    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        error: 'Password change failed',
        code: 'INVALID_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    res.status(500).json({
      error: 'Failed to change password',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;

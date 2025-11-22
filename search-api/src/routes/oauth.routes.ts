import { Router, Request, Response } from 'express';
import { oauthService } from '../services/oauth.service';
import { searchLogger } from '../config/logger';
import { SearchRequest } from '../middleware/correlation.middleware';
import crypto from 'crypto';

const router = Router();

// Store state tokens temporarily (in production, use Redis or similar)
const stateTokens = new Map<string, { timestamp: number }>();

// Clean up expired state tokens (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of stateTokens.entries()) {
    if (now - value.timestamp > 10 * 60 * 1000) {
      stateTokens.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Generate a secure state token for CSRF protection
 */
function generateStateToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  stateTokens.set(token, { timestamp: Date.now() });
  return token;
}

/**
 * Validate state token
 */
function validateStateToken(token: string): boolean {
  const stored = stateTokens.get(token);
  if (!stored) return false;

  // Token is valid for 10 minutes
  const isValid = Date.now() - stored.timestamp < 10 * 60 * 1000;

  // Delete token after validation (one-time use)
  stateTokens.delete(token);

  return isValid;
}

/**
 * GET /api/auth/oauth/github - Initiate GitHub OAuth flow
 */
router.get('/github', (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;

  try {
    const state = generateStateToken();
    const authUrl = oauthService.getGitHubAuthUrl(state);

    searchLogger.info('GitHub OAuth initiated', {
      service: 'oauth-routes',
      correlationId: searchReq.correlationId,
    });

    res.redirect(authUrl);
  } catch (error: any) {
    searchLogger.error('GitHub OAuth initiation failed', error, {
      service: 'oauth-routes',
      correlationId: searchReq.correlationId,
    });

    res.redirect(oauthService.getFrontendErrorUrl('Failed to initiate GitHub login'));
  }
});

/**
 * GET /api/auth/oauth/github/callback - Handle GitHub OAuth callback
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;
  const { code, state, error } = req.query;

  try {
    // Check for OAuth error
    if (error) {
      searchLogger.warn('GitHub OAuth error', {
        service: 'oauth-routes',
        correlationId: searchReq.correlationId,
        error,
      });
      return res.redirect(oauthService.getFrontendErrorUrl(error as string));
    }

    // Validate code
    if (!code || typeof code !== 'string') {
      return res.redirect(oauthService.getFrontendErrorUrl('Missing authorization code'));
    }

    // Validate state token (CSRF protection)
    if (!state || typeof state !== 'string' || !validateStateToken(state)) {
      searchLogger.logSecurityEvent('Invalid OAuth state token', {
        service: 'oauth-routes',
        correlationId: searchReq.correlationId,
        provider: 'github',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      }, 'warn');
      return res.redirect(oauthService.getFrontendErrorUrl('Invalid state token'));
    }

    // Handle callback
    const result = await oauthService.handleGitHubCallback(code);

    searchLogger.info('GitHub OAuth callback successful', {
      service: 'oauth-routes',
      correlationId: searchReq.correlationId,
      userId: result.user.id,
      email: result.user.email,
    });

    // Redirect to frontend with tokens
    res.redirect(oauthService.getFrontendRedirectUrl(result.tokens, result.user));
  } catch (error: any) {
    searchLogger.error('GitHub OAuth callback failed', error, {
      service: 'oauth-routes',
      correlationId: searchReq.correlationId,
    });

    res.redirect(oauthService.getFrontendErrorUrl('Authentication failed'));
  }
});

/**
 * GET /api/auth/oauth/google - Initiate Google OAuth flow
 */
router.get('/google', (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;

  try {
    const state = generateStateToken();
    const authUrl = oauthService.getGoogleAuthUrl(state);

    searchLogger.info('Google OAuth initiated', {
      service: 'oauth-routes',
      correlationId: searchReq.correlationId,
    });

    res.redirect(authUrl);
  } catch (error: any) {
    searchLogger.error('Google OAuth initiation failed', error, {
      service: 'oauth-routes',
      correlationId: searchReq.correlationId,
    });

    res.redirect(oauthService.getFrontendErrorUrl('Failed to initiate Google login'));
  }
});

/**
 * GET /api/auth/oauth/google/callback - Handle Google OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  const searchReq = req as SearchRequest;
  const { code, state, error } = req.query;

  try {
    // Check for OAuth error
    if (error) {
      searchLogger.warn('Google OAuth error', {
        service: 'oauth-routes',
        correlationId: searchReq.correlationId,
        error,
      });
      return res.redirect(oauthService.getFrontendErrorUrl(error as string));
    }

    // Validate code
    if (!code || typeof code !== 'string') {
      return res.redirect(oauthService.getFrontendErrorUrl('Missing authorization code'));
    }

    // Validate state token (CSRF protection)
    if (!state || typeof state !== 'string' || !validateStateToken(state)) {
      searchLogger.logSecurityEvent('Invalid OAuth state token', {
        service: 'oauth-routes',
        correlationId: searchReq.correlationId,
        provider: 'google',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      }, 'warn');
      return res.redirect(oauthService.getFrontendErrorUrl('Invalid state token'));
    }

    // Handle callback
    const result = await oauthService.handleGoogleCallback(code);

    searchLogger.info('Google OAuth callback successful', {
      service: 'oauth-routes',
      correlationId: searchReq.correlationId,
      userId: result.user.id,
      email: result.user.email,
    });

    // Redirect to frontend with tokens
    res.redirect(oauthService.getFrontendRedirectUrl(result.tokens, result.user));
  } catch (error: any) {
    searchLogger.error('Google OAuth callback failed', error, {
      service: 'oauth-routes',
      correlationId: searchReq.correlationId,
    });

    res.redirect(oauthService.getFrontendErrorUrl('Authentication failed'));
  }
});

export default router;

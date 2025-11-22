/**
 * OAuth Service Unit Tests
 */

// Mock dependencies before importing
jest.mock('../../../config/logger', () => ({
  searchLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logSecurityEvent: jest.fn(),
  },
}));

// Set test environment variables
const originalEnv = process.env;

describe('OAuthService', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear OAuth environment variables
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Configuration Validation', () => {
    it('should return false when GitHub is not configured', async () => {
      const { oauthService } = await import('../../../services/oauth.service');

      expect(oauthService.isGitHubConfigured()).toBe(false);
    });

    it('should return true when GitHub is fully configured', async () => {
      process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
      process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';

      const { oauthService } = await import('../../../services/oauth.service');

      expect(oauthService.isGitHubConfigured()).toBe(true);
    });

    it('should return false when Google is not configured', async () => {
      const { oauthService } = await import('../../../services/oauth.service');

      expect(oauthService.isGoogleConfigured()).toBe(false);
    });

    it('should return true when Google is fully configured', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

      const { oauthService } = await import('../../../services/oauth.service');

      expect(oauthService.isGoogleConfigured()).toBe(true);
    });

    it('should return false when only client ID is set (partial config)', async () => {
      process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
      // GITHUB_CLIENT_SECRET is not set

      const { oauthService } = await import('../../../services/oauth.service');

      expect(oauthService.isGitHubConfigured()).toBe(false);
    });
  });

  describe('Authorization URLs', () => {
    beforeEach(() => {
      process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
      process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    });

    it('should generate a valid GitHub authorization URL', async () => {
      const { oauthService } = await import('../../../services/oauth.service');

      const url = oauthService.getGitHubAuthUrl('test-state');

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test-github-client-id');
      expect(url).toContain('state=test-state');
      expect(url).toContain('scope=user%3Aemail');
    });

    it('should generate a valid Google authorization URL', async () => {
      const { oauthService } = await import('../../../services/oauth.service');

      const url = oauthService.getGoogleAuthUrl('test-state');

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-google-client-id');
      expect(url).toContain('state=test-state');
      expect(url).toContain('scope=email');
      expect(url).toContain('response_type=code');
    });

    it('should handle empty state parameter', async () => {
      const { oauthService } = await import('../../../services/oauth.service');

      const url = oauthService.getGitHubAuthUrl();

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('state=');
    });
  });

  describe('Frontend Redirect URLs', () => {
    it('should generate correct frontend success redirect URL', async () => {
      process.env.FRONTEND_URL = 'http://localhost:3000';

      const { oauthService } = await import('../../../services/oauth.service');

      const tokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 86400,
        tokenType: 'Bearer' as const,
      };

      const user = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const url = oauthService.getFrontendRedirectUrl(tokens, user);

      expect(url).toContain('http://localhost:3000/oauth/callback');
      expect(url).toContain('accessToken=test-access-token');
      expect(url).toContain('refreshToken=test-refresh-token');
      expect(url).toContain('userId=test-user-id');
      expect(url).toContain('userName=Test+User');
      expect(url).toContain('userEmail=test%40example.com');
    });

    it('should generate correct frontend error redirect URL', async () => {
      process.env.FRONTEND_URL = 'http://localhost:3000';

      const { oauthService } = await import('../../../services/oauth.service');

      const url = oauthService.getFrontendErrorUrl('Authentication failed');

      expect(url).toContain('http://localhost:3000/oauth/callback');
      expect(url).toContain('error=Authentication+failed');
    });

    it('should encode special characters in error message', async () => {
      process.env.FRONTEND_URL = 'http://localhost:3000';

      const { oauthService } = await import('../../../services/oauth.service');

      const url = oauthService.getFrontendErrorUrl('Error: Invalid token & request');

      expect(url).toContain('error=Error');
      // Special characters should be URL encoded
      expect(url).not.toContain('&request');
    });
  });

  describe('validateConfiguration', () => {
    it('should log warnings for partial GitHub configuration', async () => {
      const { searchLogger } = await import('../../../config/logger');

      process.env.GITHUB_CLIENT_ID = 'test-id';
      // Missing GITHUB_CLIENT_SECRET

      const { oauthService } = await import('../../../services/oauth.service');
      oauthService.validateConfiguration();

      expect(searchLogger.warn).toHaveBeenCalledWith(
        'GitHub OAuth partially configured - missing GITHUB_CLIENT_SECRET',
        expect.any(Object)
      );
    });

    it('should log info when OAuth is not configured', async () => {
      const { searchLogger } = await import('../../../config/logger');

      // No OAuth credentials set
      const { oauthService } = await import('../../../services/oauth.service');
      oauthService.validateConfiguration();

      expect(searchLogger.info).toHaveBeenCalledWith(
        'GitHub OAuth not configured - OAuth login disabled for GitHub',
        expect.any(Object)
      );
    });

    it('should not log warnings when fully configured', async () => {
      const { searchLogger } = await import('../../../config/logger');

      process.env.GITHUB_CLIENT_ID = 'test-id';
      process.env.GITHUB_CLIENT_SECRET = 'test-secret';
      process.env.GOOGLE_CLIENT_ID = 'test-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-secret';

      const { oauthService } = await import('../../../services/oauth.service');
      oauthService.validateConfiguration();

      expect(searchLogger.warn).not.toHaveBeenCalled();
    });
  });
});

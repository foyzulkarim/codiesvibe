import axios from 'axios';
import { User, IUser, OAuthProvider } from '../models/user.model';
import { authService } from './auth.service';
import { searchLogger } from '../config/logger';
import { TokenResponse, AuthResponse, UserResponse } from '../schemas/auth.schema';

// OAuth configuration from environment
const getOAuthConfig = () => ({
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:4003/api/auth/oauth/github/callback',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    userEmailsUrl: 'https://api.github.com/user/emails',
    scope: 'user:email read:user',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4003/api/auth/oauth/google/callback',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'email profile',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// GitHub user profile type
interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

// GitHub email type
interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

// Google user profile type
interface GoogleUser {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

// Convert IUser to UserResponse
function toUserResponse(user: IUser): UserResponse {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin?.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

class OAuthService {
  private configWarningsLogged = false;

  /**
   * Check if GitHub OAuth is properly configured
   */
  isGitHubConfigured(): boolean {
    const config = getOAuthConfig().github;
    return !!(config.clientId && config.clientSecret);
  }

  /**
   * Check if Google OAuth is properly configured
   */
  isGoogleConfigured(): boolean {
    const config = getOAuthConfig().google;
    return !!(config.clientId && config.clientSecret);
  }

  /**
   * Validate OAuth configuration and log warnings
   */
  validateConfiguration(): void {
    if (this.configWarningsLogged) return;
    this.configWarningsLogged = true;

    const config = getOAuthConfig();

    // Check GitHub configuration
    if (config.github.clientId && !config.github.clientSecret) {
      searchLogger.warn('GitHub OAuth partially configured - missing GITHUB_CLIENT_SECRET', {
        service: 'oauth-service',
      });
    } else if (!config.github.clientId && config.github.clientSecret) {
      searchLogger.warn('GitHub OAuth partially configured - missing GITHUB_CLIENT_ID', {
        service: 'oauth-service',
      });
    } else if (!config.github.clientId && !config.github.clientSecret) {
      searchLogger.info('GitHub OAuth not configured - OAuth login disabled for GitHub', {
        service: 'oauth-service',
      });
    }

    // Check Google configuration
    if (config.google.clientId && !config.google.clientSecret) {
      searchLogger.warn('Google OAuth partially configured - missing GOOGLE_CLIENT_SECRET', {
        service: 'oauth-service',
      });
    } else if (!config.google.clientId && config.google.clientSecret) {
      searchLogger.warn('Google OAuth partially configured - missing GOOGLE_CLIENT_ID', {
        service: 'oauth-service',
      });
    } else if (!config.google.clientId && !config.google.clientSecret) {
      searchLogger.info('Google OAuth not configured - OAuth login disabled for Google', {
        service: 'oauth-service',
      });
    }
  }

  /**
   * Get GitHub authorization URL
   */
  getGitHubAuthUrl(state?: string): string {
    const config = getOAuthConfig().github;
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: config.scope,
      state: state || '',
    });
    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Get Google authorization URL
   */
  getGoogleAuthUrl(state?: string): string {
    const config = getOAuthConfig().google;
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: config.scope,
      access_type: 'offline',
      state: state || '',
    });
    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange GitHub code for access token
   */
  async getGitHubAccessToken(code: string): Promise<string> {
    const config = getOAuthConfig().github;

    const response = await axios.post(
      config.tokenUrl,
      {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.callbackUrl,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error_description || 'Failed to get GitHub access token');
    }

    return response.data.access_token;
  }

  /**
   * Exchange Google code for access token
   */
  async getGoogleAccessToken(code: string): Promise<string> {
    const config = getOAuthConfig().google;

    const response = await axios.post(config.tokenUrl, {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
      grant_type: 'authorization_code',
    });

    if (response.data.error) {
      throw new Error(response.data.error_description || 'Failed to get Google access token');
    }

    return response.data.access_token;
  }

  /**
   * Get GitHub user profile
   */
  async getGitHubUser(accessToken: string): Promise<{ user: GitHubUser; email: string }> {
    const config = getOAuthConfig().github;

    // Get user profile
    const userResponse = await axios.get<GitHubUser>(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    let email = userResponse.data.email;

    // If email is not public, fetch from emails endpoint
    if (!email) {
      const emailsResponse = await axios.get<GitHubEmail[]>(config.userEmailsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      // Find primary verified email
      const primaryEmail = emailsResponse.data.find((e) => e.primary && e.verified);
      email = primaryEmail?.email || emailsResponse.data[0]?.email || '';
    }

    if (!email) {
      throw new Error('Unable to get email from GitHub');
    }

    return { user: userResponse.data, email };
  }

  /**
   * Get Google user profile
   */
  async getGoogleUser(accessToken: string): Promise<GoogleUser> {
    const config = getOAuthConfig().google;

    const response = await axios.get<GoogleUser>(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.data.email) {
      throw new Error('Unable to get email from Google');
    }

    return response.data;
  }

  /**
   * Handle GitHub OAuth callback
   */
  async handleGitHubCallback(code: string): Promise<AuthResponse> {
    await authService.ensureConnection();

    // Exchange code for access token
    const accessToken = await this.getGitHubAccessToken(code);

    // Get user profile
    const { user: githubUser, email } = await this.getGitHubUser(accessToken);

    // Find or create user
    let user = await User.findOne({
      $or: [
        { oauthProvider: 'github', oauthId: githubUser.id.toString() },
        { email },
      ],
    });

    if (user) {
      // Update existing user with GitHub info if not already linked
      if (user.oauthProvider === 'local') {
        user.oauthProvider = 'github';
        user.oauthId = githubUser.id.toString();
        user.avatarUrl = githubUser.avatar_url;
      }
      user.lastLogin = new Date();
      await user.save();

      searchLogger.info('GitHub OAuth login successful', {
        service: 'oauth-service',
        userId: user._id.toString(),
        email: user.email,
        provider: 'github',
      });
    } else {
      // Create new user
      user = new User({
        email,
        name: githubUser.name || githubUser.login,
        oauthProvider: 'github',
        oauthId: githubUser.id.toString(),
        avatarUrl: githubUser.avatar_url,
        role: 'user',
        lastLogin: new Date(),
      });
      await user.save();

      searchLogger.info('GitHub OAuth registration successful', {
        service: 'oauth-service',
        userId: user._id.toString(),
        email: user.email,
        provider: 'github',
      });
    }

    // Generate JWT tokens
    const tokens = authService.generateTokens(user);

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      user: toUserResponse(user),
      tokens,
    };
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(code: string): Promise<AuthResponse> {
    await authService.ensureConnection();

    // Exchange code for access token
    const accessToken = await this.getGoogleAccessToken(code);

    // Get user profile
    const googleUser = await this.getGoogleUser(accessToken);

    // Find or create user
    let user = await User.findOne({
      $or: [
        { oauthProvider: 'google', oauthId: googleUser.id },
        { email: googleUser.email },
      ],
    });

    if (user) {
      // Update existing user with Google info if not already linked
      if (user.oauthProvider === 'local') {
        user.oauthProvider = 'google';
        user.oauthId = googleUser.id;
        user.avatarUrl = googleUser.picture;
      }
      user.lastLogin = new Date();
      await user.save();

      searchLogger.info('Google OAuth login successful', {
        service: 'oauth-service',
        userId: user._id.toString(),
        email: user.email,
        provider: 'google',
      });
    } else {
      // Create new user
      user = new User({
        email: googleUser.email,
        name: googleUser.name,
        oauthProvider: 'google',
        oauthId: googleUser.id,
        avatarUrl: googleUser.picture,
        role: 'user',
        lastLogin: new Date(),
      });
      await user.save();

      searchLogger.info('Google OAuth registration successful', {
        service: 'oauth-service',
        userId: user._id.toString(),
        email: user.email,
        provider: 'google',
      });
    }

    // Generate JWT tokens
    const tokens = authService.generateTokens(user);

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      user: toUserResponse(user),
      tokens,
    };
  }

  /**
   * Get frontend redirect URL with tokens
   */
  getFrontendRedirectUrl(tokens: TokenResponse, user: UserResponse): string {
    const config = getOAuthConfig();
    const params = new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn.toString(),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
    });
    return `${config.frontendUrl}/auth/callback?${params.toString()}`;
  }

  /**
   * Get frontend error redirect URL
   */
  getFrontendErrorUrl(error: string): string {
    const config = getOAuthConfig();
    const params = new URLSearchParams({
      error,
    });
    return `${config.frontendUrl}/auth/callback?${params.toString()}`;
  }
}

// Export singleton instance
export const oauthService = new OAuthService();

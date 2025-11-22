import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User, IUser, toSafeUser } from '../models/user.model';
import {
  RegisterInput,
  LoginInput,
  TokenResponse,
  AuthResponse,
  UserResponse,
  JWTPayload,
} from '../schemas/auth.schema';
import { searchLogger } from '../config/logger';

// Configuration from environment
const getConfig = () => ({
  jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  jwtAccessExpiryMs: parseInt(process.env.JWT_ACCESS_EXPIRY_MS || '86400000', 10), // 24h in ms
  jwtRefreshExpiryMs: parseInt(process.env.JWT_REFRESH_EXPIRY_MS || '604800000', 10), // 7d in ms
});

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

class AuthService {
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

  /**
   * Ensure mongoose is connected to the database
   */
  async ensureConnection(): Promise<void> {
    if (this.isConnected && mongoose.connection.readyState === 1) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  private async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      // Check if already connected
      if (mongoose.connection.readyState === 1) {
        this.isConnected = true;
        return;
      }

      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;
      searchLogger.info('Mongoose connected for Auth service', {
        service: 'auth-service',
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        searchLogger.warn('Mongoose disconnected', { service: 'auth-service' });
      });

      mongoose.connection.on('error', (err) => {
        searchLogger.error('Mongoose connection error', err, { service: 'auth-service' });
      });
    } catch (error) {
      this.connectionPromise = null;
      throw error;
    }
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(payload: JWTPayload): string {
    const config = getConfig();
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtAccessExpiry,
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(payload: JWTPayload): string {
    const config = getConfig();
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtRefreshExpiry,
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokens(user: IUser): TokenResponse {
    const config = getConfig();
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      expiresIn: config.jwtAccessExpiryMs / 1000, // in seconds
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const config = getConfig();
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterInput): Promise<AuthResponse> {
    await this.ensureConnection();

    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = new User({
      email: data.email,
      passwordHash: data.password, // Will be hashed by pre-save hook
      name: data.name,
      role: 'user', // Default role
    });

    const savedUser = await user.save();

    // Generate tokens
    const tokens = this.generateTokens(savedUser);

    // Save refresh token to user
    savedUser.refreshToken = tokens.refreshToken;
    await savedUser.save();

    searchLogger.info('User registered successfully', {
      service: 'auth-service',
      userId: savedUser._id.toString(),
      email: savedUser.email,
    });

    return {
      user: toUserResponse(savedUser),
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginInput): Promise<AuthResponse> {
    await this.ensureConnection();

    // Find user with password field
    const user = await User.findOne({ email: data.email }).select('+passwordHash');
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      searchLogger.logSecurityEvent('Failed login attempt', {
        service: 'auth-service',
        email: data.email,
        timestamp: new Date().toISOString(),
      }, 'warn');
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Update user with refresh token and last login
    user.refreshToken = tokens.refreshToken;
    user.lastLogin = new Date();
    await user.save();

    searchLogger.info('User logged in successfully', {
      service: 'auth-service',
      userId: user._id.toString(),
      email: user.email,
    });

    return {
      user: toUserResponse(user),
      tokens,
    };
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string): Promise<void> {
    await this.ensureConnection();

    await User.findByIdAndUpdate(userId, {
      $unset: { refreshToken: 1 },
    });

    searchLogger.info('User logged out successfully', {
      service: 'auth-service',
      userId,
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    await this.ensureConnection();

    // Verify refresh token
    const payload = this.verifyToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid or expired refresh token');
    }

    // Find user with stored refresh token
    const user = await User.findById(payload.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Generate new tokens
    const tokens = this.generateTokens(user);

    // Update stored refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    searchLogger.info('Token refreshed successfully', {
      service: 'auth-service',
      userId: user._id.toString(),
    });

    return tokens;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    await this.ensureConnection();

    const user = await User.findById(userId);
    if (!user) {
      return null;
    }

    return toUserResponse(user);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserResponse | null> {
    await this.ensureConnection();

    const user = await User.findOne({ email });
    if (!user) {
      return null;
    }

    return toUserResponse(user);
  }

  /**
   * Check if user exists by email
   */
  async userExists(email: string): Promise<boolean> {
    await this.ensureConnection();

    const count = await User.countDocuments({ email });
    return count > 0;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: { name?: string; email?: string }
  ): Promise<UserResponse | null> {
    await this.ensureConnection();

    // If email is being updated, check for uniqueness
    if (data.email) {
      const existingUser = await User.findOne({
        email: data.email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new Error('Email is already in use');
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!user) {
      return null;
    }

    searchLogger.info('User profile updated', {
      service: 'auth-service',
      userId,
    });

    return toUserResponse(user);
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    await this.ensureConnection();

    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    await user.save();

    searchLogger.info('User password changed', {
      service: 'auth-service',
      userId,
    });
  }
}

// Export singleton instance
export const authService = new AuthService();

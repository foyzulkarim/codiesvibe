import { z } from 'zod';

// Password validation rules
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Email validation
const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(1, 'Email is required')
  .max(255, 'Email must be at most 255 characters')
  .transform((email) => email.toLowerCase().trim());

// Register schema
export const RegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
});

// Login schema
export const LoginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be at most 128 characters'),
});

// Refresh token schema
export const RefreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

// Update profile schema
export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .trim()
    .optional(),
  email: emailSchema.optional(),
});

// Change password schema
export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// Type exports
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// Token response type (not a Zod schema, just a type)
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// User response type (safe user data)
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth response type (user + tokens)
export interface AuthResponse {
  user: UserResponse;
  tokens: TokenResponse;
}

// JWT payload type
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
}

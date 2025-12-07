# Clerk Authentication Migration Guide

## Overview

This guide documents the complete migration from custom JWT authentication to Clerk authentication for the CodiesVibe application.

## What Was Changed

### Backend Changes (search-api)

#### 1. Dependencies
- **Added**: `@clerk/express` (v1.7.0)
- **Removed**: `bcrypt`, `jsonwebtoken`

#### 2. Files Removed
- `src/routes/auth.routes.ts` - Custom auth routes (login, register, etc.)
- `src/routes/oauth.routes.ts` - Custom OAuth routes (GitHub, Google)
- `src/services/auth.service.ts` - JWT generation and user management
- `src/services/oauth.service.ts` - OAuth integration
- `src/middleware/auth.middleware.ts` - JWT verification middleware
- `src/models/user.model.ts` - User database model
- `src/schemas/auth.schema.ts` - Auth validation schemas

#### 3. Files Modified
- **`src/server.ts`**: Added Clerk middleware, removed auth/OAuth route mounting
- **`src/routes/tools.routes.ts`**: Replaced `authenticateJWT` with `clerkRequireAuth`
- **`src/services/tool-crud.service.ts`**: Updated to accept Clerk user ID when creating tools

#### 4. Files Created
- **`src/middleware/clerk-auth.middleware.ts`**: Clerk authentication helpers and types

#### 5. Environment Variables
Updated `.env.example` to include:
```env
CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

Removed old variables:
- `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Frontend Changes

#### 1. Dependencies
- **Added**: `@clerk/clerk-react` (v5.0.0)

#### 2. Files Removed
- `src/contexts/AuthContext.tsx` - Custom auth context
- `src/types/auth.ts` - Custom auth types
- `src/pages/Login.tsx` - Custom login page
- `src/pages/Register.tsx` - Custom register page
- `src/pages/OAuthCallback.tsx` - OAuth callback handler
- `src/components/ProtectedRoute.tsx` - Old protected route component

#### 3. Files Created
- **`src/pages/SignIn.tsx`**: Clerk sign-in page
- **`src/pages/SignUp.tsx`**: Clerk sign-up page
- **`src/components/ProtectedRoute.tsx`**: New Clerk-based protected route component
- **`src/components/ClerkAuthInitializer.tsx`**: Initializes Clerk token for API calls
- **`src/api/clerk-auth.ts`**: Clerk token management for API client

#### 4. Files Modified
- **`src/main.tsx`**: Wrapped app with `ClerkProvider`
- **`src/App.tsx`**:
  - Removed `AuthProvider`
  - Added `ClerkAuthInitializer`
  - Updated routes from `/login` and `/register` to `/sign-in/*` and `/sign-up/*`
- **`src/api/client.ts`**:
  - Added Clerk token injection in request interceptor
  - Removed custom JWT refresh logic

#### 5. Environment Variables
Updated `.env.example` to include:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## Setup Instructions

### 1. Create Clerk Account
1. Go to https://clerk.com and create an account
2. Create a new application
3. Choose authentication options:
   - Email/password (enabled by default)
   - Social logins (GitHub, Google, etc.) - optional

### 2. Get API Keys
From your Clerk Dashboard (https://dashboard.clerk.com):
1. Navigate to "API Keys"
2. Copy your:
   - **Publishable Key** (starts with `pk_test_...` or `pk_live_...`)
   - **Secret Key** (starts with `sk_test_...` or `sk_live_...`)

### 3. Configure Environment Variables

#### Backend (search-api/.env)
```env
CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_key_here
```

#### Frontend (.env.local)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
```

### 4. Install Dependencies

#### Backend
```bash
cd search-api
npm install
```

#### Frontend
```bash
npm install
```

### 5. Configure Clerk Dashboard
In your Clerk Dashboard:
1. **Paths** → Add allowed redirect URLs:
   - Development: `http://localhost:3000`
   - Production: Your production domain
2. **Session** → Configure session lifetime (default 7 days)
3. **Email/SMS** → Customize email templates (optional)
4. **User & Authentication** → Configure sign-up/sign-in flows

## How It Works

### Backend Authentication Flow

1. **Middleware**: `clerkMiddleware()` is added to Express app in `server.ts`
2. **Protected Routes**: Routes use `clerkRequireAuth` middleware
3. **User Identification**: Clerk user ID is accessed via `req.auth.userId`
4. **Token Verification**: Clerk automatically verifies JWT tokens

### Frontend Authentication Flow

1. **Initialization**: `ClerkProvider` wraps the entire app in `main.tsx`
2. **Token Management**: `ClerkAuthInitializer` sets up token getter for API calls
3. **API Requests**: Axios interceptor adds Bearer token to all requests
4. **Protected Routes**: `ProtectedRoute` component checks auth status
5. **Sign In/Up**: Clerk's pre-built components handle authentication UI

### API Call Authentication

```typescript
// API client automatically adds Clerk token to all requests
const token = await getClerkToken();
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```

## Database Schema Changes

### Tool Model
The `contributor` field now stores Clerk user ID (string) instead of MongoDB ObjectId:

```typescript
// Before
contributor: ObjectId (references User collection)

// After
contributor: string (Clerk user ID like "user_abc123...")
```

**Note**: Since you mentioned no existing users, no data migration is needed.

## User Management

### Before (Custom Auth)
- Users stored in MongoDB `users` collection
- Password hashing with bcrypt
- JWT tokens stored in localStorage
- Manual OAuth integration with GitHub/Google

### After (Clerk)
- Users managed entirely by Clerk
- No passwords stored in your database
- Secure session tokens managed by Clerk
- Built-in OAuth support for many providers

## Features Maintained

✅ Email/password authentication
✅ Social login (GitHub, Google, etc.)
✅ Protected routes
✅ User identification in API calls
✅ Session management
✅ Token refresh (automatic with Clerk)

## Features Added

✨ Email verification (automatic)
✨ Password reset flows (built-in)
✨ Multi-factor authentication (optional)
✨ User profile management
✨ Session device management
✨ Security event logging

## Testing Checklist

### Backend
- [ ] Server starts without errors
- [ ] Public endpoints work (GET /api/tools)
- [ ] Protected endpoints reject unauthenticated requests (POST /api/tools)
- [ ] Protected endpoints accept valid Clerk tokens
- [ ] User ID is correctly extracted in controllers

### Frontend
- [ ] App loads without errors
- [ ] Sign up flow works
- [ ] Email verification works
- [ ] Sign in flow works
- [ ] Sign out works
- [ ] Protected routes redirect to sign-in
- [ ] API calls include authentication token
- [ ] Creating tools associates with user

## Troubleshooting

### "Missing Clerk Publishable Key" Error
**Solution**: Ensure `VITE_CLERK_PUBLISHABLE_KEY` is set in your `.env.local` file

### "Authentication failed" on API calls
**Solutions**:
1. Check that Clerk secret key is set in backend
2. Verify frontend is sending Bearer token in requests
3. Check Clerk Dashboard for any API key issues

### 401 Errors on Protected Routes
**Solutions**:
1. Ensure user is signed in
2. Check that `ClerkAuthInitializer` is rendered in App
3. Verify Clerk middleware is properly configured in backend

### Clerk UI Not Showing
**Solutions**:
1. Verify `@clerk/clerk-react` is installed
2. Check that routes use `/*` wildcard (e.g., `/sign-in/*`)
3. Ensure `ClerkProvider` wraps the app

## Rollback Plan

If you need to rollback:

1. **Code**:
   ```bash
   git checkout <commit-before-migration>
   ```

2. **Dependencies**:
   ```bash
   cd search-api && npm install
   cd .. && npm install
   ```

3. **Environment Variables**: Restore old `.env` files with JWT and OAuth keys

## Production Deployment

### Before Deploying

1. **Get Production Keys**:
   - Create a production Clerk instance or upgrade to production keys
   - Update environment variables with production keys

2. **Configure Clerk for Production**:
   - Add production domain to allowed redirects
   - Configure production email/SMS providers
   - Set up proper session security settings

3. **Update Environment Variables**:
   ```env
   CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
   CLERK_SECRET_KEY=sk_live_your_production_key
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
   ```

4. **Test Thoroughly**:
   - Test all authentication flows in production environment
   - Verify API authentication works
   - Check error handling

## Support and Resources

- **Clerk Documentation**: https://clerk.com/docs
- **Clerk Dashboard**: https://dashboard.clerk.com
- **API Reference**: https://clerk.com/docs/reference/backend-api
- **Community**: https://discord.com/invite/clerk

## Recent Improvements

The following improvements have been added to enhance the Clerk integration:

### ✅ Environment Variable Validation
- Server validates `CLERK_SECRET_KEY` at startup
- Checks for proper key format (must start with `sk_`)
- Provides clear error messages if configuration is missing

### ✅ Enhanced Error Handling
- Token retrieval includes retry logic with exponential backoff
- Automatic retry on transient failures (3 attempts)
- Better debugging with detailed error logging

### ✅ Improved Type Safety
- Removed unsafe `as any` type assertions
- Proper type guards with multiple checks
- Better TypeScript IntelliSense support

### ✅ User Migration Script
Run these commands to manage the legacy users collection:
```bash
cd search-api
npm run verify-users    # Check users collection status
npm run cleanup-users   # Drop empty users collection
```

### ✅ Automatic 401 Handling
- Automatic redirect to sign-in on session expiration
- Stores return URL for seamless post-login redirect
- Prevents infinite redirect loops

For detailed information, see `CLERK_AUTH_IMPROVEMENTS.md`.

## Migration Summary

✅ **Backend**: Complete - Clerk middleware integrated, old auth removed
✅ **Frontend**: Complete - Clerk provider added, old auth context removed
✅ **Environment**: Updated - New variables documented
✅ **Documentation**: Complete - Migration guide created
✅ **Improvements**: Enhanced error handling, validation, and user experience

**Next Steps**:
1. Get your Clerk API keys
2. Configure environment variables
3. Run `npm install` in both backend and frontend
4. Run `npm run verify-users` to check for existing user data
5. Test the authentication flows
6. Deploy to production when ready

# Auth Hooks Architecture Analysis

> **Date:** December 2024
> **Scope:** Clerk authentication integration with Search API (:4003)
> **Status:** Implementation Ready

---

## Executive Summary

The frontend uses Clerk authentication and communicates with a Search API server on port 4003. This document outlines the clean architecture for handling authenticated requests.

---

## Architecture Overview

### API Communication

| API | Port | Purpose |
|-----|------|---------|
| Search API | `:4003` | Tools CRUD, RBAC, Admin operations, Search |

### Authentication Flow

```
User Sign In (Clerk)
        |
        v
+-------------------+
|  ClerkProvider    |
|  (App Root)       |
+-------------------+
        |
        v
+------------------------+
|  ClerkAuthInitializer  |
|  Sets up token getter  |
+------------------------+
        |
        v
+-------------------+
|   searchClient    |
|   (Axios)         |
|                   |
|  - Auto token     |
|  - Error handling |
|  - Dev logging    |
+-------------------+
        |
        v
+-------------------+
|   Search API      |
|   :4003           |
+-------------------+
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/api/search-client.ts` | Axios client for Search API with auth interceptor |
| `src/api/clerk-auth.ts` | Clerk token management utilities |
| `src/hooks/api/useToolsAdmin.ts` | All tool-related hooks (queries & mutations) |
| `src/components/ClerkAuthInitializer.tsx` | Initializes Clerk token getter |
| `src/lib/query-params.ts` | Query parameter builder utility |
| `src/config/api.ts` | API configuration (timeouts, defaults) |

---

## Search Client

The `searchClient` is a simplified Axios instance that:

1. **Automatically injects Clerk JWT token** for authenticated requests
2. **Handles common errors** (401, 403, network errors)
3. **Logs requests in development** mode
4. **Redirects to sign-in** on authentication failures

### Configuration

```typescript
// src/api/search-client.ts
import axios from 'axios';
import { getClerkToken } from './clerk-auth';
import { apiConfig } from '@/config/api';

export const searchClient = axios.create({
  baseURL: apiConfig.searchApiUrl,
  timeout: apiConfig.timeout,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - adds auth token
searchClient.interceptors.request.use(async (config) => {
  const token = await getClerkToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handles errors
searchClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to sign-in
    }
    return Promise.reject(error);
  }
);
```

---

## Hooks Architecture

### Query Hooks (Read Operations)

| Hook | Endpoint | Auth Required |
|------|----------|---------------|
| `useToolsAdmin` | `GET /tools` | No |
| `useToolAdmin` | `GET /tools/:id` | No |
| `useVocabularies` | `GET /tools/vocabularies` | No |
| `useMyTools` | `GET /tools/my-tools` | Yes |
| `useAdminTools` | `GET /tools/admin` | Yes (Admin) |

### Mutation Hooks (Write Operations)

| Hook | Endpoint | Auth Required |
|------|----------|---------------|
| `useCreateTool` | `POST /tools` | Yes |
| `useUpdateTool` | `PATCH /tools/:id` | Yes |
| `useDeleteTool` | `DELETE /tools/:id` | Yes (Admin) |
| `useApproveTool` | `PATCH /tools/:id/approve` | Yes (Admin) |
| `useRejectTool` | `PATCH /tools/:id/reject` | Yes (Admin) |

---

## Query Parameter Builder

Utility function to build consistent URL parameters:

```typescript
// src/lib/query-params.ts
export function buildToolsQueryParams(params: ToolsQueryParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  const entries = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    status: params.status,
    category: params.category,
    industry: params.industry,
    pricingModel: params.pricingModel,
    approvalStatus: params.approvalStatus,
    contributor: params.contributor,
  };

  Object.entries(entries).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return searchParams;
}
```

---

## Environment Configuration

### Required Environment Variables

```env
# .env.local
VITE_SEARCH_API_URL=http://localhost:4003/api
```

### Production

```env
# .env.production
VITE_SEARCH_API_URL=https://search-api.codiesvibe.com/api
```

---

## Error Handling Strategy

### HTTP Status Codes

| Status | Handling |
|--------|----------|
| 401 | Redirect to `/sign-in` with return URL |
| 403 | Show permission denied message |
| 404 | Show not found message |
| 5xx | Show server error with retry option |

### Error Messages

Errors are enhanced with user-friendly messages:

```typescript
// In response interceptor
if (error.response?.status === 401) {
  error.message = 'Please sign in to continue';
}
if (error.response?.status === 403) {
  const data = error.response.data;
  error.message = data?.error || 'Permission denied';
}
```

---

## File Structure

```
src/
├── api/
│   ├── clerk-auth.ts          # Clerk token utilities
│   └── search-client.ts       # Search API axios client
├── components/
│   ├── ClerkAuthInitializer.tsx
│   └── ProtectedRoute.tsx
├── config/
│   ├── api.ts                 # API configuration
│   └── query-client.ts        # React Query setup
├── hooks/
│   └── api/
│       └── useToolsAdmin.ts   # All tool hooks
└── lib/
    └── query-params.ts        # Query parameter utilities
```

---

## Design Decisions

### Why Axios over Fetch?

1. **Interceptors** - Clean way to inject auth tokens and handle errors
2. **Request/Response transformation** - Automatic JSON parsing
3. **Timeout support** - Built-in timeout handling
4. **Cancellation** - Easier request cancellation with AbortController

### Why Centralized Error Handling?

1. **Consistency** - Same error experience across all requests
2. **Maintainability** - Single place to update error logic
3. **User Experience** - Predictable error messages

### Why Query Parameter Builder?

1. **DRY** - Avoid repeating URLSearchParams construction
2. **Consistency** - Same parameter handling across hooks
3. **Type Safety** - TypeScript ensures correct parameters

---

## Clerk Dashboard Configuration

### Session Token Customization (Required for RBAC)

To enable role-based access control without API calls on every request, you must configure Clerk to include user metadata in the session token (JWT).

**Steps:**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Sessions** in the left sidebar
4. Click **Customize session token**
5. In the Claims editor, add:

```json
{
  "metadata": "{{user.public_metadata}}"
}
```

6. Click **Save**

### Setting User Roles

To assign a role to a user:

1. Go to **Users** in the Clerk Dashboard
2. Select the user
3. Click **Edit public metadata**
4. Add:

```json
{
  "role": "admin"
}
```

Valid roles: `admin` or `maintainer` (default if not set)

### How It Works

- The session token (JWT) now includes `metadata.role`
- The backend reads the role from `auth.sessionClaims.metadata.role`
- No API call to Clerk is required on each request
- Role changes take effect on the next token refresh (typically < 60s)

---

## Testing Considerations

### Unit Tests

- Test `buildToolsQueryParams` with various inputs
- Test `searchClient` interceptors
- Test error handling logic

### Integration Tests

- Test hooks with mock API responses
- Test authentication flow
- Test error scenarios (401, 403, 500)

---

## References

- [Clerk React Documentation](https://clerk.com/docs/references/react/use-auth)
- [TanStack Query Best Practices](https://tanstack.com/query/latest/docs/framework/react/guides/best-practices)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)

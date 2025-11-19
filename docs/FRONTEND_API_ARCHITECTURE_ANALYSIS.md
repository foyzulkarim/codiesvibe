# Frontend API Architecture Analysis & Improvements

**Date**: November 17, 2025
**Project**: CodiesVibe React Application
**Focus**: API Client Architecture, Hooks, and Data Fetching

---

## 📋 Table of Contents

1. [Current Architecture Overview](#current-architecture-overview)
2. [What's Working Well](#whats-working-well)
3. [Issues & Pain Points](#issues--pain-points)
4. [Recommended Improvements](#recommended-improvements)
5. [Implementation Plan](#implementation-plan)
6. [Code Examples](#code-examples)

---

## Current Architecture Overview

### Technology Stack

- **HTTP Client**: Axios with interceptors
- **Data Fetching**: TanStack Query (React Query) v5
- **State Management**: React Query cache + React hooks
- **Type Safety**: TypeScript with shared types
- **Utilities**: Lodash (debounce)

### File Structure

```
src/
├── api/
│   ├── client.ts          # Axios configuration & interceptors
│   └── types.ts           # API types and interfaces
├── hooks/
│   └── api/
│       ├── useTools.ts    # Hook for fetching tools list
│       └── useTool.ts     # Hook for fetching single tool
└── shared/
    └── types.ts           # Shared types with backend
```

### Current API Client Features

**src/api/client.ts**:
- ✅ Axios instance with base URL configuration
- ✅ Request/response interceptors
- ✅ Basic error handling
- ✅ Session refresh on 401 errors
- ⚠️ CSRF protection (disabled/commented out)
- ⚠️ Authentication (disabled/commented out)

**src/hooks/api/useTools.ts**:
- ✅ React Query integration
- ✅ AI-powered search endpoint
- ✅ Debounced search capability
- ✅ TypeScript types for responses

**src/hooks/api/useTool.ts**:
- ✅ Single tool fetching
- ✅ Data transformation layer
- ✅ Prefetching capability
- ✅ Retry logic with smart error handling
- ✅ Proper caching configuration

---

## What's Working Well

### ✅ Strengths

1. **React Query Integration**
   - Excellent choice for server state management
   - Built-in caching, refetching, and synchronization
   - Proper query keys for cache invalidation

2. **Type Safety**
   - Comprehensive TypeScript types
   - Shared types between frontend and backend
   - Proper API response interfaces

3. **Smart Caching**
   ```typescript
   staleTime: 5 * 60 * 1000,  // 5 minutes
   gcTime: 10 * 60 * 1000,    // 10 minutes (formerly cacheTime)
   ```

4. **Error Recovery**
   - Automatic session refresh on 401
   - Retry logic for failed requests
   - User-friendly error messages

5. **Performance Optimizations**
   - Prefetching for anticipated navigation
   - Debounced search to reduce API calls
   - Proper query invalidation

6. **Axios Interceptors**
   - Centralized error handling
   - Request/response transformation
   - Session management

---

## Issues & Pain Points

### 🔴 Critical Issues

#### 1. No QueryClient Configuration
**Problem**: Using default QueryClient settings without customization

**Current**:
```typescript
const queryClient = new QueryClient();
```

**Impact**:
- No global retry strategy
- No global error handling
- Missing performance optimizations
- No dev tools configuration

**Severity**: Medium

---

#### 2. Missing Correlation ID Tracking
**Problem**: No request tracking headers for debugging

**Current**: Requests don't include correlation IDs

**Impact**:
- Cannot trace requests across frontend/backend
- Difficult to debug production issues
- No request tracking in logs

**Severity**: High (for production debugging)

---

#### 3. Hardcoded Configuration
**Problem**: Configuration values are hardcoded in source code

**Examples**:
```typescript
// In client.ts
timeout: 10000,  // Hardcoded timeout

// In useTools.ts
limit: 10,       // Hardcoded result limit
timeout: 60000   // Hardcoded AI search timeout
```

**Impact**:
- Difficult to adjust for different environments
- Cannot be changed without code changes
- No flexibility for performance tuning

**Severity**: Medium

---

### 🟡 Important Issues

#### 4. No Mutation Hooks
**Problem**: Missing hooks for CREATE, UPDATE, DELETE operations

**Current**: Only read operations (useTools, useTool)

**Missing**:
- `useCreateTool` - For creating new tools
- `useUpdateTool` - For updating tools
- `useDeleteTool` - For deleting tools
- Optimistic updates pattern

**Impact**:
- Inconsistent data management
- No cache invalidation on mutations
- Manual state updates required

**Severity**: Medium (if admin features needed)

---

#### 5. Limited Error Handling
**Problem**: Basic error handling without user feedback

**Current**:
```typescript
error.message = 'Server error. Please try again later.';
```

**Missing**:
- Error boundary integration
- Toast notifications for errors
- Retry UI for failed requests
- Offline detection

**Severity**: Medium

---

#### 6. No Request/Response Logging
**Problem**: No logging in development mode

**Impact**:
- Difficult to debug API issues
- No visibility into request/response flow
- Manual console.log debugging required

**Severity**: Low (development experience)

---

#### 7. Suboptimal Debounce Implementation
**Problem**: Using Lodash debounce instead of React hook

**Current**:
```typescript
import { debounce } from 'lodash';
const debouncedSearch = useMemo(() =>
  debounce((callback, query) => callback(query), delay),
  [delay]
);
```

**Issues**:
- Extra dependency (lodash)
- Complex memoization
- Not idiomatic React

**Severity**: Low (code quality)

---

### 🟢 Minor Issues

8. **CSRF/Auth Commented Out** - Should be properly toggled via environment
9. **No API Versioning** - Future-proofing for API v2
10. **No Offline Support** - No retry queue or offline detection
11. **Missing Loading States** - Beyond basic isLoading (isFetching, isRefetching)
12. **No Request Cancellation** - Cleanup on component unmount
13. **No Rate Limiting Feedback** - No handling for 429 errors
14. **Duplicate Import** - `import apiClient, { apiClient as axios }` in useTool.ts

---

## Recommended Improvements

### Priority 1: High Impact, Low Effort

#### ✅ Configure QueryClient with Global Defaults

**Benefits**:
- Better performance out of the box
- Consistent error handling
- Improved developer experience

**Implementation**: See Code Examples below

---

#### ✅ Add Correlation ID Interceptor

**Benefits**:
- Request tracing across systems
- Easier debugging in production
- Audit trail for API calls

**Implementation**: See Code Examples below

---

#### ✅ Environment-Based Configuration

**Benefits**:
- Different settings per environment
- No hardcoded values
- Easy performance tuning

**Implementation**: See Code Examples below

---

### Priority 2: Medium Impact, Medium Effort

#### ✅ Create Mutation Hooks

**Benefits**:
- Consistent data mutations
- Automatic cache invalidation
- Optimistic updates support

**Hooks to Create**:
- `useCreateTool`
- `useUpdateTool`
- `useDeleteTool`

---

#### ✅ Enhanced Error Handling

**Benefits**:
- Better user experience
- Clear error messages
- Retry capabilities

**Components**:
- Error boundary wrapper
- Toast notifications
- Retry UI components

---

#### ✅ Request/Response Logging

**Benefits**:
- Faster debugging
- Performance monitoring
- API usage tracking

**Implementation**:
- Development-only interceptor
- Formatted console output
- Performance timing

---

### Priority 3: Nice to Have

#### ✅ React-based Debounce Hook

**Benefits**:
- Remove lodash dependency
- Cleaner code
- Better React integration

---

#### ✅ API Versioning Support

**Benefits**:
- Future-proof for API changes
- A/B testing capability
- Gradual migration support

---

#### ✅ Offline Support

**Benefits**:
- Better user experience
- Retry queue for failed requests
- Offline indication

---

## Implementation Plan

### Phase 1: Core Improvements (Week 1)

**Tasks**:
1. Configure QueryClient with defaults
2. Add correlation ID interceptor
3. Move configuration to environment variables
4. Add request/response logging (dev only)
5. Clean up duplicate imports

**Files to Modify**:
- `src/App.tsx`
- `src/api/client.ts`
- `.env.local`
- `src/config/` (new)

**Estimated Effort**: 4-6 hours

---

### Phase 2: Mutation Hooks (Week 2)

**Tasks**:
1. Create mutation hook templates
2. Implement useCreateTool
3. Implement useUpdateTool
4. Implement useDeleteTool
5. Add optimistic updates

**Files to Create**:
- `src/hooks/api/mutations/` (new directory)
- `src/hooks/api/mutations/useCreateTool.ts`
- `src/hooks/api/mutations/useUpdateTool.ts`
- `src/hooks/api/mutations/useDeleteTool.ts`

**Estimated Effort**: 6-8 hours

---

### Phase 3: Enhanced Error Handling (Week 3)

**Tasks**:
1. Create error boundary component
2. Add toast notifications for errors
3. Implement retry UI
4. Add offline detection

**Files to Create**:
- `src/components/ErrorBoundary.tsx`
- `src/hooks/useOnlineStatus.ts`
- `src/components/RetryButton.tsx`

**Estimated Effort**: 4-6 hours

---

### Phase 4: Polish & Optimization (Week 4)

**Tasks**:
1. Replace lodash debounce with custom hook
2. Add API versioning support
3. Implement offline retry queue
4. Performance audit

**Files to Create**:
- `src/hooks/useDebounce.ts`
- `src/api/version.ts`
- `src/lib/offline-queue.ts`

**Estimated Effort**: 6-8 hours

---

## Code Examples

### 1. Configured QueryClient

**src/config/query-client.ts** (NEW):
```typescript
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults for queries
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        const apiError = error as { response?: { status?: number } };
        if (apiError.response?.status && apiError.response.status < 500) {
          return false;
        }
        // Retry up to 3 times for 5xx errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Disable auto-refetch on window focus
      refetchOnReconnect: true, // Refetch when reconnected
      refetchOnMount: true, // Refetch on component mount
    },
    mutations: {
      // Global defaults for mutations
      retry: 1, // Retry mutations once
      onError: (error) => {
        // Global error handler for mutations
        const apiError = error as { message?: string };
        toast({
          variant: 'destructive',
          title: 'Error',
          description: apiError.message || 'Something went wrong. Please try again.',
        });
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Global error handler for queries
      if (query.meta?.errorMessage) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: query.meta.errorMessage as string,
        });
      }
    },
  }),
  mutationCache: new MutationCache({
    onSuccess: (data, variables, context, mutation) => {
      // Global success handler for mutations
      if (mutation.meta?.successMessage) {
        toast({
          title: 'Success',
          description: mutation.meta.successMessage as string,
        });
      }
    },
  }),
});

// React Query DevTools configuration
export const reactQueryDevtoolsConfig = {
  initialIsOpen: false,
  position: 'bottom-right' as const,
};
```

**Updated src/App.tsx**:
```typescript
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient, reactQueryDevtoolsConfig } from "@/config/query-client";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    {import.meta.env.DEV && (
      <ReactQueryDevtools {...reactQueryDevtoolsConfig} />
    )}
  </QueryClientProvider>
);
```

---

### 2. Correlation ID Interceptor

**src/lib/correlation.ts** (NEW):
```typescript
import { v4 as uuidv4 } from 'uuid';

// Generate a unique correlation ID for each request
export const generateCorrelationId = (): string => {
  return uuidv4();
};

// Get or create correlation ID from sessionStorage
export const getOrCreateSessionId = (): string => {
  const SESSION_KEY = 'session-id';
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
};
```

**Updated src/api/client.ts**:
```typescript
import axios from 'axios';
import { generateCorrelationId, getOrCreateSessionId } from '@/lib/correlation';

// Environment-based configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.codiesvibe.com/api';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 10000;
const ENABLE_CREDENTIALS = import.meta.env.VITE_ENABLE_CREDENTIALS === 'true';
const ENABLE_REQUEST_LOGGING = import.meta.env.DEV; // Only in development

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  withCredentials: ENABLE_CREDENTIALS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add correlation IDs and logging
apiClient.interceptors.request.use(
  async (config) => {
    // Add correlation ID for request tracking
    const correlationId = generateCorrelationId();
    const sessionId = getOrCreateSessionId();

    config.headers['X-Correlation-ID'] = correlationId;
    config.headers['X-Request-ID'] = correlationId;
    config.headers['X-Session-ID'] = sessionId;

    // Store correlation ID in config for response logging
    config.metadata = { correlationId, startTime: Date.now() };

    // Development logging
    if (ENABLE_REQUEST_LOGGING) {
      console.group(`🔵 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      console.log('Correlation ID:', correlationId);
      console.log('Session ID:', sessionId);
      console.log('Headers:', config.headers);
      if (config.data) console.log('Payload:', config.data);
      if (config.params) console.log('Params:', config.params);
      console.groupEnd();
    }

    return config;
  },
  (error) => {
    if (ENABLE_REQUEST_LOGGING) {
      console.error('🔴 Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor - Error handling, logging, and session management
apiClient.interceptors.response.use(
  (response) => {
    // Development logging
    if (ENABLE_REQUEST_LOGGING && response.config.metadata) {
      const duration = Date.now() - response.config.metadata.startTime;
      console.group(`🟢 API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
      console.log('Status:', response.status);
      console.log('Duration:', `${duration}ms`);
      console.log('Correlation ID:', response.config.metadata.correlationId);
      console.log('Data:', response.data);
      console.groupEnd();
    }

    return response;
  },
  async (error) => {
    const duration = error.config?.metadata
      ? Date.now() - error.config.metadata.startTime
      : 0;

    // Development logging
    if (ENABLE_REQUEST_LOGGING) {
      console.group(`🔴 API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
      console.log('Status:', error.response?.status);
      console.log('Duration:', `${duration}ms`);
      if (error.config?.metadata) {
        console.log('Correlation ID:', error.config.metadata.correlationId);
      }
      console.log('Error:', error.response?.data || error.message);
      console.groupEnd();
    }

    // Handle session-related errors
    if (error.response?.status === 401) {
      try {
        await apiClient.post('/auth/refresh');
        return apiClient.request(error.config);
      } catch (refreshError) {
        console.error('Session refresh failed:', refreshError);
      }
    }

    // Enhanced error messages
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please try again.';
    } else if (error.response?.status === 404) {
      error.message = 'Resource not found.';
    } else if (error.response?.status === 429) {
      error.message = 'Too many requests. Please slow down.';
    } else if (error.response?.status >= 500) {
      error.message = 'Server error. Please try again later.';
    } else if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// TypeScript augmentation for metadata
declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      correlationId: string;
      startTime: number;
    };
  }
}
```

---

### 3. Environment Configuration

**.env.local** (NEW):
```env
# API Configuration
VITE_API_URL=http://localhost:4000/api
VITE_API_TIMEOUT=10000
VITE_ENABLE_CREDENTIALS=false

# Search Configuration
VITE_SEARCH_DEBOUNCE_DELAY=300
VITE_SEARCH_MIN_LENGTH=2
VITE_SEARCH_DEFAULT_LIMIT=20

# Performance
VITE_QUERY_STALE_TIME=300000
VITE_QUERY_CACHE_TIME=600000

# Features
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_REQUEST_LOGGING=true
```

**.env.production**:
```env
# API Configuration
VITE_API_URL=https://api.codiesvibe.com/api
VITE_API_TIMEOUT=15000
VITE_ENABLE_CREDENTIALS=true

# Search Configuration
VITE_SEARCH_DEBOUNCE_DELAY=500
VITE_SEARCH_MIN_LENGTH=3
VITE_SEARCH_DEFAULT_LIMIT=20

# Performance
VITE_QUERY_STALE_TIME=600000
VITE_QUERY_CACHE_TIME=1800000

# Features
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_REQUEST_LOGGING=false
```

**src/config/api.ts** (NEW):
```typescript
export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_URL || 'https://api.codiesvibe.com/api',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,
  enableCredentials: import.meta.env.VITE_ENABLE_CREDENTIALS === 'true',

  search: {
    debounceDelay: Number(import.meta.env.VITE_SEARCH_DEBOUNCE_DELAY) || 300,
    minLength: Number(import.meta.env.VITE_SEARCH_MIN_LENGTH) || 2,
    defaultLimit: Number(import.meta.env.VITE_SEARCH_DEFAULT_LIMIT) || 20,
  },

  query: {
    staleTime: Number(import.meta.env.VITE_QUERY_STALE_TIME) || 5 * 60 * 1000,
    cacheTime: Number(import.meta.env.VITE_QUERY_CACHE_TIME) || 10 * 60 * 1000,
  },

  features: {
    enableDevtools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
    enableRequestLogging: import.meta.env.DEV,
  },
} as const;
```

---

### 4. Custom Debounce Hook

**src/hooks/useDebounce.ts** (NEW):
```typescript
import { useEffect, useState } from 'react';

/**
 * Debounce hook - delays updating value until after delay milliseconds
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up on value change or unmount
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced callback hook - delays executing callback until after delay milliseconds
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const debouncedCallback = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  }) as T;

  return debouncedCallback;
}
```

**Updated src/hooks/api/useTools.ts** (remove lodash):
```typescript
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient as axios } from '@/api/client';
import { apiConfig } from '@/config/api';
// ... rest of imports

export const useTools = (searchQuery: string): UseToolsReturn => {
  // Debounce search query to reduce API calls
  const debouncedQuery = useDebounce(searchQuery, apiConfig.search.debounceDelay);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tools', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < apiConfig.search.minLength) {
        return { data: [], reasoning: null };
      }

      const apiResponse = await aiSearchTools(debouncedQuery);
      return {
        data: apiResponse.results,
        reasoning: {
          query: apiResponse.query,
          intentState: apiResponse.intentState,
          executionPlan: apiResponse.executionPlan,
          candidates: apiResponse.candidates,
          executionStats: apiResponse.executionStats,
          executionTime: apiResponse.executionTime,
          phase: apiResponse.phase,
          strategy: apiResponse.strategy,
          explanation: apiResponse.explanation
        }
      };
    },
    enabled: debouncedQuery.length >= apiConfig.search.minLength,
  });

  return {
    data: data?.data || [],
    reasoning: data?.reasoning,
    isLoading,
    isError,
    error,
  };
};
```

---

### 5. Mutation Hooks Example

**src/hooks/api/mutations/useCreateTool.ts** (NEW):
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { AITool } from '@/data/tools';
import { toast } from '@/components/ui/use-toast';

interface CreateToolParams {
  name: string;
  description: string;
  // ... other required fields
}

export const useCreateTool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateToolParams) => {
      const response = await apiClient.post<AITool>('/tools', params);
      return response.data;
    },

    onSuccess: (newTool) => {
      // Invalidate tools list query to refetch
      queryClient.invalidateQueries({ queryKey: ['tools'] });

      // Optionally: Add to cache optimistically
      queryClient.setQueryData(['tool', newTool.id], newTool);

      toast({
        title: 'Success',
        description: `Tool "${newTool.name}" created successfully!`,
      });
    },

    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create tool. Please try again.',
      });
    },

    meta: {
      successMessage: 'Tool created successfully!',
    },
  });
};

// Usage in component:
// const createTool = useCreateTool();
// createTool.mutate({ name: 'New Tool', description: '...' });
```

---

### 6. Error Boundary Component

**src/components/ErrorBoundary.tsx** (NEW):
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log to error tracking service (e.g., Sentry)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-4xl font-bold">Oops!</h1>
            <p className="text-muted-foreground">
              Something went wrong. We've been notified and are working on a fix.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-muted p-4 rounded overflow-auto">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleReset}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Updated src/App.tsx** (with ErrorBoundary):
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      {/* ... rest of app */}
    </QueryClientProvider>
  </ErrorBoundary>
);
```

---

## Summary

### Current State: ⭐⭐⭐⭐☆ (4/5)

**Strengths**:
- Good foundation with React Query
- Type-safe API layer
- Smart caching strategies
- Proper separation of concerns

**Weaknesses**:
- Missing global configuration
- No request tracing
- Hardcoded values
- Limited error handling
- No mutation patterns

### After Improvements: ⭐⭐⭐⭐⭐ (5/5)

**Enhancements**:
- Professional-grade API client
- Production-ready error handling
- Full request tracing capability
- Environment-based configuration
- Complete CRUD operations
- Better developer experience

---

## Next Steps

1. **Review this analysis** with the team
2. **Prioritize improvements** based on business needs
3. **Implement Phase 1** (core improvements)
4. **Test thoroughly** in development
5. **Deploy incrementally** to production
6. **Monitor performance** and errors
7. **Iterate** based on feedback

---

**Document Version**: 1.0
**Last Updated**: November 17, 2025
**Status**: Ready for Implementation

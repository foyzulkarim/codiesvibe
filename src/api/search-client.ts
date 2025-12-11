/**
 * Search API Client
 *
 * Axios client for communicating with the Search API server.
 * Automatically handles Clerk authentication token injection and standardized error handling.
 */

import axios, { AxiosError } from 'axios';
import { apiConfig } from '@/config/api';
import { dispatchAuthEvent, AuthEventType, isOnAuthPage } from '@/lib/auth-events';
import { createApiError, ErrorCode, type ApiError } from '@/types/errors';
import { getClerkToken } from './clerk-auth';

/**
 * API error response structure from backend
 */
interface ApiErrorData {
  message?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * HTTP status code to error mapping
 */
const HTTP_ERROR_MAP: Record<number, { code: ErrorCode; message: string }> = {
  400: { code: ErrorCode.BAD_REQUEST, message: 'Invalid request' },
  401: { code: ErrorCode.UNAUTHORIZED, message: 'Please sign in to continue' },
  403: { code: ErrorCode.FORBIDDEN, message: 'Permission denied' },
  404: { code: ErrorCode.NOT_FOUND, message: 'Resource not found' },
  429: { code: ErrorCode.RATE_LIMIT_EXCEEDED, message: 'Too many requests. Please try again later.' },
  500: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: 'Server error. Please try again later.' },
  503: { code: ErrorCode.SERVICE_UNAVAILABLE, message: 'Service temporarily unavailable. Please try again later.' },
  504: { code: ErrorCode.GATEWAY_TIMEOUT, message: 'Request timed out. Please try again.' },
};

/**
 * Resolve HTTP error from status code
 */
function resolveHttpError(
  status: number,
  data?: ApiErrorData
): { code: ErrorCode; message: string } | null {
  if (typeof status !== 'number' || status < 0 || status > 599) {
    return null;
  }

  // Use hasOwnProperty check before accessing to prevent prototype pollution
  if (Object.prototype.hasOwnProperty.call(HTTP_ERROR_MAP, status)) {
    // eslint-disable-next-line security/detect-object-injection -- Safe: status is validated as number and hasOwnProperty check performed
    const mapped = HTTP_ERROR_MAP[status];
    return {
      code: mapped.code,
      message: data?.error || data?.message || mapped.message,
    };
  }
  // Fallback for unmapped 5xx errors
  if (status >= 500) {
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Server error. Please try again later.',
    };
  }
  return null;
}

/**
 * Resolve network error (no response received)
 */
function resolveNetworkError(error: AxiosError): { code: ErrorCode; message: string } {
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return { code: ErrorCode.TIMEOUT_ERROR, message: 'Request timed out. Please try again.' };
  }
  return { code: ErrorCode.NETWORK_ERROR, message: 'Network error. Please check your connection.' };
}

/**
 * Create axios instance for Search API
 */
export const searchClient = axios.create({
  baseURL: apiConfig.searchApiUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor
 *
 * - Injects Clerk authentication token
 * - Logs requests in development mode
 */
searchClient.interceptors.request.use(
  async (config) => {
    // Add Clerk authentication token if available
    const token = await getClerkToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Development logging

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 *
 * - Handles authentication errors (401)
 * - Converts errors to standardized ApiError format
 * - Logs responses in development mode
 */
searchClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiErrorData>) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // Handle 401 special case - dispatch auth event for redirect
    if (status === 401 && !isOnAuthPage()) {
      const returnUrl = window.location.pathname + window.location.search;
      dispatchAuthEvent(AuthEventType.UNAUTHORIZED, {
        message: 'Please sign in to continue',
        returnUrl,
        statusCode: 401,
      });
    }

    // Resolve error code and message
    let resolved: { code: ErrorCode; message: string };

    const httpError = status ? resolveHttpError(status, data) : null;

    if (!error.response) {
      // Network error (no response received)
      resolved = resolveNetworkError(error);
    } else if (httpError) {
      // Known HTTP status error
      resolved = httpError;
    } else if (data) {
      // Extract from response data
      resolved = {
        code: (data.code as ErrorCode) || ErrorCode.UNKNOWN_ERROR,
        message: data.error || data.message || error.message,
      };
    } else {
      // Fallback to unknown error
      resolved = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: error.message,
      };
    }

    // Create standardized API error
    const apiError: ApiError = createApiError(resolved.code, resolved.message, {
      ...(status !== undefined && { statusCode: status }),
      ...(data?.details && { details: data.details }),
      ...(data?.requestId && { requestId: data.requestId }),
      ...(error.config?.url && { path: error.config.url }),
    });

    // Attach original error for debugging
    (apiError as ApiError & { originalError?: AxiosError }).originalError = error;

    return Promise.reject(apiError);
  }
);

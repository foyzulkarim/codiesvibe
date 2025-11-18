import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { generateCorrelationId, getOrCreateSessionId } from '@/lib/correlation';
import { apiConfig } from '@/config/api';
import { offlineQueue } from '@/lib/offline-queue';
import { getVersionHeaders } from '@/api/version';

/**
 * Extended Axios request config with metadata for tracking
 */
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    correlationId: string;
    startTime: number;
  };
}

/**
 * Create axios instance with base configuration from environment
 */
export const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  withCredentials: apiConfig.enableCredentials,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor
 *
 * Features:
 * - Adds correlation ID for request tracking
 * - Adds session ID for user session tracking
 * - Logs requests in development mode
 * - Adds timing metadata for performance tracking
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<ExtendedAxiosRequestConfig> => {
    const extendedConfig = config as ExtendedAxiosRequestConfig;

    // Generate correlation ID for this specific request
    const correlationId = generateCorrelationId();

    // Get or create session ID (persists across requests)
    const sessionId = getOrCreateSessionId();

    // Add tracking headers
    if (!extendedConfig.headers) {
      extendedConfig.headers = {} as any;
    }

    extendedConfig.headers['X-Correlation-ID'] = correlationId;
    extendedConfig.headers['X-Request-ID'] = correlationId;
    extendedConfig.headers['X-Session-ID'] = sessionId;

    // Add application metadata
    extendedConfig.headers['X-Client-Version'] = apiConfig.app.version;
    extendedConfig.headers['X-Client-Name'] = apiConfig.app.name;

    // Add API version headers
    const versionHeaders = getVersionHeaders(extendedConfig.url || '');
    Object.assign(extendedConfig.headers, versionHeaders);

    // Store metadata for response logging and timing
    extendedConfig.metadata = {
      correlationId,
      startTime: Date.now(),
    };

    // Development logging
    if (apiConfig.features.enableRequestLogging) {
      console.group(`🔵 API Request: ${extendedConfig.method?.toUpperCase()} ${extendedConfig.url}`);
      console.log('📍 Correlation ID:', correlationId);
      console.log('🔑 Session ID:', sessionId);
      console.log('📋 Headers:', extendedConfig.headers);

      if (extendedConfig.data) {
        console.log('📦 Payload:', extendedConfig.data);
      }

      if (extendedConfig.params) {
        console.log('🔍 Params:', extendedConfig.params);
      }

      console.groupEnd();
    }

    return extendedConfig;
  },
  (error: AxiosError) => {
    if (apiConfig.features.enableRequestLogging) {
      console.error('🔴 Request Error:', error);
    }
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 *
 * Features:
 * - Logs responses in development mode
 * - Tracks request duration
 * - Handles session refresh on 401
 * - Provides user-friendly error messages
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    const config = response.config as ExtendedAxiosRequestConfig;

    // Calculate request duration
    const duration = config.metadata ? Date.now() - config.metadata.startTime : 0;

    // Development logging
    if (apiConfig.features.enableRequestLogging && config.metadata) {
      console.group(`🟢 API Response: ${config.method?.toUpperCase()} ${config.url}`);
      console.log('✅ Status:', response.status, response.statusText);
      console.log('⏱️  Duration:', `${duration}ms`);
      console.log('📍 Correlation ID:', config.metadata.correlationId);
      console.log('📦 Data:', response.data);

      // Performance warning for slow requests
      if (duration > 3000) {
        console.warn('⚠️  Slow request detected (>3s)');
      }

      console.groupEnd();
    }

    return response;
  },
  async (error: AxiosError): Promise<never> => {
    const config = error.config as ExtendedAxiosRequestConfig | undefined;

    // Calculate request duration
    const duration = config?.metadata ? Date.now() - config.metadata.startTime : 0;

    // Development logging
    if (apiConfig.features.enableRequestLogging) {
      console.group(`🔴 API Error: ${config?.method?.toUpperCase()} ${config?.url}`);
      console.log('❌ Status:', error.response?.status);
      console.log('⏱️  Duration:', `${duration}ms`);

      if (config?.metadata) {
        console.log('📍 Correlation ID:', config.metadata.correlationId);
      }

      console.log('💥 Error:', error.response?.data || error.message);
      console.groupEnd();
    }

    // Handle session-related errors (401 Unauthorized)
    if (error.response?.status === 401) {
      try {
        // Attempt to refresh the session
        await apiClient.post('/auth/refresh');

        // Retry the original request
        if (config) {
          return apiClient.request(config);
        }
      } catch (refreshError) {
        console.error('Session refresh failed:', refreshError);
        // Session refresh failed - let the error propagate
        // The application should redirect to login or handle appropriately
      }
    }

    // Enhance error messages for better UX
    let userMessage = error.message;

    if (error.code === 'ECONNABORTED') {
      userMessage = 'Request timeout. Please try again.';
    } else if (error.response?.status === 404) {
      userMessage = 'Resource not found.';
    } else if (error.response?.status === 429) {
      userMessage = 'Too many requests. Please slow down and try again.';
    } else if (error.response?.status === 403) {
      userMessage = 'Access forbidden. You don\'t have permission to perform this action.';
    } else if (error.response?.status && error.response.status >= 500) {
      userMessage = 'Server error. Please try again later.';
    } else if (!error.response) {
      userMessage = 'Network error. Please check your internet connection.';
    } else if (error.response?.data && typeof error.response.data === 'object') {
      // Try to extract message from response data
      const data = error.response.data as any;
      userMessage = data.message || data.error || userMessage;
    }

    // Replace error message with user-friendly version
    error.message = userMessage;

    // Queue failed mutations for retry when online (only for mutations, not GET requests)
    if (
      !navigator.onLine &&
      config &&
      config.method &&
      ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())
    ) {
      // Add to offline queue
      offlineQueue.enqueue({
        config: config as AxiosRequestConfig,
        priority: config.method.toLowerCase() === 'delete' ? 2 : 1, // Higher priority for deletes
        maxRetries: 3,
        metadata: {
          correlationId: config.metadata?.correlationId,
          userMessage,
        },
      });

      // Return a more specific offline error
      error.message = 'You are offline. Request queued for retry when connection is restored.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;

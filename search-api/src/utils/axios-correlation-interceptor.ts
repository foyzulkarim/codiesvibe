/**
 * Axios Correlation Interceptor
 * Automatically adds correlation ID to all outgoing HTTP requests
 */

import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { correlationContext } from './correlation-context.js';
import { searchLogger } from '../config/logger.js';

/**
 * Setup Axios interceptor to add correlation ID to all outgoing requests
 */
export function setupAxiosCorrelationInterceptor(): void {
  // Request interceptor to add correlation ID header
  axios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const correlationId = correlationContext.getCorrelationId();

      if (correlationId && config.headers) {
        // Add correlation ID to request headers
        config.headers['X-Correlation-ID'] = correlationId;
        config.headers['X-Request-ID'] = correlationId;

        searchLogger.debug('Outgoing HTTP request with correlation ID', {
          correlationId,
          service: 'search-api',
          url: config.url,
          method: config.method?.toUpperCase(),
        }, {
          function: 'axiosCorrelationInterceptor',
          module: 'AxiosInterceptor',
        });
      }

      return config;
    },
    (error) => {
      const correlationId = correlationContext.getCorrelationId();
      searchLogger.error('Axios request interceptor error', error, {
        correlationId,
        service: 'search-api',
      }, {
        function: 'axiosCorrelationInterceptor',
        module: 'AxiosInterceptor',
      });
      return Promise.reject(error);
    }
  );

  // Response interceptor to log responses with correlation ID
  axios.interceptors.response.use(
    (response) => {
      const correlationId = correlationContext.getCorrelationId();

      if (correlationId) {
        searchLogger.debug('Received HTTP response', {
          correlationId,
          service: 'search-api',
          url: response.config.url,
          status: response.status,
          statusText: response.statusText,
        }, {
          function: 'axiosCorrelationInterceptor',
          module: 'AxiosInterceptor',
        });
      }

      return response;
    },
    (error) => {
      const correlationId = correlationContext.getCorrelationId();

      if (error.response) {
        // Server responded with error status
        searchLogger.warn('HTTP request failed with error response', {
          correlationId,
          service: 'search-api',
          url: error.config?.url,
          status: error.response.status,
          statusText: error.response.statusText,
        }, {
          function: 'axiosCorrelationInterceptor',
          module: 'AxiosInterceptor',
        });
      } else if (error.request) {
        // Request made but no response received
        searchLogger.error('HTTP request failed - no response received', error, {
          correlationId,
          service: 'search-api',
          url: error.config?.url,
        }, {
          function: 'axiosCorrelationInterceptor',
          module: 'AxiosInterceptor',
        });
      } else {
        // Error setting up request
        searchLogger.error('HTTP request setup failed', error, {
          correlationId,
          service: 'search-api',
        }, {
          function: 'axiosCorrelationInterceptor',
          module: 'AxiosInterceptor',
        });
      }

      return Promise.reject(error);
    }
  );

  searchLogger.info('✅ Axios correlation interceptor configured', {
    service: 'search-api',
  });
}

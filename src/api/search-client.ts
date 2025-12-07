/**
 * Search API Client
 *
 * Axios client for communicating with the Search API server.
 * Automatically handles Clerk authentication token injection.
 */

import axios, { AxiosError } from 'axios';
import { getClerkToken } from './clerk-auth';
import { apiConfig } from '@/config/api';

/**
 * API error response structure
 */
interface ApiErrorData {
  message?: string;
  error?: string;
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
    if (apiConfig.features.enableRequestLogging) {
      console.log(`[Search API] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error: AxiosError) => {
    if (apiConfig.features.enableRequestLogging) {
      console.error('[Search API] Request Error:', error);
    }
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 *
 * - Handles authentication errors (401)
 * - Enhances error messages for better UX
 * - Logs responses in development mode
 */
searchClient.interceptors.response.use(
  (response) => {
    if (apiConfig.features.enableRequestLogging) {
      console.log(`[Search API] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError<ApiErrorData>) => {
    if (apiConfig.features.enableRequestLogging) {
      console.error(`[Search API] Error ${error.response?.status}:`, error.message);
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      // Check if we're not already on the sign-in page
      if (!window.location.pathname.includes('/sign-in')) {
        const returnUrl = window.location.pathname + window.location.search;
        sessionStorage.setItem('returnUrl', returnUrl);
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`;
      }
      error.message = 'Please sign in to continue';
    }

    // Handle permission errors
    if (error.response?.status === 403) {
      const data = error.response.data;
      error.message = data?.error || data?.message || 'Permission denied';
    }

    // Handle not found
    if (error.response?.status === 404) {
      error.message = 'Resource not found';
    }

    // Handle server errors
    if (error.response?.status && error.response.status >= 500) {
      error.message = 'Server error. Please try again later.';
    }

    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    }

    // Extract error message from response if available
    if (error.response?.data) {
      const data = error.response.data;
      if (data.error || data.message) {
        error.message = data.error || data.message || error.message;
      }
    }

    return Promise.reject(error);
  }
);

export default searchClient;

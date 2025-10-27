import axios from 'axios';

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.codiesvibe.com/api',
  timeout: 10000,
  withCredentials: false, // Disabled for testing - re-enable later
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add CSRF token - TEMPORARILY DISABLED
apiClient.interceptors.request.use(async (config) => {
  // CSRF disabled for testing - re-enable later
  // Add CSRF token for POST, PUT, PATCH, DELETE requests
  // if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
  //   try {
  //     // Try to get CSRF token from session hook or make a request
  //     const csrfResponse = await axios.get(`${import.meta.env.VITE_API_URL || '/api'}/auth/csrf`, {
  //       withCredentials: true,
  //     });
  //     config.headers['X-CSRF-Token'] = csrfResponse.data.csrfToken;
  //   } catch (error) {
  //     console.warn('Failed to get CSRF token:', error);
  //   }
  // }
  return config;
});

// Response interceptor for error handling and session management
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle session-related errors
    if (error.response?.status === 401) {
      // Session expired or invalid, try to refresh
      try {
        await apiClient.post('/auth/refresh');
        // Retry the original request
        return apiClient.request(error.config);
      } catch (refreshError) {
        // Refresh failed, need to reinitialize session
        console.error('Session refresh failed:', refreshError);
        // The useSession hook will handle reinitialization
      }
    }

    // Handle different error scenarios
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please try again.';
    } else if (error.response?.status === 404) {
      error.message = 'Resource not found.';
    } else if (error.response?.status >= 500) {
      error.message = 'Server error. Please try again later.';
    } else if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

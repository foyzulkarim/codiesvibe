import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient } from '@/api/client';
import {
  User,
  AuthResponse,
  TokenResponse,
  LoginCredentials,
  RegisterCredentials,
  OAuthLoginData,
  AuthContextType,
} from '@/types/auth';

// Storage keys
const ACCESS_TOKEN_KEY = 'codiesvibe_access_token';
const REFRESH_TOKEN_KEY = 'codiesvibe_refresh_token';
const USER_KEY = 'codiesvibe_user';

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Token storage utilities
const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser: (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },
  setTokens: (tokens: TokenResponse): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  setUser: (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// Add Authorization header to requests
const setAuthHeader = (token: string | null): void => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const storedToken = tokenStorage.getAccessToken();
        const storedUser = tokenStorage.getUser();

        if (storedToken && storedUser) {
          setAuthHeader(storedToken);

          // Verify token is still valid by fetching user profile
          try {
            const response = await apiClient.get<User>('/auth/me');
            setUser(response.data);
            setIsAuthenticated(true);
            tokenStorage.setUser(response.data);
          } catch {
            // Token is invalid, try to refresh
            const refreshToken = tokenStorage.getRefreshToken();
            if (refreshToken) {
              try {
                const refreshResponse = await apiClient.post<TokenResponse>('/auth/refresh', {
                  refreshToken,
                });
                tokenStorage.setTokens(refreshResponse.data);
                setAuthHeader(refreshResponse.data.accessToken);

                // Fetch user again
                const userResponse = await apiClient.get<User>('/auth/me');
                setUser(userResponse.data);
                setIsAuthenticated(true);
                tokenStorage.setUser(userResponse.data);
              } catch {
                // Refresh failed, clear auth
                tokenStorage.clear();
                setAuthHeader(null);
              }
            } else {
              tokenStorage.clear();
              setAuthHeader(null);
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        tokenStorage.clear();
        setAuthHeader(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      const { user: userData, tokens } = response.data;

      tokenStorage.setTokens(tokens);
      tokenStorage.setUser(userData);
      setAuthHeader(tokens.accessToken);

      setUser(userData);
      setIsAuthenticated(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (credentials: RegisterCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', credentials);
      const { user: userData, tokens } = response.data;

      tokenStorage.setTokens(tokens);
      tokenStorage.setUser(userData);
      setAuthHeader(tokens.accessToken);

      setUser(userData);
      setIsAuthenticated(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // OAuth login function (for handling OAuth callback)
  const loginWithOAuth = useCallback(async (data: OAuthLoginData): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { accessToken, refreshToken, user: userData } = data;

      // Store tokens
      tokenStorage.setTokens({
        accessToken,
        refreshToken,
        expiresIn: 86400, // 24 hours
        tokenType: 'Bearer',
      });
      tokenStorage.setUser(userData);
      setAuthHeader(accessToken);

      setUser(userData);
      setIsAuthenticated(true);
    } catch (err: any) {
      const errorMessage = err.message || 'OAuth login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Call logout endpoint (optional, for server-side token invalidation)
      await apiClient.post('/auth/logout');
    } catch (err) {
      // Ignore logout errors - we'll clear local state anyway
      console.warn('Logout request failed:', err);
    } finally {
      tokenStorage.clear();
      setAuthHeader(null);
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<void> => {
    const storedRefreshToken = tokenStorage.getRefreshToken();
    if (!storedRefreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiClient.post<TokenResponse>('/auth/refresh', {
        refreshToken: storedRefreshToken,
      });

      tokenStorage.setTokens(response.data);
      setAuthHeader(response.data.accessToken);
    } catch (err: any) {
      // Refresh failed, logout user
      tokenStorage.clear();
      setAuthHeader(null);
      setUser(null);
      setIsAuthenticated(false);
      throw new Error('Session expired. Please login again.');
    }
  }, []);

  // Clear error function
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    loginWithOAuth,
    logout,
    refreshToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export token storage for use in API client interceptor
export { tokenStorage, setAuthHeader };

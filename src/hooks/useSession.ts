import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/client';

interface SessionData {
  sessionId: string;
  csrfToken: string;
  expiresAt: string;
  valid: boolean;
}

interface UseSessionReturn {
  session: SessionData | null;
  isLoading: boolean;
  error: string | null;
  initializeSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
  getCsrfToken: () => Promise<string | null>;
  isSessionValid: () => boolean;
}

export const useSession = (): UseSessionReturn => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if session is still valid
  const isSessionValid = useCallback(() => {
    if (!session) return false;
    const expiryTime = new Date(session.expiresAt).getTime();
    const currentTime = Date.now();
    return currentTime < expiryTime;
  }, [session]);

  // Initialize session
  const initializeSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const origin = window.location.origin;
      const response = await apiClient.post<SessionData>('/auth/session', {
        origin,
      });

      setSession(response.data);
      
      // Set up auto-refresh 2 minutes before expiry
      const expiryTime = new Date(response.data.expiresAt).getTime();
      const currentTime = Date.now();
      const refreshTime = expiryTime - currentTime - 2 * 60 * 1000; // 2 minutes before expiry

      if (refreshTime > 0) {
        setTimeout(() => {
          refreshSession();
        }, refreshTime);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to initialize session');
      console.error('Session initialization failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.post<SessionData>('/auth/refresh');
      setSession(response.data);
      
      // Set up next auto-refresh
      const expiryTime = new Date(response.data.expiresAt).getTime();
      const currentTime = Date.now();
      const refreshTime = expiryTime - currentTime - 2 * 60 * 1000; // 2 minutes before expiry

      if (refreshTime > 0) {
        setTimeout(() => {
          refreshSession();
        }, refreshTime);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to refresh session');
      console.error('Session refresh failed:', err);
      // Try to initialize a new session
      await initializeSession();
    }
  }, [initializeSession]);

  // Get CSRF token
  const getCsrfToken = useCallback(async (): Promise<string | null> => {
    try {
      if (!isSessionValid()) {
        await refreshSession();
      }
      
      const response = await apiClient.get<{ csrfToken: string }>('/auth/csrf');
      return response.data.csrfToken;
    } catch (err: unknown) {
      console.error('Failed to get CSRF token:', err);
      return null;
    }
  }, [isSessionValid, refreshSession]);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Periodic session validation
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSessionValid()) {
        refreshSession();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isSessionValid, refreshSession]);

  return {
    session,
    isLoading,
    error,
    initializeSession,
    refreshSession,
    getCsrfToken,
    isSessionValid,
  };
};
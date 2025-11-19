/**
 * Correlation ID utilities for request tracking
 *
 * These utilities help track requests across the frontend and backend,
 * making debugging and monitoring much easier.
 */

/**
 * Generate a unique correlation ID for each request
 * Uses crypto.randomUUID() for better performance (no external dependency)
 *
 * @returns A UUID v4 string
 */
export const generateCorrelationId = (): string => {
  // Use native crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback to manual UUID v4 generation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Get or create a session ID from sessionStorage
 * Session ID persists across page reloads but is cleared when tab is closed
 *
 * This is useful for tracking all requests from a single user session
 *
 * @returns A persistent session ID for the current browser session
 */
export const getOrCreateSessionId = (): string => {
  const SESSION_KEY = 'codiesvibe-session-id';

  try {
    // Try to get existing session ID
    let sessionId = sessionStorage.getItem(SESSION_KEY);

    // Create new session ID if none exists
    if (!sessionId) {
      sessionId = generateCorrelationId();
      sessionStorage.setItem(SESSION_KEY, sessionId);

      // Log session creation in development
      if (import.meta.env.DEV) {
        console.log('🆕 New session created:', sessionId);
      }
    }

    return sessionId;
  } catch (error) {
    // If sessionStorage is not available (e.g., private browsing, storage disabled),
    // generate a temporary session ID
    console.warn('SessionStorage not available, using temporary session ID:', error);
    return generateCorrelationId();
  }
};

/**
 * Get the current session ID without creating a new one
 * Returns null if no session exists
 *
 * @returns The current session ID or null
 */
export const getCurrentSessionId = (): string | null => {
  const SESSION_KEY = 'codiesvibe-session-id';

  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch (error) {
    return null;
  }
};

/**
 * Clear the current session ID
 * Useful for logout or session reset
 */
export const clearSessionId = (): void => {
  const SESSION_KEY = 'codiesvibe-session-id';

  try {
    sessionStorage.removeItem(SESSION_KEY);

    // Log session clear in development
    if (import.meta.env.DEV) {
      console.log('🗑️  Session cleared');
    }
  } catch (error) {
    console.warn('Failed to clear session ID:', error);
  }
};

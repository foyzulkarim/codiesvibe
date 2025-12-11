/**
 * Authentication Event System
 *
 * Provides a centralized event system for authentication-related events.
 * This allows API clients to signal auth issues without directly manipulating
 * the browser location, keeping routing logic in React components.
 */

/**
 * Custom authentication event types
 */
export enum AuthEventType {
  UNAUTHORIZED = 'auth:unauthorized',
  FORBIDDEN = 'auth:forbidden',
  SESSION_EXPIRED = 'auth:session-expired',
}

/**
 * Authentication event detail interface
 */
export interface AuthEventDetail {
  /**
   * The event type
   */
  type: AuthEventType;

  /**
   * Optional message
   */
  message?: string;

  /**
   * Optional return URL to redirect to after authentication
   */
  returnUrl?: string;

  /**
   * HTTP status code that triggered the event
   */
  statusCode?: number;
}

/**
 * Dispatch an authentication event
 *
 * @param type - The type of authentication event
 * @param detail - Additional event details
 *
 * @example
 * ```ts
 * dispatchAuthEvent(AuthEventType.UNAUTHORIZED, {
 *   returnUrl: window.location.pathname,
 *   statusCode: 401
 * });
 * ```
 */
export const dispatchAuthEvent = (
  type: AuthEventType,
  detail?: Partial<AuthEventDetail>
): void => {
  const event = new CustomEvent<AuthEventDetail>(type, {
    detail: {
      type,
      ...detail,
    },
  });

  window.dispatchEvent(event);
};

/**
 * Listen for authentication events
 *
 * @param type - The type of event to listen for
 * @param handler - Callback function to handle the event
 * @returns Cleanup function to remove the event listener
 *
 * @example
 * ```ts
 * useEffect(() => {
 *   const cleanup = listenForAuthEvent(
 *     AuthEventType.UNAUTHORIZED,
 *     (event) => {
 *       navigate(`/sign-in?redirect_url=${event.detail.returnUrl}`);
 *     }
 *   );
 *   return cleanup;
 * }, []);
 * ```
 */
export const listenForAuthEvent = (
  type: AuthEventType,
  handler: (event: CustomEvent<AuthEventDetail>) => void
): (() => void) => {
  const eventHandler = (event: Event) => {
    handler(event as CustomEvent<AuthEventDetail>);
  };

  window.addEventListener(type, eventHandler);

  // Return cleanup function
  return () => {
    window.removeEventListener(type, eventHandler);
  };
};

/**
 * Check if we're already on an auth-related page
 * Prevents infinite redirect loops
 */
export const isOnAuthPage = (): boolean => {
  const authPaths = ['/sign-in', '/sign-up', '/auth'];
  return authPaths.some((path) => window.location.pathname.includes(path));
};

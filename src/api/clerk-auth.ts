/**
 * Clerk authentication integration for API client
 *
 * This module provides a bridge between Clerk's authentication
 * and the Axios API client, ensuring all requests include
 * a valid authentication token.
 */

let tokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Set the Clerk token getter function
 * This should be called once when the app initializes with Clerk
 */
export function setClerkTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

/**
 * Get the current Clerk authentication token
 * Returns null if not authenticated or token getter not set
 */
export async function getClerkToken(): Promise<string | null> {
  if (!tokenGetter) {
    return null;
  }

  try {
    return await tokenGetter();
  } catch (error) {
    console.error('Failed to get Clerk token:', error);
    return null;
  }
}

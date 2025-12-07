/**
 * Clerk Authentication Integration
 *
 * Provides a bridge between Clerk's authentication and the Search API client.
 * The token getter is set during app initialization by ClerkAuthInitializer.
 */

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

/**
 * Set the Clerk token getter function
 *
 * Called by ClerkAuthInitializer when the app initializes.
 *
 * @param getter - Function that returns the Clerk JWT token
 */
export function setClerkTokenGetter(getter: TokenGetter): void {
  tokenGetter = getter;
}

/**
 * Get the current Clerk authentication token
 *
 * Used by the Search API client interceptor to add the auth header.
 *
 * @returns The JWT token or null if not authenticated
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

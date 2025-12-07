/**
 * Clerk Authentication Integration
 *
 * Provides a bridge between Clerk's authentication and the Search API client.
 * The token getter is set during app initialization by ClerkAuthInitializer.
 */

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;
let resolveInitialization: (() => void) | null = null;

// Create a promise that resolves when the token getter is set
initializationPromise = new Promise<void>((resolve) => {
  resolveInitialization = resolve;
});

/**
 * Set the Clerk token getter function
 *
 * Called by ClerkAuthInitializer when the app initializes.
 *
 * @param getter - Function that returns the Clerk JWT token
 */
export function setClerkTokenGetter(getter: TokenGetter): void {
  tokenGetter = getter;
  isInitialized = true;
  if (resolveInitialization) {
    resolveInitialization();
  }
}

/**
 * Check if the Clerk authentication is initialized
 *
 * @returns true if the token getter has been set
 */
export function isClerkAuthInitialized(): boolean {
  return isInitialized;
}

/**
 * Wait for Clerk authentication to be initialized
 *
 * Use this before making API calls that require authentication
 * to avoid race conditions during app startup.
 *
 * @param timeoutMs - Maximum time to wait (default: 5000ms)
 * @returns Promise that resolves when initialized or rejects on timeout
 */
export async function waitForClerkAuth(timeoutMs: number = 5000): Promise<void> {
  if (isInitialized) {
    return;
  }

  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Clerk authentication initialization timed out'));
    }, timeoutMs);
  });

  return Promise.race([initializationPromise!, timeoutPromise]);
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

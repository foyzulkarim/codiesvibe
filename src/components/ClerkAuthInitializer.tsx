import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { setClerkTokenGetter } from '@/api/clerk-auth';

/**
 * Retry logic for token retrieval
 */
async function getTokenWithRetry(
  getToken: () => Promise<string | null>,
  maxRetries = 3,
  delayMs = 1000
): Promise<string | null> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const token = await getToken();
      return token;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        console.warn(`Token retrieval attempt ${attempt} failed, retrying...`, error);
      }
    }
  }

  // All retries failed
  console.error('Failed to get Clerk token after multiple attempts:', lastError);
  return null;
}

/**
 * Component to initialize Clerk authentication integration with API client
 * This component should be rendered once at the app root level
 */
export function ClerkAuthInitializer() {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set up the token getter for the API client with retry logic
    setClerkTokenGetter(async () => {
      return await getTokenWithRetry(getToken);
    });
  }, [getToken]);

  // This component doesn't render anything
  return null;
}

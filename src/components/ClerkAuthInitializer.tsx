/**
 * Clerk Authentication Initializer
 *
 * Initializes the Clerk token getter for the Search API client.
 * This component should be rendered once at the app root level.
 *
 * Uses useLayoutEffect to ensure the token getter is set before
 * any child components make API calls, preventing race conditions.
 */

import { useAuth } from '@clerk/clerk-react';
import { useLayoutEffect, useRef } from 'react';
import { setClerkTokenGetter } from '@/api/clerk-auth';

export function ClerkAuthInitializer() {
  const { getToken, isLoaded } = useAuth();
  const hasInitialized = useRef(false);

  // Use useLayoutEffect to set up the token getter synchronously
  // before any child components render and potentially make API calls
  useLayoutEffect(() => {
    // Only initialize once when Clerk is loaded
    if (isLoaded && !hasInitialized.current) {
      setClerkTokenGetter(getToken);
      hasInitialized.current = true;
    }
  }, [getToken, isLoaded]);

  // Also update the token getter if it changes (e.g., after sign-in/sign-out)
  useLayoutEffect(() => {
    if (hasInitialized.current) {
      setClerkTokenGetter(getToken);
    }
  }, [getToken]);

  // This component doesn't render anything
  return null;
}

/**
 * Clerk Authentication Initializer
 *
 * Initializes the Clerk token getter for the Search API client.
 * This component should be rendered once at the app root level.
 */

import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { setClerkTokenGetter } from '@/api/clerk-auth';

export function ClerkAuthInitializer() {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set up the token getter for the API client
    setClerkTokenGetter(getToken);
  }, [getToken]);

  // This component doesn't render anything
  return null;
}

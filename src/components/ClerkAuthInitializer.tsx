import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { setClerkTokenGetter } from '@/api/clerk-auth';

/**
 * Component to initialize Clerk authentication integration with API client
 * This component should be rendered once at the app root level
 */
export function ClerkAuthInitializer() {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set up the token getter for the API client
    setClerkTokenGetter(async () => {
      try {
        // Get the token from Clerk for backend API calls
        return await getToken();
      } catch (error) {
        console.error('Failed to get Clerk token:', error);
        return null;
      }
    });
  }, [getToken]);

  // This component doesn't render anything
  return null;
}

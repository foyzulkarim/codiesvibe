/**
 * User Role Hook
 *
 * Gets the user's role from Clerk public metadata.
 * Returns 'admin', 'maintainer', 'user', or null based on the role set in Clerk dashboard.
 *
 * Security: Defaults to 'user' (not 'maintainer') if no role is explicitly set.
 * Admins and maintainers must be explicitly configured in Clerk metadata.
 */

import { useUser } from '@clerk/clerk-react';

export type UserRole = 'admin' | 'maintainer' | 'user' | null;

interface UseUserRoleResult {
  userId: string | null;
  role: UserRole;
  isAdmin: boolean;
  isMaintainer: boolean;
  isUser: boolean;
  hasRole: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const { user, isLoaded, isSignedIn } = useUser();

  // Safely extract role from metadata
  const metadataRole = user?.publicMetadata?.role as string | undefined;

  // Determine role with safe defaults
  let role: UserRole = null;
  if (metadataRole === 'admin') {
    role = 'admin';
  } else if (metadataRole === 'maintainer') {
    role = 'maintainer';
  } else if (isSignedIn && user) {
    // Authenticated users without explicit role default to 'user'
    role = 'user';
  }
  // Otherwise role remains null (not authenticated or no user)

  return {
    userId: user?.id ?? null,
    role,
    isAdmin: role === 'admin',
    isMaintainer: role === 'maintainer',
    isUser: role === 'user',
    hasRole: role !== null,
    isLoading: !isLoaded,
    isAuthenticated: !!isSignedIn,
  };
}

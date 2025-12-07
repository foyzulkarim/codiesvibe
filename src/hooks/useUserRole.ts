/**
 * User Role Hook
 *
 * Gets the user's role from Clerk public metadata.
 * Returns 'admin' or 'maintainer' based on the role set in Clerk dashboard.
 */

import { useUser } from '@clerk/clerk-react';

export type UserRole = 'admin' | 'maintainer';

interface UseUserRoleResult {
  role: UserRole;
  isAdmin: boolean;
  isMaintainer: boolean;
  isLoading: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const { user, isLoaded } = useUser();

  const role: UserRole =
    (user?.publicMetadata?.role as string) === 'admin' ? 'admin' : 'maintainer';

  return {
    role,
    isAdmin: role === 'admin',
    isMaintainer: role === 'maintainer',
    isLoading: !isLoaded,
  };
}

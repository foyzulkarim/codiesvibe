import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole, UserRole } from '@/hooks/useUserRole';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Required role(s) to access this route. If not specified, any authenticated user can access. */
  requiredRole?: UserRole | UserRole[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, role } = useUserRole();

  // Show loading state while auth/role is being determined
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  // Check role-based access if requiredRole is specified
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = role && allowedRoles.includes(role);

    // Admin always has access to everything
    if (!hasRequiredRole && role !== 'admin') {
      // Redirect to home or show unauthorized page
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

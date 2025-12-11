/**
 * Authentication Event Handler
 *
 * Listens for authentication-related events and handles routing.
 * This component should be mounted once in the App component.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { listenForAuthEvent, AuthEventType } from '@/lib/auth-events';

export function AuthHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for unauthorized events (401)
    const cleanupUnauthorized = listenForAuthEvent(
      AuthEventType.UNAUTHORIZED,
      (event) => {
        const { returnUrl, message } = event.detail;

        // Save return URL to session storage
        if (returnUrl) {
          sessionStorage.setItem('returnUrl', returnUrl);
        }

        // Show toast notification
        if (message) {
          toast.error(message);
        }

        // Navigate to sign-in page
        const encodedReturnUrl = returnUrl ? encodeURIComponent(returnUrl) : '';
        navigate(`/sign-in${encodedReturnUrl ? `?redirect_url=${encodedReturnUrl}` : ''}`, {
          replace: true,
        });
      }
    );

    // Listen for forbidden events (403)
    const cleanupForbidden = listenForAuthEvent(
      AuthEventType.FORBIDDEN,
      (event) => {
        const { message } = event.detail;

        // Show toast notification
        toast.error(message || 'You do not have permission to access this resource');

        // Navigate to home page
        navigate('/', { replace: true });
      }
    );

    // Listen for session expired events
    const cleanupSessionExpired = listenForAuthEvent(
      AuthEventType.SESSION_EXPIRED,
      (event) => {
        const { returnUrl, message } = event.detail;

        // Save return URL
        if (returnUrl) {
          sessionStorage.setItem('returnUrl', returnUrl);
        }

        // Show toast notification
        toast.error(message || 'Your session has expired. Please sign in again.');

        // Navigate to sign-in page
        const encodedReturnUrl = returnUrl ? encodeURIComponent(returnUrl) : '';
        navigate(`/sign-in${encodedReturnUrl ? `?redirect_url=${encodedReturnUrl}` : ''}`, {
          replace: true,
        });
      }
    );

    // Cleanup all listeners on unmount
    return () => {
      cleanupUnauthorized();
      cleanupForbidden();
      cleanupSessionExpired();
    };
  }, [navigate]);

  // This component doesn't render anything
  return null;
}

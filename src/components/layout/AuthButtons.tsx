import { Link } from 'react-router-dom';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, LogOut, Settings } from 'lucide-react';

interface AuthButtonsProps {
  /**
   * 'full' - Shows all auth controls (login/signup or user info + settings + logout)
   * 'minimal' - Shows only logout button when signed in
   */
  variant?: 'full' | 'minimal';
}

export function AuthButtons({ variant = 'full' }: AuthButtonsProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    if (variant === 'minimal') {
      return (
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      );
    }

    // Full variant - show user info, settings, and logout
    return (
      <div className="flex items-center space-x-3">
        <Link to="/admin/tools">
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Tools
          </Button>
        </Link>
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {user?.firstName || user?.emailAddresses[0]?.emailAddress}
        </span>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    );
  }

  // Not signed in
  if (variant === 'minimal') {
    return null;
  }

  // Full variant - show login and signup
  return (
    <div className="flex items-center space-x-2">
      <Link to="/sign-in">
        <Button variant="ghost" size="sm">
          <LogIn className="h-4 w-4 mr-2" />
          Login
        </Button>
      </Link>
      <Link to="/sign-up">
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Sign Up
        </Button>
      </Link>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithOAuth } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check for error in URL params
      const error = searchParams.get('error');
      if (error) {
        setStatus('error');
        setErrorMessage(decodeURIComponent(error));
        return;
      }

      // Get tokens and user data from URL params
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const userParam = searchParams.get('user');

      if (!accessToken || !refreshToken || !userParam) {
        setStatus('error');
        setErrorMessage('Missing authentication data. Please try again.');
        return;
      }

      try {
        // Parse user data
        const user = JSON.parse(decodeURIComponent(userParam));

        // Store tokens and user in auth context
        await loginWithOAuth({
          accessToken,
          refreshToken,
          user,
        });

        setStatus('success');

        // Redirect to admin after a brief success message
        setTimeout(() => {
          navigate('/admin/tools', { replace: true });
        }, 1500);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to complete authentication');
      }
    };

    handleOAuthCallback();
  }, [searchParams, loginWithOAuth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {status === 'loading' && 'Signing you in...'}
            {status === 'success' && 'Welcome!'}
            {status === 'error' && 'Authentication Failed'}
          </CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'Please wait while we complete your sign in'}
            {status === 'success' && 'You have been successfully authenticated'}
            {status === 'error' && 'There was a problem signing you in'}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}

          {status === 'success' && (
            <CheckCircle className="h-12 w-12 text-green-500" />
          )}

          {status === 'error' && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => navigate('/login')}>
                  Try Again
                </Button>
                <Button variant="ghost" onClick={() => navigate('/')}>
                  Go Home
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCallback;

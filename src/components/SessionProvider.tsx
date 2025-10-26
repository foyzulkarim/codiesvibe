import React, { createContext, useContext, ReactNode } from 'react';
import { useSession } from '@/hooks/useSession';

interface SessionData {
  sessionId: string;
  csrfToken: string;
  expiresAt: string;
  valid: boolean;
}

interface SessionContextType {
  session: SessionData | null;
  isLoading: boolean;
  error: string | null;
  isSessionValid: () => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const { session, isLoading, error, isSessionValid } = useSession();

  return (
    <SessionContext.Provider value={{ session, isLoading, error, isSessionValid }}>
      {children}
    </SessionContext.Provider>
  );
};
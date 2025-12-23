import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { LoadingOverlay } from '@/components';
import {
  dropSession,
  loadSession,
  persistSession,
} from '@/repositories/sessionRepository';
import { getUserCount } from '@/repositories/userRepository';
import { Credentials, Session } from '@/types';

import { signInWithCredentials, signOutSession } from './authService';

type AuthContextValue = {
  session: Session | null;
  isAuthenticated: boolean;
  initializing: boolean;
  loading: boolean;
  hasUsers: boolean;
  checkHasUsers: () => Promise<void>;
  signIn: (credentials: Credentials) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasUsers, setHasUsers] = useState(true); // Assume true initially to avoid flash

  const checkHasUsers = async () => {
    try {
      const count = await getUserCount();
      setHasUsers(count > 0);
    } catch (error) {
      console.error('Erro ao verificar usuarios:', error);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      await checkHasUsers();
      const storedSession = await loadSession();
      if (storedSession?.userId) {
        setSession(storedSession);
      }
      setInitializing(false);
    };

    restoreSession();
  }, []);

  const signIn = async (credentials: Credentials) => {
    setLoading(true);
    try {
      const response = await signInWithCredentials(credentials);
      const nextSession: Session = {
        userId: response.userId,
        username: response.username,
        mustChangePassword: response.mustChangePassword,
        timestamp: Date.now(),
      };
      await persistSession(nextSession);
      setSession(nextSession);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await signOutSession();
      await dropSession();
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.userId),
      initializing,
      loading,
      hasUsers,
      checkHasUsers,
      signIn,
      signOut,
    }),
    [session, initializing, loading, hasUsers],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoadingOverlay
        visible={initializing || loading}
        message={initializing ? 'Restaurando sessao...' : 'Processando...'}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return context;
}

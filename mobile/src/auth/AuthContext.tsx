import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { postJson } from '@/api/client';
import {
  clearSession,
  loadSession,
  saveSession,
  sessionFrom,
  subscribeSession,
  type AuthResponse,
  type Session,
} from '@/auth/session';
import { claimLocalData, wipeLocalData } from '@/sync/engine';

export type Registration = { username: string; password: string; motivation: string | null; dailyGoal: number };

type AuthContextValue = {
  session: Session | null;
  // True until the stored session has been read on app start.
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  register: (registration: Registration) => Promise<void>;
  // Also removes this account's data from the device.
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Follows every change, including the sync engine signing the user out when the refresh token expires.
    const unsubscribe = subscribeSession(setSession);
    // On app start the session comes from the device, not the server: this works offline.
    loadSession().finally(() => setIsLoading(false));
    return unsubscribe;
  }, []);

  async function authenticate(path: string, body: Record<string, unknown>) {
    const response = await postJson<AuthResponse>(path, body);
    claimLocalData(response.user.username);
    await saveSession(sessionFrom(response));
  }

  const value: AuthContextValue = {
    session,
    isLoading,
    signIn: (username, password) => authenticate('/auth/login', { username: username.trim().toLowerCase(), password }),
    register: (registration) =>
      authenticate('/auth/register', { ...registration, username: registration.username.trim().toLowerCase() }),
    signOut: async () => {
      wipeLocalData();
      await clearSession();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}

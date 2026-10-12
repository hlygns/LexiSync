import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { postJson } from '@/api/client';
import { clearSession, loadSession, saveSession, type Session } from '@/auth/session';

type AuthResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
};

type AuthContextValue = {
  session: Session | null;
  // True until the stored session has been read on app start.
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app start the session comes from the device, not the server: this works offline.
  useEffect(() => {
    loadSession()
      .then(setSession)
      .finally(() => setIsLoading(false));
  }, []);

  async function authenticate(path: string, email: string, password: string) {
    const response = await postJson<AuthResponse>(path, { email, password });
    const next: Session = { email: email.trim().toLowerCase(), ...response };
    await saveSession(next);
    setSession(next);
  }

  const value: AuthContextValue = {
    session,
    isLoading,
    signIn: (email, password) => authenticate('/auth/login', email, password),
    register: (email, password) => authenticate('/auth/register', email, password),
    signOut: async () => {
      await clearSession();
      setSession(null);
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

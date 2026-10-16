import * as SecureStore from 'expo-secure-store';

export type Session = {
  username: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  // Answers from the sign-up cards.
  motivation: string | null;
  dailyGoal: number;
};

// What /auth/login, /auth/register and /auth/refresh return.
export type AuthResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  user: { username: string; motivation: string | null; dailyGoal: number };
};

export function sessionFrom(response: AuthResponse): Session {
  return {
    username: response.user.username,
    accessToken: response.accessToken,
    accessTokenExpiresAt: response.accessTokenExpiresAt,
    refreshToken: response.refreshToken,
    motivation: response.user.motivation,
    dailyGoal: response.user.dailyGoal,
  };
}

// SecureStore keeps the value encrypted (Android Keystore / iOS Keychain), unlike AsyncStorage.
const KEY = 'lexisync.session';

// The session also lives in memory so that non-React code (the sync engine) can read it.
let current: Session | null = null;

type Listener = (session: Session | null) => void;
const listeners = new Set<Listener>();

function setCurrent(session: Session | null): void {
  current = session;
  listeners.forEach((listener) => listener(session));
}

export function getSession(): Session | null {
  return current;
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) {
    setCurrent(null);
    return null;
  }

  // Sessions saved by earlier versions had "email" instead of "username" and no sign-up answers.
  const stored = JSON.parse(raw) as Partial<Session> & { email?: string };
  setCurrent({
    username: stored.username ?? stored.email ?? '',
    accessToken: stored.accessToken ?? '',
    accessTokenExpiresAt: stored.accessTokenExpiresAt ?? new Date(0).toISOString(),
    refreshToken: stored.refreshToken ?? '',
    motivation: stored.motivation ?? null,
    dailyGoal: stored.dailyGoal ?? 20,
  });
  return current;
}

export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
  setCurrent(session);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
  setCurrent(null);
}

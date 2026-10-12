import * as SecureStore from 'expo-secure-store';

export type Session = {
  email: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
};

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
  setCurrent(raw ? (JSON.parse(raw) as Session) : null);
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

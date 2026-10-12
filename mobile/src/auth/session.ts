import * as SecureStore from 'expo-secure-store';

export type Session = {
  email: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
};

// SecureStore keeps the value encrypted (Android Keystore / iOS Keychain), unlike AsyncStorage.
const KEY = 'lexisync.session';

export async function loadSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

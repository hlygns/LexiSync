import { normalizeApiUrl } from '@/api/url';
import { getMeta, setMeta } from '@/db/meta';

// The API address can be changed inside the app, because the server runs on a home computer whose
// IP address changes from network to network. The address built into the app is only the default.
const KEY = 'apiUrl';

export function getApiUrl(): string | undefined {
  return getMeta(KEY) ?? process.env.EXPO_PUBLIC_API_URL;
}

export function setApiUrl(input: string): string {
  const url = normalizeApiUrl(input);
  setMeta(KEY, url);
  return url;
}

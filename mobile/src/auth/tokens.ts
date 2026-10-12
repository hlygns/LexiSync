import { ApiError, postJson, request } from '@/api/client';
import { clearSession, getSession, saveSession } from '@/auth/session';

type AuthResponse = { accessToken: string; accessTokenExpiresAt: string; refreshToken: string };

// Refresh a little before the real expiry, so a token never expires mid-request.
const EXPIRY_MARGIN_MS = 30_000;

// A refresh token works only once. If two requests refreshed at the same time, the second
// would be rejected and sign the user out, so everyone waits for the same in-flight refresh.
let refreshing: Promise<string> | null = null;

async function refresh(): Promise<string> {
  const session = getSession();
  if (!session) {
    throw new ApiError(401);
  }

  try {
    const response = await postJson<AuthResponse>('/auth/refresh', { refreshToken: session.refreshToken });
    await saveSession({ email: session.email, ...response });
    return response.accessToken;
  } catch (error) {
    // The server said the refresh token is no longer valid: the user has to sign in again.
    // A network error is different: stay signed in and try again later.
    if (error instanceof ApiError && error.status === 401) {
      await clearSession();
    }
    throw error;
  }
}

export function getAccessToken(options: { forceRefresh?: boolean } = {}): Promise<string> {
  const session = getSession();
  if (!session) {
    return Promise.reject(new ApiError(401));
  }

  const expiresAt = Date.parse(session.accessTokenExpiresAt);
  if (!options.forceRefresh && expiresAt - Date.now() > EXPIRY_MARGIN_MS) {
    return Promise.resolve(session.accessToken);
  }

  refreshing ??= refresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// A request to a protected endpoint. Refreshes the access token when needed, without the caller noticing.
export async function authorizedRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const accessToken = await getAccessToken();
  try {
    return await request<T>(method, path, { body, accessToken });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    // The server rejected a token we thought was valid (e.g. clock difference): refresh once and retry.
    const fresh = await getAccessToken({ forceRefresh: true });
    return request<T>(method, path, { body, accessToken: fresh });
  }
}

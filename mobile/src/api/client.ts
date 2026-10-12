const baseUrl = process.env.EXPO_PUBLIC_API_URL;

// A free-tier server may need a while to wake up; give up after this long and try again later.
const TIMEOUT_MS = 20_000;

// status 0 means the request never got an answer (no network, server down or asleep, timeout).
export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`API request failed with status ${status}`);
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

type RequestOptions = { body?: unknown; accessToken?: string };

export async function request<T>(method: 'GET' | 'POST', path: string, options: RequestOptions = {}): Promise<T> {
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.');
  }

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return (await response.json()) as T;
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, { body });
}

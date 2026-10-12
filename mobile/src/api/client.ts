const baseUrl = process.env.EXPO_PUBLIC_API_URL;

// status 0 means the request never reached the server (no network, server down).
export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`API request failed with status ${status}`);
  }
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.');
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0);
  }

  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return (await response.json()) as T;
}

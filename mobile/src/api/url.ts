// Pure helper, kept apart from server.ts so it can be tested without a database.

// "192.168.1.49" -> "http://192.168.1.49:8080"; a full URL is kept as it is, without a trailing slash.
export function normalizeApiUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  if (!/:\d+$/.test(url.replace(/^https?:\/\//i, '')) && url.startsWith('http://')) url = `${url}:8080`;
  return url;
}

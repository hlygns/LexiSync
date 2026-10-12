type Versioned = { updatedAt: string; deletedAt: string | null };

// Decides whether a row pulled from the server replaces the local row. Mirrors the server's
// ConflictResolver, so both sides reach the same answer: a delete always wins, otherwise the
// later write wins. Pure, so it is unit tested directly.
export function shouldApplyRemote(local: Versioned | undefined, remote: Versioned): boolean {
  if (!local) return true;
  if (remote.deletedAt) return true;
  // The local delete is still in the outbox and will win on the server too.
  if (local.deletedAt) return false;
  // Parse instead of comparing strings: the server and the device format dates differently.
  return Date.parse(remote.updatedAt) >= Date.parse(local.updatedAt);
}

// "2026-10-12T09:00:00.123456+00:00" (server) -> "2026-10-12T09:00:00.123Z" (device format).
// Keeps every date in the local database comparable as plain text.
export function normalizeDate(value: string): string;
export function normalizeDate(value: string | null): string | null;
export function normalizeDate(value: string | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

import { asc, count, eq, inArray } from 'drizzle-orm';

import { ApiError, request } from '@/api/client';
import { getSession } from '@/auth/session';
import { authorizedRequest } from '@/auth/tokens';
import { db, type Tx } from '@/db/client';
import { getMeta, setMeta } from '@/db/meta';
import { rebuildReviewState } from '@/db/reviews';
import { cards, decks, exams, outbox, reviewLogs, reviewStates, syncMeta } from '@/db/schema';
import { normalizeDate, shouldApplyRemote } from '@/sync/merge';
import { enqueueCard, enqueueDeck } from '@/sync/outbox';

type RemoteDeck = { id: string; examId: number; name: string; updatedAt: string; deletedAt: string | null; serverVersion: number };
type RemoteCard = {
  id: string;
  deckId: string;
  term: string;
  meaning: string;
  example: string | null;
  tags: string[] | null;
  updatedAt: string;
  deletedAt: string | null;
  serverVersion: number;
};
type RemoteReviewLog = { id: string; cardId: string; grade: number; reviewedAt: string; deviceId: string };
type PullResponse = { latestVersion: number; decks: RemoteDeck[]; cards: RemoteCard[]; reviewLogs: RemoteReviewLog[] };
type PushResponse = { results: { changeId: string; status: string; reason: string | null }[] };

const PUSH_BATCH_SIZE = 100;
const LAST_VERSION_KEY = 'lastVersion';
const OWNER_KEY = 'owner';
const BACKFILL_KEY = 'outboxBackfilled';

// ---- status, shown on the home screen -------------------------------------------------------

export type SyncStatus = {
  state: 'idle' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: string | null;
};

let status: SyncStatus = { state: 'idle', lastSyncedAt: null };
const statusListeners = new Set<() => void>();

function setStatus(next: SyncStatus): void {
  status = next;
  statusListeners.forEach((listener) => listener());
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeSyncStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

// ---- running a sync -------------------------------------------------------------------------

let running: Promise<void> | null = null;
let requestedWhileRunning = false;

// Safe to call from anywhere, any number of times: only one sync runs at a time, and a request
// that arrives during a run causes exactly one more run afterwards.
export function requestSync(): Promise<void> {
  if (running) {
    requestedWhileRunning = true;
    return running;
  }

  running = runSync().finally(() => {
    running = null;
    if (requestedWhileRunning) {
      requestedWhileRunning = false;
      void requestSync();
    }
  });
  return running;
}

async function runSync(): Promise<void> {
  if (!getSession()) {
    return;
  }

  setStatus({ ...status, state: 'syncing' });
  try {
    enqueueNeverSentRows();
    // Push first: once the outbox is empty, whatever the pull brings cannot overwrite unsent work.
    await push();
    await pull();
    await refreshExams();
    setStatus({ state: 'idle', lastSyncedAt: new Date().toISOString() });
  } catch (error) {
    // Nothing is lost on failure: unsent changes stay in the outbox and the next sync continues from there.
    const isOffline = error instanceof ApiError && error.isNetworkError;
    setStatus({ ...status, state: isOffline ? 'offline' : 'error' });
  }
}

// Runs once per installation. Decks and cards created before the outbox existed (an early build of
// the app) have no outbox row; without this they would stay on this device forever.
function enqueueNeverSentRows(): void {
  if (getMeta(BACKFILL_KEY)) return;

  db.transaction((tx) => {
    const queued = new Set(
      tx
        .select()
        .from(outbox)
        .all()
        .map((row) => String(row.payload.id)),
    );
    for (const deck of tx.select().from(decks).where(eq(decks.serverVersion, 0)).all()) {
      if (!queued.has(deck.id)) enqueueDeck(tx, deck);
    }
    for (const card of tx.select().from(cards).where(eq(cards.serverVersion, 0)).all()) {
      if (!queued.has(card.id)) enqueueCard(tx, card);
    }
    setMeta(BACKFILL_KEY, 'done', tx);
  });
}

async function push(): Promise<void> {
  for (;;) {
    const batch = db.select().from(outbox).orderBy(asc(outbox.seq)).limit(PUSH_BATCH_SIZE).all();
    if (batch.length === 0) {
      return;
    }

    const response = await authorizedRequest<PushResponse>('POST', '/sync/push', {
      changes: batch.map((row) => ({ changeId: row.changeId, entity: row.entity, data: row.payload })),
    });

    // Every answered change leaves the outbox, whatever its status: applied and duplicate are done,
    // ignored lost a conflict, rejected can never succeed. If the answer never arrives, the rows stay
    // and are sent again with the same changeId, which the server recognises.
    const answered = response.results.map((result) => result.changeId);
    if (answered.length === 0) {
      throw new ApiError(500);
    }
    db.delete(outbox).where(inArray(outbox.changeId, answered)).run();
  }
}

async function pull(): Promise<void> {
  const since = Number(getMeta(LAST_VERSION_KEY) ?? 0);
  const response = await authorizedRequest<PullResponse>('GET', `/sync/pull?since=${since}`);

  // One transaction: the new rows and the new "last version" are saved together or not at all.
  db.transaction((tx) => {
    applyPull(tx, response);
    setMeta(LAST_VERSION_KEY, String(response.latestVersion), tx);
  });
}

function applyPull(tx: Tx, response: PullResponse): void {
  for (const remote of response.decks) {
    const local = tx.select().from(decks).where(eq(decks.id, remote.id)).get();
    if (!shouldApplyRemote(local, remote)) continue;

    const values = {
      examId: remote.examId,
      name: remote.name,
      updatedAt: normalizeDate(remote.updatedAt),
      deletedAt: normalizeDate(remote.deletedAt),
      serverVersion: remote.serverVersion,
    };
    tx.insert(decks)
      .values({ id: remote.id, ...values })
      .onConflictDoUpdate({ target: decks.id, set: values })
      .run();
  }

  for (const remote of response.cards) {
    const local = tx.select().from(cards).where(eq(cards.id, remote.id)).get();
    if (!shouldApplyRemote(local, remote)) continue;

    const values = {
      deckId: remote.deckId,
      term: remote.term,
      meaning: remote.meaning,
      example: remote.example,
      tags: remote.tags ?? [],
      updatedAt: normalizeDate(remote.updatedAt),
      deletedAt: normalizeDate(remote.deletedAt),
      serverVersion: remote.serverVersion,
    };
    tx.insert(cards)
      .values({ id: remote.id, ...values })
      .onConflictDoUpdate({ target: cards.id, set: values })
      .run();
  }

  // Logs never conflict: a log we do not have yet is added, one we already have is skipped.
  const cardsWithNewLogs = new Set<string>();
  for (const remote of response.reviewLogs) {
    const inserted = tx
      .insert(reviewLogs)
      .values({ ...remote, reviewedAt: normalizeDate(remote.reviewedAt) })
      .onConflictDoNothing()
      .returning({ id: reviewLogs.id })
      .all();
    if (inserted.length > 0) {
      cardsWithNewLogs.add(remote.cardId);
    }
  }

  // Reviews made on another device change when a card is due here.
  cardsWithNewLogs.forEach((cardId) => rebuildReviewState(tx, cardId));
}

// Reference data, public endpoint. Failure is not a sync failure: the previous copy keeps working.
async function refreshExams(): Promise<void> {
  try {
    const rows = await request<{ id: number; code: string; name: string }[]>('GET', '/exams');
    if (rows.length === 0) return;
    db.transaction((tx) => {
      tx.delete(exams).run();
      tx.insert(exams).values(rows).run();
    });
  } catch {
    // Keep the local copy.
  }
}

// ---- account changes ------------------------------------------------------------------------

export function pendingChangeCount(): number {
  return db.select({ total: count() }).from(outbox).get()?.total ?? 0;
}

// Removes everything that belongs to the signed-in account. The device id is kept.
export function wipeLocalData(): void {
  db.transaction((tx) => {
    tx.delete(outbox).run();
    tx.delete(reviewStates).run();
    tx.delete(reviewLogs).run();
    tx.delete(cards).run();
    tx.delete(decks).run();
    tx.delete(syncMeta).where(inArray(syncMeta.key, [LAST_VERSION_KEY, OWNER_KEY])).run();
  });
  setStatus({ state: 'idle', lastSyncedAt: null });
}

// Called right after sign-in. If the data on the device belongs to a different account
// (the previous user was signed out by an expired session), it must not leak into this one.
export function claimLocalData(email: string): void {
  const owner = getMeta(OWNER_KEY);
  if (owner && owner !== email) {
    wipeLocalData();
  }
  setMeta(OWNER_KEY, email);
}

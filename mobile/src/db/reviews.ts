import { and, asc, eq, isNull, lte, or } from 'drizzle-orm';

import { db, type Tx } from '@/db/client';
import { getDeviceId } from '@/db/meta';
import { cards, reviewLogs, reviewStates, type Card, type ReviewState } from '@/db/schema';
import { uuidv7 } from '@/db/uuid';
import { dueAt, INITIAL_STATE, review, type Grade, type Sm2State } from '@/srs/sm2';
import { enqueueReviewLog } from '@/sync/outbox';

export type DueCard = { card: Card; state: ReviewState | null };

// A card is due today if its due time falls anywhere before midnight, local time.
export function endOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

// Cards to study now: never reviewed (no state row) or due today or earlier.
export function getDueCards(deckId: string, now: Date = new Date()): DueCard[] {
  return db
    .select({ card: cards, state: reviewStates })
    .from(cards)
    .leftJoin(reviewStates, eq(reviewStates.cardId, cards.id))
    .where(
      and(
        eq(cards.deckId, deckId),
        isNull(cards.deletedAt),
        or(isNull(reviewStates.cardId), lte(reviewStates.dueAt, endOfToday(now).toISOString())),
      ),
    )
    .orderBy(asc(reviewStates.dueAt))
    .all();
}

export function toSm2State(state: ReviewState | null): Sm2State {
  return state
    ? { repetitions: state.repetitions, intervalDays: state.intervalDays, easeFactor: state.easeFactor }
    : INITIAL_STATE;
}

// Saves one review: the log row, the recalculated state and the outbox entry, all or nothing.
export function recordReview(cardId: string, grade: Grade, now: Date = new Date()): void {
  const log = { id: uuidv7(), cardId, grade, reviewedAt: now.toISOString(), deviceId: getDeviceId() };
  db.transaction((tx) => {
    tx.insert(reviewLogs).values(log).run();
    rebuildReviewState(tx, cardId);
    enqueueReviewLog(tx, log);
  });
}

// Replays every log of the card through SM-2, oldest first. Used after a local review and after
// pulling logs made on another device, so both kinds of review end up in the same state.
export function rebuildReviewState(tx: Tx, cardId: string): void {
  const logs = tx
    .select()
    .from(reviewLogs)
    .where(eq(reviewLogs.cardId, cardId))
    .orderBy(asc(reviewLogs.reviewedAt), asc(reviewLogs.id))
    .all();

  if (logs.length === 0) {
    tx.delete(reviewStates).where(eq(reviewStates.cardId, cardId)).run();
    return;
  }

  const state = logs.reduce((current, log) => review(current, log.grade as Grade), INITIAL_STATE);
  const lastReviewedAt = new Date(logs[logs.length - 1].reviewedAt);
  const values = { ...state, dueAt: dueAt(state, lastReviewedAt).toISOString() };

  tx.insert(reviewStates)
    .values({ cardId, ...values })
    .onConflictDoUpdate({ target: reviewStates.cardId, set: values })
    .run();
}

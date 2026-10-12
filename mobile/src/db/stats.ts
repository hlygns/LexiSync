import { and, count, eq, gte, isNull, lte } from 'drizzle-orm';

import { db } from '@/db/client';
import { endOfToday } from '@/db/reviews';
import { cards, decks, reviewLogs, reviewStates } from '@/db/schema';
import { computeStreak, localDayKey } from '@/stats/streak';

export type Stats = { reviewedToday: number; due: number; streak: number };

// Everything is computed from the local database, so the numbers are available offline.
export function getStats(now: Date = new Date()): Stats {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const reviewedToday =
    db.select({ total: count() }).from(reviewLogs).where(gte(reviewLogs.reviewedAt, startOfToday)).get()?.total ?? 0;

  // Learned words that are due today or earlier, in any deck that still exists.
  const due = db
    .select({ id: cards.id })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .innerJoin(reviewStates, eq(reviewStates.cardId, cards.id))
    .where(
      and(
        isNull(cards.deletedAt),
        isNull(decks.deletedAt),
        lte(reviewStates.dueAt, endOfToday(now).toISOString()),
      ),
    )
    .all().length;

  const reviewDays = db
    .select({ reviewedAt: reviewLogs.reviewedAt })
    .from(reviewLogs)
    .all()
    .map((log) => localDayKey(new Date(log.reviewedAt)));

  return { reviewedToday, due, streak: computeStreak(reviewDays, now) };
}

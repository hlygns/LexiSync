import { count, gte } from 'drizzle-orm';

import { db } from '@/db/client';
import { getDueCards } from '@/db/reviews';
import { practiceResults, reviewLogs, reviewStates } from '@/db/schema';
import { computeStreak, localDayKey } from '@/stats/streak';

export type Stats = {
  // Reviews done today (a passed unit test counts as one review per word).
  reviewedToday: number;
  // Learned words that are due again today or earlier.
  due: number;
  // Consecutive days with at least one review.
  streak: number;
  // Words that have been learned at least once.
  learned: number;
  // Practice sessions finished, all modes together.
  testsTaken: number;
};

// Everything is computed from the local database, so the numbers are available offline.
export function getStats(now: Date = new Date()): Stats {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const reviewedToday =
    db.select({ total: count() }).from(reviewLogs).where(gte(reviewLogs.reviewedAt, startOfToday)).get()?.total ?? 0;
  const learned = db.select({ total: count() }).from(reviewStates).get()?.total ?? 0;
  const testsTaken = db.select({ total: count() }).from(practiceResults).get()?.total ?? 0;

  const reviewDays = db
    .select({ reviewedAt: reviewLogs.reviewedAt })
    .from(reviewLogs)
    .all()
    .map((log) => localDayKey(new Date(log.reviewedAt)));

  return {
    reviewedToday,
    due: getDueCards(now).length,
    streak: computeStreak(reviewDays, now),
    learned,
    testsTaken,
  };
}

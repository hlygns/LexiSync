import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { getDeviceId } from '@/db/meta';
import { cards, decks, practiceResults, type Card, type PracticeMode } from '@/db/schema';
import { uuidv7 } from '@/db/uuid';
import { enqueuePracticeResult } from '@/sync/outbox';

// Every word in every deck that still exists: the material for free practice.
export function getAllCards(): Card[] {
  return db
    .select({ card: cards })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(isNull(cards.deletedAt), isNull(decks.deletedAt)))
    .orderBy(asc(cards.id))
    .all()
    .map((row) => row.card);
}

// The result and its outbox row are saved together or not at all.
export function savePracticeResult(mode: PracticeMode, score: number, total: number, now: Date = new Date()): void {
  const result = { id: uuidv7(), mode, score, total, completedAt: now.toISOString(), deviceId: getDeviceId() };
  db.transaction((tx) => {
    tx.insert(practiceResults).values(result).run();
    enqueuePracticeResult(tx, result);
  });
}

export type ModeProgress = {
  mode: PracticeMode;
  attempts: number;
  // Average and best share of correct answers, 0-100. null when the mode was never tried.
  average: number | null;
  best: number | null;
  // Most recent first.
  recent: { id: string; score: number; total: number; completedAt: string }[];
};

export const PROGRESS_ORDER: PracticeMode[] = ['general', 'vocab', 'cloze', 'translation'];

const percent = (score: number, total: number) => Math.round((score / total) * 100);

export function getProgress(): ModeProgress[] {
  const all = db.select().from(practiceResults).orderBy(desc(practiceResults.completedAt)).all();

  return PROGRESS_ORDER.map((mode) => {
    const results = all.filter((result) => result.mode === mode);
    const percents = results.map((result) => percent(result.score, result.total));
    return {
      mode,
      attempts: results.length,
      average: percents.length === 0 ? null : Math.round(percents.reduce((sum, p) => sum + p, 0) / percents.length),
      best: percents.length === 0 ? null : Math.max(...percents),
      recent: results.slice(0, 5).map(({ id, score, total, completedAt }) => ({ id, score, total, completedAt })),
    };
  });
}

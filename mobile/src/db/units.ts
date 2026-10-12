import { and, asc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { getDeviceId } from '@/db/meta';
import { insertReview } from '@/db/reviews';
import { cards, quizResults, type Card } from '@/db/schema';
import { uuidv7 } from '@/db/uuid';
import { isPass, splitIntoUnits } from '@/quiz/quiz';
import { Grade } from '@/srs/sm2';
import { enqueueQuizResult } from '@/sync/outbox';

// passed: its test was passed.  current: the next one to study.  locked: an earlier test is still open.
export type UnitStatus = 'passed' | 'current' | 'locked';

export type Unit = {
  index: number;
  cards: Card[];
  status: UnitStatus;
  // Best test result so far, if the test was ever taken.
  best: { score: number; total: number } | null;
};

export function getDeckCards(deckId: string): Card[] {
  return db
    .select()
    .from(cards)
    .where(and(eq(cards.deckId, deckId), isNull(cards.deletedAt)))
    .orderBy(asc(cards.id)) // ids are time-ordered (UUID v7), so this is creation order
    .all();
}

// The deck's cards in groups of 20, each with its lock state.
// A unit opens only when the test of every unit before it has been passed.
export function getUnits(deckId: string): Unit[] {
  const results = db.select().from(quizResults).where(eq(quizResults.deckId, deckId)).all();

  let previousPassed = true;
  return splitIntoUnits(getDeckCards(deckId)).map((unitCards, index) => {
    const attempts = results.filter((result) => result.unitIndex === index);
    const best = attempts.reduce<Unit['best']>(
      (top, attempt) => (!top || attempt.score / attempt.total > top.score / top.total ? attempt : top),
      null,
    );
    const passed = attempts.some((attempt) => isPass(attempt.score, attempt.total));

    const status: UnitStatus = passed ? 'passed' : previousPassed ? 'current' : 'locked';
    previousPassed = passed;
    return { index, cards: unitCards, status, best: best && { score: best.score, total: best.total } };
  });
}

export type QuizAnswer = { cardId: string; correct: boolean };

// Saves a finished test. Every attempt is stored; a passed attempt also counts as the first review
// of each word (right answer = "İyi", wrong answer = "Bilmiyorum"), which starts its SM-2 schedule.
// One transaction: the result, the reviews and their outbox rows are saved together or not at all.
export function saveQuizResult(deckId: string, unitIndex: number, answers: QuizAnswer[], now: Date = new Date()): boolean {
  const score = answers.filter((answer) => answer.correct).length;
  const passed = isPass(score, answers.length);

  const result = {
    id: uuidv7(),
    deckId,
    unitIndex,
    score,
    total: answers.length,
    completedAt: now.toISOString(),
    deviceId: getDeviceId(),
  };

  db.transaction((tx) => {
    tx.insert(quizResults).values(result).run();
    enqueueQuizResult(tx, result);

    if (passed) {
      for (const answer of answers) {
        insertReview(tx, answer.cardId, answer.correct ? Grade.Good : Grade.Again, now);
      }
    }
  });

  return passed;
}

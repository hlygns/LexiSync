// SM-2 spaced repetition. Line-for-line port of backend/src/LexiSync.Domain/Srs/Sm2.cs;
// both are checked against shared/sm2-vectors.json so they cannot drift apart.

// The four study buttons on SM-2's 0-5 quality scale.
export const Grade = { Again: 1, Hard: 3, Good: 4, Easy: 5 } as const;
export type Grade = (typeof Grade)[keyof typeof Grade];

export type Sm2State = { repetitions: number; intervalDays: number; easeFactor: number };

export const INITIAL_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;

// A card that has never been reviewed.
export const INITIAL_STATE: Sm2State = { repetitions: 0, intervalDays: 0, easeFactor: INITIAL_EASE_FACTOR };

// Pure: the result depends only on the arguments.
export function review(state: Sm2State, grade: Grade): Sm2State {
  const q = grade;

  let repetitions: number;
  let intervalDays: number;

  if (q < 3) {
    // Forgotten: start over, see the card again tomorrow.
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (state.repetitions === 0) intervalDays = 1;
    else if (state.repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(state.intervalDays * state.easeFactor);
    repetitions = state.repetitions + 1;
  }

  const easeFactor = Math.max(
    state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
    MIN_EASE_FACTOR,
  );

  return { repetitions, intervalDays, easeFactor };
}

export function dueAt(state: Sm2State, reviewedAt: Date): Date {
  return new Date(reviewedAt.getTime() + state.intervalDays * 24 * 60 * 60 * 1000);
}

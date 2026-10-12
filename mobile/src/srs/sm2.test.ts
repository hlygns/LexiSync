import vectors from '../../../shared/sm2-vectors.json';
import { dueAt, Grade, INITIAL_STATE, MIN_EASE_FACTOR, review, type Sm2State } from './sm2';

function reviewAll(grades: number[]): Sm2State {
  return grades.reduce((state, grade) => review(state, grade as Grade), INITIAL_STATE);
}

// The same file is run by the backend's xUnit tests (Sm2SharedVectorTests.cs).
describe('shared vectors (must match the C# implementation)', () => {
  test.each(vectors)('$name', ({ grades, expected }) => {
    const state = reviewAll(grades);

    expect(state.repetitions).toBe(expected.repetitions);
    expect(state.intervalDays).toBe(expected.intervalDays);
    expect(state.easeFactor).toBeCloseTo(expected.easeFactor, 10);
  });
});

describe('sm2', () => {
  test('first three successful reviews are 1, 6 and 15 days apart', () => {
    expect(reviewAll([Grade.Good]).intervalDays).toBe(1);
    expect(reviewAll([Grade.Good, Grade.Good]).intervalDays).toBe(6);
    expect(reviewAll([Grade.Good, Grade.Good, Grade.Good]).intervalDays).toBe(15);
  });

  test('again resets repetitions and schedules tomorrow', () => {
    const state = reviewAll([Grade.Good, Grade.Good, Grade.Good, Grade.Again]);

    expect(state.repetitions).toBe(0);
    expect(state.intervalDays).toBe(1);
  });

  test('ease factor never drops below the minimum', () => {
    expect(reviewAll(Array(20).fill(Grade.Again)).easeFactor).toBeCloseTo(MIN_EASE_FACTOR, 10);
  });

  test('does not modify the state it is given', () => {
    const input: Sm2State = { repetitions: 4, intervalDays: 38, easeFactor: 2.2 };
    const copy = { ...input };

    review(input, Grade.Hard);

    expect(input).toEqual(copy);
  });

  test('due date is review time plus interval', () => {
    const reviewedAt = new Date('2026-10-12T09:00:00.000Z');
    const state = reviewAll([Grade.Good, Grade.Good]);

    expect(dueAt(state, reviewedAt).toISOString()).toBe('2026-10-18T09:00:00.000Z');
  });
});

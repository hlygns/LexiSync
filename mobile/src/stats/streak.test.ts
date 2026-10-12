import { computeStreak, localDayKey } from './streak';

const today = new Date(2026, 9, 12, 14, 0); // 12 October 2026, local time

describe('computeStreak', () => {
  test('no reviews means no streak', () => {
    expect(computeStreak([], today)).toBe(0);
  });

  test('a review today is a streak of one', () => {
    expect(computeStreak(['2026-10-12'], today)).toBe(1);
  });

  test('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-10-10', '2026-10-11', '2026-10-12'], today)).toBe(3);
  });

  test('a streak that ended yesterday is still alive today', () => {
    expect(computeStreak(['2026-10-10', '2026-10-11'], today)).toBe(2);
  });

  test('a missed day breaks the streak', () => {
    expect(computeStreak(['2026-10-08', '2026-10-09', '2026-10-11', '2026-10-12'], today)).toBe(2);
  });

  test('a streak that ended two days ago is lost', () => {
    expect(computeStreak(['2026-10-09', '2026-10-10'], today)).toBe(0);
  });

  test('several reviews on the same day count once', () => {
    expect(computeStreak(['2026-10-12', '2026-10-12', '2026-10-11'], today)).toBe(2);
  });

  test('crosses a month boundary', () => {
    expect(computeStreak(['2026-09-29', '2026-09-30', '2026-10-01'], new Date(2026, 9, 1, 8, 0))).toBe(3);
  });
});

describe('localDayKey', () => {
  test('pads month and day', () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

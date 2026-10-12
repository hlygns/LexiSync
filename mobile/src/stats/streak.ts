// "2026-10-12" in the device's own time zone: a review at 23:50 and one at 00:10 are different days.
export function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Number of consecutive days with at least one review, ending today.
// If nothing has been reviewed yet today, the streak that ended yesterday still counts:
// it is only lost once a whole day passes without a review. Pure.
export function computeStreak(reviewDays: Iterable<string>, today: Date): number {
  const days = new Set(reviewDays);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!days.has(localDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

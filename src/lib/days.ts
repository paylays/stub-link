const DAY_MS = 86_400_000;

export function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Oldest first, ending at the UTC day of `now`.
export function lastNDaysUtc(n: number, now: Date): string[] {
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) days.push(toUtcDay(new Date(todayStart - i * DAY_MS)));
  return days;
}

export type DayRow = { day: string; clicks: number; uniques: number };

export function fillDays(days: string[], rows: DayRow[]): DayRow[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return days.map((day) => byDay.get(day) ?? { day, clicks: 0, uniques: 0 });
}

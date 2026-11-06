import type { SQLiteDatabase } from 'expo-sqlite';

/** Kalendertag in Ortszeit als Schlüssel, z. B. "2026-11-03". */
export function dayKey(time: number): string {
  const d = new Date(time);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Lernserie: Anzahl aufeinanderfolgender Tage mit mindestens einer Übung, bis heute.
 * Wer heute noch nicht geübt hat, verliert die Serie nicht sofort: dann zählt bis gestern.
 */
export function streakFromDays(days: Set<string>, now: number): number {
  const oneDay = 86_400_000;
  let cursor = now;
  if (!days.has(dayKey(cursor))) cursor -= oneDay;
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor -= oneDay;
  }
  return streak;
}

export type LearningStats = {
  reviewsToday: number;
  correctToday: number;
  streak: number;
  totalReviews: number;
};

export async function getStats(db: SQLiteDatabase, now: number): Promise<LearningStats> {
  // Die letzten 400 Tage reichen für die Serie.
  const since = now - 400 * 86_400_000;
  const rows = await db.getAllAsync<{ rating: number; reviewed_at: number }>(
    'SELECT rating, reviewed_at FROM review_log WHERE reviewed_at >= ?',
    since,
  );
  const total = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM review_log');
  const today = dayKey(now);
  const days = new Set<string>();
  let reviewsToday = 0;
  let correctToday = 0;
  for (const r of rows) {
    const key = dayKey(r.reviewed_at);
    days.add(key);
    if (key === today) {
      reviewsToday++;
      if (r.rating >= 2) correctToday++;
    }
  }
  return { reviewsToday, correctToday, streak: streakFromDays(days, now), totalReviews: total?.n ?? 0 };
}

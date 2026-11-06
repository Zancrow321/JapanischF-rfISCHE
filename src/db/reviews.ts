import type { SQLiteDatabase } from 'expo-sqlite';

import type { StoredCard } from '@/learn/srs';

/** Alle Karten einer Abfrageart, nach Inhalt-ID. */
export async function getCards(db: SQLiteDatabase, mode: string): Promise<Map<string, StoredCard>> {
  const rows = await db.getAllAsync<StoredCard>(
    `SELECT item_id, mode, state, due, stability, difficulty, reps, lapses, last_review,
            scheduled_days, learning_steps
       FROM review_card WHERE mode = ?`,
    mode,
  );
  return new Map(rows.map((r) => [r.item_id, r]));
}

/** Speichert den neuen Lernstand und protokolliert die Antwort. */
export async function saveReview(
  db: SQLiteDatabase,
  card: StoredCard,
  grade: number,
  reviewedAt: number,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO review_card
         (item_id, mode, state, due, stability, difficulty, reps, lapses, last_review,
          scheduled_days, learning_steps)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(item_id, mode) DO UPDATE SET
         state = excluded.state, due = excluded.due, stability = excluded.stability,
         difficulty = excluded.difficulty, reps = excluded.reps, lapses = excluded.lapses,
         last_review = excluded.last_review, scheduled_days = excluded.scheduled_days,
         learning_steps = excluded.learning_steps`,
      card.item_id,
      card.mode,
      card.state,
      card.due,
      card.stability,
      card.difficulty,
      card.reps,
      card.lapses,
      card.last_review,
      card.scheduled_days,
      card.learning_steps,
    );
    await db.runAsync(
      'INSERT INTO review_log (item_id, mode, rating, reviewed_at) VALUES (?, ?, ?, ?)',
      card.item_id,
      card.mode,
      grade,
      reviewedAt,
    );
  });
}

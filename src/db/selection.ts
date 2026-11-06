import type { SQLiteDatabase } from 'expo-sqlite';

/** Liefert die IDs aller aktuell ausgewählten Lerninhalte. */
export async function getActiveItemIds(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ item_id: string }>(
    'SELECT item_id FROM item_selection WHERE active = 1',
  );
  return new Set(rows.map((r) => r.item_id));
}

/** Schaltet mehrere Inhalte auf einmal an oder aus (z. B. eine ganze Kana-Reihe). */
export async function setItemsActive(
  db: SQLiteDatabase,
  itemIds: string[],
  active: boolean,
): Promise<void> {
  if (itemIds.length === 0) return;
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const id of itemIds) {
      await db.runAsync(
        `INSERT INTO item_selection (item_id, active, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET active = excluded.active, updated_at = excluded.updated_at`,
        id,
        active ? 1 : 0,
        now,
      );
    }
  });
}

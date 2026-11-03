import type { SQLiteDatabase } from 'expo-sqlite';

/** Eigene Bedeutungen (z. B. für Kanji), nach Inhalt-ID. */
export async function getMeaningOverrides(db: SQLiteDatabase): Promise<Map<string, string>> {
  const rows = await db.getAllAsync<{ item_id: string; german: string }>('SELECT item_id, german FROM meaning_override');
  return new Map(rows.map((r) => [r.item_id, r.german]));
}

export async function getMeaningOverride(db: SQLiteDatabase, itemId: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ german: string }>('SELECT german FROM meaning_override WHERE item_id = ?', itemId);
  return row?.german ?? null;
}

/** Leerer Text entfernt die eigene Bedeutung wieder. */
export async function setMeaningOverride(db: SQLiteDatabase, itemId: string, german: string): Promise<void> {
  if (!german.trim()) {
    await db.runAsync('DELETE FROM meaning_override WHERE item_id = ?', itemId);
    return;
  }
  await db.runAsync(
    'INSERT INTO meaning_override (item_id, german) VALUES (?, ?) ON CONFLICT(item_id) DO UPDATE SET german = excluded.german',
    itemId,
    german.trim(),
  );
}

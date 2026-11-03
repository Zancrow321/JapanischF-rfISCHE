import type { SQLiteDatabase } from 'expo-sqlite';

import type { N5Word } from '@/data/types';

export type VocabList = { id: number; name: string; source: 'builtin' | 'custom'; count: number };

export type Vocab = {
  id: number;
  list_id: number;
  german: string;
  /** Lesung in Kana (Hiragana oder Katakana) */
  kana: string;
  /** Schreibweise mit Kanji, falls es eine gibt */
  written: string | null;
  note: string | null;
};

export type VocabInput = Pick<Vocab, 'german' | 'kana' | 'written' | 'note'>;

/** ID für Auswahl und Lernstand */
export const vocabItemId = (id: number) => `vocab:${id}`;
export const vocabListItemId = (id: number) => `vocablist:${id}`;

export const N5_LIST_NAME = 'JLPT N5 Grundwortschatz';

export async function getLists(db: SQLiteDatabase): Promise<VocabList[]> {
  return db.getAllAsync<VocabList>(
    `SELECT l.id, l.name, l.source, COUNT(v.id) AS count
       FROM vocab_list l LEFT JOIN vocab v ON v.list_id = l.id
      GROUP BY l.id ORDER BY l.source = 'builtin', l.created_at`,
  );
}

export async function getList(db: SQLiteDatabase, id: number): Promise<VocabList | null> {
  return db.getFirstAsync<VocabList>(
    `SELECT l.id, l.name, l.source, COUNT(v.id) AS count
       FROM vocab_list l LEFT JOIN vocab v ON v.list_id = l.id
      WHERE l.id = ? GROUP BY l.id`,
    id,
  );
}

/** Legt eine Liste an. Zum Lernen anschalten über die Auswahl (vocabListItemId). */
export async function createList(db: SQLiteDatabase, name: string, source: 'builtin' | 'custom' = 'custom') {
  const res = await db.runAsync(
    'INSERT INTO vocab_list (name, source, created_at) VALUES (?, ?, ?)',
    name.trim(),
    source,
    Date.now(),
  );
  return res.lastInsertRowId;
}

export async function renameList(db: SQLiteDatabase, id: number, name: string) {
  await db.runAsync('UPDATE vocab_list SET name = ? WHERE id = ?', name.trim(), id);
}

/** Löscht die Liste mit allen Wörtern und deren Lernstand. */
export async function deleteList(db: SQLiteDatabase, id: number) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM review_card WHERE item_id IN (SELECT 'vocab:' || id FROM vocab WHERE list_id = ?)`,
      id,
    );
    await db.runAsync('DELETE FROM vocab WHERE list_id = ?', id);
    await db.runAsync('DELETE FROM vocab_list WHERE id = ?', id);
    await db.runAsync('DELETE FROM item_selection WHERE item_id = ?', vocabListItemId(id));
  });
}

export async function getWords(db: SQLiteDatabase, listIds: number[]): Promise<Vocab[]> {
  if (listIds.length === 0) return [];
  return db.getAllAsync<Vocab>(
    `SELECT id, list_id, german, kana, written, note FROM vocab
      WHERE list_id IN (${listIds.map(() => '?').join(',')}) ORDER BY created_at, id`,
    ...listIds,
  );
}

const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);

export async function addWord(db: SQLiteDatabase, listId: number, word: VocabInput) {
  const res = await db.runAsync(
    'INSERT INTO vocab (list_id, german, kana, written, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    listId,
    word.german.trim(),
    word.kana.trim(),
    clean(word.written),
    clean(word.note),
    Date.now(),
  );
  return res.lastInsertRowId;
}

export async function updateWord(db: SQLiteDatabase, id: number, word: VocabInput) {
  await db.runAsync(
    'UPDATE vocab SET german = ?, kana = ?, written = ?, note = ? WHERE id = ?',
    word.german.trim(),
    word.kana.trim(),
    clean(word.written),
    clean(word.note),
    id,
  );
}

export async function deleteWord(db: SQLiteDatabase, id: number) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM review_card WHERE item_id = ?', vocabItemId(id));
    await db.runAsync('DELETE FROM vocab WHERE id = ?', id);
  });
}

/** Deutsche Bedeutungen aus dem Wörterbuch ("a|b|c") für die Anzeige, höchstens drei. */
export const joinGerman = (glosses: string[]) => glosses.slice(0, 3).join('; ');

/** Fügt die mitgelieferte N5-Liste als eigene, bearbeitbare Liste hinzu. */
export async function addN5List(db: SQLiteDatabase, words: N5Word[]): Promise<number> {
  const id = await createList(db, N5_LIST_NAME, 'builtin');
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const [written, kana, german] of words) {
      await db.runAsync(
        'INSERT INTO vocab (list_id, german, kana, written, note, created_at) VALUES (?, ?, ?, ?, NULL, ?)',
        id,
        joinGerman(german.split('|')),
        kana,
        written || null,
        now,
      );
    }
  });
  return id;
}

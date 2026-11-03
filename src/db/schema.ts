import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Datenbank für alles, was sich der Nutzer erarbeitet: Auswahl, Lernstand, eigene Listen.
 * Die Lerninhalte selbst (Kana, Kanji, Strichdaten) liegen als Dateien in der App.
 *
 * Jede Migration läuft genau einmal. Neue Änderungen kommen immer als neuer Eintrag ans Ende,
 * bestehende Einträge werden nie verändert, damit vorhandene Lernstände erhalten bleiben.
 */
export const MIGRATIONS: string[] = [
  // Version 1
  `
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  -- Welche Zeichen und Vokabeln gerade gelernt werden (item_id z. B. "kana:hiragana:か", "kanji:日").
  CREATE TABLE item_selection (
    item_id TEXT PRIMARY KEY NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  );

  -- Eigene Lernsets, z. B. "Lektion 3".
  CREATE TABLE study_set (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE study_set_item (
    set_id INTEGER NOT NULL REFERENCES study_set(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    PRIMARY KEY (set_id, item_id)
  );

  -- Lernstand pro Karte und Abfragerichtung (Werte für den FSRS-Algorithmus).
  CREATE TABLE review_card (
    item_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    state INTEGER NOT NULL DEFAULT 0,
    due INTEGER NOT NULL,
    stability REAL NOT NULL DEFAULT 0,
    difficulty REAL NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    last_review INTEGER,
    PRIMARY KEY (item_id, mode)
  );
  CREATE INDEX review_card_due ON review_card(due);

  CREATE TABLE review_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    rating INTEGER NOT NULL,
    reviewed_at INTEGER NOT NULL
  );
  CREATE INDEX review_log_time ON review_log(reviewed_at);

  -- Vokabellisten: mitgelieferte (builtin) und eigene (custom).
  CREATE TABLE vocab_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('builtin', 'custom')),
    created_at INTEGER NOT NULL
  );
  CREATE TABLE vocab (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES vocab_list(id) ON DELETE CASCADE,
    german TEXT NOT NULL,
    kana TEXT NOT NULL,
    written TEXT,
    note TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX vocab_list_idx ON vocab(list_id);

  -- Eigene deutsche Bedeutungen, die die mitgelieferten überschreiben.
  CREATE TABLE meaning_override (
    item_id TEXT PRIMARY KEY NOT NULL,
    german TEXT NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(db: SQLiteDatabase): Promise<void> {
  // Verbindungseinstellungen müssen außerhalb der Transaktion gesetzt werden.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if (row === null) throw new Error('Datenbankversion konnte nicht gelesen werden');
  const current = row.user_version;
  if (current > SCHEMA_VERSION) {
    throw new Error('Die Datenbank ist neuer als diese App-Version');
  }
  if (current === SCHEMA_VERSION) return;

  await db.withTransactionAsync(async () => {
    for (let v = current; v < SCHEMA_VERSION; v++) {
      await db.execAsync(MIGRATIONS[v]);
    }
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
}

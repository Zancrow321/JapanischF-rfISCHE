import { ALL_KANA, type Kana } from './kana';
import { KANJI } from './kanji';
import type { KanjiEntry } from './types';

export type CharInfo = { kind: 'kana'; kana: Kana } | { kind: 'kanji'; kanji: KanjiEntry };

const kanaByChar = new Map(ALL_KANA.map((k) => [k.char, k]));
let kanjiByChar: Map<string, KanjiEntry> | null = null;

/** Findet ein Zeichen (auch Kombinationen wie きゃ) in den Kana- oder Kanji-Daten. */
export function lookupChar(char: string): CharInfo | null {
  const kana = kanaByChar.get(char);
  if (kana) return { kind: 'kana', kana };
  kanjiByChar ??= new Map(KANJI.map((k) => [k.c, k]));
  const kanji = kanjiByChar.get(char);
  return kanji ? { kind: 'kanji', kanji } : null;
}

/** Pfad zur Zeichenseite mit Strichreihenfolge und Schreibübung. */
export const charHref = (char: string) => `/zeichen/${encodeURIComponent(char)}` as const;

import { toKatakana } from '@/data/kana';
import { toHiragana } from '@/lib/romaji';
import type { VocabScript, WordForms } from '@/vocab/script';

/** Vokabeln aus dem Kopf schreiben (Deutsch → japanische Schriftzeichen) */
export const VOCAB_WRITE_MODE = 'vokabel-schreiben';

/** Ein Zeichen des Worts: schreiben, wenn es Strichdaten gibt, sonst wird es einfach vorgegeben (z. B. „・“). */
export type WriteChar = { char: string; write: boolean };

/**
 * Was geschrieben wird, in der gewählten Schrift. Romaji kann man nicht mit Strichen schreiben,
 * daher dann Hiragana. Bei Kanji: die Schreibweise mit Kanji, außer es gibt keine oder einem
 * Kanji fehlen die Strichdaten, dann die Kana-Form.
 */
export function writeTarget(word: WordForms, script: VocabScript, hasStrokes: (char: string) => boolean): WriteChar[] {
  const kana = script === 'katakana' ? toKatakana(word.kana) : toHiragana(word.kana);
  const kanaChars = toChars(kana, hasStrokes);
  if (script !== 'kanji' || !word.written) return kanaChars;
  const written = toChars(word.written.replace(/\s/g, ''), hasStrokes);
  // Nur Kanji ohne Daten wären ein Problem; fehlende Satzzeichen o. Ä. werden einfach vorgegeben.
  const missingKanji = written.some((c) => !c.write && /\p{Script=Han}/u.test(c.char));
  return missingKanji ? kanaChars : written;
}

function toChars(text: string, hasStrokes: (char: string) => boolean): WriteChar[] {
  return Array.from(text).map((char) => ({ char, write: hasStrokes(char) }));
}

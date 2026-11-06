import { toKatakana } from '@/data/kana';
import { kanaToRomaji, toHiragana } from '@/lib/romaji';

/** In welcher Schrift Vokabeln gezeigt und abgefragt werden. */
export type VocabScript = 'romaji' | 'hiragana' | 'katakana' | 'kanji';

export const VOCAB_SCRIPTS: { value: VocabScript; label: string }[] = [
  { value: 'romaji', label: 'Romaji' },
  { value: 'hiragana', label: 'Hiragana' },
  { value: 'katakana', label: 'Katakana' },
  { value: 'kanji', label: 'Kanji' },
];

export const DEFAULT_VOCAB_SCRIPT: VocabScript = 'hiragana';

export const isVocabScript = (v: string | null | undefined): v is VocabScript =>
  VOCAB_SCRIPTS.some((s) => s.value === v);

export type WordForms = { kana: string; written: string | null };

/** Das Wort in der gewählten Schrift. Ohne Kanji-Schreibweise wird bei "Kanji" die Kana-Form gezeigt. */
export function displayWord(word: WordForms, script: VocabScript): string {
  switch (script) {
    case 'romaji':
      return kanaToRomaji(word.kana);
    case 'hiragana':
      return toHiragana(word.kana);
    case 'katakana':
      return toKatakana(word.kana);
    case 'kanji':
      return word.written || word.kana;
  }
}

/** Alle Formen auf einen Blick, z. B. für die Auflösung: 水 · みず · mizu */
export function allForms(word: WordForms): string[] {
  const forms = [word.written, word.kana, kanaToRomaji(word.kana)].filter((f): f is string => !!f);
  return [...new Set(forms)];
}

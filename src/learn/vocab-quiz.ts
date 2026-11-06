import type { Vocab } from '@/db/vocab';
import { answerKey } from '@/lib/romaji';

import type { Rng } from './kana-quiz';
import type { StoredCard } from './srs';

/** Deutsch → Japanisch */
export const VOCAB_DE_JA = 'vokabel-de-ja';
/** Japanisch → Deutsch */
export const VOCAB_JA_DE = 'vokabel-ja-de';

export type VocabDirection = 'de-ja' | 'ja-de';
export const modeFor = (d: VocabDirection) => (d === 'de-ja' ? VOCAB_DE_JA : VOCAB_JA_DE);

export type VocabQuestionType = 'tippen' | 'waehlen' | 'selbst';

export type VocabQuestion = { word: Vocab; type: VocabQuestionType; choices: Vocab[] };

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Ist die getippte Antwort richtig? Akzeptiert Romaji, Hiragana, Katakana und die Schreibweise
 * mit Kanji, egal welche Schrift gerade gewählt ist (auf dem Handy fehlt oft die japanische Tastatur).
 */
export function isJapaneseAnswerCorrect(word: Pick<Vocab, 'kana' | 'written'>, input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (word.written && trimmed.replace(/\s/g, '') === word.written) return true;
  return answerKey(trimmed) === answerKey(word.kana);
}

/** Drei andere Wörter als falsche Antworten, ohne gleiche Bedeutung oder gleiche Lesung. */
export function pickVocabChoices(target: Vocab, pool: Vocab[], rng: Rng, count = 4): Vocab[] {
  const seenGerman = new Set([target.german.toLowerCase()]);
  const seenKana = new Set([answerKey(target.kana)]);
  const others: Vocab[] = [];
  for (const w of shuffle(pool, rng)) {
    if (others.length >= count - 1) break;
    const g = w.german.toLowerCase();
    const k = answerKey(w.kana);
    if (w.id === target.id || seenGerman.has(g) || seenKana.has(k)) continue;
    seenGerman.add(g);
    seenKana.add(k);
    others.push(w);
  }
  return shuffle([target, ...others], rng);
}

/**
 * Fragen für eine Runde. Neue Wörter werden zuerst mit Auswahl abgefragt, bekannte Wörter
 * Deutsch → Japanisch zum Eintippen. Bei zu wenigen Wörtern für eine Auswahl: selbst prüfen.
 */
export function buildVocabQuestions(
  words: Vocab[],
  pool: Vocab[],
  direction: VocabDirection,
  cards: Map<string, StoredCard>,
  itemId: (w: Vocab) => string,
  rng: Rng = Math.random,
): VocabQuestion[] {
  return shuffle(words, rng).map((word) => {
    const choices = pickVocabChoices(word, pool, rng);
    const canChoose = choices.length >= 4;
    const known = (cards.get(itemId(word))?.reps ?? 0) >= 2;
    let type: VocabQuestionType;
    if (direction === 'de-ja') type = known || !canChoose ? 'tippen' : 'waehlen';
    else type = canChoose ? 'waehlen' : 'selbst';
    return { word, type, choices: type === 'waehlen' ? choices : [] };
  });
}

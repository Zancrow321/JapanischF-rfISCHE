import { kanjiItemId, kanjiMeanings, shortReading } from '@/data/kanji';
import type { KanjiEntry } from '@/data/types';

import type { Rng } from './kana-quiz';

export const KANJI_MODE = 'kanji-lesen';
export const KANJI_WRITE_MODE = 'kanji-schreiben';

/** bedeutung: Kanji → Bedeutung wählen; lesung: Kanji → Lesung wählen; finden: Bedeutung → Kanji wählen */
export type KanjiQuestionType = 'bedeutung' | 'lesung' | 'finden';

export type KanjiQuestion = { kanji: KanjiEntry; type: KanjiQuestionType; choices: KanjiEntry[] };

export type Overrides = Map<string, string>;

export const meaningText = (k: KanjiEntry, overrides: Overrides) =>
  kanjiMeanings(k, overrides.get(kanjiItemId(k))).meanings.slice(0, 2).join(', ');

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Drei falsche Antworten. Bevorzugt ausgewählte Kanji (die kennt man schon ein bisschen) und
 * dasselbe Schuljahr, damit es nicht zu leicht wird. Gleiche Bedeutung oder Lesung ist ausgeschlossen.
 */
export function pickKanjiChoices(
  target: KanjiEntry,
  type: KanjiQuestionType,
  active: KanjiEntry[],
  all: KanjiEntry[],
  overrides: Overrides,
  rng: Rng,
  count = 4,
): KanjiEntry[] {
  const label = (k: KanjiEntry) => (type === 'lesung' ? shortReading(k) : meaningText(k, overrides)).toLowerCase();
  const seen = new Set([label(target)]);
  const targetReadings = new Set([...target.on, ...target.kun]);
  const candidates = [
    ...shuffle(active, rng),
    ...shuffle(all.filter((k) => k.grade === target.grade), rng),
    ...shuffle(all, rng).slice(0, 200),
  ];
  const picked: KanjiEntry[] = [];
  const used = new Set([target.c]);
  for (const k of candidates) {
    if (picked.length >= count - 1) break;
    if (used.has(k.c)) continue;
    const l = label(k);
    if (!l || seen.has(l)) continue;
    if (type === 'lesung' && [...k.on, ...k.kun].some((r) => targetReadings.has(r))) continue;
    used.add(k.c);
    seen.add(l);
    picked.push(k);
  }
  return shuffle([target, ...picked], rng);
}

export function buildKanjiQuestions(
  kanji: KanjiEntry[],
  active: KanjiEntry[],
  all: KanjiEntry[],
  overrides: Overrides,
  rng: Rng = Math.random,
): KanjiQuestion[] {
  const types: KanjiQuestionType[] = ['bedeutung', 'lesung', 'finden'];
  return shuffle(kanji, rng).map((k) => {
    // Kanji ohne Lesung (selten) nur nach Bedeutung abfragen.
    const possible = shortReading(k) ? types : types.filter((t) => t !== 'lesung');
    const type = possible[Math.floor(rng() * possible.length)];
    return { kanji: k, type, choices: pickKanjiChoices(k, type, active, all, overrides, rng) };
  });
}

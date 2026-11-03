import type { Kana } from '@/data/kana';

import type { StoredCard } from './srs';

export const KANA_MODE = 'kana-lesen';
export const KANA_WRITE_MODE = 'kana-schreiben';

export type QuestionType = 'tippen' | 'lesung-waehlen' | 'hoeren';

export type Question = {
  kana: Kana;
  type: QuestionType;
  /** Nur bei Auswahlfragen: vier Zeichen, eines davon ist die richtige Antwort */
  choices: Kana[];
};

export type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Wählt die Karten für eine Runde: zuerst fällige (älteste zuerst), dann neue in der
 * gegebenen Reihenfolge. Nicht ausgewählte Inhalte kommen nie dran. Gilt für Zeichen und Vokabeln.
 */
export function pickSessionKana<T extends { id: string }>(
  activeKana: T[],
  cards: Map<string, StoredCard>,
  now: number,
  { limit = 20, newLimit = 10 } = {},
): T[] {
  const due = activeKana
    .filter((k) => {
      const c = cards.get(k.id);
      return c !== undefined && c.due <= now;
    })
    .sort((a, b) => cards.get(a.id)!.due - cards.get(b.id)!.due);
  const fresh = activeKana.filter((k) => !cards.has(k.id)).slice(0, newLimit);
  return [...due, ...fresh].slice(0, limit);
}

/** Zählt, wie viele Karten heute dran sind (fällig oder noch nie geübt). */
export function countDue(activeKana: { id: string }[], cards: Map<string, StoredCard>, now: number) {
  let due = 0;
  let fresh = 0;
  for (const k of activeKana) {
    const c = cards.get(k.id);
    if (!c) fresh++;
    else if (c.due <= now) due++;
  }
  return { due, fresh };
}

/**
 * Drei falsche Antworten zum Auswählen: Zeichen derselben Schrift mit anderer Lesung, damit die
 * Antwort eindeutig ist. Bevorzugt dieselbe Art (Grundzeichen, Dakuten, Kombination), sonst wäre
 * z. B. „rya“ neben „o“ zu leicht zu erraten.
 */
export function pickChoices(target: Kana, pool: Kana[], rng: Rng, count = 4): Kana[] {
  const targetReadings = new Set(target.romaji);
  const seen = new Set<string>();
  const sameScript = shuffle(
    pool.filter((k) => k.script === target.script && k.id !== target.id),
    rng,
  );
  const ordered = [
    ...sameScript.filter((k) => k.category === target.category),
    ...sameScript.filter((k) => k.category !== target.category),
  ];
  const candidates = ordered.filter((k) => {
    // Keine Zeichen mit gleicher Lesung (z. B. じ und ぢ), keine doppelten Lesungen.
    if (k.romaji.some((r) => targetReadings.has(r)) || seen.has(k.romaji[0])) return false;
    seen.add(k.romaji[0]);
    return true;
  });
  return shuffle([target, ...candidates.slice(0, count - 1)], rng);
}

export function buildQuestions(
  kana: Kana[],
  pool: Kana[],
  types: QuestionType[],
  rng: Rng = Math.random,
): Question[] {
  return shuffle(kana, rng).map((k) => {
    const type = types[Math.floor(rng() * types.length)];
    return { kana: k, type, choices: type === 'tippen' ? [] : pickChoices(k, pool, rng) };
  });
}

/** Prüft eine getippte Umschrift; Groß-/Kleinschreibung und Leerzeichen sind egal. */
export function isRomajiCorrect(kana: Kana, input: string): boolean {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, '');
  return kana.romaji.includes(normalized);
}

import { KANJI } from './generated/kanji-index';
import type { KanjiEntry } from './types';

export { KANJI };

/**
 * KANJIDIC2 schreibt Kun-Lesungen mit Markierungen: "い.きる" (Okurigana nach dem Punkt),
 * "ひと-" (Vorsilbe). Für die Anzeige werden diese Zeichen entfernt.
 */
export function displayReading(reading: string): string {
  return reading.replace(/[.\-]/g, '');
}

export const kanjiItemId = (k: KanjiEntry) => `kanji:${k.c}`;

export type KanjiGroup = { id: string; label: string; items: KanjiEntry[] };

/** Gruppen nach Schuljahr, so wie japanische Kinder die Kanji lernen. */
export function kanjiGroupsByGrade(kanji: KanjiEntry[] = KANJI): KanjiGroup[] {
  const byGrade = new Map<number, KanjiEntry[]>();
  for (const k of kanji) {
    if (!byGrade.has(k.grade)) byGrade.set(k.grade, []);
    byGrade.get(k.grade)!.push(k);
  }
  return [...byGrade.entries()]
    .sort(([a], [b]) => a - b)
    .map(([grade, items]) => ({
      id: `grade-${grade}`,
      label: grade <= 6 ? `${grade}. Schuljahr` : 'Mittelstufe und später',
      items,
    }));
}

/**
 * Bedeutungen zum Anzeigen und Abfragen: eigene Bedeutung, sonst Deutsch aus dem Wörterbuch,
 * sonst Englisch aus KANJIDIC2.
 */
export function kanjiMeanings(k: KanjiEntry, override?: string | null): { meanings: string[]; lang: 'eigene' | 'de' | 'en' } {
  if (override && override.trim()) {
    return { meanings: override.split(/[;,]/).map((m) => m.trim()).filter(Boolean), lang: 'eigene' };
  }
  if (k.meaningsDe && k.meaningsDe.length > 0) return { meanings: k.meaningsDe, lang: 'de' };
  return { meanings: k.meaningsEn.slice(0, 3), lang: 'en' };
}

/** Kurze Lesung für Abfragen: erste On-Lesung und erste Kun-Lesung, z. B. "スイ · みず". */
export function shortReading(k: KanjiEntry): string {
  const parts = [k.on[0], k.kun[0] ? displayReading(k.kun[0]) : undefined].filter((p): p is string => !!p);
  return [...new Set(parts)].join(' · ');
}

/** Kun-Lesungen ohne Markierungen und ohne Doppelte (みず und みず- sind für die Anzeige gleich). */
export const kunReadings = (k: KanjiEntry) => [...new Set(k.kun.map(displayReading))];

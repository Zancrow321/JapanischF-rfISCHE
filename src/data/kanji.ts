import { KANJI } from './generated/kanji-index';
import type { KanjiEntry } from './types';

export { KANJI };

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

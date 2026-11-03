import { displayReading, KANJI, kanjiGroupsByGrade } from '../kanji';
import { getStrokes } from '../strokes';

describe('Kanji-Daten', () => {
  it('enthält alle 2136 Jōyō-Kanji mit Strichdaten', () => {
    expect(KANJI).toHaveLength(2136);
    const missing = KANJI.filter((k) => getStrokes(k.c) === null).map((k) => k.c);
    expect(missing).toEqual([]);
  });

  it('gruppiert nach Schuljahr 1–6 und Rest', () => {
    const groups = kanjiGroupsByGrade();
    expect(groups.map((g) => g.id)).toEqual([
      'grade-1',
      'grade-2',
      'grade-3',
      'grade-4',
      'grade-5',
      'grade-6',
      'grade-8',
    ]);
    expect(groups[0].items).toHaveLength(80);
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(2136);
  });

  it('entfernt Markierungen aus Lesungen', () => {
    expect(displayReading('い.きる')).toBe('いきる');
    expect(displayReading('ひと-')).toBe('ひと');
    expect(displayReading('ニチ')).toBe('ニチ');
  });
});

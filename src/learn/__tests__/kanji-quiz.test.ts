import { kanjiMeanings, shortReading } from '@/data/kanji';
import type { KanjiEntry } from '@/data/types';

import { buildKanjiQuestions, meaningText, pickKanjiChoices } from '../kanji-quiz';

const k = (c: string, on: string[], kun: string[], de: string[], en: string[] = ['x'], grade = 1): KanjiEntry => ({
  c, grade, strokes: 4, jlptOld: 4, freq: 1, on, kun, meaningsEn: en, meaningsDe: de,
});

const ALL = [
  k('水', ['スイ'], ['みず'], ['Wasser']),
  k('火', ['カ'], ['ひ'], ['Feuer']),
  k('木', ['ボク', 'モク'], ['き'], ['Baum']),
  k('金', ['キン'], ['かね'], ['Geld', 'Gold']),
  k('土', ['ド'], ['つち'], ['Erde']),
  k('日', ['ニチ'], ['ひ'], ['Sonne', 'Tag']),
  k('川', ['セン'], ['かわ'], [], ['river']),
];
const rng = () => 0.3;

describe('Kanji-Bedeutungen', () => {
  it('eigene vor Deutsch vor Englisch', () => {
    expect(kanjiMeanings(ALL[0], 'Wasser; Flüssigkeit')).toEqual({ meanings: ['Wasser', 'Flüssigkeit'], lang: 'eigene' });
    expect(kanjiMeanings(ALL[0])).toEqual({ meanings: ['Wasser'], lang: 'de' });
    expect(kanjiMeanings(ALL[6])).toEqual({ meanings: ['river'], lang: 'en' });
  });
  it('kurze Lesung', () => {
    expect(shortReading(ALL[2])).toBe('ボク · き');
    expect(shortReading(k('一', ['イチ'], ['ひと-'], []))).toBe('イチ · ひと');
  });
  it('meaningText nimmt höchstens zwei', () => {
    expect(meaningText(ALL[3], new Map())).toBe('Geld, Gold');
  });
});

describe('pickKanjiChoices', () => {
  it('vier verschiedene Kanji, das richtige ist dabei', () => {
    const c = pickKanjiChoices(ALL[0], 'bedeutung', ALL.slice(0, 3), ALL, new Map(), rng);
    expect(c).toHaveLength(4);
    expect(c).toContain(ALL[0]);
    expect(new Set(c.map((x) => x.c)).size).toBe(4);
  });
  it('bei Lesungsfragen keine Kanji mit gleicher Lesung (火 und 日 = ひ)', () => {
    for (let i = 0; i < 20; i++) {
      const c = pickKanjiChoices(ALL[1], 'lesung', ALL, ALL, new Map(), Math.random);
      expect(c.map((x) => x.c)).not.toContain('日');
    }
  });
});

it('buildKanjiQuestions erzeugt eine Frage pro Kanji', () => {
  const qs = buildKanjiQuestions(ALL.slice(0, 3), ALL.slice(0, 3), ALL, new Map(), rng);
  expect(qs.map((q) => q.kanji.c).sort()).toEqual(['木', '水', '火']);
  for (const q of qs) expect(q.choices).toContain(q.kanji);
});

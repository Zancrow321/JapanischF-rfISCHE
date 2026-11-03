import { ALL_KANA, KANA_GROUPS, kanaGroupsFor, toKatakana } from '../kana';
import { getStrokesForText } from '../strokes';

describe('Kana-Tabellen', () => {
  it('enthält das komplette Grundalphabet (46 Zeichen je Schrift)', () => {
    for (const script of ['hiragana', 'katakana'] as const) {
      const basis = kanaGroupsFor(script)
        .filter((g) => g.category === 'basis')
        .flatMap((g) => g.items);
      expect(basis).toHaveLength(46);
    }
  });

  it('hat 25 Dakuten-Zeichen und 33 Kombinationen je Schrift', () => {
    for (const script of ['hiragana', 'katakana'] as const) {
      const groups = kanaGroupsFor(script);
      const count = (c: string) =>
        groups.filter((g) => g.category === c).flatMap((g) => g.items).length;
      expect(count('dakuten')).toBe(25);
      expect(count('yoon')).toBe(33);
    }
  });

  it('vergibt eindeutige IDs', () => {
    const ids = ALL_KANA.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
    const groupIds = KANA_GROUPS.map((g) => g.id);
    expect(new Set(groupIds).size).toBe(groupIds.length);
  });

  it('nutzt Hepburn als erste Umschrift', () => {
    const find = (char: string) => ALL_KANA.find((k) => k.char === char)!;
    expect(find('し').romaji[0]).toBe('shi');
    expect(find('ツ').romaji[0]).toBe('tsu');
    expect(find('ふ').romaji).toEqual(['fu', 'hu']);
    expect(find('ジョ').romaji[0]).toBe('jo');
  });

  it('wandelt Hiragana in Katakana um', () => {
    expect(toKatakana('きゃ')).toBe('キャ');
    expect(toKatakana('ゔ')).toBe('ヴ');
    expect(toKatakana('abc')).toBe('abc');
  });

  it('hat für jedes Kana-Zeichen Strichdaten', () => {
    for (const k of ALL_KANA) {
      for (const part of getStrokesForText(k.char)) {
        expect({ char: part.char, has: part.strokes !== null }).toEqual({ char: part.char, has: true });
      }
    }
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { chunkKey, kanjiVgFileName, parseKanjidic, parseKanjiVgSvg } from '../parsers';

const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

describe('parseKanjidic', () => {
  const kanji = parseKanjidic(fixture('kanjidic2-sample.xml'));

  it('behält nur Jōyō-Kanji (Schuljahr 1–8)', () => {
    expect(kanji.map((k) => k.c)).toEqual(['日', '亜']);
  });

  it('liest Lesungen, Bedeutungen und Kennzahlen', () => {
    expect(kanji[0]).toEqual({
      c: '日',
      grade: 1,
      strokes: 4,
      jlptOld: 4,
      freq: 1,
      on: ['ニチ', 'ジツ'],
      kun: ['ひ', '-び'],
      meaningsEn: ['day', 'sun'],
    });
  });

  it('nimmt bei mehreren Strichzahlen die erste', () => {
    expect(kanji[1].strokes).toBe(7);
    expect(kanji[1].meaningsEn).toEqual(['Asia']);
  });
});

describe('parseKanjiVgSvg', () => {
  it('liest alle Striche in Reihenfolge samt Nummernposition', () => {
    const data = parseKanjiVgSvg(fixture('kanjivg-065e5.svg'));
    expect(data.paths).toHaveLength(4);
    expect(data.paths[0]).toMatch(/^M31\.5,24\.5/);
    expect(data.numbers).toEqual([
      [25.25, 32.63],
      [34.5, 22.5],
      [37.5, 51.5],
      [37.5, 83.5],
    ]);
  });

  it('sortiert nach Strichnummer, auch wenn die Datei anders geordnet ist', () => {
    const svg =
      '<path id="kvg:04e00-s2" d="M2"/><path id="kvg:04e00-s1" d="M1"/>' +
      '<path id="kvg:04e00-s10" d="M10"/>';
    expect(parseKanjiVgSvg(svg).paths).toEqual(['M1', 'M2', 'M10']);
  });

  it('meldet einen Fehler, wenn keine Striche drin sind', () => {
    expect(() => parseKanjiVgSvg('<svg></svg>')).toThrow();
  });
});

describe('Dateinamen und Pakete', () => {
  it('bildet KanjiVG-Dateinamen', () => {
    expect(kanjiVgFileName('日')).toBe('065e5.svg');
    expect(kanjiVgFileName('あ')).toBe('03042.svg');
  });

  it('teilt Zeichen in Pakete', () => {
    expect(chunkKey('あ')).toBe('30');
    expect(chunkKey('ア')).toBe('30');
    expect(chunkKey('日')).toBe('65');
  });
});

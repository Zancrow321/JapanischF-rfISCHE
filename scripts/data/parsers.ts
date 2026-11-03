/**
 * Reine Umwandlungsfunktionen für die Rohdaten (ohne Datei- oder Netzwerkzugriff),
 * damit sie mit kleinen Beispieldateien getestet werden können.
 */
import { XMLParser } from 'fast-xml-parser';

import type { KanjiEntry, StrokeData } from '../../src/data/types.ts';

export type { KanjiEntry, StrokeData };

const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

type XmlText = string | number | { '#text': string | number; [attr: string]: unknown };
const text = (v: XmlText): string => String(typeof v === 'object' ? v['#text'] : v);
const attr = (v: XmlText, name: string): string | undefined =>
  typeof v === 'object' ? (v[`@_${name}`] as string | undefined) : undefined;

/** Liest KANJIDIC2-XML und gibt die Jōyō-Kanji (Schuljahr 1–8) zurück. */
export function parseKanjidic(xml: string): KanjiEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    processEntities: true,
    // Große Datei: DOCTYPE-Entities sind in KANJIDIC2 nur Element-Deklarationen.
    isArray: (name) => ['character', 'reading', 'meaning', 'rmgroup', 'stroke_count'].includes(name),
  });
  const doc = parser.parse(xml);
  const characters = asArray(doc.kanjidic2?.character);
  const result: KanjiEntry[] = [];

  for (const ch of characters) {
    const misc = ch.misc ?? {};
    const grade = misc.grade !== undefined ? Number(misc.grade) : NaN;
    if (!(grade >= 1 && grade <= 8)) continue;

    const on: string[] = [];
    const kun: string[] = [];
    const meaningsEn: string[] = [];
    for (const group of asArray(ch.reading_meaning?.rmgroup)) {
      for (const r of asArray<XmlText>(group.reading)) {
        const type = attr(r, 'r_type');
        if (type === 'ja_on') on.push(text(r));
        else if (type === 'ja_kun') kun.push(text(r));
      }
      for (const m of asArray<XmlText>(group.meaning)) {
        // Englische Bedeutungen haben kein m_lang-Attribut.
        if (attr(m, 'm_lang') === undefined) meaningsEn.push(text(m));
      }
    }

    result.push({
      c: text(ch.literal),
      grade,
      strokes: Number(asArray(misc.stroke_count)[0]),
      jlptOld: misc.jlpt !== undefined ? Number(misc.jlpt) : null,
      freq: misc.freq !== undefined ? Number(misc.freq) : null,
      on,
      kun,
      meaningsEn,
    });
  }
  return result;
}

/** Liest eine einzelne KanjiVG-SVG-Datei (z. B. kanji/065e5.svg). */
export function parseKanjiVgSvg(svg: string): StrokeData {
  const strokes: { n: number; d: string }[] = [];
  const pathRe = /<path\b[^>]*\bid="kvg:[0-9a-f]+(?:-[A-Za-z]+\d*)?-s(\d+)"[^>]*\bd="([^"]+)"/g;
  for (const m of svg.matchAll(pathRe)) {
    strokes.push({ n: Number(m[1]), d: m[2] });
  }
  strokes.sort((a, b) => a.n - b.n);

  const numbers: [number, number][] = [];
  const numRe = /<text transform="matrix\(1 0 0 1 ([\d.]+) ([\d.]+)\)">\d+<\/text>/g;
  for (const m of svg.matchAll(numRe)) {
    numbers.push([Number(m[1]), Number(m[2])]);
  }

  if (strokes.length === 0) throw new Error('Keine Striche in der SVG-Datei gefunden');
  return { paths: strokes.map((s) => s.d), numbers };
}

/** Dateiname in KanjiVG für ein Zeichen, z. B. "日" → "065e5.svg" */
export function kanjiVgFileName(char: string): string {
  return char.codePointAt(0)!.toString(16).padStart(5, '0') + '.svg';
}

export { chunkKey } from '../../src/data/chunk-key.ts';

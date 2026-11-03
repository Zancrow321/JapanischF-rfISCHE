/**
 * Erzeugt die Lerninhalte der App aus freien Datensätzen:
 *   - KANJIDIC2 (EDRDG, CC BY-SA 4.0): Lesungen, Bedeutungen, Schuljahr, Strichzahl
 *   - KanjiVG (Ulrich Apel, CC BY-SA 3.0): Strichreihenfolge für Kana und Kanji
 *
 * Aufruf:  npm run data
 * Optionen:
 *   --kanjidic <pfad>   lokale kanjidic2.xml(.gz) statt Download
 *   --only-kana         nur Kana-Strichdaten erzeugen (schnell, ohne KANJIDIC2)
 *
 * Ergebnis: assets/data/kanji.json, assets/data/strokes/*.json und src/data/generated/*.ts
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

import { chunkKey, kanjiVgFileName, parseKanjidic, parseKanjiVgSvg, type StrokeData } from './parsers.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT_DATA = path.join(ROOT, 'assets/data');
const OUT_STROKES = path.join(OUT_DATA, 'strokes');
const OUT_INDEX = path.join(ROOT, 'src/data/generated/strokes-index.ts');
const OUT_KANJI_INDEX = path.join(ROOT, 'src/data/generated/kanji-index.ts');
const CACHE = path.join(ROOT, '.cache/data');

const KANJIDIC_URL = 'https://www.edrdg.org/kanjidic/kanjidic2.xml.gz';
const KANJIVG_RAW = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/';

const args = process.argv.slice(2);
const argValue = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

/** Alle Hiragana (ぁ–ゖ), Katakana (ァ–ヺ) und der Längenstrich ー. */
function kanaChars(): string[] {
  const chars: string[] = [];
  for (let c = 0x3041; c <= 0x3096; c++) chars.push(String.fromCodePoint(c));
  for (let c = 0x30a1; c <= 0x30fa; c++) chars.push(String.fromCodePoint(c));
  chars.push('ー');
  return chars;
}

async function download(url: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) throw Object.assign(new Error(`404 ${url}`), { notFound: true });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if ((e as { notFound?: boolean }).notFound || attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

async function cached(name: string, url: string): Promise<Buffer> {
  const file = path.join(CACHE, name);
  if (existsSync(file)) return readFile(file);
  const buf = await download(url);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buf);
  return buf;
}

async function loadKanjidicXml(): Promise<string> {
  const local = argValue('--kanjidic');
  const buf = local ? await readFile(local) : await cached('kanjidic2.xml.gz', KANJIDIC_URL);
  const isGzip = buf[0] === 0x1f && buf[1] === 0x8b;
  return (isGzip ? gunzipSync(buf) : buf).toString('utf8');
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

async function main() {
  const onlyKana = args.includes('--only-kana');
  let chars = kanaChars();

  if (!onlyKana) {
    console.log('KANJIDIC2 laden …');
    const kanji = parseKanjidic(await loadKanjidicXml());
    kanji.sort((a, b) => a.grade - b.grade || (a.freq ?? 9999) - (b.freq ?? 9999));
    console.log(`  ${kanji.length} Jōyō-Kanji gefunden`);
    if (kanji.length < 2100) throw new Error('Unerwartet wenige Jōyō-Kanji, Quelldatei prüfen');
    await mkdir(OUT_DATA, { recursive: true });
    await writeFile(path.join(OUT_DATA, 'kanji.json'), JSON.stringify(kanji));
    chars = chars.concat(kanji.map((k) => k.c));
  }

  await mkdir(path.dirname(OUT_KANJI_INDEX), { recursive: true });
  await writeFile(
    OUT_KANJI_INDEX,
    [
      '// Automatisch erzeugt von scripts/data/build-data.ts – nicht von Hand bearbeiten.',
      "import type { KanjiEntry } from '@/data/types';",
      '',
      onlyKana
        ? 'export const KANJI: KanjiEntry[] = [];'
        : "export const KANJI: KanjiEntry[] = require('../../../assets/data/kanji.json');",
      '',
    ].join('\n'),
  );

  console.log(`KanjiVG-Strichdaten für ${chars.length} Zeichen laden …`);
  const missing: string[] = [];
  const strokes = await mapLimit(chars, 16, async (c) => {
    const file = kanjiVgFileName(c);
    try {
      const svg = (await cached(`kanjivg/${file}`, KANJIVG_RAW + file)).toString('utf8');
      return [c, parseKanjiVgSvg(svg)] as const;
    } catch (e) {
      if ((e as { notFound?: boolean }).notFound) {
        missing.push(c);
        return null;
      }
      throw e;
    }
  });
  if (missing.length) console.log(`  Ohne Strichdaten in KanjiVG: ${missing.join(' ')}`);

  const chunks = new Map<string, Record<string, StrokeData>>();
  for (const entry of strokes) {
    if (!entry) continue;
    const [c, data] = entry;
    const key = chunkKey(c);
    if (!chunks.has(key)) chunks.set(key, {});
    chunks.get(key)![c] = data;
  }

  await rm(OUT_STROKES, { recursive: true, force: true });
  await mkdir(OUT_STROKES, { recursive: true });
  const keys = [...chunks.keys()].sort();
  for (const key of keys) {
    await writeFile(path.join(OUT_STROKES, `${key}.json`), JSON.stringify(chunks.get(key)));
  }

  await mkdir(path.dirname(OUT_INDEX), { recursive: true });
  await writeFile(
    OUT_INDEX,
    [
      '// Automatisch erzeugt von scripts/data/build-data.ts – nicht von Hand bearbeiten.',
      "import type { StrokeData } from '@/data/types';",
      '',
      'type Chunk = Record<string, StrokeData>;',
      '',
      '/** Strichdaten werden erst beim ersten Zugriff auf ein Paket geladen. */',
      'export const STROKE_CHUNKS: Record<string, () => Chunk> = {',
      ...keys.map((k) => `  '${k}': () => require('../../../assets/data/strokes/${k}.json'),`),
      '};',
      '',
    ].join('\n'),
  );

  console.log(`Fertig: ${strokes.filter(Boolean).length} Zeichen in ${keys.length} Paketen.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

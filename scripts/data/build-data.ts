/**
 * Erzeugt die Lerninhalte der App aus freien Datensätzen:
 *   - KANJIDIC2 (EDRDG, CC BY-SA 4.0): Lesungen, Bedeutungen, Schuljahr, Strichzahl
 *   - KanjiVG (Ulrich Apel, CC BY-SA 3.0): Strichreihenfolge für Kana und Kanji
 *   - JMdict (EDRDG, CC BY-SA 4.0): deutsch-japanisches Wörterbuch für die Vokabel-Vorschläge
 *   - open-anki-jlpt-decks (MIT, nach den Listen von tanos.co.uk): Wörter der JLPT-Stufe N5
 *
 * Aufruf:  npm run data
 * Optionen:
 *   --kanjidic <pfad>   lokale kanjidic2.xml(.gz) statt Download
 *   --jmdict <pfad>     lokale JMdict(.gz) statt Download
 *   --only-kana         nur Kana-Strichdaten erzeugen (schnell, ohne KANJIDIC2 und JMdict)
 *
 * Ergebnis: assets/data/kanji.json, dict-de.json, n5.json, strokes/*.json und src/data/generated/*.ts
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

import { buildDictionary, buildN5, parseCsv, parseJmdict } from './jmdict.ts';
import { chunkKey, kanjiVgFileName, parseKanjidic, parseKanjiVgSvg, type StrokeData } from './parsers.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT_DATA = path.join(ROOT, 'assets/data');
const OUT_STROKES = path.join(OUT_DATA, 'strokes');
const OUT_INDEX = path.join(ROOT, 'src/data/generated/strokes-index.ts');
const OUT_KANJI_INDEX = path.join(ROOT, 'src/data/generated/kanji-index.ts');
const OUT_DICT_INDEX = path.join(ROOT, 'src/data/generated/dict-index.ts');
const CACHE = path.join(ROOT, '.cache/data');

const KANJIDIC_URL = 'https://www.edrdg.org/kanjidic/kanjidic2.xml.gz';
// JMdict.gz enthält alle Sprachen (JMdict_e.gz nur Englisch).
const JMDICT_URLS = ['http://ftp.edrdg.org/pub/Nihongo/JMdict.gz', 'https://www.edrdg.org/pub/Nihongo/JMdict.gz'];
const N5_URL = 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n5.csv';
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
  return gunzipIfNeeded(buf);
}

function gunzipIfNeeded(buf: Buffer): string {
  const isGzip = buf[0] === 0x1f && buf[1] === 0x8b;
  return (isGzip ? gunzipSync(buf) : buf).toString('utf8');
}

async function loadJmdictXml(): Promise<string> {
  const local = argValue('--jmdict');
  if (local) return gunzipIfNeeded(await readFile(local));
  let lastError: unknown;
  for (const url of JMDICT_URLS) {
    try {
      return gunzipIfNeeded(await cached('JMdict.gz', url));
    } catch (e) {
      lastError = e;
      console.log(`  ${url} nicht erreichbar, versuche nächste Quelle`);
    }
  }
  throw lastError;
}

async function buildVocabData(): Promise<void> {
  console.log('JMdict laden …');
  const entries = parseJmdict(await loadJmdictXml());
  const dict = buildDictionary(entries);
  console.log(`  ${entries.length} Einträge mit Deutsch, davon ${dict.length} gebräuchlich`);
  if (dict.length < 5000) throw new Error('Unerwartet wenige deutsche Einträge, Quelldatei prüfen');

  console.log('N5-Wortliste laden …');
  const n5 = buildN5(parseCsv((await cached('n5.csv', N5_URL)).toString('utf8')), entries);
  console.log(`  ${n5.words.length} Wörter zugeordnet, ohne deutsche Übersetzung: ${n5.missing.length}`);
  if (n5.missing.length) console.log(`  ${n5.missing.join(' ')}`);
  if (n5.words.length < 500) throw new Error('Unerwartet wenige N5-Wörter zugeordnet');

  await writeFile(path.join(OUT_DATA, 'dict-de.json'), JSON.stringify(dict));
  await writeFile(path.join(OUT_DATA, 'n5.json'), JSON.stringify(n5.words));
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
    await buildVocabData();
  }

  await mkdir(path.dirname(OUT_DICT_INDEX), { recursive: true });
  await writeFile(
    OUT_DICT_INDEX,
    [
      '// Automatisch erzeugt von scripts/data/build-data.ts – nicht von Hand bearbeiten.',
      "import type { DictEntry, N5Word } from '@/data/types';",
      '',
      '/** Wird erst beim ersten Suchen geladen, weil das Wörterbuch groß ist. */',
      onlyKana
        ? 'export const loadDictionary = (): DictEntry[] => [];'
        : "export const loadDictionary = (): DictEntry[] => require('../../../assets/data/dict-de.json');",
      onlyKana
        ? 'export const loadN5 = (): N5Word[] => [];'
        : "export const loadN5 = (): N5Word[] => require('../../../assets/data/n5.json');",
      '',
    ].join('\n'),
  );

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

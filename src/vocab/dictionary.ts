import { loadDictionary } from '@/data/generated/dict-index';
import type { DictEntry } from '@/data/types';

export type Suggestion = { written: string; kana: string; german: string[] };

/** Kleinbuchstaben, ohne Akzente (ä → a), ß → ss: so findet man Wörter auch mit Tippfehlern bei Umlauten. */
export function normalizeGerman(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Der Kern einer Übersetzung: ohne Klammern und ohne Artikel oder Platzhalter am Anfang. */
function core(gloss: string): string {
  return normalizeGerman(gloss)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/^(der|die|das|ein|eine|sich|etw\.|jmdn\.|jmdm\.|jmds\.)\s+/g, '')
    .replace(/[!?.,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const JAPANESE = /[぀-ヿ一-鿿]/;

/** Wie gut passt eine Übersetzung zur Suche? 0 = genau, höher = schwächer, null = gar nicht. */
function glossScore(gloss: string, query: string): number | null {
  const c = core(gloss);
  if (c === query) return 0;
  const words = c.split(/[\s\-/]+/);
  if (words.includes(query)) return 1;
  if (c.startsWith(query)) return 2;
  if (words.some((w) => w.startsWith(query))) return 3;
  return null;
}

type Prepared = { entry: DictEntry; glosses: string[] };
let prepared: Prepared[] | null = null;

function getPrepared(entries?: DictEntry[]): Prepared[] {
  if (entries) return entries.map((entry) => ({ entry, glosses: entry[2].split('|') }));
  prepared ??= loadDictionary().map((entry) => ({ entry, glosses: entry[2].split('|') }));
  return prepared;
}

export const dictionaryAvailable = () => getPrepared().length > 0;

/**
 * Sucht Vorschläge zu einem deutschen Wort. Japanische Eingaben (Kana/Kanji) werden in
 * Schreibweise und Lesung gesucht. Sortiert nach Genauigkeit, dann nach Häufigkeit.
 */
export function searchDictionary(input: string, limit = 8, entries?: DictEntry[]): Suggestion[] {
  const isJapanese = JAPANESE.test(input);
  // Japanisch nicht zerlegen (NFD würde べ in へ + Dakuten aufspalten).
  const query = isJapanese ? input.trim().normalize('NFC') : normalizeGerman(input);
  if (query.length === 0) return [];
  const hits: { p: Prepared; score: number }[] = [];

  for (const p of getPrepared(entries)) {
    const [written, kana, , rank] = p.entry;
    let best: number | null = null;
    if (isJapanese) {
      if (written === query || kana === query) best = 0;
      else if (written.startsWith(query) || kana.startsWith(query)) best = 2;
    } else {
      p.glosses.forEach((g, i) => {
        const s = glossScore(g, query);
        // Spätere Übersetzungen zählen etwas weniger als die erste.
        if (s !== null) best = Math.min(best ?? Infinity, s * 10 + Math.min(i, 3));
      });
    }
    if (best !== null) hits.push({ p, score: best * 100 + rank });
  }

  return hits
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ p }) => ({ written: p.entry[0], kana: p.entry[1], german: p.glosses }));
}

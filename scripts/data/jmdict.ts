/**
 * Deutsch-japanisches Wörterbuch aus JMdict (EDRDG, CC BY-SA 4.0) und die JLPT-N5-Grundliste.
 * Reine Funktionen ohne Datei- oder Netzwerkzugriff, damit sie mit Beispieldaten testbar sind.
 */
import type { DictEntry, N5Word } from '../../src/data/types.ts';

export type { DictEntry, N5Word };

export type JmdictEntry = {
  kanji: string[];
  readings: string[];
  german: string[];
  /** Englische Übersetzungen, zum Gegenprüfen der Kanji-Bedeutungen */
  english?: string[];
  /** Hat eine Häufigkeitsmarkierung (news1, ichi1, spec1 …) */
  common: boolean;
  /** Kleinerer Wert = häufiger; aus der nfXX-Markierung, sonst 99 */
  rank: number;
};

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const all = (block: string, tag: string) =>
  [...block.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1]);

/** Rang aus Häufigkeitsmarkierungen: nf01 (häufigste 500) bis nf48; andere Marken zählen als 50. */
function rankFrom(pri: string[]): number {
  let rank = 99;
  for (const p of pri) {
    const nf = /^nf(\d\d)$/.exec(p);
    rank = Math.min(rank, nf ? Number(nf[1]) : 50);
  }
  return rank;
}

/** Bereinigt eine deutsche Übersetzung: Fachgebiete in {…} weg, Leerraum zusammenfassen. */
export function cleanGloss(gloss: string): string {
  return decode(gloss).replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Liest JMdict-XML Eintrag für Eintrag (die Datei ist zu groß und enthält DOCTYPE-Entities,
 * daher ohne vollständigen XML-Parser). Nur Einträge mit deutscher Übersetzung werden behalten.
 */
export function parseJmdict(xml: string): JmdictEntry[] {
  const result: JmdictEntry[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  for (let m = entryRe.exec(xml); m !== null; m = entryRe.exec(xml)) {
    const block = m[1];
    const german: string[] = [];
    for (const g of block.matchAll(/<gloss[^>]*xml:lang="ger"[^>]*>([\s\S]*?)<\/gloss>/g)) {
      const clean = cleanGloss(g[1]);
      if (clean && !german.includes(clean)) german.push(clean);
    }
    if (german.length === 0) continue;
    const english = [...block.matchAll(/<gloss(?:\s+g_type="[^"]*")?>([\s\S]*?)<\/gloss>/g)].map((g) => decode(g[1]));

    const kEle = all(block, 'k_ele');
    const rEle = all(block, 'r_ele');
    const pri = [...kEle.flatMap((k) => all(k, 'ke_pri')), ...rEle.flatMap((r) => all(r, 're_pri'))];
    result.push({
      // Seltene oder veraltete Schreibweisen (iK, oK, rK, sK) nicht als Vorschlag nehmen.
      kanji: kEle.filter((k) => !/<ke_inf>&(iK|oK|rK|sK|ateji);<\/ke_inf>/.test(k)).flatMap((k) => all(k, 'keb')).map(decode),
      readings: rEle.filter((r) => !/<re_inf>&(ik|ok|rk|sk);<\/re_inf>/.test(r)).flatMap((r) => all(r, 'reb')).map(decode),
      german,
      english,
      common: pri.length > 0,
      rank: rankFrom(pri),
    });
  }
  return result;
}

/** Eine Zeile der N5-Liste (expression, reading, meaning, …) in CSV mit Anführungszeichen. */
export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (quoted) {
      if (ch === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && csv[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

/** "～くらい; ぐらい" → ["くらい", "ぐらい"], "けっこん (する)" → ["けっこん"] */
export function splitForms(value: string): string[] {
  return value
    .split(/[;；]/)
    .map((v) => v.replace(/\([^)]*\)|（[^）]*）/g, '').replace(/[～〜~]/g, '').trim())
    .filter(Boolean);
}

/** Maximal so viele Übersetzungen pro Wort speichern. */
const MAX_GLOSSES = 4;

/**
 * Bringt gut lernbare Übersetzungen nach vorne: Einträge mit Auslassung („…“), Beispielen
 * („z. B.“) oder sehr langen Erklärungen rutschen nach hinten, sonst bleibt die Reihenfolge.
 */
export function rankGlosses(glosses: string[]): string[] {
  const penalty = (g: string) => (/…|\.\.\.|z\.\s?B\./.test(g) ? 2 : 0) + (g.length > 25 ? 1 : 0);
  return glosses
    .map((g, i) => ({ g, i, p: penalty(g) }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map((x) => x.g)
    .slice(0, MAX_GLOSSES);
}

/** Wörterbuch für die Vorschläge: nur gebräuchliche Wörter, häufige zuerst. */
export function buildDictionary(entries: JmdictEntry[]): DictEntry[] {
  return entries
    .filter((e) => e.common && e.readings.length > 0)
    .sort((a, b) => a.rank - b.rank)
    .map((e) => [e.kanji[0] ?? '', e.readings[0], rankGlosses(e.german).join('|'), e.rank] as DictEntry);
}

/**
 * Ordnet die Wörter der N5-Liste den JMdict-Einträgen zu, um die deutsche Übersetzung zu bekommen.
 * Gibt die Liste und die Wörter ohne Treffer zurück.
 */
export function buildN5(rows: string[][], entries: JmdictEntry[]): { words: N5Word[]; missing: string[] } {
  const byForm = new Map<string, JmdictEntry[]>();
  const add = (form: string, e: JmdictEntry) => {
    const list = byForm.get(form);
    if (list) list.push(e);
    else byForm.set(form, [e]);
  };
  for (const e of entries) {
    for (const k of e.kanji) add(k, e);
    for (const r of e.readings) add(r, e);
  }

  const [header, ...data] = rows;
  const iExpr = header.indexOf('expression');
  const iRead = header.indexOf('reading');
  const words: N5Word[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    const exprs = splitForms(row[iExpr] ?? '');
    const reads = splitForms(row[iRead] ?? '');
    if (exprs.length === 0 || reads.length === 0) continue;
    let best: { e: JmdictEntry; written: string; reading: string } | null = null;
    for (const expr of exprs) {
      for (const e of byForm.get(expr) ?? []) {
        const reading = reads.find((r) => e.readings.includes(r)) ?? (e.readings.includes(expr) ? expr : undefined);
        if (!reading) continue;
        const candidate = { e, written: e.kanji.includes(expr) ? expr : '', reading };
        // Bei mehreren Einträgen den häufigeren nehmen.
        if (!best || candidate.e.rank < best.e.rank) best = candidate;
      }
      if (best) break;
    }
    if (!best) {
      missing.push(row[iExpr]);
      continue;
    }
    const key = `${best.written}|${best.reading}`;
    if (seen.has(key)) continue;
    seen.add(key);
    words.push([best.written, best.reading, rankGlosses(best.e.german).join('|')]);
  }
  return { words, missing };
}

type KanjiReadings = { c: string; on: string[]; kun: string[]; meaningsEn: string[] };

/** Englischer Begriff in Grundform: klein, ohne Klammern und ohne "to " (to see → see). */
export const normEnglish = (e: string) =>
  e
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/^to\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Englisch → Deutsch aus ganz JMdict: welche deutschen Übersetzungen stehen wie oft in Einträgen
 * mit diesem englischen Begriff? Einzelne falsche Zuordnungen fallen dabei nicht ins Gewicht.
 */
export function englishToGerman(entries: JmdictEntry[]): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const e of entries) {
    for (const en of new Set((e.english ?? []).map(normEnglish))) {
      if (!en) continue;
      let counts = map.get(en);
      if (!counts) map.set(en, (counts = new Map()));
      for (const de of e.german) counts.set(de, (counts.get(de) ?? 0) + 1);
    }
  }
  return map;
}

/**
 * Deutsche Bedeutungen für Kanji: die englischen Bedeutungen aus KANJIDIC2 werden über JMdict
 * übersetzt (two → zwei). Direkte JMdict-Einträge einzelner Kanji sind dafür zu unzuverlässig,
 * weil ihre deutschen Übersetzungen oft von gleichlautenden Wörtern stammen (三 み → „Schlange“).
 * Nur Übersetzungen, die in mindestens zwei Einträgen vorkommen; sonst bleibt Englisch.
 */
export function germanForKanji(kanji: KanjiReadings[], entries: JmdictEntry[]): Map<string, string[]> {
  const enDe = englishToGerman(entries);
  const result = new Map<string, string[]>();
  for (const k of kanji) {
    const german: string[] = [];
    for (const en of k.meaningsEn.slice(0, 4)) {
      const counts = enDe.get(normEnglish(en));
      if (!counts) continue;
      // Einzelwörter bevorzugen (one → „ein“ statt „eine Seite“), Ziffern auslassen (5 → „fünf“).
      const weight = (de: string, n: number) => (de.includes(' ') ? n / 2 : n);
      const best = [...counts.entries()]
        .filter(([de, n]) => n >= 2 && /[a-zäöüß]/i.test(de) && !/…|z\.\s?B\./.test(de))
        .sort((a, b) => weight(b[0], b[1]) - weight(a[0], a[1]) || a[0].length - b[0].length)[0];
      if (best && !german.some((g) => g.toLowerCase() === best[0].toLowerCase())) german.push(best[0]);
      if (german.length >= 3) break;
    }
    if (german.length > 0) result.set(k.c, german);
  }
  return result;
}

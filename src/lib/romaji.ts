/**
 * Umwandlung zwischen Kana und Romaji (Hepburn) für Vokabeln.
 * Die Tabellen kommen aus den Kana-Daten der App, dazu kleine Zeichen und Sonderfälle.
 */
import { ALL_KANA } from '@/data/kana';

/** Wandelt Katakana in Hiragana um; andere Zeichen (auch ー) bleiben unverändert. */
export function toHiragana(text: string): string {
  return Array.from(text)
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      return code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : ch;
    })
    .join('');
}

const VOWELS = 'aeiou';

/** Hiragana (auch ein- oder zweistellig) → Hepburn-Romaji */
const TO_ROMAJI = new Map<string, string>();
/** Romaji (alle üblichen Schreibweisen) → Hiragana */
const FROM_ROMAJI = new Map<string, string>();

for (const k of ALL_KANA) {
  const hira = toHiragana(k.char);
  // Grundtabelle zuerst; erweiterte Katakana füllen nur Lücken (ti bleibt ち, wo bleibt を).
  if (!TO_ROMAJI.has(hira)) TO_ROMAJI.set(hira, k.romaji[0]);
  for (const r of k.romaji) if (!FROM_ROMAJI.has(r)) FROM_ROMAJI.set(r, hira);
}
for (const [hira, romaji] of [
  ['ぁ', 'a'], ['ぃ', 'i'], ['ぅ', 'u'], ['ぇ', 'e'], ['ぉ', 'o'],
  ['ゃ', 'ya'], ['ゅ', 'yu'], ['ょ', 'yo'], ['ゎ', 'wa'], ['ゕ', 'ka'], ['ゖ', 'ke'],
] as const) {
  TO_ROMAJI.set(hira, romaji);
}
for (const [romaji, hira] of [['la', 'ぁ'], ['li', 'ぃ'], ['lu', 'ぅ'], ['le', 'ぇ'], ['lo', 'ぉ'], ['xtsu', 'っ'], ['ltsu', 'っ']] as const) {
  FROM_ROMAJI.set(romaji, hira);
}
TO_ROMAJI.set('を', 'o');

/** Kana (Hiragana oder Katakana) → Romaji, z. B. がっこう → gakkou, コーヒー → koohii */
export function kanaToRomaji(kana: string): string {
  const chars = Array.from(toHiragana(kana));
  let out = '';
  let geminate = false;
  for (let i = 0; i < chars.length; i++) {
    const two = chars[i] + (chars[i + 1] ?? '');
    let romaji: string | undefined;
    if (chars[i + 1] && TO_ROMAJI.has(two)) {
      romaji = TO_ROMAJI.get(two);
      i++;
    } else if (chars[i] === 'っ') {
      geminate = true;
      continue;
    } else if (chars[i] === 'ー') {
      const last = [...out].reverse().find((c) => VOWELS.includes(c));
      romaji = last ?? '';
    } else if (chars[i] === 'ん') {
      const next = TO_ROMAJI.get(chars[i + 1] ?? '') ?? '';
      // Apostroph vor Vokal oder y, damit z. B. きんえん nicht wie きねん aussieht.
      romaji = next && (VOWELS.includes(next[0]) || next[0] === 'y') ? "n'" : 'n';
    } else {
      romaji = TO_ROMAJI.get(chars[i]) ?? chars[i];
    }
    if (geminate && romaji) {
      romaji = (romaji.startsWith('ch') ? 't' : romaji[0]) + romaji;
      geminate = false;
    }
    out += romaji;
  }
  return out;
}

const MACRONS: Record<string, string> = { ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ee', ō: 'ou', â: 'aa', î: 'ii', û: 'uu', ê: 'ee', ô: 'ou' };

/** Romaji → Hiragana, z. B. konnichiwa → こんにちわ, gakkō → がっこう. Unbekanntes bleibt stehen. */
export function romajiToHiragana(input: string): string {
  const s = input.toLowerCase().replace(/[āīūēōâîûêô]/g, (c) => MACRONS[c]);
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const next = s[i + 1];
    if (c === 'n') {
      if (next === "'") {
        out += 'ん';
        i += 2;
        continue;
      }
      if (next === 'n') {
        // "nn" vor Vokal: erstes n ist ん, zweites gehört zur Silbe (konnichiwa).
        const after = s[i + 2];
        const nextSyllable = after !== undefined && (VOWELS.includes(after) || after === 'y');
        out += 'ん';
        i += nextSyllable ? 1 : 2;
        continue;
      }
      if (next === undefined || !(VOWELS.includes(next) || next === 'y')) {
        out += 'ん';
        i++;
        continue;
      }
    }
    // Doppelter Konsonant → っ (gakkou, kitte), auch "tch" (matcha).
    if (next && c === next && !VOWELS.includes(c) && /[a-z]/.test(c)) {
      out += 'っ';
      i++;
      continue;
    }
    if (c === 't' && next === 'c' && s[i + 2] === 'h') {
      out += 'っ';
      i++;
      continue;
    }
    if (c === '-') {
      out += 'ー';
      i++;
      continue;
    }
    let matched = false;
    for (let len = 4; len >= 1; len--) {
      const part = s.slice(i, i + len);
      const hira = FROM_ROMAJI.get(part);
      if (hira) {
        out += hira;
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += c;
      i++;
    }
  }
  return out;
}

const hasLatin = (s: string) => /[a-zāīūēōâîûêô]/i.test(s);

/**
 * Vergleichsschlüssel für eine Antwort in Kana oder Romaji. Gleicht Schreibvarianten aus
 * (shi/si, tsu/tu, ō/ou/oo, ー), damit z. B. "gakko u", "gakkō" und "がっこう" gleich sind.
 */
export function answerKey(input: string): string {
  const compact = input.trim().toLowerCase().replace(/’/g, "'").replace(/[\s.]/g, '');
  const kana = hasLatin(compact) ? romajiToHiragana(compact) : compact;
  // Der Apostroph bleibt, er unterscheidet z. B. kin'en (きんえん) von kinen (きねん).
  return kanaToRomaji(kana).replace(/ou/g, 'oo');
}

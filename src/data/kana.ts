/**
 * Vollständige Hiragana- und Katakana-Tabellen.
 *
 * Katakana werden aus den Hiragana abgeleitet (gleiche Lesung, Unicode-Abstand 0x60),
 * dazu kommen erweiterte Katakana für Fremdwörter.
 * Romaji in Hepburn-Umschrift; weitere übliche Schreibweisen stehen dahinter.
 */

export type KanaScript = 'hiragana' | 'katakana';
export type KanaCategory = 'basis' | 'dakuten' | 'yoon' | 'erweitert';

export type Kana = {
  /** Eindeutige ID, z. B. "kana:hiragana:か" */
  id: string;
  char: string;
  script: KanaScript;
  /** Erste Schreibweise = Hepburn, weitere werden beim Abfragen auch akzeptiert. */
  romaji: string[];
  groupId: string;
  category: KanaCategory;
};

export type KanaGroup = {
  /** z. B. "hiragana-k" */
  id: string;
  script: KanaScript;
  category: KanaCategory;
  label: string;
  items: Kana[];
};

type Row = { key: string; label: string; category: KanaCategory; cells: [string, string | string[]][] };

const HIRAGANA_ROWS: Row[] = [
  { key: 'a', label: 'Vokale', category: 'basis', cells: [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o']] },
  { key: 'k', label: 'K-Reihe', category: 'basis', cells: [['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']] },
  { key: 's', label: 'S-Reihe', category: 'basis', cells: [['さ', 'sa'], ['し', ['shi', 'si']], ['す', 'su'], ['せ', 'se'], ['そ', 'so']] },
  { key: 't', label: 'T-Reihe', category: 'basis', cells: [['た', 'ta'], ['ち', ['chi', 'ti']], ['つ', ['tsu', 'tu']], ['て', 'te'], ['と', 'to']] },
  { key: 'n', label: 'N-Reihe', category: 'basis', cells: [['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no']] },
  { key: 'h', label: 'H-Reihe', category: 'basis', cells: [['は', 'ha'], ['ひ', 'hi'], ['ふ', ['fu', 'hu']], ['へ', 'he'], ['ほ', 'ho']] },
  { key: 'm', label: 'M-Reihe', category: 'basis', cells: [['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo']] },
  { key: 'y', label: 'Y-Reihe', category: 'basis', cells: [['や', 'ya'], ['ゆ', 'yu'], ['よ', 'yo']] },
  { key: 'r', label: 'R-Reihe', category: 'basis', cells: [['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro']] },
  { key: 'w', label: 'W-Reihe und N', category: 'basis', cells: [['わ', 'wa'], ['を', ['o', 'wo']], ['ん', ['n', 'nn']]] },

  { key: 'g', label: 'G-Reihe', category: 'dakuten', cells: [['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go']] },
  { key: 'z', label: 'Z-Reihe', category: 'dakuten', cells: [['ざ', 'za'], ['じ', ['ji', 'zi']], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo']] },
  { key: 'd', label: 'D-Reihe', category: 'dakuten', cells: [['だ', 'da'], ['ぢ', ['ji', 'di']], ['づ', ['zu', 'du']], ['で', 'de'], ['ど', 'do']] },
  { key: 'b', label: 'B-Reihe', category: 'dakuten', cells: [['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo']] },
  { key: 'p', label: 'P-Reihe', category: 'dakuten', cells: [['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po']] },

  { key: 'ky', label: 'KY', category: 'yoon', cells: [['きゃ', 'kya'], ['きゅ', 'kyu'], ['きょ', 'kyo']] },
  { key: 'sh', label: 'SH', category: 'yoon', cells: [['しゃ', ['sha', 'sya']], ['しゅ', ['shu', 'syu']], ['しょ', ['sho', 'syo']]] },
  { key: 'ch', label: 'CH', category: 'yoon', cells: [['ちゃ', ['cha', 'tya']], ['ちゅ', ['chu', 'tyu']], ['ちょ', ['cho', 'tyo']]] },
  { key: 'ny', label: 'NY', category: 'yoon', cells: [['にゃ', 'nya'], ['にゅ', 'nyu'], ['にょ', 'nyo']] },
  { key: 'hy', label: 'HY', category: 'yoon', cells: [['ひゃ', 'hya'], ['ひゅ', 'hyu'], ['ひょ', 'hyo']] },
  { key: 'my', label: 'MY', category: 'yoon', cells: [['みゃ', 'mya'], ['みゅ', 'myu'], ['みょ', 'myo']] },
  { key: 'ry', label: 'RY', category: 'yoon', cells: [['りゃ', 'rya'], ['りゅ', 'ryu'], ['りょ', 'ryo']] },
  { key: 'gy', label: 'GY', category: 'yoon', cells: [['ぎゃ', 'gya'], ['ぎゅ', 'gyu'], ['ぎょ', 'gyo']] },
  { key: 'j', label: 'J', category: 'yoon', cells: [['じゃ', ['ja', 'zya']], ['じゅ', ['ju', 'zyu']], ['じょ', ['jo', 'zyo']]] },
  { key: 'by', label: 'BY', category: 'yoon', cells: [['びゃ', 'bya'], ['びゅ', 'byu'], ['びょ', 'byo']] },
  { key: 'py', label: 'PY', category: 'yoon', cells: [['ぴゃ', 'pya'], ['ぴゅ', 'pyu'], ['ぴょ', 'pyo']] },
];

/** Nur in Katakana gebräuchlich (Fremdwörter). */
const KATAKANA_EXTENDED_ROWS: Row[] = [
  { key: 'v', label: 'V', category: 'erweitert', cells: [['ヴァ', 'va'], ['ヴィ', 'vi'], ['ヴ', 'vu'], ['ヴェ', 've'], ['ヴォ', 'vo']] },
  { key: 'f', label: 'F', category: 'erweitert', cells: [['ファ', 'fa'], ['フィ', 'fi'], ['フェ', 'fe'], ['フォ', 'fo']] },
  { key: 'w2', label: 'W', category: 'erweitert', cells: [['ウィ', 'wi'], ['ウェ', 'we'], ['ウォ', 'wo']] },
  { key: 'td', label: 'T und D', category: 'erweitert', cells: [['ティ', 'ti'], ['ディ', 'di'], ['トゥ', 'tu'], ['ドゥ', 'du'], ['デュ', 'dyu']] },
  { key: 'shjch', label: 'SH, J, CH', category: 'erweitert', cells: [['シェ', 'she'], ['ジェ', 'je'], ['チェ', 'che']] },
  { key: 'ts', label: 'TS', category: 'erweitert', cells: [['ツァ', 'tsa'], ['ツィ', 'tsi'], ['ツェ', 'tse'], ['ツォ', 'tso']] },
];

/** Wandelt Hiragana in Katakana um; andere Zeichen bleiben unverändert. */
export function toKatakana(text: string): string {
  return Array.from(text)
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      return code >= 0x3041 && code <= 0x3096 ? String.fromCodePoint(code + 0x60) : ch;
    })
    .join('');
}

function buildGroups(script: KanaScript, rows: Row[], convert: (s: string) => string): KanaGroup[] {
  return rows.map((row) => {
    const groupId = `${script}-${row.key}`;
    return {
      id: groupId,
      script,
      category: row.category,
      label: row.label,
      items: row.cells.map(([hira, romaji]) => {
        const char = convert(hira);
        return {
          id: `kana:${script}:${char}`,
          char,
          script,
          romaji: Array.isArray(romaji) ? romaji : [romaji],
          groupId,
          category: row.category,
        };
      }),
    };
  });
}

export const KANA_GROUPS: KanaGroup[] = [
  ...buildGroups('hiragana', HIRAGANA_ROWS, (s) => s),
  ...buildGroups('katakana', HIRAGANA_ROWS, toKatakana),
  ...buildGroups('katakana', KATAKANA_EXTENDED_ROWS, (s) => s),
];

export const ALL_KANA: Kana[] = KANA_GROUPS.flatMap((g) => g.items);

export const CATEGORY_LABELS: Record<KanaCategory, string> = {
  basis: 'Grundzeichen',
  dakuten: 'Mit Dakuten (゛) und Handakuten (゜)',
  yoon: 'Kombinationen (Yōon)',
  erweitert: 'Erweiterte Katakana',
};

export function kanaGroupsFor(script: KanaScript): KanaGroup[] {
  return KANA_GROUPS.filter((g) => g.script === script);
}

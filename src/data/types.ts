/** Ein Jōyō-Kanji aus KANJIDIC2. */
export type KanjiEntry = {
  /** Zeichen */
  c: string;
  /** Schuljahr laut KANJIDIC2: 1–6 Grundschule, 8 = restliche Jōyō-Kanji */
  grade: number;
  strokes: number;
  /** Alte JLPT-Stufe 1–4 (4 = leichteste), falls vorhanden */
  jlptOld: number | null;
  /** Häufigkeitsrang in Zeitungen (1 = häufigstes), falls vorhanden */
  freq: number | null;
  on: string[];
  kun: string[];
  /** Englische Bedeutungen aus KANJIDIC2; deutsche kommen in Etappe 5 dazu */
  meaningsEn: string[];
};

/** Strichreihenfolge eines Zeichens aus KanjiVG. */
export type StrokeData = {
  /** SVG-Pfade der Striche in Schreibreihenfolge, Koordinaten im 109×109-Raster */
  paths: string[];
  /** Position der Strichnummern [x, y] */
  numbers: [number, number][];
};

/** Wörterbucheintrag (kompakt gespeichert): [Schreibweise oder "", Lesung in Kana, deutsche Bedeutungen mit "|" getrennt, Häufigkeitsrang] */
export type DictEntry = [written: string, reading: string, german: string, rank: number];

/** Wort der JLPT-N5-Grundliste: [Schreibweise oder "", Lesung, deutsche Bedeutungen mit "|"] */
export type N5Word = [written: string, reading: string, german: string];

import { chunkKey } from './chunk-key';
import { STROKE_CHUNKS } from './generated/strokes-index';
import type { StrokeData } from './types';

/** Strichreihenfolge eines einzelnen Zeichens, oder null wenn KanjiVG keine Daten hat. */
export function getStrokes(char: string): StrokeData | null {
  const load = STROKE_CHUNKS[chunkKey(char)];
  return load?.()[char] ?? null;
}

/** Strichdaten für ein ganzes Wort oder eine Kombination wie きゃ, Zeichen für Zeichen. */
export function getStrokesForText(text: string): { char: string; strokes: StrokeData | null }[] {
  return Array.from(text).map((char) => ({ char, strokes: getStrokes(char) }));
}

import { useMemo } from 'react';

import { getStrokes } from '@/data/strokes';

import { pathToPoints, type Point } from './geometry';

export type CharStrokes = { paths: string[]; points: Point[][]; numbers: [number, number][] };

/** Strichdaten eines Zeichens, als SVG-Pfade und als Punktlisten. */
export function useCharStrokes(char: string): CharStrokes | null {
  return useMemo(() => {
    const data = getStrokes(char);
    if (!data) return null;
    return { paths: data.paths, points: data.paths.map((d) => pathToPoints(d)), numbers: data.numbers };
  }, [char]);
}

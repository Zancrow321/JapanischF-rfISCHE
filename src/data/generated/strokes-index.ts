// Automatisch erzeugt von scripts/data/build-data.ts – nicht von Hand bearbeiten.
import type { StrokeData } from '@/data/types';

type Chunk = Record<string, StrokeData>;

/** Strichdaten werden erst beim ersten Zugriff auf ein Paket geladen. */
export const STROKE_CHUNKS: Record<string, () => Chunk> = {
  '30': () => require('../../../assets/data/strokes/30.json'),
};

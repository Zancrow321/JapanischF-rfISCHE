// Automatisch erzeugt von scripts/data/build-data.ts – nicht von Hand bearbeiten.
import type { DictEntry, N5Word } from '@/data/types';

/** Wird erst beim ersten Suchen geladen, weil das Wörterbuch groß ist. */
export const loadDictionary = (): DictEntry[] => require('../../../assets/data/dict-de.json');
export const loadN5 = (): N5Word[] => require('../../../assets/data/n5.json');

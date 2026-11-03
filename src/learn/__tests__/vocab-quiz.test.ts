import type { Vocab } from '@/db/vocab';

import { buildVocabQuestions, isJapaneseAnswerCorrect, pickVocabChoices } from '../vocab-quiz';
import type { StoredCard } from '../srs';

let nextId = 1;
const w = (german: string, kana: string, written: string | null = null): Vocab => ({
  id: nextId++,
  list_id: 1,
  german,
  kana,
  written,
  note: null,
});

const mizu = w('Wasser', 'みず', '水');
const POOL = [mizu, w('Feuer', 'ひ', '火'), w('Baum', 'き', '木'), w('Berg', 'やま', '山'), w('Fluss', 'かわ', '川'), w('Wasser', 'おみず', 'お水')];
const fixedRng = () => 0.42;

describe('isJapaneseAnswerCorrect', () => {
  it('akzeptiert Romaji, Kana und Kanji', () => {
    for (const a of ['mizu', 'MIZU ', 'みず', 'ミズ', '水']) expect(isJapaneseAnswerCorrect(mizu, a)).toBe(true);
  });
  it('lehnt Falsches und Leeres ab', () => {
    for (const a of ['', 'misu', 'みそ', '火']) expect(isJapaneseAnswerCorrect(mizu, a)).toBe(false);
  });
  it('gleicht lange Vokale aus', () => {
    const gakkou = w('Schule', 'がっこう', '学校');
    for (const a of ['gakkou', 'gakkō', 'gakkoo']) expect(isJapaneseAnswerCorrect(gakkou, a)).toBe(true);
  });
});

describe('pickVocabChoices', () => {
  it('nimmt vier verschiedene Wörter, ohne doppelte Bedeutung', () => {
    const choices = pickVocabChoices(mizu, POOL, fixedRng);
    expect(choices).toHaveLength(4);
    expect(choices).toContain(mizu);
    expect(choices.filter((c) => c.german === 'Wasser')).toHaveLength(1);
  });
  it('liefert weniger, wenn es nicht genug Wörter gibt', () => {
    expect(pickVocabChoices(mizu, POOL.slice(0, 2), fixedRng)).toHaveLength(2);
  });
});

describe('buildVocabQuestions', () => {
  const id = (v: Vocab) => `vocab:${v.id}`;
  it('neue Wörter mit Auswahl, bekannte zum Tippen', () => {
    const cards = new Map([[id(mizu), { reps: 3 } as StoredCard]]);
    const qs = buildVocabQuestions(POOL.slice(0, 5), POOL, 'de-ja', cards, id, fixedRng);
    for (const q of qs) expect(q.type).toBe(q.word === mizu ? 'tippen' : 'waehlen');
  });
  it('Japanisch → Deutsch ohne genug Wörter: selbst prüfen', () => {
    const qs = buildVocabQuestions([mizu], [mizu, POOL[1]], 'ja-de', new Map(), id, fixedRng);
    expect(qs[0]).toMatchObject({ type: 'selbst', choices: [] });
  });
});

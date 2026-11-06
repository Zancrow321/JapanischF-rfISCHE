import { writeTarget } from '../vocab-write';

const all = () => true;
const chars = (r: { char: string }[]) => r.map((c) => c.char).join('');

describe('writeTarget', () => {
  const mizu = { kana: 'みず', written: '水' };

  it('schreibt in der gewählten Schrift', () => {
    expect(chars(writeTarget(mizu, 'hiragana', all))).toBe('みず');
    expect(chars(writeTarget(mizu, 'katakana', all))).toBe('ミズ');
    expect(chars(writeTarget(mizu, 'kanji', all))).toBe('水');
  });

  it('nimmt bei Romaji Hiragana', () => {
    expect(chars(writeTarget(mizu, 'romaji', all))).toBe('みず');
  });

  it('nimmt Kana, wenn es keine Kanji-Form gibt', () => {
    expect(chars(writeTarget({ kana: 'これ', written: null }, 'kanji', all))).toBe('これ');
  });

  it('nimmt Kana, wenn einem Kanji die Strichdaten fehlen', () => {
    const noMizu = (c: string) => c !== '水';
    expect(chars(writeTarget(mizu, 'kanji', noMizu))).toBe('みず');
  });

  it('gibt Zeichen ohne Strichdaten vor statt sie abzufragen', () => {
    const noDot = (c: string) => c !== 'ー';
    expect(writeTarget({ kana: 'コーヒー', written: null }, 'katakana', noDot)).toEqual([
      { char: 'コ', write: true },
      { char: 'ー', write: false },
      { char: 'ヒ', write: true },
      { char: 'ー', write: false },
    ]);
  });

  it('wandelt Katakana-Wörter für Hiragana um', () => {
    expect(chars(writeTarget({ kana: 'パン', written: null }, 'hiragana', all))).toBe('ぱん');
  });
});

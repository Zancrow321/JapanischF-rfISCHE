import { answerKey, kanaToRomaji, romajiToHiragana, toHiragana } from '../romaji';

describe('kanaToRomaji', () => {
  it.each([
    ['みず', 'mizu'],
    ['がっこう', 'gakkou'],
    ['きょう', 'kyou'],
    ['しゃしん', 'shashin'],
    ['まっちゃ', 'matcha'],
    ['きんえん', "kin'en"],
    ['こんにちは', 'konnichiha'],
    ['コーヒー', 'koohii'],
    ['パーティー', 'paatii'],
    ['ファイル', 'fairu'],
    ['ほんを', "hon'o"],
  ])('%s → %s', (kana, romaji) => {
    expect(kanaToRomaji(kana)).toBe(romaji);
  });
});

describe('romajiToHiragana', () => {
  it.each([
    ['mizu', 'みず'],
    ['gakkou', 'がっこう'],
    ['gakkō', 'がっこう'],
    ['konnichiwa', 'こんにちわ'],
    ['konnnichiwa', 'こんにちわ'],
    ['shinbun', 'しんぶん'],
    ["kin'en", 'きんえん'],
    ['matcha', 'まっちゃ'],
    ['sensei', 'せんせい'],
    ['tsukue', 'つくえ'],
    ['tukue', 'つくえ'],
    ['ko-hi-', 'こーひー'],
    ['hon', 'ほん'],
  ])('%s → %s', (romaji, kana) => {
    expect(romajiToHiragana(romaji)).toBe(kana);
  });
});

describe('answerKey', () => {
  it('gleicht Schreibweisen aus', () => {
    const key = answerKey('がっこう');
    for (const v of ['gakkou', 'gakkō', 'Gakkoo', ' gak kou ', 'ガッコウ']) expect(answerKey(v)).toBe(key);
    expect(answerKey('コーヒー')).toBe(answerKey('kōhī'));
    expect(answerKey('コーヒー')).toBe(answerKey('ko-hi-'));
    expect(answerKey('しんぶん')).toBe(answerKey('sinbun'));
  });

  it('unterscheidet verschiedene Wörter', () => {
    expect(answerKey('おばさん')).not.toBe(answerKey('obaasan'));
    expect(answerKey('きんえん')).not.toBe(answerKey('kinen'));
  });
});

it('toHiragana', () => {
  expect(toHiragana('カタカナー')).toBe('かたかなー');
});

import type { DictEntry } from '@/data/types';

import { normalizeGerman, searchDictionary } from '../dictionary';
import { allForms, displayWord } from '../script';

const DICT: DictEntry[] = [
  ['水', 'みず', 'Wasser|kaltes Wasser', 1],
  ['お湯', 'おゆ', 'heißes Wasser', 20],
  ['水泳', 'すいえい', 'Schwimmen', 30],
  ['食べる', 'たべる', 'essen|speisen', 5],
  ['', 'コーヒー', 'Kaffee', 10],
  ['水曜日', 'すいようび', 'Mittwoch', 15],
  ['洪水', 'こうずい', 'Überschwemmung|Hochwasser', 40],
  ['', 'ああ', 'ach!', 50],
];

const search = (q: string) => searchDictionary(q, 8, DICT).map((s) => s.written || s.kana);

describe('searchDictionary', () => {
  it('stellt genaue Treffer vor Teiltreffer', () => {
    expect(search('Wasser')).toEqual(['水', 'お湯']);
  });
  it('findet Wortanfänge', () => {
    expect(search('was')).toEqual(['水', 'お湯']);
    expect(search('hoch')).toEqual(['洪水']);
  });
  it('ignoriert Groß-/Kleinschreibung, Umlaute und Satzzeichen', () => {
    expect(search('KAFFEE')).toEqual(['コーヒー']);
    expect(search('uberschwemmung')).toEqual(['洪水']);
    expect(search('ach')).toEqual(['ああ']);
  });
  it('sucht japanische Eingaben in Schreibweise und Lesung', () => {
    expect(search('水')).toEqual(['水', '水曜日', '水泳']);
    expect(search('たべ')).toEqual(['食べる']);
  });
  it('liefert alle Übersetzungen mit', () => {
    expect(searchDictionary('essen', 8, DICT)[0]).toEqual({ written: '食べる', kana: 'たべる', german: ['essen', 'speisen'] });
  });
  it('leere Suche liefert nichts', () => {
    expect(search('  ')).toEqual([]);
  });
});

it('normalizeGerman', () => {
  expect(normalizeGerman(' Straße Ärger ')).toBe('strasse arger');
});

describe('displayWord', () => {
  const mizu = { kana: 'みず', written: '水' };
  const kaffee = { kana: 'コーヒー', written: null };
  it('zeigt das Wort in der gewählten Schrift', () => {
    expect(displayWord(mizu, 'romaji')).toBe('mizu');
    expect(displayWord(mizu, 'hiragana')).toBe('みず');
    expect(displayWord(mizu, 'katakana')).toBe('ミズ');
    expect(displayWord(mizu, 'kanji')).toBe('水');
    expect(displayWord(kaffee, 'kanji')).toBe('コーヒー');
    expect(displayWord(kaffee, 'hiragana')).toBe('こーひー');
  });
  it('allForms', () => {
    expect(allForms(mizu)).toEqual(['水', 'みず', 'mizu']);
    expect(allForms(kaffee)).toEqual(['コーヒー', 'koohii']);
  });
});

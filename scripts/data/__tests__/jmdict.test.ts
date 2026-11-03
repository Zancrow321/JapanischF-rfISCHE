import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildDictionary, buildN5, germanForKanji, parseCsv, parseJmdict, rankGlosses, splitForms } from '../jmdict.ts';

const xml = readFileSync(path.join(__dirname, 'fixtures/jmdict-sample.xml'), 'utf8');

describe('parseJmdict', () => {
  const entries = parseJmdict(xml);

  it('behält nur Einträge mit deutscher Übersetzung', () => {
    expect(entries.map((e) => e.readings[0])).toEqual(['みず', 'あう', 'ああ', 'ちんご']);
  });

  it('liest Schreibweisen, Lesungen, Bedeutungen und Häufigkeit', () => {
    expect(entries[0]).toEqual({ kanji: ['水'], readings: ['みず'], german: ['Wasser', 'kaltes Wasser'], english: ['water'], common: true, rank: 1 });
    expect(entries[2]).toMatchObject({ kanji: [], common: true, rank: 50 });
    expect(entries[3]).toMatchObject({ german: ['seltenes Wort & mehr'], common: false, rank: 99 });
  });

  it('lässt unregelmäßige Schreibweisen weg', () => {
    expect(entries[1].kanji).toEqual(['会う']);
  });
});

describe('buildDictionary', () => {
  it('nimmt nur gebräuchliche Wörter, häufigste zuerst', () => {
    expect(buildDictionary(parseJmdict(xml))).toEqual([
      ['水', 'みず', 'Wasser|kaltes Wasser', 1],
      ['会う', 'あう', 'treffen|begegnen', 10],
      ['', 'ああ', 'ach!', 50],
    ]);
  });
});

describe('N5-Liste', () => {
  it('liest CSV mit Anführungszeichen', () => {
    expect(parseCsv('a,b\n"x, y",z\r\n"sag ""hi""",w\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'z'],
      ['sag "hi"', 'w'],
    ]);
  });

  it('trennt Varianten und entfernt Zusätze', () => {
    expect(splitForms('～くらい; ぐらい')).toEqual(['くらい', 'ぐらい']);
    expect(splitForms('けっこん (する)')).toEqual(['けっこん']);
    expect(splitForms('(〜を) とお')).toEqual(['とお']);
  });

  it('ordnet Wörter der deutschen Übersetzung zu', () => {
    const csv = 'expression,reading,meaning\n水,みず,water\nああ,ああ,ah\n会う; 逢う,あう,to meet\n知らない,しらない,x\n';
    const { words, missing } = buildN5(parseCsv(csv), parseJmdict(xml));
    expect(words).toEqual([
      ['水', 'みず', 'Wasser|kaltes Wasser'],
      ['', 'ああ', 'ach!'],
      ['会う', 'あう', 'treffen|begegnen'],
    ]);
    expect(missing).toEqual(['知らない']);
  });
});

describe('rankGlosses', () => {
  it('stellt kurze, klare Übersetzungen nach vorne und kürzt auf vier', () => {
    expect(
      rankGlosses(['geraten in … (z.B. ein Unwetter)', 'kommen in', 'haben (z.B. einen Unfall)', 'treffen', 'begegnen', 'sehen'])
    ).toEqual(['kommen in', 'treffen', 'begegnen', 'sehen']);
  });
});

describe('germanForKanji', () => {
  const entry = (english: string[], german: string[]) => ({ kanji: [], readings: ['x'], german, english, common: true, rank: 1 });
  const ENTRIES = [
    entry(['two'], ['zwei', 'Eingeweide']),
    entry(['two'], ['zwei']),
    entry(['two (things)'], ['zwei Stück']),
    entry(['to see', 'to look'], ['sehen', 'schauen']),
    entry(['to see'], ['sehen']),
    entry(['snake'], ['Schlange']),
    entry(['five'], ['5', 'fünf']),
    entry(['five'], ['5', 'fünf']),
    entry(['five (things)'], ['5', 'fünf Stück']),
  ];
  it('übersetzt die englischen Bedeutungen über JMdict', () => {
    const m = germanForKanji(
      [
        { c: '二', on: ['ニ'], kun: ['ふた'], meaningsEn: ['two'] },
        { c: '見', on: ['ケン'], kun: ['み.る'], meaningsEn: ['see', 'hopes'] },
        { c: '巳', on: ['シ'], kun: ['み'], meaningsEn: ['snake'] },
        { c: '五', on: ['ゴ'], kun: ['いつ'], meaningsEn: ['five'] },
      ],
      ENTRIES,
    );
    expect(m.get('二')).toEqual(['zwei']);
    expect(m.get('見')).toEqual(['sehen']);
    expect(m.get('五')).toEqual(['fünf']);
    // Nur ein Beleg: zu unsicher, es bleibt Englisch.
    expect(m.has('巳')).toBe(false);
  });
});

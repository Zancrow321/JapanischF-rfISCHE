import { loadDictionary, loadN5 } from '@/data/generated/dict-index';
import { searchDictionary } from '@/vocab/dictionary';

// Prüft die erzeugten Wörterbuchdaten. Ohne erzeugte Daten (--only-kana) sind beide Listen leer.
const dict = loadDictionary();
const n5 = loadN5();
const generated = dict.length > 0;

(generated ? describe : describe.skip)('erzeugtes Wörterbuch', () => {
  it('enthält genug gebräuchliche Wörter in der richtigen Form', () => {
    expect(dict.length).toBeGreaterThan(5000);
    for (const [written, kana, german, rank] of dict.slice(0, 200)) {
      expect(typeof written).toBe('string');
      expect(kana).toMatch(/^[぀-ヿー・]+$/);
      expect(german.length).toBeGreaterThan(0);
      expect(rank).toBeGreaterThan(0);
    }
  });

  it('findet Grundwörter', () => {
    const first = (q: string) => searchDictionary(q, 8).map((s) => s.written || s.kana);
    expect(first('Wasser')).toContain('水');
    expect(first('Katze')).toContain('猫');
    expect(first('Schule')).toContain('学校');
  });

  it('N5-Liste hat Lesung und Deutsch für jedes Wort', () => {
    expect(n5.length).toBeGreaterThan(500);
    for (const [, kana, german] of n5) {
      expect(kana.length).toBeGreaterThan(0);
      expect(german.length).toBeGreaterThan(0);
    }
  });
});

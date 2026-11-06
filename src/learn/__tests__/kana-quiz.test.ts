import { ALL_KANA, type Kana } from '@/data/kana';

import {
  buildQuestions,
  countDue,
  isRomajiCorrect,
  pickChoices,
  pickSessionKana,
} from '../kana-quiz';
import { gradeForWriting, reviewCard, type StoredCard } from '../srs';

const k = (char: string): Kana => ALL_KANA.find((x) => x.char === char)!;

/** Wiederholbarer Zufall für Tests. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const NOW = new Date('2026-11-03T12:00:00Z').getTime();
const DAY = 86_400_000;

function card(itemId: string, due: number): StoredCard {
  return {
    item_id: itemId,
    mode: 'kana-lesen',
    state: 2,
    due,
    stability: 5,
    difficulty: 5,
    reps: 3,
    lapses: 0,
    last_review: due - 5 * DAY,
    scheduled_days: 5,
    learning_steps: 0,
  };
}

describe('Runde zusammenstellen', () => {
  const active = ['あ', 'い', 'う', 'え', 'お'].map(k);

  it('nimmt fällige Karten zuerst (älteste vorn), dann neue', () => {
    const cards = new Map([
      [k('い').id, card(k('い').id, NOW - DAY)],
      [k('う').id, card(k('う').id, NOW - 3 * DAY)],
      [k('え').id, card(k('え').id, NOW + DAY)], // noch nicht fällig
    ]);
    expect(pickSessionKana(active, cards, NOW).map((x) => x.char)).toEqual(['う', 'い', 'あ', 'お']);
  });

  it('begrenzt neue Zeichen und die Rundengröße', () => {
    const many = ALL_KANA.filter((x) => x.script === 'hiragana');
    expect(pickSessionKana(many, new Map(), NOW, { newLimit: 10 })).toHaveLength(10);
    expect(pickSessionKana(many, new Map(), NOW, { limit: 5, newLimit: 10 })).toHaveLength(5);
  });

  it('zählt fällige und neue Zeichen', () => {
    const cards = new Map([
      [k('い').id, card(k('い').id, NOW - DAY)],
      [k('え').id, card(k('え').id, NOW + DAY)],
    ]);
    expect(countDue(active, cards, NOW)).toEqual({ due: 1, fresh: 3 });
  });
});

describe('Antwortmöglichkeiten', () => {
  it('liefert vier verschiedene Zeichen derselben Schrift mit der richtigen Antwort', () => {
    const rng = seeded(7);
    for (const target of ALL_KANA) {
      const choices = pickChoices(target, ALL_KANA, rng);
      expect(choices).toHaveLength(4);
      expect(choices).toContain(target);
      expect(new Set(choices.map((c) => c.romaji[0])).size).toBe(4);
      expect(choices.every((c) => c.script === target.script)).toBe(true);
    }
  });

  it('nimmt Ablenker aus derselben Art von Zeichen', () => {
    const rng = seeded(5);
    for (let i = 0; i < 50; i++) {
      expect(pickChoices(k('お'), ALL_KANA, rng).every((c) => c.category === 'basis')).toBe(true);
      expect(pickChoices(k('きゃ'), ALL_KANA, rng).every((c) => c.category === 'yoon')).toBe(true);
    }
  });

  it('bietet zu じ nie ぢ an (gleiche Lesung)', () => {
    const rng = seeded(3);
    for (let i = 0; i < 200; i++) {
      expect(pickChoices(k('じ'), ALL_KANA, rng).map((c) => c.char)).not.toContain('ぢ');
    }
  });

  it('baut Fragen ohne Auswahl für Tipp-Fragen', () => {
    const qs = buildQuestions([k('か'), k('き')], ALL_KANA, ['tippen'], seeded(1));
    expect(qs).toHaveLength(2);
    expect(qs.every((q) => q.type === 'tippen' && q.choices.length === 0)).toBe(true);
  });
});

describe('Getippte Umschrift', () => {
  it('akzeptiert Hepburn und alternative Schreibweisen', () => {
    expect(isRomajiCorrect(k('し'), 'shi')).toBe(true);
    expect(isRomajiCorrect(k('し'), ' SI ')).toBe(true);
    expect(isRomajiCorrect(k('し'), 'chi')).toBe(false);
    expect(isRomajiCorrect(k('を'), 'wo')).toBe(true);
    expect(isRomajiCorrect(k('きゃ'), 'kya')).toBe(true);
  });
});

describe('Lernkurve', () => {
  it('plant richtige Antworten später ein als falsche', () => {
    const now = new Date(NOW);
    const right = reviewCard('x', 'kana-lesen', undefined, true, now).card;
    const wrong = reviewCard('x', 'kana-lesen', undefined, false, now).card;
    expect(right.due).toBeGreaterThan(wrong.due);
    expect(right.reps).toBe(1);
  });

  it('verlängert den Abstand bei wiederholt richtigen Antworten', () => {
    let t = NOW;
    let stored: StoredCard | undefined;
    const gaps: number[] = [];
    for (let i = 0; i < 5; i++) {
      stored = reviewCard('x', 'kana-lesen', stored, true, new Date(t)).card;
      gaps.push(stored.due - t);
      t = stored.due;
    }
    expect(gaps[4]).toBeGreaterThan(gaps[1]);
    expect(stored!.lapses).toBe(0);
  });

  it('zählt Fehler nach dem Lernen als Rückfall', () => {
    let stored = reviewCard('x', 'kana-lesen', undefined, true, new Date(NOW)).card;
    for (let i = 0; i < 3; i++) {
      stored = reviewCard('x', 'kana-lesen', stored, true, new Date(stored.due)).card;
    }
    const after = reviewCard('x', 'kana-lesen', stored, false, new Date(stored.due)).card;
    expect(after.lapses).toBe(1);
    expect(after.due - stored.due).toBeLessThan(DAY);
  });
});

describe('Bewertung beim Schreiben', () => {
  it('stuft nach Fehlerzahl ab', () => {
    expect(gradeForWriting(0)).toBe(3);
    expect(gradeForWriting(2)).toBe(2);
    expect(gradeForWriting(3)).toBe(1);
  });
});

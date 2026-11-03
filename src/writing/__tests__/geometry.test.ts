import { getStrokes } from '@/data/strokes';

import { checkStroke, partialPoints, pathLength, pathToPoints, resample, type Point } from '../geometry';

const strokesOf = (char: string) => getStrokes(char)!.paths.map((d) => pathToPoints(d));

/** Simuliert eine Hand: leicht verschoben und verwackelt. */
function wobble(points: Point[], { dx = 0, dy = 0, noise = 1.5, seed = 1 } = {}): Point[] {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646 - 0.5;
  };
  return resample(points, 20).map((p) => ({ x: p.x + dx + rnd() * noise * 2, y: p.y + dy + rnd() * noise * 2 }));
}

describe('pathToPoints', () => {
  it('liest absolute und relative Kurven', () => {
    const pts = pathToPoints('M10,10c0,0,10,0,10,0C30,10,40,10,40,10');
    expect(pts[0]).toEqual({ x: 10, y: 10 });
    expect(pts[pts.length - 1].x).toBeCloseTo(40);
    expect(pathLength(pts)).toBeCloseTo(30, 0);
  });

  it('liest S-Befehle mit gespiegeltem Kontrollpunkt', () => {
    const pts = pathToPoints('M0,0C0,10,10,10,10,0S20,-10,20,0');
    expect(pts[pts.length - 1].x).toBeCloseTo(20);
    expect(pts[pts.length - 1].y).toBeCloseTo(0);
  });

  it('kann jeden Strich aller Zeichen lesen', () => {
    for (const c of ['日', 'あ', '書', '鬱'.normalize()]) {
      const s = getStrokes(c);
      if (!s) continue;
      for (const d of s.paths) {
        const pts = pathToPoints(d);
        expect(pts.length).toBeGreaterThan(1);
        for (const p of pts) {
          expect(p.x).toBeGreaterThan(-5);
          expect(p.x).toBeLessThan(114);
        }
      }
    }
  });
});

describe('partialPoints', () => {
  it('liefert den Anfang einer Linie', () => {
    const line = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const half = partialPoints(line, 0.5);
    expect(half[half.length - 1].x).toBeCloseTo(5);
  });
});

describe('checkStroke', () => {
  const hi = strokesOf('日');

  it('erkennt einen ordentlich nachgezeichneten Strich', () => {
    for (let i = 0; i < hi.length; i++) {
      expect(checkStroke(wobble(hi[i], { dx: 3, dy: -2, seed: i + 1 }), hi, i)).toEqual({ ok: true });
    }
  });

  it('meldet einen falsch herum gezogenen Strich', () => {
    expect(checkStroke([...hi[2]].reverse(), hi, 2)).toEqual({ ok: false, reason: 'richtung' });
  });

  it('meldet einen Strich in falscher Reihenfolge', () => {
    // Statt Strich 3 (Mitte) wird gleich Strich 4 (unten) gezogen.
    expect(checkStroke(wobble(hi[3]), hi, 2)).toEqual({ ok: false, reason: 'reihenfolge' });
  });

  it('meldet einen Strich an völlig falscher Stelle', () => {
    const scribble = [{ x: 90, y: 10 }, { x: 100, y: 20 }, { x: 95, y: 30 }];
    expect(checkStroke(scribble, hi, 0)).toEqual({ ok: false, reason: 'form' });
  });

  it('erkennt alle Striche von あ und ア', () => {
    for (const c of ['あ', 'ア', 'き', 'ツ']) {
      const s = strokesOf(c);
      s.forEach((stroke, i) => expect(checkStroke(wobble(stroke, { dx: -2, seed: 7 + i }), s, i)).toEqual({ ok: true }));
    }
  });

  it('unterscheidet ツ und シ (gleiche Striche, andere Richtung)', () => {
    const tsu = strokesOf('ツ');
    const shi = strokesOf('シ');
    // Der letzte Strich von シ wird von unten nach oben gezogen, bei ツ von oben nach unten.
    expect(checkStroke(wobble(shi[2]), tsu, 2).ok).toBe(false);
  });
});

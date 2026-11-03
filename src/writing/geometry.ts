/**
 * Geometrie für die Schreibübung: SVG-Pfade aus KanjiVG in Punktlisten umwandeln und
 * einen gezeichneten Strich mit dem richtigen Strich vergleichen.
 * Alle Koordinaten liegen im 109×109-Raster von KanjiVG.
 */

export type Point = { x: number; y: number };

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/**
 * Wandelt einen SVG-Pfad in eine Punktliste um. Unterstützt die Befehle, die in KanjiVG
 * vorkommen (M, C, S), dazu L, H, V und Z, jeweils absolut und relativ.
 */
export function pathToPoints(d: string, samplesPerCurve = 12): Point[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const points: Point[] = [];
  let i = 0;
  let cmd = '';
  let cur: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  let lastCtrl: Point | null = null;

  const num = () => Number(tokens[i++]);

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const base = rel ? cur : { x: 0, y: 0 };
    const pt = (): Point => {
      const x = num();
      const y = num();
      return { x: base.x + x, y: base.y + y };
    };

    switch (cmd.toUpperCase()) {
      case 'M': {
        cur = pt();
        start = cur;
        points.push(cur);
        lastCtrl = null;
        // Weitere Koordinatenpaare nach M gelten als L.
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L': {
        cur = pt();
        points.push(cur);
        lastCtrl = null;
        break;
      }
      case 'H': {
        const x = num();
        cur = { x: rel ? cur.x + x : x, y: cur.y };
        points.push(cur);
        lastCtrl = null;
        break;
      }
      case 'V': {
        const y = num();
        cur = { x: cur.x, y: rel ? cur.y + y : y };
        points.push(cur);
        lastCtrl = null;
        break;
      }
      case 'C': {
        const c1 = pt();
        const c2 = pt();
        const end = pt();
        for (let s = 1; s <= samplesPerCurve; s++) points.push(cubic(cur, c1, c2, end, s / samplesPerCurve));
        lastCtrl = c2;
        cur = end;
        break;
      }
      case 'S': {
        const c1: Point = lastCtrl ? { x: 2 * cur.x - lastCtrl.x, y: 2 * cur.y - lastCtrl.y } : cur;
        const c2 = pt();
        const end = pt();
        for (let s = 1; s <= samplesPerCurve; s++) points.push(cubic(cur, c1, c2, end, s / samplesPerCurve));
        lastCtrl = c2;
        cur = end;
        break;
      }
      case 'Z': {
        cur = start;
        points.push(cur);
        lastCtrl = null;
        break;
      }
      default:
        // Unbekannter Befehl: überspringen, damit ein Datenfehler die App nicht anhält.
        i++;
    }
  }
  return points;
}

export function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += dist(points[i - 1], points[i]);
  return len;
}

/** Verteilt n Punkte gleichmäßig entlang der Linie. */
export function resample(points: Point[], n = 32): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: n }, () => points[0]);
  const total = pathLength(points);
  if (total === 0) return Array.from({ length: n }, () => points[0]);
  const step = total / (n - 1);
  const result: Point[] = [points[0]];
  let acc = 0;
  let prev = points[0];
  let idx = 1;
  while (result.length < n - 1 && idx < points.length) {
    const next = points[idx];
    const seg = dist(prev, next);
    if (acc + seg >= step && seg > 0) {
      const t = (step - acc) / seg;
      const p = { x: prev.x + t * (next.x - prev.x), y: prev.y + t * (next.y - prev.y) };
      result.push(p);
      prev = p;
      acc = 0;
    } else {
      acc += seg;
      prev = next;
      idx++;
    }
  }
  while (result.length < n) result.push(points[points.length - 1]);
  return result;
}

/** Teil einer Linie bis zum Anteil t (0–1), für die Strichanimation. */
export function partialPoints(points: Point[], t: number): Point[] {
  if (t >= 1) return points;
  const target = pathLength(points) * Math.max(0, t);
  const result: Point[] = [points[0]];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = dist(points[i - 1], points[i]);
    if (acc + seg >= target) {
      const f = seg === 0 ? 0 : (target - acc) / seg;
      result.push({
        x: points[i - 1].x + f * (points[i].x - points[i - 1].x),
        y: points[i - 1].y + f * (points[i].y - points[i - 1].y),
      });
      return result;
    }
    acc += seg;
    result.push(points[i]);
  }
  return result;
}

export function pointsToSvg(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export type StrokeVerdict =
  | { ok: true }
  | { ok: false; reason: 'richtung' | 'form' | 'reihenfolge' };

/** Durchschnittlicher Abstand zweier gleich langer Punktlisten. */
function meanDistance(a: Point[], b: Point[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += dist(a[i], b[i]);
  return sum / a.length;
}

/**
 * Wie gut passt ein gezeichneter Strich zum Vorbild? Kleiner = besser.
 * Toleranz wächst etwas mit der Strichlänge, damit lange Striche nicht zu streng sind.
 */
function matchScore(drawn: Point[], target: Point[]) {
  const a = resample(drawn);
  const b = resample(target);
  const tolerance = Math.max(12, pathLength(target) * 0.22);
  return {
    forward: meanDistance(a, b) / tolerance,
    backward: meanDistance([...a].reverse(), b) / tolerance,
  };
}

/**
 * Prüft den Strich Nummer `index`. Ist er falsch, wird unterschieden, ob er nur falsch herum
 * gezogen wurde, ob er zu einem späteren Strich passt (Reihenfolge) oder gar nicht passt (Form).
 */
export function checkStroke(drawn: Point[], strokes: Point[][], index: number): StrokeVerdict {
  if (drawn.length < 2 || pathLength(drawn) < 3) {
    // Ein Antippen zählt nur bei sehr kurzen Strichen (Punkten) als Strich.
    if (pathLength(strokes[index]) >= 8) return { ok: false, reason: 'form' };
  }
  const { forward, backward } = matchScore(drawn, strokes[index]);
  if (forward <= 1) return { ok: true };
  if (backward <= 1) return { ok: false, reason: 'richtung' };
  for (let j = index + 1; j < strokes.length; j++) {
    if (matchScore(drawn, strokes[j]).forward <= 1) return { ok: false, reason: 'reihenfolge' };
  }
  return { ok: false, reason: 'form' };
}

export const VERDICT_TEXT: Record<'richtung' | 'form' | 'reihenfolge', string> = {
  richtung: 'Falsche Richtung – dieser Strich wird andersherum gezogen.',
  reihenfolge: 'Das ist ein späterer Strich. Achte auf die Reihenfolge.',
  form: 'Der Strich passt noch nicht. Schau dir den richtigen an.',
};

import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useScrollLock } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { checkStroke, pointsToSvg, VERDICT_TEXT, type Point } from './geometry';
import { Grid } from './grid';
import type { CharStrokes } from './use-char-strokes';

export type WritingResult = { mistakes: number };

type Props = {
  strokes: CharStrokes;
  /** Blasse Vorlage im Hintergrund zeigen */
  showTemplate: boolean;
  size?: number;
  onComplete: (result: WritingResult) => void;
};

/** Nach so vielen Fehlern beim selben Strich wird er als Hinweis gezeigt. */
const HINT_AFTER = 2;
const FLASH_MS = 1100;
/** Bis zu so vielen Pixeln Bewegung zählt eine Berührung noch als Tipp (statt Wischen). */
const TAP_SLOP = 10;

/**
 * Zeichenfeld: Strich für Strich nachzeichnen. Richtige Striche werden in sauberer Form übernommen,
 * bei falschen erscheint kurz der richtige Strich und eine Erklärung.
 */
export function WritingPad({ strokes, showTemplate, size = 300, onComplete }: Props) {
  const theme = useTheme();
  const [done, setDone] = useState(0);
  const [drawing, setDrawing] = useState<Point[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [missesOnStroke, setMissesOnStroke] = useState(0);
  const [flash, setFlash] = useState<{ wrong: Point[]; text: string } | null>(null);

  const scale = 109 / size;
  const current = useRef<Point[]>([]);
  const { locked, lock, markInside, register } = useScrollLock();
  useEffect(register, [register]);
  /** Startpunkt der Berührung, solange das Feld noch nicht eingerastet ist (Tipp oder Wischen?). */
  const tapStart = useRef<{ x: number; y: number } | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  const toGrid = (e: GestureResponderEvent): Point => ({
    x: e.nativeEvent.locationX * scale,
    y: e.nativeEvent.locationY * scale,
  });

  const release = () => {
    const drawn = current.current;
    current.current = [];
    setDrawing([]);
    if (done >= strokes.points.length || finished.current) return;
    const verdict = checkStroke(drawn, strokes.points, done);
    if (verdict.ok) {
      const next = done + 1;
      setDone(next);
      setMissesOnStroke(0);
      if (next === strokes.points.length) {
        finished.current = true;
        onComplete({ mistakes });
      }
    } else {
      setMistakes(mistakes + 1);
      setMissesOnStroke(missesOnStroke + 1);
      setFlash({ wrong: drawn, text: VERDICT_TEXT[verdict.reason] });
    }
  };

  // Touch- und Mausereignisse über das Responder-System von React Native (Handy und Browser).
  // Nicht eingerastet: Wischen scrollt die Seite wie gewohnt, ein Tipp rastet das Feld ein.
  // Eingerastet: Die Seite scrollt nicht, jede Berührung ist ein Strich. Ein Tipp außerhalb
  // des Feldes löst die Sperre wieder (siehe Screen).
  const touchHandlers = {
    [Platform.OS === 'web' ? 'onPointerDown' : 'onTouchStart']: markInside,
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => locked,
    // Solange nicht eingerastet, darf die Seite die Geste zum Scrollen übernehmen.
    onResponderTerminationRequest: () => !locked,
    onResponderGrant: (e: GestureResponderEvent) => {
      if (!locked) {
        tapStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        return;
      }
      current.current = [toGrid(e)];
      setDrawing(current.current);
    },
    onResponderMove: (e: GestureResponderEvent) => {
      if (!locked) {
        const start = tapStart.current;
        if (start && Math.hypot(e.nativeEvent.pageX - start.x, e.nativeEvent.pageY - start.y) > TAP_SLOP) {
          tapStart.current = null;
        }
        return;
      }
      current.current = [...current.current, toGrid(e)];
      setDrawing(current.current);
    },
    onResponderRelease: () => {
      if (!locked) {
        if (tapStart.current) lock();
        tapStart.current = null;
        return;
      }
      release();
    },
    onResponderTerminate: () => {
      if (!locked) {
        tapStart.current = null;
        return;
      }
      release();
    },
  };

  const showHint = flash !== null || missesOnStroke >= HINT_AFTER;
  const total = strokes.points.length;

  return (
    <View style={styles.wrap}>
      <View
        {...touchHandlers}
        aria-label="Zeichenfeld"
        aria-pressed={locked}
        style={[
          styles.pad,
          {
            width: size,
            height: size,
            backgroundColor: theme.backgroundElement,
            // Im Browser: eingerastet keine Browser-Gesten, sonst darf man über dem Feld scrollen.
            touchAction: locked ? 'none' : 'pan-y',
          } as object,
        ]}>
        <Svg width={size} height={size} viewBox="0 0 109 109" pointerEvents="none">
          <Grid color={theme.border} />
          {showTemplate
            ? strokes.paths.map((d, i) => (
                <Path key={`t${i}`} d={d} stroke={theme.backgroundSelected} strokeWidth={4} fill="none" strokeLinecap="round" />
              ))
            : null}
          {showHint && done < total ? (
            <Path d={strokes.paths[done]} stroke={theme.success} strokeWidth={4} strokeDasharray="4,3" fill="none" strokeLinecap="round" />
          ) : null}
          {strokes.paths.slice(0, done).map((d, i) => (
            <Path key={`d${i}`} d={d} stroke={theme.text} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {flash && flash.wrong.length > 1 ? (
            <Path d={pointsToSvg(flash.wrong)} stroke={theme.accent} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
          ) : null}
          {drawing.length > 1 ? (
            <Path d={pointsToSvg(drawing)} stroke={theme.text} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </Svg>
        <View pointerEvents="none" style={[styles.ring, { borderColor: locked ? theme.accent : theme.border }]} />
        {!locked ? (
          <View style={styles.cover} pointerEvents="none">
            <ThemedText type="small" style={[styles.coverText, { backgroundColor: theme.background }]}>
              Tippen zum Zeichnen
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {flash
          ? flash.text
          : done === total
            ? 'Fertig!'
            : !locked
              ? 'Tippe ins Feld, damit es einrastet und die Seite beim Zeichnen nicht scrollt.'
              : `Strich ${done + 1} von ${total}${missesOnStroke >= HINT_AFTER ? ' – folge der grünen Linie' : ''} · Tipp daneben löst das Feld`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.two },
  pad: { borderRadius: Spacing.two, overflow: 'hidden' },
  // Rahmen als eigene Ebene, damit er die Zeichenfläche nicht verkleinert oder die Koordinaten verschiebt.
  ring: { ...StyleSheet.absoluteFill, borderRadius: Spacing.two, borderWidth: 2 },
  cover: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  coverText: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.two, overflow: 'hidden', opacity: 0.9 },
});

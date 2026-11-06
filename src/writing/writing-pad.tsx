import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
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
  const lockScroll = useScrollLock();

  // Falls die Seite mitten im Zeichnen verlassen wird, das Scrollen wieder freigeben.
  useEffect(() => () => lockScroll(false), [lockScroll]);
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
  // Sobald ein Finger das Feld berührt, wird das Scrollen des Bildschirms angehalten, damit
  // sich beim Zeichnen nichts verschiebt. Außerhalb des Feldes scrollt alles wie gewohnt.
  const touchHandlers = {
    onTouchStart: () => lockScroll(true),
    onTouchEnd: () => lockScroll(false),
    onTouchCancel: () => lockScroll(false),
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      current.current = [toGrid(e)];
      setDrawing(current.current);
    },
    onResponderMove: (e: GestureResponderEvent) => {
      current.current = [...current.current, toGrid(e)];
      setDrawing(current.current);
    },
    onResponderRelease: () => {
      lockScroll(false);
      release();
    },
    onResponderTerminate: () => {
      lockScroll(false);
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
        style={[styles.pad, { width: size, height: size, backgroundColor: theme.backgroundElement }]}>
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
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {flash
          ? flash.text
          : done === total
            ? 'Fertig!'
            : `Strich ${done + 1} von ${total}${missesOnStroke >= HINT_AFTER ? ' – folge der grünen Linie' : ''}`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.two },
  pad: { borderRadius: Spacing.two, overflow: 'hidden', touchAction: 'none' } as object,
});

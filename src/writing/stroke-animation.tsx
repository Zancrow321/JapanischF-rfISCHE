import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { Button } from '@/components/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { partialPoints, pointsToSvg } from './geometry';
import { Grid } from './grid';
import type { CharStrokes } from './use-char-strokes';

/** Dauer eines Strichs in der Animation (ms) */
const STROKE_MS = 700;
const PAUSE_MS = 250;

/** Spielt die Strichreihenfolge Strich für Strich ab, mit Nummern. */
export function StrokeAnimation({ strokes, size = 260 }: { strokes: CharStrokes; size?: number }) {
  const theme = useTheme();
  // Fortschritt in "Strichen": 2.5 = zwei Striche fertig, der dritte zur Hälfte.
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState(0);
  const total = strokes.paths.length;

  useEffect(() => {
    let frame: ReturnType<typeof requestAnimationFrame>;
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const per = STROKE_MS + PAUSE_MS;
      const done = Math.floor(elapsed / per);
      const within = Math.min(1, (elapsed % per) / STROKE_MS);
      const p = Math.min(total, done + within);
      setProgress(p);
      if (p < total) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, total]);

  const full = Math.floor(progress);
  const partial = progress - full;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} viewBox="0 0 109 109">
        <Grid color={theme.border} />
        {strokes.paths.map((d, i) => (
          <Path key={`bg${i}`} d={d} stroke={theme.backgroundSelected} strokeWidth={3} fill="none" strokeLinecap="round" />
        ))}
        {strokes.paths.slice(0, full).map((d, i) => (
          <Path key={`s${i}`} d={d} stroke={theme.text} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {full < total && partial > 0 ? (
          <Path
            d={pointsToSvg(partialPoints(strokes.points[full], partial))}
            stroke={theme.accent}
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {strokes.numbers.slice(0, Math.ceil(progress)).map(([x, y], i) => (
          <SvgText key={`n${i}`} x={x} y={y} fontSize={7} fill={theme.accent}>
            {i + 1}
          </SvgText>
        ))}
      </Svg>
      <Button label="Nochmal abspielen" variant="secondary" onPress={() => setRun((r) => r + 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.two },
});

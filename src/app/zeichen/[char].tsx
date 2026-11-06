import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { KanjiDetails } from '@/components/kanji-details';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { displayReading } from '@/data/kanji';
import { lookupChar } from '@/data/lookup';
import { useTheme, windowStyle } from '@/hooks/use-theme';
import { speakJapanese } from '@/lib/speech';
import { StrokeAnimation } from '@/writing/stroke-animation';
import { useCharStrokes } from '@/writing/use-char-strokes';
import { WritingPad } from '@/writing/writing-pad';

type Mode = 'ansehen' | 'nachzeichnen' | 'gedaechtnis';

export default function CharScreen() {
  const { char: raw, modus } = useLocalSearchParams<{ char: string; modus?: string }>();
  const text = decodeURIComponent(raw ?? '');
  const info = lookupChar(text);
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>(modus === 'nachzeichnen' || modus === 'gedaechtnis' ? modus : 'ansehen');
  // Kombinationen wie きゃ bestehen aus zwei Zeichen, die nacheinander geschrieben werden.
  const parts = Array.from(text);
  const [partIndex, setPartIndex] = useState(0);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [mistakesSoFar, setMistakesSoFar] = useState(0);
  const strokes = useCharStrokes(parts[Math.min(partIndex, parts.length - 1)] ?? '');

  const restart = (m: Mode) => {
    setMode(m);
    setPartIndex(0);
    setMistakesSoFar(0);
    setResult(null);
    setRound((r) => r + 1);
  };

  const reading =
    info?.kind === 'kana'
      ? info.kana.romaji[0]
      : info?.kind === 'kanji'
        ? [...new Set([...info.kanji.on, ...info.kanji.kun.map(displayReading)])].slice(0, 4).join(' · ')
        : '';

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: text || 'Zeichen' }} />
      <Screen>
        <View style={styles.header}>
          <ThemedText style={styles.char}>{text}</ThemedText>
          <View style={styles.headerText}>
            <ThemedText type="subtitle" style={styles.reading}>
              {reading}
            </ThemedText>
            {info?.kind === 'kana' && info.kana.romaji.length > 1 ? (
              <ThemedText type="small" themeColor="textSecondary">
                auch: {info.kana.romaji.slice(1).join(', ')}
              </ThemedText>
            ) : null}
          </View>
          <Button label="🔊" variant="secondary" onPress={() => speakJapanese(text)} />
        </View>

        {info?.kind === 'kanji' && mode === 'ansehen' ? <KanjiDetails kanji={info.kanji} /> : null}

        <Segmented
          value={mode}
          onChange={restart}
          options={[
            { value: 'ansehen', label: 'Ansehen' },
            { value: 'nachzeichnen', label: 'Nachzeichnen' },
            { value: 'gedaechtnis', label: 'Aus dem Kopf' },
          ]}
        />

        {!strokes ? (
          <ThemedText>Für dieses Zeichen gibt es keine Strichdaten.</ThemedText>
        ) : mode === 'ansehen' ? (
          <View style={styles.center}>
            {parts.map((p) => (
              <AnimatedPart key={`${p}-${round}`} char={p} />
            ))}
          </View>
        ) : result !== null ? (
          <View style={[styles.result, windowStyle(theme, result === 0 ? theme.successSoft : theme.accentSoft)]}>
            <ThemedText type="smallBold">
              {result === 0 ? 'Perfekt, alle Striche richtig!' : `Geschafft, mit ${result} ${result === 1 ? 'Fehler' : 'Fehlern'}.`}
            </ThemedText>
            <Button label="Nochmal schreiben" onPress={() => restart(mode)} />
          </View>
        ) : (
          <View style={styles.center}>
            {parts.length > 1 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Zeichen {partIndex + 1} von {parts.length}: {parts[partIndex]}
              </ThemedText>
            ) : null}
            <WritingPad
              key={`${round}-${partIndex}`}
              strokes={strokes}
              showTemplate={mode === 'nachzeichnen'}
              onComplete={({ mistakes }) => {
                const total = mistakesSoFar + mistakes;
                if (partIndex + 1 < parts.length) {
                  setMistakesSoFar(total);
                  setPartIndex(partIndex + 1);
                } else {
                  setResult(total);
                }
              }}
            />
          </View>
        )}

        {/* Beim Ansehen stehen Bedeutung und Beispiele oben, beim Schreiben unter dem Zeichenfeld. */}
        {info?.kind === 'kanji' && mode !== 'ansehen' ? <KanjiDetails kanji={info.kanji} /> : null}
      </Screen>
    </>
  );
}

function AnimatedPart({ char }: { char: string }) {
  const strokes = useCharStrokes(char);
  return strokes ? <StrokeAnimation strokes={strokes} /> : null;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  headerText: { flex: 1, gap: Spacing.one },
  char: { fontSize: 64, lineHeight: 76 },
  reading: { fontSize: 24, lineHeight: 32 },
  center: { alignItems: 'center', gap: Spacing.three },
  result: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
});

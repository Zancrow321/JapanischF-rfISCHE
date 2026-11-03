import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ALL_KANA, type Kana } from '@/data/kana';
import { getCards, saveReview } from '@/db/reviews';
import { useSelection } from '@/hooks/use-selection';
import { useTheme } from '@/hooks/use-theme';
import { KANA_WRITE_MODE, pickSessionKana } from '@/learn/kana-quiz';
import { gradeForWriting, reviewCard, type StoredCard } from '@/learn/srs';
import { speakJapanese } from '@/lib/speech';
import { StrokeAnimation } from '@/writing/stroke-animation';
import { useCharStrokes } from '@/writing/use-char-strokes';
import { WritingPad } from '@/writing/writing-pad';

type Outcome = { mistakes: number; gaveUp: boolean };

type Session =
  | { status: 'loading' }
  | { status: 'empty'; reason: 'nichts-ausgewaehlt' | 'nichts-faellig' }
  | { status: 'running'; kana: Kana[]; index: number; outcomes: Outcome[] };

export default function WritingQuizScreen() {
  const db = useSQLiteContext();
  const { active, loaded } = useSelection();
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const cards = useRef<Map<string, StoredCard>>(new Map());

  async function prepare(extra: boolean): Promise<Session> {
    const loadedCards = await getCards(db, KANA_WRITE_MODE);
    cards.current = loadedCards;
    const activeKana = ALL_KANA.filter((k) => active.has(k.id));
    if (activeKana.length === 0) return { status: 'empty', reason: 'nichts-ausgewaehlt' };
    // Schreiben dauert länger als Lesen, daher kürzere Runden.
    let picked = pickSessionKana(activeKana, loadedCards, Date.now(), { limit: 10, newLimit: 5 });
    if (picked.length === 0 && extra) {
      picked = [...activeKana].sort(() => Math.random() - 0.5).slice(0, 10);
    }
    if (picked.length === 0) return { status: 'empty', reason: 'nichts-faellig' };
    return {
      status: 'running',
      kana: [...picked].sort(() => Math.random() - 0.5),
      index: 0,
      outcomes: [],
    };
  }

  const start = (extra = false) => prepare(extra).then(setSession);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    prepare(false).then((s) => {
      if (!cancelled) setSession(s);
    });
    return () => {
      cancelled = true;
    };
    // Nur beim Öffnen starten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  async function finish(kana: Kana, outcome: Outcome) {
    if (session.status !== 'running') return;
    const now = new Date();
    const grade = outcome.gaveUp ? 1 : gradeForWriting(outcome.mistakes);
    const { card } = reviewCard(kana.id, KANA_WRITE_MODE, cards.current.get(kana.id), grade, now);
    cards.current.set(kana.id, card);
    setSession({ ...session, outcomes: [...session.outcomes, outcome] });
    await saveReview(db, card, grade, now.getTime());
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Kana schreiben' }} />
      <Screen>
        {session.status === 'loading' ? <ThemedText>Lade …</ThemedText> : null}
        {session.status === 'empty' ? (
          <View style={styles.block}>
            <ThemedText>
              {session.reason === 'nichts-ausgewaehlt'
                ? 'Du hast noch keine Kana ausgewählt.'
                : 'Für heute ist alles geschrieben. Gut gemacht!'}
            </ThemedText>
            {session.reason === 'nichts-ausgewaehlt' ? (
              <Button label="Kana auswählen" onPress={() => router.replace('/einstellungen')} />
            ) : (
              <Button label="Trotzdem eine Runde schreiben" onPress={() => start(true)} />
            )}
          </View>
        ) : null}
        {session.status === 'running' && session.index < session.kana.length ? (
          <WriteQuestion
            key={session.index}
            kana={session.kana[session.index]}
            position={session.index + 1}
            total={session.kana.length}
            outcome={session.outcomes[session.index]}
            onFinish={(o) => finish(session.kana[session.index], o)}
            onNext={() => setSession({ ...session, index: session.index + 1 })}
          />
        ) : null}
        {session.status === 'running' && session.index >= session.kana.length ? (
          <View style={styles.block}>
            <ThemedText type="subtitle">
              {session.outcomes.filter((o) => !o.gaveUp && o.mistakes === 0).length} von{' '}
              {session.kana.length} fehlerfrei
            </ThemedText>
            <Button label="Noch eine Runde" onPress={() => start(true)} />
            <Button label="Fertig" variant="secondary" onPress={() => router.back()} />
          </View>
        ) : null}
      </Screen>
    </>
  );
}

function WriteQuestion({
  kana,
  position,
  total,
  outcome,
  onFinish,
  onNext,
}: {
  kana: Kana;
  position: number;
  total: number;
  outcome: Outcome | undefined;
  onFinish: (o: Outcome) => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  const parts = Array.from(kana.char);
  const [part, setPart] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const strokes = useCharStrokes(parts[part]);
  // Gleiche Lesung bei mehreren Zeichen (z. B. じ/ぢ, ず/づ, お/を): Reihe dazuschreiben.
  const ambiguous = ALL_KANA.some(
    (k) => k.id !== kana.id && k.script === kana.script && k.romaji[0] === kana.romaji[0],
  );
  const groupLabel = ambiguous ? ` (${kana.groupId.split('-')[1].toUpperCase()}-Reihe)` : '';

  useEffect(() => {
    speakJapanese(kana.char);
  }, [kana.char]);

  return (
    <View style={styles.block}>
      <ThemedText type="small" themeColor="textSecondary">
        {position} / {total} · Schreibe das Zeichen ({kana.script === 'hiragana' ? 'Hiragana' : 'Katakana'})
      </ThemedText>
      <View style={styles.promptRow}>
        <ThemedText style={styles.romaji}>{kana.romaji[0]}</ThemedText>
        {groupLabel ? <ThemedText themeColor="textSecondary">{groupLabel}</ThemedText> : null}
        <Button label="🔊" variant="secondary" onPress={() => speakJapanese(kana.char)} />
      </View>

      {outcome ? (
        <View
          style={[
            styles.feedback,
            { backgroundColor: !outcome.gaveUp && outcome.mistakes === 0 ? theme.successSoft : theme.accentSoft },
          ]}>
          <ThemedText type="smallBold">
            {outcome.gaveUp
              ? `So schreibt man ${kana.char}:`
              : outcome.mistakes === 0
                ? 'Perfekt!'
                : `Richtig, mit ${outcome.mistakes} ${outcome.mistakes === 1 ? 'Fehler' : 'Fehlern'}.`}
          </ThemedText>
          {outcome.gaveUp
            ? parts.map((p) => <AnswerAnimation key={p} char={p} />)
            : <ThemedText style={styles.answerChar}>{kana.char}</ThemedText>}
          <Button label="Weiter" onPress={onNext} />
        </View>
      ) : strokes ? (
        <View style={styles.center}>
          {parts.length > 1 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Zeichen {part + 1} von {parts.length}
            </ThemedText>
          ) : null}
          <WritingPad
            key={part}
            strokes={strokes}
            showTemplate={false}
            onComplete={(r) => {
              const total = mistakes + r.mistakes;
              if (part + 1 < parts.length) {
                setMistakes(total);
                setPart(part + 1);
              } else {
                onFinish({ mistakes: total, gaveUp: false });
              }
            }}
          />
          <Button
            label="Weiß ich nicht – zeig es mir"
            variant="secondary"
            onPress={() => onFinish({ mistakes, gaveUp: true })}
          />
        </View>
      ) : null}
    </View>
  );
}

function AnswerAnimation({ char }: { char: string }) {
  const strokes = useCharStrokes(char);
  return strokes ? <StrokeAnimation strokes={strokes} size={200} /> : null;
}

const styles = StyleSheet.create({
  block: { gap: Spacing.three },
  center: { alignItems: 'center', gap: Spacing.three },
  promptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  romaji: { fontSize: 48, lineHeight: 60, fontWeight: 600 },
  answerChar: { fontSize: 72, lineHeight: 88, textAlign: 'center' },
  feedback: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two, alignItems: 'center' },
});

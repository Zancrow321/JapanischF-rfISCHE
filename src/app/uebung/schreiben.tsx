import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ALL_KANA, type Kana } from '@/data/kana';
import { displayReading, KANJI, kanjiItemId, kanjiMeanings } from '@/data/kanji';
import type { KanjiEntry } from '@/data/types';
import { getMeaningOverrides } from '@/db/meanings';
import { getCards, saveReview } from '@/db/reviews';
import { useSelection } from '@/hooks/use-selection';
import { useTheme } from '@/hooks/use-theme';
import { KANA_WRITE_MODE, pickSessionKana } from '@/learn/kana-quiz';
import { KANJI_WRITE_MODE } from '@/learn/kanji-quiz';
import { gradeForWriting, reviewCard, type StoredCard } from '@/learn/srs';
import { speakJapanese } from '@/lib/speech';
import { StrokeAnimation } from '@/writing/stroke-animation';
import { useCharStrokes } from '@/writing/use-char-strokes';
import { WritingPad } from '@/writing/writing-pad';

type Outcome = { mistakes: number; gaveUp: boolean };

/** Ein Zeichen zum Schreiben: Kana (Aufgabe = Umschrift) oder Kanji (Aufgabe = Bedeutung). */
type WriteItem = {
  id: string;
  char: string;
  /** Was groß angezeigt wird */
  prompt: string;
  /** Kleiner Zusatz, z. B. Lesung oder Reihe */
  hint: string;
  /** Was vorgelesen wird */
  speak: string;
  label: string;
};

type Session =
  | { status: 'loading' }
  | { status: 'empty'; reason: 'nichts-ausgewaehlt' | 'nichts-faellig' }
  | { status: 'running'; kana: WriteItem[]; index: number; outcomes: Outcome[] };

function kanaItem(kana: Kana): WriteItem {
  // Gleiche Lesung bei mehreren Zeichen (z. B. じ/ぢ, ず/づ, お/を): Reihe dazuschreiben.
  const ambiguous = ALL_KANA.some(
    (k) => k.id !== kana.id && k.script === kana.script && k.romaji[0] === kana.romaji[0],
  );
  return {
    id: kana.id,
    char: kana.char,
    prompt: kana.romaji[0],
    hint: ambiguous ? `(${kana.groupId.split('-')[1].toUpperCase()}-Reihe)` : '',
    speak: kana.char,
    label: kana.script === 'hiragana' ? 'Hiragana' : 'Katakana',
  };
}

function kanjiItem(k: KanjiEntry, override: string | undefined): WriteItem {
  const { meanings, lang } = kanjiMeanings(k, override);
  const reading = [k.kun[0] ? displayReading(k.kun[0]) : undefined, k.on[0]].filter(Boolean).join(' · ');
  return {
    id: kanjiItemId(k),
    char: k.c,
    prompt: meanings.slice(0, 2).join(', ') + (lang === 'en' ? ' (engl.)' : ''),
    hint: reading,
    speak: k.kun[0] ? displayReading(k.kun[0]) : (k.on[0] ?? k.c),
    label: `Kanji, ${k.strokes} Striche`,
  };
}

export default function WritingQuizScreen() {
  const db = useSQLiteContext();
  const { art } = useLocalSearchParams<{ art?: string }>();
  const isKanji = art === 'kanji';
  const mode = isKanji ? KANJI_WRITE_MODE : KANA_WRITE_MODE;
  const { active, loaded } = useSelection();
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const cards = useRef<Map<string, StoredCard>>(new Map());

  async function prepare(extra: boolean): Promise<Session> {
    const loadedCards = await getCards(db, mode);
    cards.current = loadedCards;
    let activeKana: WriteItem[];
    if (isKanji) {
      const overrides = await getMeaningOverrides(db);
      activeKana = KANJI.filter((k) => active.has(kanjiItemId(k))).map((k) => kanjiItem(k, overrides.get(kanjiItemId(k))));
    } else {
      activeKana = ALL_KANA.filter((k) => active.has(k.id)).map(kanaItem);
    }
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

  async function finish(kana: WriteItem, outcome: Outcome) {
    if (session.status !== 'running') return;
    const now = new Date();
    const grade = outcome.gaveUp ? 1 : gradeForWriting(outcome.mistakes);
    const { card } = reviewCard(kana.id, mode, cards.current.get(kana.id), grade, now);
    cards.current.set(kana.id, card);
    setSession({ ...session, outcomes: [...session.outcomes, outcome] });
    await saveReview(db, card, grade, now.getTime());
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: isKanji ? 'Kanji schreiben' : 'Kana schreiben' }} />
      <Screen>
        {session.status === 'loading' ? <ThemedText>Lade …</ThemedText> : null}
        {session.status === 'empty' ? (
          <View style={styles.block}>
            <ThemedText>
              {session.reason === 'nichts-ausgewaehlt'
                ? `Du hast noch keine ${isKanji ? 'Kanji' : 'Kana'} ausgewählt.`
                : 'Für heute ist alles geschrieben. Gut gemacht!'}
            </ThemedText>
            {session.reason === 'nichts-ausgewaehlt' ? (
              <Button label={isKanji ? 'Kanji auswählen' : 'Kana auswählen'} onPress={() => router.replace('/einstellungen')} />
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
  kana: WriteItem;
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

  useEffect(() => {
    speakJapanese(kana.speak);
  }, [kana.speak]);

  return (
    <View style={styles.block}>
      <ThemedText type="small" themeColor="textSecondary">
        {position} / {total} · Schreibe das Zeichen ({kana.label})
      </ThemedText>
      <View style={styles.promptRow}>
        <ThemedText style={kana.prompt.length > 6 ? styles.promptLong : styles.romaji}>{kana.prompt}</ThemedText>
        {kana.hint ? <ThemedText themeColor="textSecondary">{kana.hint}</ThemedText> : null}
        <Button label="🔊" variant="secondary" onPress={() => speakJapanese(kana.speak)} />
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
  promptRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  romaji: { fontSize: 48, lineHeight: 60, fontWeight: 600 },
  promptLong: { fontSize: 28, lineHeight: 36, fontWeight: 600, textAlign: 'center', flexShrink: 1 },
  answerChar: { fontSize: 72, lineHeight: 88, textAlign: 'center' },
  feedback: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two, alignItems: 'center' },
});

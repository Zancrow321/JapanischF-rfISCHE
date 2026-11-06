import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ProgressBar } from '@/components/quiz';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getStrokes } from '@/data/strokes';
import { getCards, saveReview } from '@/db/reviews';
import { getSetting } from '@/db/settings';
import { getLists, getWords, vocabItemId, vocabListItemId, type Vocab } from '@/db/vocab';
import { useSelection } from '@/hooks/use-selection';
import { useTheme, windowStyle } from '@/hooks/use-theme';
import { pickSessionKana } from '@/learn/kana-quiz';
import { gradeForWriting, reviewCard, type StoredCard } from '@/learn/srs';
import { VOCAB_WRITE_MODE, writeTarget, type WriteChar } from '@/learn/vocab-write';
import { speakJapanese } from '@/lib/speech';
import { allForms, DEFAULT_VOCAB_SCRIPT, isVocabScript, type VocabScript } from '@/vocab/script';
import { StrokeAnimation } from '@/writing/stroke-animation';
import { useCharStrokes } from '@/writing/use-char-strokes';
import { WritingPad } from '@/writing/writing-pad';

type Outcome = { mistakes: number; gaveUp: boolean };

type Item = { word: Vocab; chars: WriteChar[] };

type Session =
  | { status: 'loading' }
  | { status: 'empty'; reason: 'keine-woerter' | 'nichts-faellig' }
  | { status: 'running'; items: Item[]; index: number; outcomes: Outcome[] };

const hasStrokes = (char: string) => getStrokes(char) !== null;

/** Vokabeln aus dem Kopf schreiben: deutsches Wort sehen, japanisches Wort Zeichen für Zeichen zeichnen. */
export default function VocabWriteScreen() {
  const db = useSQLiteContext();
  const { active, loaded } = useSelection();
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const cards = useRef<Map<string, StoredCard>>(new Map());

  async function prepare(extra: boolean): Promise<Session> {
    const stored = await getSetting(db, 'vocab_script');
    const script: VocabScript = isVocabScript(stored) ? stored : DEFAULT_VOCAB_SCRIPT;
    const lists = (await getLists(db)).filter((l) => active.has(vocabListItemId(l.id)));
    const words = await getWords(db, lists.map((l) => l.id));
    const loadedCards = await getCards(db, VOCAB_WRITE_MODE);
    cards.current = loadedCards;
    // Wörter, bei denen es nichts zu zeichnen gibt, fallen weg.
    const items = words
      .map((word) => ({ id: vocabItemId(word.id), word, chars: writeTarget(word, script, hasStrokes) }))
      .filter((i) => i.chars.some((c) => c.write));
    if (items.length === 0) return { status: 'empty', reason: 'keine-woerter' };

    // Schreiben dauert länger als Antippen, daher kürzere Runden.
    let picked = pickSessionKana(items, loadedCards, Date.now(), { limit: 10, newLimit: 5 });
    if (picked.length === 0 && extra) {
      picked = [...items].sort(() => Math.random() - 0.5).slice(0, 10);
    }
    if (picked.length === 0) return { status: 'empty', reason: 'nichts-faellig' };
    return {
      status: 'running',
      items: [...picked].sort(() => Math.random() - 0.5).map(({ word, chars }) => ({ word, chars })),
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

  async function finish(item: Item, outcome: Outcome) {
    if (session.status !== 'running') return;
    const now = new Date();
    const itemId = vocabItemId(item.word.id);
    const grade = outcome.gaveUp ? 1 : gradeForWriting(outcome.mistakes);
    const { card } = reviewCard(itemId, VOCAB_WRITE_MODE, cards.current.get(itemId), grade, now);
    cards.current.set(itemId, card);
    setSession({ ...session, outcomes: [...session.outcomes, outcome] });
    speakJapanese(item.word.kana);
    await saveReview(db, card, grade, now.getTime());
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Vokabeln schreiben' }} />
      <Screen>
        {session.status === 'loading' ? <ThemedText>Lade …</ThemedText> : null}
        {session.status === 'empty' ? (
          <View style={styles.block}>
            <ThemedText>
              {session.reason === 'keine-woerter'
                ? 'In deinen aktiven Listen sind noch keine Wörter.'
                : 'Für heute ist alles geschrieben. Gut gemacht!'}
            </ThemedText>
            {session.reason === 'keine-woerter' ? (
              <Button label="Zu den Vokabeln" onPress={() => router.replace('/vocab')} />
            ) : (
              <Button label="Trotzdem eine Runde schreiben" onPress={() => start(true)} />
            )}
          </View>
        ) : null}
        {session.status === 'running' && session.index < session.items.length ? (
          <WriteWord
            key={session.index}
            item={session.items[session.index]}
            position={session.index + 1}
            total={session.items.length}
            outcome={session.outcomes[session.index]}
            onFinish={(o) => finish(session.items[session.index], o)}
            onNext={() => setSession({ ...session, index: session.index + 1 })}
          />
        ) : null}
        {session.status === 'running' && session.index >= session.items.length ? (
          <View style={styles.block}>
            <ThemedText type="subtitle">
              {session.outcomes.filter((o) => !o.gaveUp && o.mistakes === 0).length} von {session.items.length}{' '}
              fehlerfrei
            </ThemedText>
            {session.items.some((_, i) => session.outcomes[i]?.gaveUp || session.outcomes[i]?.mistakes) ? (
              <ThemedText>
                Diese kommen bald wieder:{' '}
                {session.items
                  .filter((_, i) => session.outcomes[i]?.gaveUp || session.outcomes[i]?.mistakes)
                  .map((it) => `${it.chars.map((c) => c.char).join('')} (${it.word.german})`)
                  .join(', ')}
              </ThemedText>
            ) : null}
            <Button label="Noch eine Runde" onPress={() => start(true)} />
            <Button label="Fertig" variant="secondary" onPress={() => router.back()} />
          </View>
        ) : null}
      </Screen>
    </>
  );
}

function WriteWord({
  item,
  position,
  total,
  outcome,
  onFinish,
  onNext,
}: {
  item: Item;
  position: number;
  total: number;
  outcome: Outcome | undefined;
  onFinish: (o: Outcome) => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  const { word, chars } = item;
  const text = chars.map((c) => c.char).join('');
  const firstToWrite = (from: number) => {
    let i = from;
    while (i < chars.length && !chars[i].write) i++;
    return i;
  };
  const [part, setPart] = useState(() => firstToWrite(0));
  const [mistakes, setMistakes] = useState(0);
  const [template, setTemplate] = useState(false);
  const strokes = useCharStrokes(chars[part]?.char ?? '');

  return (
    <View style={styles.block}>
      <ProgressBar value={(position - 1) / total} />
      <ThemedText type="small" themeColor="textSecondary">
        {position} / {total} · Schreibe das Wort auf Japanisch
      </ThemedText>
      <View style={[styles.prompt, windowStyle(theme, theme.backgroundElement)]}>
        <ThemedText style={styles.germanPrompt}>{word.german}</ThemedText>
        {word.note ? (
          <ThemedText type="small" themeColor="textSecondary">
            {word.note}
          </ThemedText>
        ) : null}
      </View>

      {/* Fortschritt im Wort: fertige Zeichen, aktuelles Feld und offene Felder */}
      <View style={styles.slots} aria-label={`Zeichen ${Math.min(part + 1, chars.length)} von ${chars.length}`}>
        {chars.map((c, i) => {
          const shown = outcome || i < part || !c.write;
          const current = !outcome && i === part;
          return (
            <View
              key={i}
              style={[
                styles.slot,
                { borderColor: current ? theme.accent : theme.border },
                current ? { borderWidth: 2 } : null,
              ]}>
              <ThemedText style={styles.slotChar}>{shown ? c.char : ' '}</ThemedText>
            </View>
          );
        })}
      </View>

      {outcome ? (
        <View
          style={[
            styles.feedback,
            windowStyle(theme, !outcome.gaveUp && outcome.mistakes === 0 ? theme.successSoft : theme.accentSoft),
          ]}>
          <ThemedText type="smallBold">
            {outcome.gaveUp
              ? `So schreibt man ${text}:`
              : outcome.mistakes === 0
                ? 'Perfekt!'
                : `Richtig, mit ${outcome.mistakes} ${outcome.mistakes === 1 ? 'Fehler' : 'Fehlern'}.`}
          </ThemedText>
          {outcome.gaveUp ? (
            <View style={styles.animations}>
              {/* Jedes Zeichen nur einmal zeigen, z. B. bei ああ */}
              {[...new Set(chars.filter((c) => c.write).map((c) => c.char))].map((c) => (
                <AnswerAnimation key={c} char={c} />
              ))}
            </View>
          ) : (
            <ThemedText style={styles.answerWord}>{text}</ThemedText>
          )}
          <ThemedText>
            {allForms(word).join(' · ')} = {word.german}
          </ThemedText>
          <View style={styles.buttons}>
            <Button label="🔊 Anhören" variant="secondary" onPress={() => speakJapanese(word.kana)} />
            <Button label="Weiter" onPress={onNext} />
          </View>
        </View>
      ) : strokes ? (
        <View style={styles.center}>
          <WritingPad
            key={part}
            strokes={strokes}
            showTemplate={template}
            onComplete={(r) => {
              const sum = mistakes + r.mistakes;
              const next = firstToWrite(part + 1);
              setTemplate(false);
              if (next < chars.length) {
                setMistakes(sum);
                setPart(next);
              } else {
                onFinish({ mistakes: sum, gaveUp: false });
              }
            }}
          />
          <View style={styles.buttons}>
            {!template ? (
              <Button
                label="Vorlage zeigen"
                variant="secondary"
                onPress={() => {
                  // Hilfe zählt als ein Fehler.
                  setMistakes(mistakes + 1);
                  setTemplate(true);
                }}
              />
            ) : null}
            <Button
              label="Weiß ich nicht"
              variant="secondary"
              onPress={() => onFinish({ mistakes, gaveUp: true })}
            />
          </View>
          <Button label="🔊 Tipp: anhören" variant="secondary" onPress={() => speakJapanese(word.kana)} />
        </View>
      ) : null}
    </View>
  );
}

function AnswerAnimation({ char }: { char: string }) {
  const strokes = useCharStrokes(char);
  return strokes ? <StrokeAnimation strokes={strokes} size={140} /> : null;
}

const styles = StyleSheet.create({
  block: { gap: Spacing.three },
  center: { alignItems: 'center', gap: Spacing.three },
  prompt: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    minHeight: 120,
    gap: Spacing.two,
  },
  germanPrompt: { fontSize: 30, lineHeight: 40, textAlign: 'center', fontWeight: 600 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two },
  slot: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotChar: { fontSize: 28, lineHeight: 36 },
  animations: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two },
  answerWord: { fontSize: 48, lineHeight: 64, textAlign: 'center' },
  feedback: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two, alignItems: 'center' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'center' },
});

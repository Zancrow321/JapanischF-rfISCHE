import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceButton, ProgressBar, quizStyles } from '@/components/quiz';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { displayReading, KANJI, kanjiItemId, kanjiMeanings, kunReadings, shortReading } from '@/data/kanji';
import { charHref } from '@/data/lookup';
import type { KanjiEntry } from '@/data/types';
import { getMeaningOverrides } from '@/db/meanings';
import { getCards, saveReview } from '@/db/reviews';
import { useSelection } from '@/hooks/use-selection';
import { useTheme } from '@/hooks/use-theme';
import { pickSessionKana } from '@/learn/kana-quiz';
import {
  buildKanjiQuestions,
  KANJI_MODE,
  meaningText,
  type KanjiQuestion,
  type KanjiQuestionType,
  type Overrides,
} from '@/learn/kanji-quiz';
import { reviewCard, type StoredCard } from '@/learn/srs';
import { speakJapanese } from '@/lib/speech';

type Answer = { correct: boolean; given: string };

type Session =
  | { status: 'loading' }
  | { status: 'empty'; reason: 'nichts-ausgewaehlt' | 'nichts-faellig' }
  | { status: 'running'; questions: KanjiQuestion[]; index: number; answers: Answer[]; overrides: Overrides };

/** Was die Sprachausgabe vorliest: lieber die Kun-Lesung (ein Wort), sonst die On-Lesung. */
const spoken = (k: KanjiEntry) => (k.kun[0] ? displayReading(k.kun[0]) : (k.on[0] ?? k.c));

export default function KanjiQuizScreen() {
  const db = useSQLiteContext();
  const { active, loaded } = useSelection();
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const cards = useRef<Map<string, StoredCard>>(new Map());

  async function prepare(extra: boolean): Promise<Session> {
    const [loadedCards, overrides] = await Promise.all([getCards(db, KANJI_MODE), getMeaningOverrides(db)]);
    cards.current = loadedCards;
    const activeKanji = KANJI.filter((k) => active.has(kanjiItemId(k)));
    if (activeKanji.length === 0) return { status: 'empty', reason: 'nichts-ausgewaehlt' };
    const items = activeKanji.map((k) => ({ id: kanjiItemId(k), k }));
    let picked = pickSessionKana(items, loadedCards, Date.now(), { limit: 15, newLimit: 8 }).map((i) => i.k);
    if (picked.length === 0 && extra) picked = [...activeKanji].sort(() => Math.random() - 0.5).slice(0, 15);
    if (picked.length === 0) return { status: 'empty', reason: 'nichts-faellig' };
    return {
      status: 'running',
      questions: buildKanjiQuestions(picked, activeKanji, KANJI, overrides),
      index: 0,
      answers: [],
      overrides,
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

  async function answer(q: KanjiQuestion, correct: boolean, given: string) {
    if (session.status !== 'running') return;
    const now = new Date();
    const id = kanjiItemId(q.kanji);
    const { card, grade } = reviewCard(id, KANJI_MODE, cards.current.get(id), correct, now);
    cards.current.set(id, card);
    setSession({ ...session, answers: [...session.answers, { correct, given }] });
    speakJapanese(spoken(q.kanji));
    await saveReview(db, card, grade, now.getTime());
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Kanji üben' }} />
      <Screen>
        {session.status === 'loading' ? <ThemedText>Lade …</ThemedText> : null}
        {session.status === 'empty' ? (
          <View style={styles.block}>
            <ThemedText>
              {session.reason === 'nichts-ausgewaehlt'
                ? 'Du hast noch keine Kanji ausgewählt.'
                : 'Für heute ist alles wiederholt. Gut gemacht!'}
            </ThemedText>
            {session.reason === 'nichts-ausgewaehlt' ? (
              <Button label="Kanji auswählen" onPress={() => router.replace('/einstellungen')} />
            ) : (
              <Button label="Trotzdem eine Runde üben" onPress={() => start(true)} />
            )}
          </View>
        ) : null}
        {session.status === 'running' && session.index < session.questions.length ? (
          <QuestionView
            key={session.index}
            question={session.questions[session.index]}
            overrides={session.overrides}
            position={session.index + 1}
            total={session.questions.length}
            answer={session.answers[session.index]}
            onAnswer={answer}
            onNext={() => setSession({ ...session, index: session.index + 1 })}
          />
        ) : null}
        {session.status === 'running' && session.index >= session.questions.length ? (
          <View style={styles.block}>
            <ThemedText type="subtitle">
              {session.answers.filter((a) => a.correct).length} von {session.questions.length} richtig
            </ThemedText>
            {session.questions.some((_, i) => !session.answers[i]?.correct) ? (
              <ThemedText>
                Diese kommen bald wieder:{' '}
                {session.questions
                  .filter((_, i) => !session.answers[i]?.correct)
                  .map((q) => `${q.kanji.c} (${meaningText(q.kanji, session.overrides)})`)
                  .join(', ')}
              </ThemedText>
            ) : (
              <ThemedText>Alles richtig, stark!</ThemedText>
            )}
            <Button label="Noch eine Runde" onPress={() => start(true)} />
            <Button label="Fertig" variant="secondary" onPress={() => router.back()} />
          </View>
        ) : null}
      </Screen>
    </>
  );
}

const PROMPTS: Record<KanjiQuestionType, string> = {
  bedeutung: 'Was bedeutet dieses Kanji?',
  lesung: 'Wie liest man dieses Kanji?',
  finden: 'Welches Kanji hat diese Bedeutung?',
};

function QuestionView({
  question,
  overrides,
  position,
  total,
  answer,
  onAnswer,
  onNext,
}: {
  question: KanjiQuestion;
  overrides: Overrides;
  position: number;
  total: number;
  answer: Answer | undefined;
  onAnswer: (q: KanjiQuestion, correct: boolean, given: string) => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  const { kanji, type } = question;
  const label = (k: KanjiEntry) =>
    type === 'bedeutung' ? meaningText(k, overrides) : type === 'lesung' ? shortReading(k) : k.c;
  const { meanings, lang } = kanjiMeanings(kanji, overrides.get(kanjiItemId(kanji)));

  return (
    <View style={styles.block}>
      <ProgressBar value={(position - 1) / total} />
      <ThemedText type="small" themeColor="textSecondary">
        {position} / {total} · {PROMPTS[type]}
      </ThemedText>
      <View style={[styles.prompt, { backgroundColor: theme.backgroundElement }]}>
        {type === 'finden' ? (
          <ThemedText style={styles.meaningPrompt}>{meaningText(kanji, overrides)}</ThemedText>
        ) : (
          <ThemedText style={styles.bigChar}>{kanji.c}</ThemedText>
        )}
      </View>
      <View style={quizStyles.choices}>
        {question.choices.map((c) => (
          <ChoiceButton
            key={c.c}
            label={label(c)}
            large={type === 'finden'}
            state={answer ? (c.c === kanji.c ? 'right' : answer.given === c.c ? 'wrong' : 'idle') : 'idle'}
            disabled={!!answer}
            onPress={() => onAnswer(question, c.c === kanji.c, c.c)}
          />
        ))}
      </View>
      {answer ? (
        <View style={[styles.feedback, { backgroundColor: answer.correct ? theme.successSoft : theme.accentSoft }]}>
          <ThemedText type="smallBold">{answer.correct ? 'Richtig!' : 'Leider falsch.'}</ThemedText>
          <View style={styles.answerRow}>
            <ThemedText style={styles.answerChar}>{kanji.c}</ThemedText>
            <View style={styles.answerText}>
              <ThemedText>
                {meanings.join(', ')}
                {lang === 'en' ? ' (englisch)' : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                On: {kanji.on.join(', ') || '–'} · Kun: {kunReadings(kanji).join(', ') || '–'}
              </ThemedText>
            </View>
          </View>
          <View style={styles.buttons}>
            <Button label="🔊 Anhören" variant="secondary" onPress={() => speakJapanese(spoken(kanji))} />
            <Button label="✎ Ansehen" variant="secondary" onPress={() => router.push(charHref(kanji.c))} />
            <Button label="Weiter" onPress={onNext} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.three },
  prompt: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    minHeight: 180,
  },
  bigChar: { fontSize: 112, lineHeight: 132 },
  meaningPrompt: { fontSize: 30, lineHeight: 40, textAlign: 'center', fontWeight: 600 },
  feedback: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  answerChar: { fontSize: 56, lineHeight: 68 },
  answerText: { flex: 1, gap: Spacing.one },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'flex-end' },
});

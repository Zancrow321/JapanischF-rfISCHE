import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceButton, ProgressBar, quizStyles } from '@/components/quiz';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getCards, saveReview } from '@/db/reviews';
import { getSetting } from '@/db/settings';
import { getLists, getWords, vocabItemId, vocabListItemId } from '@/db/vocab';
import { useSelection } from '@/hooks/use-selection';
import { useTheme } from '@/hooks/use-theme';
import { pickSessionKana } from '@/learn/kana-quiz';
import { reviewCard, type StoredCard } from '@/learn/srs';
import {
  buildVocabQuestions,
  isJapaneseAnswerCorrect,
  modeFor,
  type VocabDirection,
  type VocabQuestion,
} from '@/learn/vocab-quiz';
import { speakJapanese } from '@/lib/speech';
import { allForms, DEFAULT_VOCAB_SCRIPT, displayWord, isVocabScript, type VocabScript } from '@/vocab/script';

type Answer = { correct: boolean; given: string };

type Session =
  | { status: 'loading' }
  | { status: 'empty'; reason: 'keine-woerter' | 'nichts-faellig' }
  | { status: 'running'; questions: VocabQuestion[]; index: number; answers: Answer[]; script: VocabScript };

export default function VocabQuizScreen() {
  const db = useSQLiteContext();
  const { richtung } = useLocalSearchParams<{ richtung?: string }>();
  const direction: VocabDirection = richtung === 'ja-de' ? 'ja-de' : 'de-ja';
  const mode = modeFor(direction);
  const { active, loaded } = useSelection();
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const cards = useRef<Map<string, StoredCard>>(new Map());

  async function prepare(extra: boolean): Promise<Session> {
    const stored = await getSetting(db, 'vocab_script');
    const script = isVocabScript(stored) ? stored : DEFAULT_VOCAB_SCRIPT;
    const lists = (await getLists(db)).filter((l) => active.has(vocabListItemId(l.id)));
    const words = await getWords(db, lists.map((l) => l.id));
    const loadedCards = await getCards(db, mode);
    cards.current = loadedCards;
    if (words.length === 0) return { status: 'empty', reason: 'keine-woerter' };

    const items = words.map((w) => ({ id: vocabItemId(w.id), word: w }));
    let picked = pickSessionKana(items, loadedCards, Date.now(), { limit: 15, newLimit: 8 }).map((i) => i.word);
    if (picked.length === 0 && extra) {
      picked = [...words].sort(() => Math.random() - 0.5).slice(0, 15);
    }
    if (picked.length === 0) return { status: 'empty', reason: 'nichts-faellig' };
    const questions = buildVocabQuestions(picked, words, direction, loadedCards, (w) => vocabItemId(w.id));
    return { status: 'running', questions, index: 0, answers: [], script };
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

  async function answer(question: VocabQuestion, correct: boolean, given: string) {
    if (session.status !== 'running') return;
    const now = new Date();
    const itemId = vocabItemId(question.word.id);
    const { card, grade } = reviewCard(itemId, mode, cards.current.get(itemId), correct, now);
    cards.current.set(itemId, card);
    setSession({ ...session, answers: [...session.answers, { correct, given }] });
    speakJapanese(question.word.kana);
    await saveReview(db, card, grade, now.getTime());
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: direction === 'de-ja' ? 'Deutsch → Japanisch' : 'Japanisch → Deutsch' }}
      />
      <Screen>
        {session.status === 'loading' ? <ThemedText>Lade …</ThemedText> : null}
        {session.status === 'empty' ? (
          <View style={styles.block}>
            <ThemedText>
              {session.reason === 'keine-woerter'
                ? 'In deinen aktiven Listen sind noch keine Wörter.'
                : 'Für heute ist alles wiederholt. Gut gemacht!'}
            </ThemedText>
            {session.reason === 'keine-woerter' ? (
              <Button label="Zu den Vokabeln" onPress={() => router.replace('/vocab')} />
            ) : (
              <Button label="Trotzdem eine Runde üben" onPress={() => start(true)} />
            )}
          </View>
        ) : null}
        {session.status === 'running' && session.index < session.questions.length ? (
          <QuestionView
            key={session.index}
            question={session.questions[session.index]}
            direction={direction}
            script={session.script}
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
                  .map((q) => `${displayWord(q.word, session.script)} (${q.word.german})`)
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

function QuestionView({
  question,
  direction,
  script,
  position,
  total,
  answer,
  onAnswer,
  onNext,
}: {
  question: VocabQuestion;
  direction: VocabDirection;
  script: VocabScript;
  position: number;
  total: number;
  answer: Answer | undefined;
  onAnswer: (q: VocabQuestion, correct: boolean, given: string) => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  const { word, type } = question;
  const [revealed, setRevealed] = useState(false);
  const deJa = direction === 'de-ja';

  const prompt = deJa
    ? type === 'tippen'
      ? `Wie heißt das auf Japanisch? Tippe es in Romaji oder Kana${script === 'kanji' ? ' (Kanji geht auch)' : ''}.`
      : 'Wie heißt das auf Japanisch?'
    : type === 'selbst'
      ? 'Was bedeutet das? Überlege, dann deck auf.'
      : 'Was bedeutet das?';

  return (
    <View style={styles.block}>
      <ProgressBar value={(position - 1) / total} />
      <ThemedText type="small" themeColor="textSecondary">
        {position} / {total} · {prompt}
      </ThemedText>

      <View style={[styles.prompt, { backgroundColor: theme.backgroundElement }]}>
        {deJa ? (
          <ThemedText style={styles.germanPrompt}>{word.german}</ThemedText>
        ) : (
          <>
            <ThemedText style={styles.japanesePrompt}>{displayWord(word, script)}</ThemedText>
            <Button label="🔊" variant="secondary" onPress={() => speakJapanese(word.kana)} />
          </>
        )}
      </View>

      {type === 'tippen' ? (
        <TypeAnswer
          disabled={!!answer}
          onSubmit={(given) => onAnswer(question, isJapaneseAnswerCorrect(word, given), given)}
          onGiveUp={() => onAnswer(question, false, '')}
        />
      ) : null}

      {type === 'waehlen' ? (
        <View style={quizStyles.choices}>
          {question.choices.map((c) => (
            <ChoiceButton
              key={c.id}
              label={deJa ? displayWord(c, script) : c.german}
              large={false}
              state={answer ? (c.id === word.id ? 'right' : answer.given === String(c.id) ? 'wrong' : 'idle') : 'idle'}
              disabled={!!answer}
              onPress={() => onAnswer(question, c.id === word.id, String(c.id))}
            />
          ))}
        </View>
      ) : null}

      {type === 'selbst' && !answer ? (
        revealed ? (
          <View style={[styles.feedback, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.germanAnswer}>{word.german}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {allForms(word).join(' · ')}
            </ThemedText>
            <View style={styles.buttons}>
              <Button label="Nicht gewusst" variant="secondary" onPress={() => onAnswer(question, false, '')} />
              <Button label="Gewusst" onPress={() => onAnswer(question, true, '')} />
            </View>
          </View>
        ) : (
          <Button label="Aufdecken" onPress={() => setRevealed(true)} />
        )
      ) : null}

      {answer ? (
        <View style={[styles.feedback, { backgroundColor: answer.correct ? theme.successSoft : theme.accentSoft }]}>
          <ThemedText type="smallBold">
            {answer.correct
              ? 'Richtig!'
              : type === 'tippen' && answer.given
                ? `Leider falsch, du hast „${answer.given}“ getippt.`
                : type === 'selbst'
                  ? 'Kommt bald wieder.'
                  : 'Leider falsch.'}
          </ThemedText>
          <ThemedText style={styles.answerWord}>{displayWord(word, script)}</ThemedText>
          <ThemedText>
            {allForms(word).join(' · ')} = {word.german}
          </ThemedText>
          <View style={styles.buttons}>
            <Button label="🔊 Anhören" variant="secondary" onPress={() => speakJapanese(word.kana)} />
            <Button label="Weiter" onPress={onNext} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function TypeAnswer({
  disabled,
  onSubmit,
  onGiveUp,
}: {
  disabled: boolean;
  onSubmit: (given: string) => void;
  onGiveUp: () => void;
}) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const submit = () => {
    if (disabled || value.trim() === '') return;
    onSubmit(value.trim());
  };
  return (
    <View style={styles.block}>
      <View style={styles.typeRow}>
        <TextInput
          value={value}
          onChangeText={setValue}
          onSubmitEditing={submit}
          editable={!disabled}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="z. B. mizu"
          placeholderTextColor={theme.textSecondary}
          aria-label="Antwort eingeben"
          style={[quizStyles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <Button label="Prüfen" onPress={submit} disabled={disabled} />
      </View>
      {!disabled ? <Button label="Weiß ich nicht" variant="secondary" onPress={onGiveUp} /> : null}
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
    minHeight: 160,
    gap: Spacing.two,
  },
  germanPrompt: { fontSize: 30, lineHeight: 40, textAlign: 'center', fontWeight: 600 },
  japanesePrompt: { fontSize: 48, lineHeight: 64, textAlign: 'center' },
  germanAnswer: { fontSize: 24, lineHeight: 32, fontWeight: 600 },
  answerWord: { fontSize: 36, lineHeight: 48 },
  typeRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  feedback: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'flex-end' },
});

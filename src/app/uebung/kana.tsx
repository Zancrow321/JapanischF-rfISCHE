import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ALL_KANA, type Kana } from '@/data/kana';
import { getCards, saveReview } from '@/db/reviews';
import { useSelection } from '@/hooks/use-selection';
import { useTheme } from '@/hooks/use-theme';
import {
  buildQuestions,
  isRomajiCorrect,
  KANA_MODE,
  pickSessionKana,
  type Question,
  type QuestionType,
} from '@/learn/kana-quiz';
import { reviewCard, type StoredCard } from '@/learn/srs';
import { hasJapaneseVoice, speakJapanese } from '@/lib/speech';

type Answer = { correct: boolean; given: string };

type Session =
  | { status: 'loading' }
  | { status: 'empty'; reason: 'nichts-ausgewaehlt' | 'nichts-faellig' }
  | { status: 'running'; questions: Question[]; index: number; answers: Answer[] };

export default function KanaQuizScreen() {
  const db = useSQLiteContext();
  const { active, loaded } = useSelection();
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const cards = useRef<Map<string, StoredCard>>(new Map());

  /** Stellt eine neue Runde zusammen; ändert selbst keinen Zustand. */
  async function prepare(extra: boolean): Promise<Session> {
    const loadedCards = await getCards(db, KANA_MODE);
    cards.current = loadedCards;
    const activeKana = ALL_KANA.filter((k) => active.has(k.id));
    if (activeKana.length === 0) return { status: 'empty', reason: 'nichts-ausgewaehlt' };
    let picked = pickSessionKana(activeKana, loadedCards, Date.now());
    if (picked.length === 0 && extra) {
      // Zusatzrunde: zufällige ausgewählte Zeichen, auch wenn sie noch nicht fällig sind.
      picked = [...activeKana].sort(() => Math.random() - 0.5).slice(0, 20);
    }
    if (picked.length === 0) return { status: 'empty', reason: 'nichts-faellig' };
    const types: QuestionType[] = ['tippen', 'lesung-waehlen'];
    if (await hasJapaneseVoice()) types.push('hoeren');
    return { status: 'running', questions: buildQuestions(picked, ALL_KANA, types), index: 0, answers: [] };
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
    // Nur beim Öffnen starten, nicht bei jeder Änderung der Auswahl.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  async function answer(question: Question, correct: boolean, given: string) {
    if (session.status !== 'running') return;
    const now = new Date();
    const { card, grade } = reviewCard(
      question.kana.id,
      KANA_MODE,
      cards.current.get(question.kana.id),
      correct,
      now,
    );
    cards.current.set(question.kana.id, card);
    setSession({ ...session, answers: [...session.answers, { correct, given }] });
    speakJapanese(question.kana.char);
    await saveReview(db, card, grade, now.getTime());
  }

  function next() {
    if (session.status !== 'running') return;
    setSession({ ...session, index: session.index + 1 });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Kana üben' }} />
      <Screen>
        {session.status === 'loading' ? <ThemedText>Lade …</ThemedText> : null}
        {session.status === 'empty' ? (
          <EmptyState reason={session.reason} onExtra={() => start(true)} />
        ) : null}
        {session.status === 'running' && session.index < session.questions.length ? (
          <QuestionView
            key={session.index}
            question={session.questions[session.index]}
            position={session.index + 1}
            total={session.questions.length}
            answer={session.answers[session.index]}
            onAnswer={answer}
            onNext={next}
          />
        ) : null}
        {session.status === 'running' && session.index >= session.questions.length ? (
          <Summary questions={session.questions} answers={session.answers} onAgain={() => start(true)} />
        ) : null}
      </Screen>
    </>
  );
}

function EmptyState({
  reason,
  onExtra,
}: {
  reason: 'nichts-ausgewaehlt' | 'nichts-faellig';
  onExtra: () => void;
}) {
  if (reason === 'nichts-ausgewaehlt') {
    return (
      <View style={styles.block}>
        <ThemedText>Du hast noch keine Kana ausgewählt.</ThemedText>
        <Button label="Kana auswählen" onPress={() => router.replace('/kana')} />
      </View>
    );
  }
  return (
    <View style={styles.block}>
      <ThemedText>Für heute ist alles wiederholt. Gut gemacht!</ThemedText>
      <Button label="Trotzdem eine Runde üben" onPress={onExtra} />
      <Button label="Zurück" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}

type QuestionProps = {
  question: Question;
  position: number;
  total: number;
  answer: Answer | undefined;
  onAnswer: (q: Question, correct: boolean, given: string) => void;
  onNext: () => void;
};

const PROMPTS: Record<QuestionType, string> = {
  tippen: 'Wie liest man dieses Zeichen? Tippe die Umschrift.',
  'lesung-waehlen': 'Wie liest man dieses Zeichen?',
  hoeren: 'Welches Zeichen hörst du?',
};

function QuestionView({ question, position, total, answer, onAnswer, onNext }: QuestionProps) {
  const theme = useTheme();
  const { kana, type } = question;

  useEffect(() => {
    if (type === 'hoeren') speakJapanese(kana.char);
  }, [type, kana.char]);

  return (
    <View style={styles.block}>
      <ProgressBar value={(position - 1) / total} />
      <ThemedText type="small" themeColor="textSecondary">
        {position} / {total} · {PROMPTS[type]}
      </ThemedText>

      {type === 'hoeren' ? (
        <Pressable
          accessibilityRole="button"
          aria-label="Nochmal anhören"
          onPress={() => speakJapanese(kana.char)}
          style={[styles.prompt, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={styles.speaker}>🔊</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Tippen zum Anhören
          </ThemedText>
        </Pressable>
      ) : (
        <View style={[styles.prompt, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={styles.bigChar}>{kana.char}</ThemedText>
        </View>
      )}

      {type === 'tippen' ? (
        <TypeAnswer kana={kana} disabled={!!answer} onAnswer={(ok, given) => onAnswer(question, ok, given)} />
      ) : (
        <View style={styles.choices}>
          {question.choices.map((c) => (
            <ChoiceButton
              key={c.id}
              label={type === 'hoeren' ? c.char : c.romaji[0]}
              large={type === 'hoeren'}
              state={answer ? (c.id === kana.id ? 'right' : answer.given === c.id ? 'wrong' : 'idle') : 'idle'}
              disabled={!!answer}
              onPress={() => onAnswer(question, c.id === kana.id, c.id)}
            />
          ))}
        </View>
      )}

      {answer ? (
        <Feedback
          kana={kana}
          correct={answer.correct}
          typed={type === 'tippen' ? answer.given : undefined}
          onNext={onNext}
        />
      ) : null}
    </View>
  );
}

function TypeAnswer({
  kana,
  disabled,
  onAnswer,
}: {
  kana: Kana;
  disabled: boolean;
  onAnswer: (correct: boolean, given: string) => void;
}) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const submit = () => {
    if (disabled || value.trim() === '') return;
    onAnswer(isRomajiCorrect(kana, value), value);
  };
  return (
    <View style={styles.typeRow}>
      <TextInput
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        editable={!disabled}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="z. B. ka"
        placeholderTextColor={theme.textSecondary}
        aria-label="Umschrift eingeben"
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      <Button label="Prüfen" onPress={submit} disabled={disabled} />
    </View>
  );
}

function Feedback({
  kana,
  correct,
  typed,
  onNext,
}: {
  kana: Kana;
  correct: boolean;
  typed?: string;
  onNext: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.feedback,
        { backgroundColor: correct ? theme.successSoft : theme.accentSoft },
      ]}>
      <ThemedText type="smallBold">
        {correct ? 'Richtig!' : typed ? `Leider falsch, du hast „${typed}“ getippt.` : 'Leider falsch.'}
      </ThemedText>
      <ThemedText>
        {kana.char} liest man „{kana.romaji[0]}“
        {kana.romaji.length > 1 ? ` (auch ${kana.romaji.slice(1).join(', ')})` : ''}.
      </ThemedText>
      <View style={styles.feedbackButtons}>
        <Button label="🔊 Anhören" variant="secondary" onPress={() => speakJapanese(kana.char)} />
        <Button label="Weiter" onPress={onNext} />
      </View>
    </View>
  );
}

function Summary({
  questions,
  answers,
  onAgain,
}: {
  questions: Question[];
  answers: Answer[];
  onAgain: () => void;
}) {
  const right = answers.filter((a) => a.correct).length;
  const wrong = questions.filter((_, i) => !answers[i]?.correct).map((q) => q.kana);
  return (
    <View style={styles.block}>
      <ThemedText type="subtitle">
        {right} von {questions.length} richtig
      </ThemedText>
      {wrong.length > 0 ? (
        <ThemedText>
          Diese kommen bald wieder: {wrong.map((k) => `${k.char} (${k.romaji[0]})`).join(', ')}
        </ThemedText>
      ) : (
        <ThemedText>Alles richtig, stark!</ThemedText>
      )}
      <Button label="Noch eine Runde" onPress={onAgain} />
      <Button label="Fertig" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.progress, { backgroundColor: theme.backgroundElement }]}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: '100%', backgroundColor: theme.accent }} />
    </View>
  );
}

function ChoiceButton({
  label,
  large,
  state,
  disabled,
  onPress,
}: {
  label: string;
  large: boolean;
  state: 'idle' | 'right' | 'wrong';
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const borderColor = state === 'right' ? theme.success : state === 'wrong' ? theme.accent : theme.border;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { borderColor, backgroundColor: theme.background, opacity: pressed ? 0.7 : 1 },
      ]}>
      <ThemedText style={large ? styles.choiceCharText : styles.choiceText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.three },
  progress: { height: 6, borderRadius: 3, overflow: 'hidden' },
  prompt: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.four,
    minHeight: 180,
  },
  bigChar: { fontSize: 112, lineHeight: 132 },
  speaker: { fontSize: 56, lineHeight: 72 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choice: {
    flexGrow: 1,
    flexBasis: '45%',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  choiceText: { fontSize: 22, lineHeight: 30 },
  choiceCharText: { fontSize: 40, lineHeight: 52 },
  typeRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  input: {
    flex: 1,
    // Ohne minWidth nimmt das Feld im Browser seine Standardbreite und schiebt den Knopf hinaus.
    minWidth: 0,
    borderWidth: 2,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 22,
  },
  feedback: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  feedbackButtons: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
});

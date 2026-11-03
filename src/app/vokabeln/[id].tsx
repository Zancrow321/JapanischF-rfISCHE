import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { quizStyles } from '@/components/quiz';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  addWord,
  deleteList,
  deleteWord,
  getList,
  getWords,
  joinGerman,
  updateWord,
  type Vocab,
  type VocabList,
} from '@/db/vocab';
import { useTheme } from '@/hooks/use-theme';
import { useVocabScript } from '@/hooks/use-vocab-script';
import { romajiToHiragana } from '@/lib/romaji';
import { speakJapanese } from '@/lib/speech';
import { dictionaryAvailable, normalizeGerman, searchDictionary, type Suggestion } from '@/vocab/dictionary';
import { allForms, displayWord, type VocabScript } from '@/vocab/script';

const KANA_ONLY = /^[぀-ヿー・\s]+$/;

/** Lesung aus der Eingabe: Romaji werden in Hiragana umgewandelt, Kana bleiben wie sie sind. */
const toReading = (input: string) => (/[a-z]/i.test(input) ? romajiToHiragana(input.trim()) : input.trim());

type Form = { german: string; kana: string; written: string };
const EMPTY: Form = { german: '', kana: '', written: '' };

export default function VocabListScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = Number(id);
  const [script] = useVocabScript();
  const [list, setList] = useState<VocabList | null>(null);
  const [words, setWords] = useState<Vocab[]>([]);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Vocab | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getList(db, listId), getWords(db, [listId])]).then(([l, w]) => {
        if (cancelled) return;
        setList(l);
        setWords(w);
      });
      return () => {
        cancelled = true;
      };
      // version: nach Änderungen neu laden
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, listId, version]),
  );
  const reload = () => setVersion((v) => v + 1);

  async function save(input: Form) {
    const word = { german: input.german, kana: toReading(input.kana), written: input.written, note: null };
    if (editing) await updateWord(db, editing.id, word);
    else await addWord(db, listId, word);
    setEditing(null);
    setForm(EMPTY);
    reload();
  }

  async function remove(word: Vocab) {
    await deleteWord(db, word.id);
    if (editing?.id === word.id) {
      setEditing(null);
      setForm(EMPTY);
    }
    reload();
  }

  async function removeList() {
    await deleteList(db, listId);
    router.back();
  }

  if (!list) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Liste' }} />
        <ThemedText>Lade …</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: list.name }} />
      <WordForm
        key={editing?.id ?? 'neu'}
        form={form}
        onChange={setForm}
        script={script}
        editing={!!editing}
        onSave={save}
        onCancel={() => {
          setEditing(null);
          setForm(EMPTY);
        }}
      />

      <ThemedText type="smallBold">
        {words.length} {words.length === 1 ? 'Wort' : 'Wörter'}
      </ThemedText>
      {words.length === 0 ? (
        <ThemedText themeColor="textSecondary">Füge oben dein erstes Wort hinzu.</ThemedText>
      ) : null}
      {words.map((w) => (
        <WordRow
          key={w.id}
          word={w}
          script={script}
          selected={editing?.id === w.id}
          onEdit={() => {
            setEditing(w);
            setForm({ german: w.german, kana: w.kana, written: w.written ?? '' });
          }}
          onDelete={() => remove(w)}
        />
      ))}

      <View style={styles.dangerZone}>
        {confirmDeleteList ? (
          <>
            <ThemedText>Liste „{list.name}“ mit allen Wörtern und dem Lernstand löschen?</ThemedText>
            <View style={styles.row}>
              <Button label="Ja, löschen" onPress={removeList} />
              <Button label="Abbrechen" variant="secondary" onPress={() => setConfirmDeleteList(false)} />
            </View>
          </>
        ) : (
          <Button label="Liste löschen" variant="secondary" onPress={() => setConfirmDeleteList(true)} />
        )}
      </View>
    </Screen>
  );
}

function WordForm({
  form,
  onChange,
  script,
  editing,
  onSave,
  onCancel,
}: {
  form: Form;
  onChange: (f: Form) => void;
  script: VocabScript;
  editing: boolean;
  onSave: (f: Form) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  // Vorschläge nur, solange die Lesung noch leer ist (danach ist das Wort gewählt).
  const [showSuggestions, setShowSuggestions] = useState(!editing);
  const suggestions = useMemo(
    () => (showSuggestions && form.german.trim().length >= 2 ? searchDictionary(form.german, 8) : []),
    [form.german, showSuggestions],
  );
  const reading = toReading(form.kana);
  const readingOk = reading.length > 0 && KANA_ONLY.test(reading);
  const canSave = form.german.trim().length > 0 && readingOk;

  function pick(s: Suggestion) {
    const typed = normalizeGerman(form.german);
    // Eigene Formulierung behalten, wenn sie genau einer Übersetzung entspricht.
    const keep = s.german.some((g) => normalizeGerman(g) === typed);
    onChange({ german: keep ? form.german.trim() : joinGerman(s.german), kana: s.kana, written: s.written });
    setShowSuggestions(false);
  }

  const inputStyle = [quizStyles.input, styles.formInput, { color: theme.text, borderColor: theme.border }];

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">{editing ? 'Wort bearbeiten' : 'Wort hinzufügen'}</ThemedText>
      <TextInput
        value={form.german}
        onChangeText={(german) => {
          onChange({ ...form, german });
          if (!editing && !form.kana) setShowSuggestions(true);
        }}
        placeholder="Deutsch, z. B. Wasser"
        placeholderTextColor={theme.textSecondary}
        aria-label="Deutsches Wort"
        autoCorrect={false}
        style={inputStyle}
      />

      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          <ThemedText type="small" themeColor="textSecondary">
            Vorschläge aus dem Wörterbuch, tippe einen an:
          </ThemedText>
          {suggestions.map((s) => (
            <Pressable
              key={`${s.written}|${s.kana}`}
              accessibilityRole="button"
              aria-label={`Vorschlag ${s.written || s.kana}`}
              onPress={() => pick(s)}
              style={({ pressed }) => [
                styles.suggestion,
                { backgroundColor: theme.background, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText style={styles.suggestionWord}>{displayWord({ kana: s.kana, written: s.written }, script)}</ThemedText>
              <View style={styles.suggestionText}>
                <ThemedText type="small" themeColor="textSecondary">
                  {allForms({ kana: s.kana, written: s.written }).join(' · ')}
                </ThemedText>
                <ThemedText type="small">{joinGerman(s.german)}</ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : form.german.trim().length >= 2 && showSuggestions && !dictionaryAvailable() ? (
        <ThemedText type="small" themeColor="textSecondary">
          Das Wörterbuch ist in dieser Version noch nicht enthalten. Trage die Lesung bitte selbst ein.
        </ThemedText>
      ) : null}

      <TextInput
        value={form.kana}
        onChangeText={(kana) => onChange({ ...form, kana })}
        placeholder="Lesung in Kana oder Romaji, z. B. mizu"
        placeholderTextColor={theme.textSecondary}
        aria-label="Lesung"
        autoCapitalize="none"
        autoCorrect={false}
        style={inputStyle}
      />
      {form.kana.trim() ? (
        <ThemedText type="small" themeColor={readingOk ? 'textSecondary' : undefined}>
          {readingOk
            ? `Lesung: ${reading}`
            : 'Die Lesung bitte nur in Kana oder Romaji (z. B. „mizu“ oder „みず“).'}
        </ThemedText>
      ) : null}
      <TextInput
        value={form.written}
        onChangeText={(written) => onChange({ ...form, written })}
        placeholder="Schreibweise mit Kanji (optional), z. B. 水"
        placeholderTextColor={theme.textSecondary}
        aria-label="Schreibweise mit Kanji"
        autoCorrect={false}
        style={inputStyle}
      />
      <View style={styles.row}>
        <Button label={editing ? 'Speichern' : 'Hinzufügen'} disabled={!canSave} onPress={() => onSave(form)} />
        {editing || form.german || form.kana ? (
          <Button label={editing ? 'Abbrechen' : 'Leeren'} variant="secondary" onPress={onCancel} />
        ) : null}
      </View>
    </View>
  );
}

function WordRow({
  word,
  script,
  selected,
  onEdit,
  onDelete,
}: {
  word: Vocab;
  script: VocabScript;
  selected: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const [confirm, setConfirm] = useState(false);
  return (
    <View
      style={[
        styles.wordRow,
        { backgroundColor: theme.backgroundElement, borderColor: selected ? theme.accent : 'transparent' },
      ]}>
      <Pressable accessibilityRole="button" aria-label={`${word.german} bearbeiten`} onPress={onEdit} style={styles.wordMain}>
        <ThemedText style={styles.wordJa}>{displayWord(word, script)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {allForms(word).join(' · ')}
        </ThemedText>
        <ThemedText type="small">{word.german}</ThemedText>
      </Pressable>
      <View style={styles.wordButtons}>
        <Pressable accessibilityRole="button" aria-label="Anhören" onPress={() => speakJapanese(word.kana)} style={styles.iconButton}>
          <ThemedText>🔊</ThemedText>
        </Pressable>
        {confirm ? (
          <Pressable accessibilityRole="button" aria-label="Wirklich löschen" onPress={onDelete} style={styles.iconButton}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              Löschen?
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" aria-label={`${word.german} löschen`} onPress={() => setConfirm(true)} style={styles.iconButton}>
            <ThemedText themeColor="textSecondary">✕</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  formInput: { flex: 0, fontSize: 18 },
  suggestions: { gap: Spacing.two },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  suggestionWord: { fontSize: 26, lineHeight: 34, minWidth: 64 },
  suggestionText: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    borderWidth: 2,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  wordMain: { flex: 1, gap: 2 },
  wordJa: { fontSize: 26, lineHeight: 34 },
  wordButtons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  iconButton: { padding: Spacing.two },
  dangerZone: { marginTop: Spacing.four, gap: Spacing.two },
});

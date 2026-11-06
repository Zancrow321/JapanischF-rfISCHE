import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { quizStyles } from '@/components/quiz';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { kanjiItemId, kanjiMeanings, kunReadings } from '@/data/kanji';
import type { KanjiEntry } from '@/data/types';
import { getMeaningOverride, setMeaningOverride } from '@/db/meanings';
import { addWord, createList, getLists, joinGerman, vocabListItemId, type VocabList } from '@/db/vocab';
import { useSelection } from '@/hooks/use-selection';
import { useTheme, windowStyle } from '@/hooks/use-theme';
import { speakJapanese } from '@/lib/speech';
import { examplesFor, type Suggestion } from '@/vocab/dictionary';
import { allForms } from '@/vocab/script';

const DEFAULT_LIST = 'Beispielwörter';

/** Bedeutung (änderbar), Lesungen und Beispielwörter eines Kanji. */
export function KanjiDetails({ kanji }: { kanji: KanjiEntry }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const itemId = kanjiItemId(kanji);
  const [override, setOverride] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const examples = useMemo(() => examplesFor(kanji.c), [kanji.c]);

  useEffect(() => {
    let cancelled = false;
    getMeaningOverride(db, itemId).then((o) => {
      if (!cancelled) setOverride(o);
    });
    return () => {
      cancelled = true;
    };
  }, [db, itemId]);

  const { meanings, lang } = kanjiMeanings(kanji, override);

  async function save(text: string) {
    await setMeaningOverride(db, itemId, text);
    setOverride(text.trim() || null);
    setEditing(false);
  }

  return (
    <View style={styles.block}>
      <View style={[styles.card, windowStyle(theme, theme.backgroundElement)]}>
        <ThemedText type="smallBold">
          Bedeutung{lang === 'en' ? ' (nur englisch vorhanden)' : lang === 'eigene' ? ' (deine eigene)' : ''}
        </ThemedText>
        {editing ? (
          <>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => save(draft)}
              autoFocus
              placeholder="z. B. Wasser; Fluss"
              placeholderTextColor={theme.textSecondary}
              aria-label="Eigene Bedeutung"
              style={[quizStyles.input, styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Mehrere Bedeutungen mit Strichpunkt trennen. Leer lassen, um die Wörterbuch-Bedeutung zu nehmen.
            </ThemedText>
            <View style={styles.row}>
              <Button label="Speichern" onPress={() => save(draft)} />
              <Button label="Abbrechen" variant="secondary" onPress={() => setEditing(false)} />
            </View>
          </>
        ) : (
          <>
            <ThemedText style={styles.meaning}>{meanings.join(', ')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              On: {kanji.on.join(', ') || '–'} · Kun: {kunReadings(kanji).join(', ') || '–'} ·{' '}
              {kanji.strokes} Striche
            </ThemedText>
            <View style={styles.row}>
              <Button
                label="Bedeutung ändern"
                variant="secondary"
                onPress={() => {
                  setDraft(override ?? meanings.join('; '));
                  setEditing(true);
                }}
              />
            </View>
          </>
        )}
      </View>

      {examples.length > 0 ? (
        <View style={styles.block}>
          <ThemedText type="smallBold">Beispielwörter</ThemedText>
          {examples.map((ex) => (
            <ExampleRow key={`${ex.written}|${ex.kana}`} example={ex} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ExampleRow({ example }: { example: Suggestion }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { setMany } = useSelection();
  const [lists, setLists] = useState<VocabList[] | null>(null);
  const [addedTo, setAddedTo] = useState<string | null>(null);

  async function openChooser() {
    const all = (await getLists(db)).filter((l) => l.source === 'custom');
    if (all.length === 0) {
      // Noch keine eigene Liste: eine anlegen, damit das Übernehmen mit einem Tipp klappt.
      const id = await createList(db, DEFAULT_LIST);
      await setMany([vocabListItemId(id)], true);
      await add({ id, name: DEFAULT_LIST, source: 'custom', count: 0 });
      return;
    }
    if (all.length === 1) {
      await add(all[0]);
      return;
    }
    setLists(all);
  }

  async function add(list: VocabList) {
    await addWord(db, list.id, {
      german: joinGerman(example.german),
      kana: example.kana,
      written: example.written,
      note: null,
    });
    setLists(null);
    setAddedTo(list.name);
  }

  return (
    <View style={[styles.example, windowStyle(theme, theme.backgroundElement)]}>
      <View style={styles.exampleMain}>
        <Pressable accessibilityRole="button" aria-label={`${example.written} anhören`} onPress={() => speakJapanese(example.kana)}>
          <ThemedText style={styles.exampleWord}>{example.written}</ThemedText>
        </Pressable>
        <View style={styles.exampleText}>
          <ThemedText type="small" themeColor="textSecondary">
            {allForms({ kana: example.kana, written: null }).join(' · ')}
          </ThemedText>
          <ThemedText type="small">{joinGerman(example.german)}</ThemedText>
        </View>
      </View>
      {addedTo ? (
        <ThemedText type="small" style={{ color: theme.success }}>
          ✓ In „{addedTo}“ übernommen
        </ThemedText>
      ) : lists ? (
        <View style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary">
            In welche Liste?
          </ThemedText>
          {lists.map((l) => (
            <Button key={l.id} label={l.name} variant="secondary" onPress={() => add(l)} />
          ))}
        </View>
      ) : (
        <Button label="+ In Vokabelliste" variant="secondary" onPress={openChooser} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.two },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  meaning: { fontSize: 22, lineHeight: 30, fontWeight: 600 },
  input: { flex: 0, fontSize: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  example: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  exampleMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  exampleWord: { fontSize: 28, lineHeight: 36 },
  exampleText: { flex: 1, gap: 2 },
});

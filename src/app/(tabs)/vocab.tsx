import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { PracticeCard } from '@/components/practice-card';
import { quizStyles } from '@/components/quiz';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { loadN5 } from '@/data/generated/dict-index';
import { addN5List, createList, N5_LIST_NAME, vocabListItemId } from '@/db/vocab';
import { useSelection } from '@/hooks/use-selection';
import { useTheme } from '@/hooks/use-theme';
import { useVocabOverview } from '@/hooks/use-vocab';
import { useVocabScript } from '@/hooks/use-vocab-script';
import { VOCAB_SCRIPTS } from '@/vocab/script';

/** Vokabeln: eigene Listen, Schriftwahl und Abfrage in beide Richtungen. */
export default function VocabScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [script, setScript] = useVocabScript();
  const { lists, deJa, jaDe, reload } = useVocabOverview();
  const { active, toggle, setMany } = useSelection();
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const hasN5 = lists.some((l) => l.source === 'builtin' && l.name === N5_LIST_NAME);

  async function create() {
    const name = newName.trim();
    if (!name) return;
    const id = await createList(db, name);
    await setMany([vocabListItemId(id)], true);
    setNewName('');
    router.push({ pathname: '/vokabeln/[id]', params: { id: String(id) } });
  }

  async function addN5() {
    const words = loadN5();
    if (words.length === 0) return;
    setBusy(true);
    try {
      const id = await addN5List(db, words);
      await setMany([vocabListItemId(id)], true);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.section}>
        <ThemedText type="smallBold">In welcher Schrift willst du lernen?</ThemedText>
        <Segmented options={VOCAB_SCRIPTS} value={script} onChange={setScript} />
        <ThemedText type="small" themeColor="textSecondary">
          {script === 'kanji'
            ? 'Wörter ohne Kanji erscheinen in Kana. Beim Antworten kannst du immer auch Romaji tippen.'
            : 'So werden die Wörter gezeigt und abgefragt. Beim Antworten kannst du immer auch Romaji tippen.'}
        </ThemedText>
      </View>

      <PracticeCard
        title="Deutsch → Japanisch"
        href={{ pathname: '/uebung/vokabeln', params: { richtung: 'de-ja' } }}
        emptyHint="Lege unten eine Liste an und füge Wörter hinzu, dann kannst du hier üben."
        {...deJa}
      />
      <PracticeCard
        title="Japanisch → Deutsch"
        href={{ pathname: '/uebung/vokabeln', params: { richtung: 'ja-de' } }}
        emptyHint="Sobald eine Liste Wörter hat, kannst du hier üben."
        {...jaDe}
      />

      <View style={styles.section}>
        <ThemedText type="smallBold">Deine Listen</ThemedText>
        {lists.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            Noch keine Listen. Lege eine an, z. B. „Lektion 1“, oder nimm die N5-Grundliste.
          </ThemedText>
        ) : null}
        {lists.map((l) => {
          const on = active.has(vocabListItemId(l.id));
          return (
            <View key={l.id} style={[styles.listRow, { backgroundColor: theme.backgroundElement }]}>
              <Pressable
                accessibilityRole="link"
                aria-label={`Liste ${l.name} öffnen`}
                onPress={() => router.push({ pathname: '/vokabeln/[id]', params: { id: String(l.id) } })}
                style={styles.listName}>
                <ThemedText type="smallBold">{l.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {l.count} {l.count === 1 ? 'Wort' : 'Wörter'}
                </ThemedText>
              </Pressable>
              <View style={styles.toggle}>
                <ThemedText type="small" themeColor="textSecondary">
                  {on ? 'lernen' : 'pausiert'}
                </ThemedText>
                <Switch
                  value={on}
                  onValueChange={() => toggle(vocabListItemId(l.id))}
                  aria-label={`${l.name} lernen`}
                  trackColor={{ true: theme.accent, false: theme.border }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          );
        })}

        <View style={styles.newRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={create}
            placeholder="Neue Liste, z. B. Lektion 3"
            placeholderTextColor={theme.textSecondary}
            aria-label="Name der neuen Liste"
            style={[quizStyles.input, styles.smallInput, { color: theme.text, borderColor: theme.border }]}
          />
          <Button label="Anlegen" onPress={create} disabled={!newName.trim()} />
        </View>

        {!hasN5 && loadN5().length > 0 ? (
          <Button
            label={busy ? 'Wird hinzugefügt …' : `N5-Grundliste hinzufügen (${loadN5().length} Wörter)`}
            variant="secondary"
            disabled={busy}
            onPress={addN5}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  listName: { flex: 1, gap: 2, paddingVertical: Spacing.one },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  newRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  smallInput: { fontSize: 16 },
});

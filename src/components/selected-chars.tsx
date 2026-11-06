import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ALL_KANA } from '@/data/kana';
import { KANJI, kanjiItemId } from '@/data/kanji';
import { charHref } from '@/data/lookup';
import { useSelection } from '@/hooks/use-selection';
import { useTheme, windowStyle } from '@/hooks/use-theme';

type Props = {
  title: string;
  /** Wird an die Zeichenseite übergeben, z. B. „nachzeichnen“ */
  mode?: 'ansehen' | 'nachzeichnen';
};

/** Zeigt die in den Einstellungen gewählten Zeichen; Antippen öffnet die Zeichenseite. */
export function SelectedChars({ title, mode = 'ansehen' }: Props) {
  const theme = useTheme();
  const { active } = useSelection();
  const groups = [
    { label: 'Hiragana', chars: ALL_KANA.filter((k) => k.script === 'hiragana' && active.has(k.id)).map((k) => k.char) },
    { label: 'Katakana', chars: ALL_KANA.filter((k) => k.script === 'katakana' && active.has(k.id)).map((k) => k.char) },
    { label: 'Kanji', chars: KANJI.filter((k) => active.has(kanjiItemId(k))).map((k) => k.c) },
  ].filter((g) => g.chars.length > 0);

  if (groups.length === 0) {
    return (
      <View style={[styles.card, windowStyle(theme, theme.backgroundElement)]}>
        <ThemedText>Du hast noch keine Schriftzeichen ausgewählt.</ThemedText>
        <Button label="In den Einstellungen auswählen" onPress={() => router.push('/einstellungen')} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {groups.map((g) => (
        <View key={g.label} style={styles.group}>
          <ThemedText type="small" themeColor="textSecondary">
            {g.label} ({g.chars.length})
          </ThemedText>
          <View style={styles.grid}>
            {g.chars.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="link"
                aria-label={c}
                onPress={() =>
                  router.push(mode === 'ansehen' ? charHref(c) : `${charHref(c)}?modus=${mode}`)
                }
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}>
                <ThemedText style={styles.char}>{c}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Button label="Auswahl ändern" variant="secondary" onPress={() => router.push('/einstellungen')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  group: { gap: Spacing.one },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { width: 56, height: 56, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  char: { fontSize: 26, lineHeight: 32 },
});

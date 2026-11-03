import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ALL_KANA } from '@/data/kana';
import { KANJI } from '@/data/kanji';
import { useSelection } from '@/hooks/use-selection';
import { useTheme } from '@/hooks/use-theme';

const ROADMAP = [
  { title: 'Kana lesen', text: 'Hiragana und Katakana abfragen, mit Aussprache.', stage: 2 },
  { title: 'Schreiben üben', text: 'Strichreihenfolge ansehen und nachzeichnen.', stage: 3 },
  { title: 'Vokabeln', text: 'JLPT N5 und eigene Listen aus dem Unterricht.', stage: 4 },
  { title: 'Kanji', text: 'Lesungen, Bedeutungen und Schreiben.', stage: 5 },
];

export default function StartScreen() {
  const theme = useTheme();
  const { active } = useSelection();
  const kanaActive = ALL_KANA.filter((k) => active.has(k.id)).length;
  const kanjiActive = KANJI.filter((k) => active.has(`kanji:${k.c}`)).length;

  return (
    <Screen>
      <ThemedText type="title" style={{ color: theme.accent }}>
        日本語
      </ThemedText>
      <ThemedText>Dein Begleiter zum Japanischunterricht.</ThemedText>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">Deine Auswahl</ThemedText>
        <ThemedText>
          {kanaActive} von {ALL_KANA.length} Kana
        </ThemedText>
        <ThemedText>
          {kanjiActive} von {KANJI.length} Kanji
        </ThemedText>
      </View>

      <ThemedText type="smallBold">Kommt als Nächstes</ThemedText>
      {ROADMAP.map((r) => (
        <View key={r.title} style={[styles.card, { borderColor: theme.border, borderWidth: 1 }]}>
          <ThemedText type="smallBold">{r.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {r.text} (Etappe {r.stage})
          </ThemedText>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
});

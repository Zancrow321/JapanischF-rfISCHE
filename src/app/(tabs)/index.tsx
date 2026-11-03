import { StyleSheet, View } from 'react-native';

import { PracticeCard } from '@/components/practice-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ALL_KANA } from '@/data/kana';
import { KANJI } from '@/data/kanji';
import { useKanaDue } from '@/hooks/use-kana-due';
import { KANA_WRITE_MODE } from '@/learn/kana-quiz';
import { useSelection } from '@/hooks/use-selection';
import { useTheme } from '@/hooks/use-theme';

const ROADMAP = [
  { title: 'Vokabeln', text: 'JLPT N5 und eigene Listen aus dem Unterricht.', stage: 4 },
  { title: 'Kanji', text: 'Lesungen, Bedeutungen und Schreiben.', stage: 5 },
];

export default function StartScreen() {
  const theme = useTheme();
  const { active } = useSelection();
  const kanaDue = useKanaDue();
  const writeDue = useKanaDue(KANA_WRITE_MODE);
  const kanaActive = ALL_KANA.filter((k) => active.has(k.id)).length;
  const kanjiActive = KANJI.filter((k) => active.has(`kanji:${k.c}`)).length;

  return (
    <Screen>
      <ThemedText type="title" style={{ color: theme.accent }}>
        日本語
      </ThemedText>
      <ThemedText>Dein Begleiter zum Japanischunterricht.</ThemedText>

      <PracticeCard
        title="Kana lesen"
        href="/uebung/kana"
        emptyHint="Wähle im Tab „Kana“ die Zeichen aus, die du gerade lernst."
        {...kanaDue}
      />
      {kanaDue.selected > 0 ? (
        <PracticeCard title="Kana schreiben" href="/uebung/schreiben" emptyHint="" {...writeDue} />
      ) : null}

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

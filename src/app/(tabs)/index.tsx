import { StyleSheet, View } from 'react-native';

import { PracticeCard } from '@/components/practice-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ALL_KANA } from '@/data/kana';
import { KANJI, kanjiItemId } from '@/data/kanji';
import { useKanaDue } from '@/hooks/use-kana-due';
import { useSelection } from '@/hooks/use-selection';
import { useStats } from '@/hooks/use-stats';
import { useTheme } from '@/hooks/use-theme';
import { KANA_WRITE_MODE } from '@/learn/kana-quiz';

export default function StartScreen() {
  const theme = useTheme();
  const { active } = useSelection();
  const readDue = useKanaDue();
  const writeDue = useKanaDue(KANA_WRITE_MODE);
  const stats = useStats();
  const kanaActive = ALL_KANA.filter((k) => active.has(k.id)).length;
  const kanjiActive = KANJI.filter((k) => active.has(kanjiItemId(k))).length;

  return (
    <Screen>
      <ThemedText type="title" style={{ color: theme.accent }}>
        日本語
      </ThemedText>
      <ThemedText>Dein Begleiter zum Japanischunterricht.</ThemedText>

      <PracticeCard
        title="Schriftzeichen lesen"
        href="/uebung/kana"
        emptyHint="Wähle in den Einstellungen die Zeichen aus, die du gerade lernst."
        {...readDue}
      />
      {readDue.selected > 0 ? (
        <PracticeCard title="Schriftzeichen schreiben" href="/uebung/schreiben" emptyHint="" {...writeDue} />
      ) : null}

      <ThemedText type="smallBold">Dein Fortschritt</ThemedText>
      <View style={styles.statsRow}>
        <Stat label="Lernserie" value={stats ? `${stats.streak} ${stats.streak === 1 ? 'Tag' : 'Tage'}` : '–'} />
        <Stat label="Heute geübt" value={stats ? String(stats.reviewsToday) : '–'} />
        <Stat
          label="Heute richtig"
          value={stats && stats.reviewsToday > 0 ? `${Math.round((stats.correctToday / stats.reviewsToday) * 100)} %` : '–'}
        />
      </View>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small">
          Ausgewählt: {kanaActive} von {ALL_KANA.length} Kana, {kanjiActive} von {KANJI.length} Kanji
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Insgesamt {stats?.totalReviews ?? 0} Antworten gegeben
        </ThemedText>
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, borderRadius: Spacing.three, padding: Spacing.three, alignItems: 'center', gap: Spacing.one },
  statValue: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
});

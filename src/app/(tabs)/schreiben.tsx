import { PracticeCard } from '@/components/practice-card';
import { Screen } from '@/components/screen';
import { SelectedChars } from '@/components/selected-chars';
import { ThemedText } from '@/components/themed-text';
import { useKanaDue } from '@/hooks/use-kana-due';
import { KANA_WRITE_MODE } from '@/learn/kana-quiz';

/** Schriftzeichen schreiben: Abfrage aus dem Kopf und freies Nachzeichnen der gewählten Zeichen. */
export default function WritingScreen() {
  const due = useKanaDue(KANA_WRITE_MODE);
  return (
    <Screen>
      <PracticeCard
        title="Aus dem Kopf schreiben"
        href="/uebung/schreiben"
        emptyHint="Wähle in den Einstellungen Hiragana oder Katakana aus, dann kannst du sie hier schreiben."
        {...due}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Tippe ein Zeichen an, um es nachzuzeichnen.
      </ThemedText>
      <SelectedChars title="Nachzeichnen" mode="nachzeichnen" />
    </Screen>
  );
}

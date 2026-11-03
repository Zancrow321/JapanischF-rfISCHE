import { PracticeCard } from '@/components/practice-card';
import { Screen } from '@/components/screen';
import { SelectedChars } from '@/components/selected-chars';
import { ThemedText } from '@/components/themed-text';
import { useKanaDue } from '@/hooks/use-kana-due';

/** Schriftzeichen lesen lernen: nur die in den Einstellungen gewählten Zeichen. */
export default function CharactersScreen() {
  const due = useKanaDue();
  return (
    <Screen>
      <PracticeCard
        title="Lesen üben"
        href="/uebung/kana"
        emptyHint="Wähle in den Einstellungen Hiragana oder Katakana aus, dann kannst du sie hier üben."
        {...due}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Die Abfrage für Kanji kommt mit der Kanji-Etappe. Tippe ein Zeichen an, um Lesung,
        Aussprache und Strichreihenfolge zu sehen.
      </ThemedText>
      <SelectedChars title="Deine Schriftzeichen" />
    </Screen>
  );
}

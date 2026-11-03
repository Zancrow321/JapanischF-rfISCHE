import { PracticeCard } from '@/components/practice-card';
import { Screen } from '@/components/screen';
import { SelectedChars } from '@/components/selected-chars';
import { ThemedText } from '@/components/themed-text';
import { useKanaDue, useKanjiDue } from '@/hooks/use-kana-due';
import { KANJI_MODE } from '@/learn/kanji-quiz';

/** Schriftzeichen lesen lernen: nur die in den Einstellungen gewählten Zeichen. */
export default function CharactersScreen() {
  const kana = useKanaDue();
  const kanji = useKanjiDue(KANJI_MODE);
  return (
    <Screen>
      <PracticeCard
        title="Kana lesen üben"
        href="/uebung/kana"
        emptyHint="Wähle in den Einstellungen Hiragana oder Katakana aus, dann kannst du sie hier üben."
        {...kana}
      />
      <PracticeCard
        title="Kanji üben: Bedeutung und Lesung"
        href="/uebung/kanji"
        emptyHint="Wähle in den Einstellungen Kanji aus, dann kannst du sie hier üben."
        {...kanji}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Tippe ein Zeichen an, um Lesung, Bedeutung, Aussprache, Strichreihenfolge und Beispielwörter zu sehen.
      </ThemedText>
      <SelectedChars title="Deine Schriftzeichen" />
    </Screen>
  );
}

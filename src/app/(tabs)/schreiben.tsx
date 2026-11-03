import { PracticeCard } from '@/components/practice-card';
import { Screen } from '@/components/screen';
import { SelectedChars } from '@/components/selected-chars';
import { ThemedText } from '@/components/themed-text';
import { useKanaDue, useKanjiDue } from '@/hooks/use-kana-due';
import { KANA_WRITE_MODE } from '@/learn/kana-quiz';
import { KANJI_WRITE_MODE } from '@/learn/kanji-quiz';

/** Schriftzeichen schreiben: Abfrage aus dem Kopf und freies Nachzeichnen der gewählten Zeichen. */
export default function WritingScreen() {
  const kana = useKanaDue(KANA_WRITE_MODE);
  const kanji = useKanjiDue(KANJI_WRITE_MODE);
  return (
    <Screen>
      <PracticeCard
        title="Kana aus dem Kopf schreiben"
        href="/uebung/schreiben"
        emptyHint="Wähle in den Einstellungen Hiragana oder Katakana aus, dann kannst du sie hier schreiben."
        {...kana}
      />
      <PracticeCard
        title="Kanji aus dem Kopf schreiben"
        href={{ pathname: '/uebung/schreiben', params: { art: 'kanji' } }}
        emptyHint="Wähle in den Einstellungen Kanji aus, dann kannst du sie hier schreiben."
        {...kanji}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Tippe ein Zeichen an, um es nachzuzeichnen.
      </ThemedText>
      <SelectedChars title="Nachzeichnen" mode="nachzeichnen" />
    </Screen>
  );
}

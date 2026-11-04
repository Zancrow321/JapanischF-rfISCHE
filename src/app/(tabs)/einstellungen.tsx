import { useState } from 'react';

import { DesignPicker } from '@/components/design-picker';
import { KanaPicker } from '@/components/pickers/kana-picker';
import { KanjiPicker } from '@/components/pickers/kanji-picker';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';

type Tab = 'hiragana' | 'katakana' | 'kanji';

export default function SettingsScreen() {
  const [tab, setTab] = useState<Tab>('hiragana');
  return (
    <Screen>
      <ThemedText type="smallBold">Design</ThemedText>
      <DesignPicker />
      <ThemedText type="smallBold">Welche Schriftzeichen lernst du gerade?</ThemedText>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'hiragana', label: 'Hiragana' },
          { value: 'katakana', label: 'Katakana' },
          { value: 'kanji', label: 'Kanji' },
        ]}
      />
      {tab === 'kanji' ? <KanjiPicker /> : <KanaPicker script={tab} />}
    </Screen>
  );
}

import { router } from 'expo-router';
import { useState } from 'react';

import { CharTile } from '@/components/char-tile';
import { GroupSection } from '@/components/group-section';
import { PracticeCard } from '@/components/practice-card';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { CATEGORY_LABELS, kanaGroupsFor, type KanaCategory, type KanaScript } from '@/data/kana';
import { useKanaDue } from '@/hooks/use-kana-due';
import { KANA_WRITE_MODE } from '@/learn/kana-quiz';
import { charHref } from '@/data/lookup';
import { useSelection } from '@/hooks/use-selection';

const CATEGORIES: KanaCategory[] = ['basis', 'dakuten', 'yoon', 'erweitert'];

export default function KanaScreen() {
  const [script, setScript] = useState<KanaScript>('hiragana');
  const { active, toggle, setMany } = useSelection();
  const groups = kanaGroupsFor(script);
  const kanaDue = useKanaDue();
  const writeDue = useKanaDue(KANA_WRITE_MODE);

  return (
    <Screen>
      <PracticeCard
        title="Lesen üben"
        href="/uebung/kana"
        emptyHint="Markiere unten Zeichen, dann kannst du sie hier üben."
        {...kanaDue}
      />
      {kanaDue.selected > 0 ? (
        <PracticeCard title="Schreiben üben" href="/uebung/schreiben" emptyHint="" {...writeDue} />
      ) : null}
      <Segmented
        value={script}
        onChange={setScript}
        options={[
          { value: 'hiragana', label: 'Hiragana' },
          { value: 'katakana', label: 'Katakana' },
        ]}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Tippe Zeichen an, die du gerade lernst. Nur markierte Zeichen werden abgefragt. Lange drücken zeigt Strichreihenfolge und Schreibübung.
      </ThemedText>

      {CATEGORIES.map((category) => {
        const inCategory = groups.filter((g) => g.category === category);
        if (inCategory.length === 0) return null;
        return [
          <ThemedText key={category} type="subtitle" style={{ fontSize: 22, lineHeight: 30 }}>
            {CATEGORY_LABELS[category]}
          </ThemedText>,
          ...inCategory.map((group) => {
            const ids = group.items.map((k) => k.id);
            return (
              <GroupSection
                key={group.id}
                title={group.label}
                total={ids.length}
                activeCount={ids.filter((id) => active.has(id)).length}
                onToggleAll={(on) => setMany(ids, on)}>
                {group.items.map((k) => (
                  <CharTile
                    key={k.id}
                    char={k.char}
                    caption={k.romaji[0]}
                    active={active.has(k.id)}
                    onPress={() => toggle(k.id)}
                    onLongPress={() => router.push(charHref(k.char))}
                  />
                ))}
              </GroupSection>
            );
          }),
        ];
      })}
    </Screen>
  );
}

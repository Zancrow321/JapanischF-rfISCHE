import { router } from 'expo-router';

import { CharTile } from '@/components/char-tile';
import { GroupSection } from '@/components/group-section';
import { ThemedText } from '@/components/themed-text';
import { CATEGORY_LABELS, kanaGroupsFor, type KanaCategory, type KanaScript } from '@/data/kana';
import { charHref } from '@/data/lookup';
import { useSelection } from '@/hooks/use-selection';

const CATEGORIES: KanaCategory[] = ['basis', 'dakuten', 'yoon', 'erweitert'];

/** Auswahl der Hiragana oder Katakana, die gelernt werden. */
export function KanaPicker({ script }: { script: KanaScript }) {
  const { active, toggle, setMany } = useSelection();
  const groups = kanaGroupsFor(script);

  return (
    <>
      <ThemedText type="small" themeColor="textSecondary">
        Tippe die Zeichen an, die du gerade lernst. Nur markierte Zeichen kommen in „Schriftzeichen“ und „Schreiben“ dran.
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
    </>
  );
}

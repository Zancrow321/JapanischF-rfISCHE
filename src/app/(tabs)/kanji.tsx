import { useState } from 'react';
import { Pressable } from 'react-native';

import { CharTile } from '@/components/char-tile';
import { GroupSection } from '@/components/group-section';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { displayReading, KANJI, kanjiGroupsByGrade, kanjiItemId } from '@/data/kanji';
import { useSelection } from '@/hooks/use-selection';

/** Große Gruppen erst auf Wunsch ganz anzeigen, damit der Bildschirm schnell bleibt. */
const PREVIEW = 40;

export default function KanjiScreen() {
  const { active, toggle, setMany } = useSelection();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (KANJI.length === 0) {
    return (
      <Screen>
        <ThemedText>
          Die Kanji-Daten sind noch nicht erzeugt. Sie werden mit „npm run data“ aus KANJIDIC2 und
          KanjiVG gebaut.
        </ThemedText>
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText type="small" themeColor="textSecondary">
        Alle {KANJI.length} Jōyō-Kanji, sortiert nach Schuljahr und Häufigkeit. Tippe an, was du
        gerade lernst.
      </ThemedText>
      {kanjiGroupsByGrade().map((group) => {
        const ids = group.items.map(kanjiItemId);
        const isOpen = expanded.has(group.id);
        const shown = isOpen ? group.items : group.items.slice(0, PREVIEW);
        return (
          <GroupSection
            key={group.id}
            title={group.label}
            total={ids.length}
            activeCount={ids.filter((id) => active.has(id)).length}
            onToggleAll={(on) => setMany(ids, on)}>
            {shown.map((k) => (
              <CharTile
                key={k.c}
                char={k.c}
                caption={displayReading(k.kun[0] ?? k.on[0] ?? '').slice(0, 6)}
                active={active.has(kanjiItemId(k))}
                onPress={() => toggle(kanjiItemId(k))}
              />
            ))}
            {!isOpen && group.items.length > PREVIEW ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpanded((s) => new Set(s).add(group.id))}>
                <ThemedText type="linkPrimary">
                  Alle {group.items.length} anzeigen
                </ThemedText>
              </Pressable>
            ) : null}
          </GroupSection>
        );
      })}
    </Screen>
  );
}

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { ALL_KANA } from '@/data/kana';
import { KANJI, kanjiItemId } from '@/data/kanji';
import { getCards } from '@/db/reviews';
import { countDue, KANA_MODE } from '@/learn/kana-quiz';
import type { StoredCard } from '@/learn/srs';

import { useSelection } from './use-selection';

const KANJI_ITEMS = KANJI.map((k) => ({ id: kanjiItemId(k) }));

/** Wie viele ausgewählte Kana heute dran sind; wird bei jedem Öffnen des Bildschirms neu geladen. */
export function useKanaDue(mode: string = KANA_MODE) {
  return useDue(mode, ALL_KANA);
}

/** Wie viele ausgewählte Kanji heute dran sind. */
export function useKanjiDue(mode: string) {
  return useDue(mode, KANJI_ITEMS);
}

function useDue(mode: string, items: { id: string }[]) {
  const db = useSQLiteContext();
  const { active } = useSelection();
  const [loadedCards, setLoadedCards] = useState<{ cards: Map<string, StoredCard>; at: number }>({
    cards: new Map(),
    at: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getCards(db, mode).then((c) => {
        if (!cancelled) setLoadedCards({ cards: c, at: Date.now() });
      });
      return () => {
        cancelled = true;
      };
    }, [db, mode]),
  );

  return useMemo(() => {
    const activeItems = items.filter((k) => active.has(k.id));
    return { selected: activeItems.length, ...countDue(activeItems, loadedCards.cards, loadedCards.at) };
  }, [active, items, loadedCards]);
}

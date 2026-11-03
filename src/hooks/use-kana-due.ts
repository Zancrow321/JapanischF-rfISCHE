import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { ALL_KANA } from '@/data/kana';
import { getCards } from '@/db/reviews';
import { countDue, KANA_MODE } from '@/learn/kana-quiz';
import type { StoredCard } from '@/learn/srs';

import { useSelection } from './use-selection';

/** Wie viele ausgewählte Kana heute dran sind; wird bei jedem Öffnen des Bildschirms neu geladen. */
export function useKanaDue(mode: string = KANA_MODE) {
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
    const activeKana = ALL_KANA.filter((k) => active.has(k.id));
    return { selected: activeKana.length, ...countDue(activeKana, loadedCards.cards, loadedCards.at) };
  }, [active, loadedCards]);
}

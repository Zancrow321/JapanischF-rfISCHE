import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';

import { getCards } from '@/db/reviews';
import { getLists, getWords, vocabItemId, vocabListItemId, type Vocab, type VocabList } from '@/db/vocab';
import { countDue } from '@/learn/kana-quiz';
import type { StoredCard } from '@/learn/srs';
import { VOCAB_DE_JA, VOCAB_JA_DE } from '@/learn/vocab-quiz';

import { useSelection } from './use-selection';

type Loaded = {
  lists: VocabList[];
  words: Vocab[];
  cards: Record<string, Map<string, StoredCard>>;
  at: number;
};

/** Listen, Wörter der aktiven Listen und fällige Karten; wird bei jedem Öffnen neu geladen. */
export function useVocabOverview() {
  const db = useSQLiteContext();
  const { active } = useSelection();
  const [data, setData] = useState<Loaded>({ lists: [], words: [], cards: {}, at: 0 });
  const [version, setVersion] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const lists = await getLists(db);
        const words = await getWords(db, lists.map((l) => l.id));
        const cards = {
          [VOCAB_DE_JA]: await getCards(db, VOCAB_DE_JA),
          [VOCAB_JA_DE]: await getCards(db, VOCAB_JA_DE),
        };
        if (!cancelled) setData({ lists, words, cards, at: Date.now() });
      })();
      return () => {
        cancelled = true;
      };
      // version: nach Änderungen neu laden
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, version]),
  );

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return useMemo(() => {
    const activeWords = data.words
      .filter((w) => active.has(vocabListItemId(w.list_id)))
      .map((w) => ({ ...w, id: vocabItemId(w.id) }));
    const due = (mode: string) => ({
      selected: activeWords.length,
      ...countDue(activeWords, data.cards[mode] ?? new Map(), data.at),
    });
    return { lists: data.lists, deJa: due(VOCAB_DE_JA), jaDe: due(VOCAB_JA_DE), reload };
  }, [active, data, reload]);
}

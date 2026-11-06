import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { getStats, type LearningStats } from '@/db/stats';

/** Lernstatistik, neu geladen bei jedem Öffnen des Bildschirms. */
export function useStats(): LearningStats | null {
  const db = useSQLiteContext();
  const [stats, setStats] = useState<LearningStats | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getStats(db, Date.now()).then((s) => {
        if (!cancelled) setStats(s);
      });
      return () => {
        cancelled = true;
      };
    }, [db]),
  );
  return stats;
}

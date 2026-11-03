import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { getSetting, setSetting } from '@/db/settings';
import { DEFAULT_VOCAB_SCRIPT, isVocabScript, type VocabScript } from '@/vocab/script';

const KEY = 'vocab_script';

/** Gewählte Schrift für Vokabeln; gespeichert, damit sie beim nächsten Öffnen gleich bleibt. */
export function useVocabScript(): [VocabScript, (s: VocabScript) => void] {
  const db = useSQLiteContext();
  const [script, setScript] = useState<VocabScript>(DEFAULT_VOCAB_SCRIPT);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getSetting(db, KEY).then((v) => {
        if (!cancelled && isVocabScript(v)) setScript(v);
      });
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  const change = useCallback(
    (s: VocabScript) => {
      setScript(s);
      setSetting(db, KEY, s);
    },
    [db],
  );
  return [script, change];
}

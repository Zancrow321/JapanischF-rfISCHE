import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { getActiveItemIds, setItemsActive } from '@/db/selection';

type SelectionContextValue = {
  /** IDs aller ausgewählten Lerninhalte */
  active: Set<string>;
  loaded: boolean;
  toggle: (id: string) => Promise<void>;
  setMany: (ids: string[], on: boolean) => Promise<void>;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

/** Hält die Auswahl für alle Bildschirme gemeinsam, gespeichert in der Datenbank. */
export function SelectionProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [active, setActive] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getActiveItemIds(db).then((ids) => {
      if (!cancelled) {
        setActive(ids);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const setMany = useCallback(
    async (ids: string[], on: boolean) => {
      // Sofort anzeigen, danach speichern.
      setActive((prev) => {
        const next = new Set(prev);
        for (const id of ids) {
          if (on) next.add(id);
          else next.delete(id);
        }
        return next;
      });
      await setItemsActive(db, ids, on);
    },
    [db],
  );

  const toggle = useCallback((id: string) => setMany([id], !active.has(id)), [active, setMany]);

  const value = useMemo(() => ({ active, loaded, toggle, setMany }), [active, loaded, toggle, setMany]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection braucht einen SelectionProvider');
  return ctx;
}

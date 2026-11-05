import { DotGothic16_400Regular, useFonts } from '@expo-google-fonts/dotgothic16';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  Colors,
  DEFAULT_DESIGN,
  DESIGN_EXTRAS,
  isDesignId,
  type DesignExtras,
  type DesignId,
  type Palette,
} from '@/constants/theme';
import { getSetting, setSetting } from '@/db/settings';

export type Theme = Palette & DesignExtras;

const KEY = 'design';

/** Fertiges Theme für ein Design; die Schrift nur, wenn sie geladen ist. */
export function themeFor(id: DesignId, fontReady = true): Theme {
  const extras = DESIGN_EXTRAS[id];
  return { ...Colors[id], ...extras, font: fontReady ? extras.font : undefined };
}

type DesignState = { theme: Theme; design: DesignId; setDesign: (d: DesignId) => void; fontReady: boolean };

const DesignContext = createContext<DesignState>({
  theme: themeFor(DEFAULT_DESIGN),
  design: DEFAULT_DESIGN,
  setDesign: () => {},
  fontReady: false,
});

/** Lädt das gewählte Design aus der Datenbank; ohne Wahl gilt „Dunkel“. */
export function DesignProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [design, setState] = useState<DesignId>(DEFAULT_DESIGN);
  const [fontReady] = useFonts({ DotGothic16_400Regular });

  useEffect(() => {
    let cancelled = false;
    getSetting(db, KEY).then((v) => {
      if (!cancelled && isDesignId(v)) setState(v);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const setDesign = useCallback(
    (d: DesignId) => {
      setState(d);
      setSetting(db, KEY, d);
    },
    [db],
  );

  const value = useMemo(
    () => ({ theme: themeFor(design, fontReady), design, setDesign, fontReady }),
    [design, fontReady, setDesign],
  );
  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export const useDesign = () => useContext(DesignContext);

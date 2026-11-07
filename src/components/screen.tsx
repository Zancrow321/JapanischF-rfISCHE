import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Einrasten des Zeichenfelds: Ein Tipp ins Feld sperrt das Scrollen des Bildschirms, damit man beim
 * Zeichnen nicht versehentlich verrutscht. Ein Tipp irgendwo außerhalb des Feldes löst die Sperre.
 * Der Zustand liegt hier im Bildschirm, damit er erhalten bleibt, wenn das Feld für das nächste
 * Zeichen eines Wortes neu aufgebaut wird.
 */
type ScrollLock = {
  /** Ist das Zeichenfeld gerade eingerastet? */
  locked: boolean;
  /** Feld einrasten (Scrollen aus). */
  lock: () => void;
  /** Vom Zeichenfeld bei jeder Berührung aufzurufen, damit sie nicht als „außerhalb“ zählt. */
  markInside: () => void;
  /** Ein Zeichenfeld meldet sich an; die Rückgabe meldet es wieder ab. */
  register: () => () => void;
};

const ScrollLockContext = createContext<ScrollLock>({
  locked: false,
  lock: () => {},
  markInside: () => {},
  register: () => () => {},
});

export const useScrollLock = () => useContext(ScrollLockContext);

/** Berührungsbeginn: am Handy Touch, im Browser Zeiger (Maus, Stift, Finger). */
const touchStartProp = Platform.OS === 'web' ? 'onPointerDown' : 'onTouchStart';

/** Scrollbarer Bildschirm mit begrenzter Breite, damit es auch am PC gut aussieht. */
export function Screen({ children }: PropsWithChildren) {
  const theme = useTheme();
  const [locked, setLocked] = useState(false);
  const inside = useRef(false);
  const pads = useRef(0);

  const lock = useCallback(() => setLocked(true), []);
  const markInside = useCallback(() => {
    inside.current = true;
  }, []);
  const register = useCallback(() => {
    pads.current += 1;
    return () => {
      pads.current -= 1;
      // Wird das Feld nur für das nächste Zeichen neu aufgebaut, meldet sich gleich ein neues an.
      // Verschwindet es ganz, darf die Seite nicht gesperrt bleiben.
      setTimeout(() => {
        if (pads.current === 0) setLocked(false);
      }, 0);
    };
  }, []);

  // Berührungen im Zeichenfeld kommen hier nach dem Feld an (die Ereignisse steigen nach oben auf),
  // deshalb ist die Markierung schon gesetzt. Alles andere zählt als Tipp außerhalb.
  const onStart = useCallback(() => {
    if (inside.current) inside.current = false;
    else setLocked(false);
  }, []);

  const value = useMemo(() => ({ locked, lock, markInside, register }), [locked, lock, markInside, register]);

  return (
    <ScrollLockContext.Provider value={value}>
      <View style={styles.root} {...{ [touchStartProp]: onStart }}>
        <ScrollView
          scrollEnabled={!locked}
          // Die Tastatur verdeckt keine Eingabefelder: auf dem iPhone rückt die Seite selbst nach oben,
          // auf Android verkleinert sich das Fenster (Standard bei Expo).
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={styles.outer}>
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      </View>
    </ScrollLockContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  outer: { alignItems: 'center', padding: Spacing.three, paddingBottom: Spacing.six },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
});

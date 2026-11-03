import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Erlaubt Kindern wie dem Zeichenfeld, das Scrollen des Bildschirms kurz anzuhalten.
 * Auf iPhone und Android scrollt die ScrollView sonst nativ mit, während man zeichnet.
 */
const ScrollLockContext = createContext<(locked: boolean) => void>(() => {});

export const useScrollLock = () => useContext(ScrollLockContext);

/** Scrollbarer Bildschirm mit begrenzter Breite, damit es auch am PC gut aussieht. */
export function Screen({ children }: PropsWithChildren) {
  const theme = useTheme();
  const [locked, setLocked] = useState(false);
  return (
    <ScrollLockContext.Provider value={setLocked}>
      <ScrollView
        scrollEnabled={!locked}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.outer}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </ScrollLockContext.Provider>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: 'center', padding: Spacing.three, paddingBottom: Spacing.six },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
});

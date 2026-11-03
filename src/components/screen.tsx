import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Scrollbarer Bildschirm mit begrenzter Breite, damit es auch am PC gut aussieht. */
export function Screen({ children }: PropsWithChildren) {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.outer}>
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: 'center', padding: Spacing.three, paddingBottom: Spacing.six },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
});

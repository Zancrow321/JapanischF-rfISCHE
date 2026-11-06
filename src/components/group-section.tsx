import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = PropsWithChildren<{
  title: string;
  activeCount: number;
  total: number;
  onToggleAll: (on: boolean) => void;
}>;

/** Überschrift einer Zeichengruppe mit Schalter für die ganze Gruppe. */
export function GroupSection({ title, activeCount, total, onToggleAll, children }: Props) {
  const theme = useTheme();
  const allOn = activeCount === total;
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {activeCount}/{total}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => onToggleAll(!allOn)}
          style={({ pressed }) => [styles.button, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}>
          <ThemedText type="small">{allOn ? 'Alle abwählen' : 'Alle lernen'}</ThemedText>
        </Pressable>
      </View>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1 },
  button: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});

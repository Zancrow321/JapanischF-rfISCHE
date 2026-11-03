import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ProgressBar({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.progress, { backgroundColor: theme.backgroundElement }]}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: '100%', backgroundColor: theme.accent }} />
    </View>
  );
}

export function ChoiceButton({
  label,
  large,
  state,
  disabled,
  onPress,
}: {
  label: string;
  large: boolean;
  state: 'idle' | 'right' | 'wrong';
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const borderColor = state === 'right' ? theme.success : state === 'wrong' ? theme.accent : theme.border;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { borderColor, backgroundColor: theme.background, opacity: pressed ? 0.7 : 1 },
      ]}>
      <ThemedText style={large ? styles.choiceCharText : styles.choiceText}>{label}</ThemedText>
    </Pressable>
  );
}

export const quizStyles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  input: {
    flex: 1,
    // Ohne minWidth nimmt das Feld im Browser seine Standardbreite und schiebt den Knopf hinaus.
    minWidth: 0,
    borderWidth: 2,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 22,
  },
});

const styles = StyleSheet.create({
  progress: { height: 6, borderRadius: 3, overflow: 'hidden' },
  choice: {
    flexGrow: 1,
    flexBasis: '45%',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  choiceText: { fontSize: 22, lineHeight: 30, textAlign: 'center' },
  choiceCharText: { fontSize: 40, lineHeight: 52 },
});

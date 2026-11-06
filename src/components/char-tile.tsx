import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  char: string;
  caption?: string;
  active: boolean;
  onPress: () => void;
  /** Langes Drücken öffnet die Zeichenseite */
  onLongPress?: () => void;
};

/** Ein Schriftzeichen zum Antippen: markiert = wird gelernt. */
export function CharTile({ char, caption, active, onPress, onLongPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      role="checkbox"
      aria-checked={active}
      aria-label={caption ? `${char} ${caption}` : char}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.tile,
        {
          // Im Retro-Design sind Fenster und Markierung beide blau, daher dort ein helleres Blau.
          backgroundColor: active ? (theme.id === 'retro' ? theme.backgroundSelected : theme.accentSoft) : theme.backgroundElement,
          borderColor: active ? theme.accent : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Text style={[styles.char, { color: theme.text }]}>{char}</Text>
      {caption ? (
        <Text style={[styles.caption, { color: theme.textSecondary }]}>{caption}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 64,
    height: 72,
    borderRadius: Spacing.two,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  char: { fontSize: 28, lineHeight: 34 },
  caption: { fontSize: 12, lineHeight: 16 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DESIGN_IDS, DESIGN_LABELS, Spacing, type DesignId } from '@/constants/theme';
import { themeFor, useDesign } from '@/hooks/use-design';
import { windowStyle } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/** Kacheln mit kleiner Vorschau; ein Tipp stellt die ganze App auf das Design um. */
export function DesignPicker() {
  const { design, setDesign, fontReady, theme: current } = useDesign();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" aria-label="Design">
      {DESIGN_IDS.map((id) => (
        <Tile
          key={id}
          id={id}
          selected={id === design}
          fontReady={fontReady}
          ringColor={current.accent}
          onPress={() => setDesign(id)}
        />
      ))}
    </View>
  );
}

function Tile({
  id,
  selected,
  fontReady,
  ringColor,
  onPress,
}: {
  id: DesignId;
  selected: boolean;
  fontReady: boolean;
  ringColor: string;
  onPress: () => void;
}) {
  const t = themeFor(id, fontReady);
  const font = t.font ? { fontFamily: t.font, fontWeight: 'normal' as const } : null;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      aria-label={`Design ${DESIGN_LABELS[id]}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { borderColor: selected ? ringColor : 'transparent', opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={[styles.preview, { backgroundColor: t.background }]}>
        <View style={[styles.window, windowStyle(t, t.backgroundElement)]}>
          <Text style={[styles.glyph, { color: t.accent }, font]}>日本語</Text>
          <View style={[styles.bar, { backgroundColor: t.accent }]} />
        </View>
      </View>
      <ThemedText type={selected ? 'smallBold' : 'small'} style={styles.label}>
        {DESIGN_LABELS[id]}
        {id === 'dunkel' ? ' (Standard)' : ''}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  tile: { flex: 1, borderWidth: 2, borderRadius: Spacing.three, padding: Spacing.one, gap: Spacing.one },
  preview: { borderRadius: Spacing.two, padding: Spacing.two, height: 84, justifyContent: 'center' },
  window: { borderRadius: Spacing.two, padding: Spacing.two, gap: Spacing.one, alignItems: 'center' },
  glyph: { fontSize: 18, lineHeight: 24, fontWeight: 700 },
  bar: { height: 6, alignSelf: 'stretch', borderRadius: 3 },
  label: { textAlign: 'center' },
});

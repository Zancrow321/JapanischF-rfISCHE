import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  selected: number;
  due: number;
  fresh: number;
  href: Href;
  emptyHint: string;
};

/** Karte mit „Heute fällig“ und Knopf zum Üben. */
export function PracticeCard({ title, selected, due, fresh, href, emptyHint }: Props) {
  const theme = useTheme();
  const todo = due + fresh;
  return (
    <View style={[styles.card, { backgroundColor: theme.accentSoft }]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {selected === 0 ? (
        <ThemedText type="small">{emptyHint}</ThemedText>
      ) : (
        <>
          <ThemedText>
            Heute fällig: {due} zum Wiederholen, {fresh} neu
          </ThemedText>
          <Button
            label={todo > 0 ? 'Jetzt üben' : 'Zusatzrunde üben'}
            onPress={() => router.push(href)}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
});

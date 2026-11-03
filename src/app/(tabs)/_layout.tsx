import { Tabs } from 'expo-router/js-tabs';
import { Text, type ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Tab-Symbole sind passende Schriftzeichen, dafür braucht es keine Bilddateien. */
function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Start', tabBarIcon: ({ color }) => <TabIcon glyph="家" color={color} /> }}
      />
      <Tabs.Screen
        name="kana"
        options={{ title: 'Kana', tabBarIcon: ({ color }) => <TabIcon glyph="あ" color={color} /> }}
      />
      <Tabs.Screen
        name="kanji"
        options={{ title: 'Kanji', tabBarIcon: ({ color }) => <TabIcon glyph="漢" color={color} /> }}
      />
      <Tabs.Screen
        name="vocab"
        options={{ title: 'Vokabeln', tabBarIcon: ({ color }) => <TabIcon glyph="語" color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Fortschritt', tabBarIcon: ({ color }) => <TabIcon glyph="進" color={color} /> }}
      />
    </Tabs>
  );
}

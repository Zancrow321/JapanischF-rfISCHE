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
        tabBarLabelStyle: { fontSize: 10, lineHeight: 14, ...(theme.font ? { fontFamily: theme.font } : null) },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: theme.font ? { fontFamily: theme.font, fontWeight: 'normal' } : undefined,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Start', tabBarIcon: ({ color }) => <TabIcon glyph="家" color={color} /> }}
      />
      <Tabs.Screen
        name="vocab"
        options={{ title: 'Vokabeln', tabBarIcon: ({ color }) => <TabIcon glyph="語" color={color} /> }}
      />
      <Tabs.Screen
        name="zeichen"
        options={{ title: 'Schriftzeichen', tabBarLabel: 'Zeichen', tabBarIcon: ({ color }) => <TabIcon glyph="字" color={color} /> }}
      />
      <Tabs.Screen
        name="schreiben"
        options={{ title: 'Schreiben', tabBarIcon: ({ color }) => <TabIcon glyph="書" color={color} /> }}
      />
      <Tabs.Screen
        name="einstellungen"
        options={{ title: 'Einstellungen', tabBarIcon: ({ color }) => <TabIcon glyph="⚙" color={color} /> }}
      />
    </Tabs>
  );
}

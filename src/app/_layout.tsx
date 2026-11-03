import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { DatabaseProvider } from '@/db/database-provider';
import { SelectionProvider } from '@/hooks/use-selection';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DatabaseProvider>
        <SelectionProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SelectionProvider>
      </DatabaseProvider>
    </ThemeProvider>
  );
}

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
          {/*
            Die Kopfzeile der Unterseiten steht schon hier fest und nicht erst in der Seite selbst.
            Sonst legt das iPhone die Seite zuerst ohne Kopfzeile an, und die Kopfzeile verdeckt
            danach den oberen Rand (z. B. die Eingabefelder in einer Vokabelliste).
          */}
          <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Zurück' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </SelectionProvider>
      </DatabaseProvider>
    </ThemeProvider>
  );
}

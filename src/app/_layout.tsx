import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DatabaseProvider } from '@/db/database-provider';
import { DesignProvider } from '@/hooks/use-design';
import { SelectionProvider } from '@/hooks/use-selection';
import { useTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <DesignProvider>
        <SelectionProvider>
          <ThemedNavigation />
        </SelectionProvider>
      </DesignProvider>
    </DatabaseProvider>
  );
}

/** Kopfzeilen, Hintergründe und Statusleiste in den Farben des gewählten Designs. */
function ThemedNavigation() {
  const theme = useTheme();
  const base = theme.dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.accent,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.border,
    },
  };
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {/*
        Die Kopfzeile der Unterseiten steht schon hier fest und nicht erst in der Seite selbst.
        Sonst legt das iPhone die Seite zuerst ohne Kopfzeile an, und die Kopfzeile verdeckt
        danach den oberen Rand (z. B. die Eingabefelder in einer Vokabelliste).
      */}
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackTitle: 'Zurück',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: theme.font ? { fontFamily: theme.font, fontWeight: 'normal' } : undefined,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

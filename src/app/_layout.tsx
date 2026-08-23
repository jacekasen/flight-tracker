import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { palette } from '@/constants/theme';
import { AuthProvider } from '@/providers/auth-provider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: palette.background },
            headerStyle: { backgroundColor: palette.background },
            headerTintColor: palette.text,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="confirm" options={{ title: 'Confirm flight' }} />
          <Stack.Screen name="manual" options={{ title: 'Manual entry' }} />
          <Stack.Screen name="flight/[id]" options={{ title: 'Flight details' }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}

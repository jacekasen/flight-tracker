import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { palette, type } from '@/constants/theme';
import { AuthProvider } from '@/providers/auth-provider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider
        value={{
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: palette.background,
            border: palette.border,
            card: palette.surface,
            notification: palette.danger,
            primary: palette.accent,
            text: palette.text,
          },
        }}
      >
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: palette.background },
            gestureDirection: 'horizontal',
            gestureEnabled: true,
            headerStyle: { backgroundColor: palette.background },
            headerTintColor: palette.text,
            headerTitleStyle: { fontSize: type.bodyStrong.fontSize, fontWeight: '800' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="confirm" options={{ title: 'Confirm flight' }} />
          <Stack.Screen name="manual" options={{ title: 'Manual entry' }} />
          <Stack.Screen
            name="flight/[id]"
            options={{ headerBackButtonDisplayMode: 'minimal', title: 'Flight details' }}
          />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}

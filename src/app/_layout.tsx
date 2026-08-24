import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
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
            gestureDirection: 'horizontal',
            gestureEnabled: true,
            headerStyle: { backgroundColor: palette.background },
            headerTintColor: palette.text,
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

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { palette, type } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="light" />
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
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
        <Stack.Protected guard={!session}>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="confirm" options={{ title: 'Confirm flight' }} />
          <Stack.Screen name="manual" options={{ title: 'Manual entry' }} />
          <Stack.Screen
            name="flight/[id]"
            options={{ headerBackButtonDisplayMode: 'minimal', title: 'Flight details' }}
          />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: palette.background,
    flex: 1,
    justifyContent: 'center',
  },
});

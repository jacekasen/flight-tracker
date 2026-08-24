import { Stack } from 'expo-router';

import { palette } from '@/constants/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function ProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: palette.background },
        gestureDirection: 'horizontal',
        gestureEnabled: true,
        headerShown: false,
      }}
    />
  );
}

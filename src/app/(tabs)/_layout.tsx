import { Tabs } from 'expo-router';
import { Text, View, type ColorValue } from 'react-native';

import { palette } from '@/constants/theme';

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 20 }}>{symbol}</Text>;
}

function ProfileIcon({ color }: { color: ColorValue }) {
  return (
    <View style={{ alignItems: 'center', height: 20, justifyContent: 'center', width: 20 }}>
      <View
        style={{
          borderColor: color,
          borderRadius: 5,
          borderWidth: 1.8,
          height: 9,
          width: 9,
        }}
      />
      <View
        style={{
          borderColor: color,
          borderRadius: 9,
          borderWidth: 1.8,
          height: 8,
          marginTop: 2,
          width: 17,
        }}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.background },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: 86,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Flights',
          tabBarIcon: ({ color }) => <TabIcon symbol="✈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Add flight',
          tabBarIcon: ({ color }) => <TabIcon symbol="＋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

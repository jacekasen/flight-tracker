import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text } from 'react-native';

import { palette } from '@/constants/theme';

export function SymbolIcon({
  name,
  fallback,
  color = palette.accent,
  size = 17,
}: {
  name: SFSymbol;
  fallback: string;
  color?: string;
  size?: number;
}) {
  return (
    <SymbolView
      fallback={<Text style={[styles.fallback, { color, fontSize: size + 1 }]}>{fallback}</Text>}
      name={name}
      size={size}
      tintColor={color}
      weight="semibold"
    />
  );
}

const styles = StyleSheet.create({
  fallback: { fontWeight: '700', lineHeight: 20 },
});

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { layout, palette, radius, type } from '@/constants/theme';

type ActionButtonVariant = 'primary' | 'secondary' | 'danger';

export function ActionButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ActionButtonVariant;
  style?: StyleProp<ViewStyle>;
}) {
  const foreground = variant === 'primary' ? palette.background : variant === 'danger' ? palette.danger : palette.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        style,
        (pressed || disabled || loading) && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={[styles.label, { color: foreground }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: layout.controlHeight,
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: palette.accent },
  secondary: { borderColor: palette.borderStrong, borderWidth: 1 },
  danger: { backgroundColor: palette.dangerSoft, borderColor: palette.danger, borderWidth: 1 },
  label: type.button,
  pressed: { opacity: 0.62 },
});

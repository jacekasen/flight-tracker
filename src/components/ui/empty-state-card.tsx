import { Pressable, StyleSheet, Text, View } from 'react-native';

import { layout, palette, radius, spacing, type } from '@/constants/theme';

export function EmptyStateCard({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action && onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: spacing.lg,
  },
  title: { color: palette.text, ...type.title },
  body: { color: palette.muted, marginTop: spacing.sm, ...type.body },
  button: {
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: layout.controlHeight,
  },
  buttonText: { color: palette.text, ...type.bodyStrong },
  pressed: { opacity: 0.68 },
});

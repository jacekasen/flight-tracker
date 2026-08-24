import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { layout, palette, radius, spacing, type } from '@/constants/theme';

export function FormField({
  label,
  error,
  containerStyle,
  inputStyle,
  multiline,
  ...inputProps
}: TextInputProps & {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
        multiline={multiline}
        placeholderTextColor={palette.muted}
        style={[
          styles.input,
          multiline && styles.multiline,
          error && styles.inputError,
          inputStyle,
        ]}
        textAlignVertical={multiline ? 'top' : inputProps.textAlignVertical}
        {...inputProps}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { color: palette.muted, ...type.label },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.text,
    fontSize: type.button.fontSize,
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  multiline: { minHeight: 100 },
  inputError: { borderColor: palette.warning },
  error: { color: palette.warning, fontSize: 12 },
});

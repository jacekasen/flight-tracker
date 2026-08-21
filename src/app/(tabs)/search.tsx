import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, spacing } from '@/constants/theme';

export default function SearchScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>TRACK SOMETHING NEW</Text>
        <Text style={styles.title}>Add a flight</Text>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            accessibilityLabel="Flight number"
            autoCapitalize="characters"
            placeholder="Flight number, e.g. UA 120"
            placeholderTextColor={palette.muted}
            style={styles.input}
          />
        </View>
        <Text style={styles.hint}>
          Flight search is the next integration point. Supabase is ready to store saved trips.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg },
  eyebrow: { color: palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: palette.text, fontSize: 34, fontWeight: '800', marginBottom: spacing.xl },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  searchIcon: { color: palette.accent, fontSize: 24 },
  input: { flex: 1, color: palette.text, fontSize: 16, paddingVertical: 18 },
  hint: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: spacing.md },
});

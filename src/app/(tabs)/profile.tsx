import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.card}>
          <View style={[styles.statusDot, isSupabaseConfigured && styles.connected]} />
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>
              Supabase {isSupabaseConfigured ? 'configured' : 'needs credentials'}
            </Text>
            <Text style={styles.statusBody}>
              {isSupabaseConfigured
                ? 'The client is ready for authentication and flight sync.'
                : 'Copy .env.example to .env and add your project URL and publishable key.'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg },
  eyebrow: { color: palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: palette.text, fontSize: 34, fontWeight: '800', marginBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderColor: palette.border,
    borderWidth: 1,
    padding: spacing.md,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.warning, marginTop: 5 },
  connected: { backgroundColor: palette.success },
  statusCopy: { flex: 1 },
  statusTitle: { color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 5 },
  statusBody: { color: palette.muted, fontSize: 13, lineHeight: 19 },
});

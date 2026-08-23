import { useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, spacing } from '@/constants/theme';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session, isLoading: isSessionLoading } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setMessage('Enter your email and password.');
      return;
    }
    if (mode === 'signUp' && !fullName.trim()) {
      setMessage('Enter your name.');
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    const supabase = getSupabase();
    const result =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { full_name: fullName.trim() } },
          });

    setIsSubmitting(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (!result.data.session) {
      setMessage('Check your email to confirm your account, then sign in.');
      setMode('signIn');
      return;
    }
    setPassword('');
    router.replace('/');
  }

  async function signOut() {
    setIsSubmitting(true);
    const { error } = await getSupabase().auth.signOut();
    setIsSubmitting(false);
    setMessage(error?.message ?? null);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <Text style={styles.title}>Profile</Text>

          {!isSupabaseConfigured ? (
            <View style={styles.card}>
              <View style={styles.statusDot} />
              <View style={styles.statusCopy}>
                <Text style={styles.statusTitle}>Supabase needs credentials</Text>
                <Text style={styles.statusBody}>
                  Copy .env.example to .env.local and add your project URL and publishable key.
                </Text>
              </View>
            </View>
          ) : isSessionLoading ? (
            <ActivityIndicator color={palette.accent} />
          ) : session ? (
            <View style={styles.cardColumn}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(session.user.user_metadata.full_name ?? session.user.email ?? '?')
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              </View>
              <Text style={styles.accountName}>
                {session.user.user_metadata.full_name ?? 'Flight tracker'}
              </Text>
              <Text style={styles.accountEmail}>{session.user.email}</Text>
              <Text style={styles.privateCopy}>
                Your saved flights are private and protected by row-level security.
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={signOut}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>Sign out</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.modeRow}>
                {(['signIn', 'signUp'] as const).map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    key={item}
                    onPress={() => {
                      setMode(item);
                      setMessage(null);
                    }}
                    style={[styles.modeButton, mode === item && styles.modeButtonActive]}
                  >
                    <Text style={[styles.modeText, mode === item && styles.modeTextActive]}>
                      {item === 'signIn' ? 'Sign in' : 'Create account'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {mode === 'signUp' && (
                <TextInput
                  accessibilityLabel="Full name"
                  autoComplete="name"
                  onChangeText={setFullName}
                  placeholder="Full name"
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={fullName}
                />
              )}
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={palette.muted}
                style={styles.input}
                value={email}
              />
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                onChangeText={setPassword}
                onSubmitEditing={submit}
                placeholder="Password"
                placeholderTextColor={palette.muted}
                secureTextEntry
                style={styles.input}
                value={password}
              />
              {message && <Text style={styles.message}>{message}</Text>}
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={submit}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed || isSubmitting) && styles.pressed,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={palette.background} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'signIn' ? 'Sign in' : 'Create account'}
                  </Text>
                )}
              </Pressable>
              <Text style={styles.privacy}>
                Sign in to save, edit, and revisit your private flight history.
              </Text>
            </View>
          )}

          {session && message && <Text style={styles.message}>{message}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg, paddingBottom: 120 },
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
  cardColumn: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.lg,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.warning, marginTop: 5 },
  statusCopy: { flex: 1 },
  statusTitle: { color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 5 },
  statusBody: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 64,
  },
  avatarText: { color: palette.accent, fontSize: 26, fontWeight: '800' },
  accountName: { color: palette.text, fontSize: 20, fontWeight: '800' },
  accountEmail: { color: palette.muted, fontSize: 14, marginTop: 4 },
  privateCopy: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginVertical: spacing.lg,
    textAlign: 'center',
  },
  form: { gap: 12 },
  modeRow: {
    backgroundColor: palette.surface,
    borderRadius: 14,
    flexDirection: 'row',
    padding: 4,
  },
  modeButton: { alignItems: 'center', borderRadius: 11, flex: 1, paddingVertical: 11 },
  modeButtonActive: { backgroundColor: palette.accentSoft },
  modeText: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  modeTextActive: { color: palette.accent },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  message: { color: palette.warning, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: { color: palette.background, fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    width: '100%',
  },
  secondaryButtonText: { color: palette.text, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.65 },
  privacy: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});

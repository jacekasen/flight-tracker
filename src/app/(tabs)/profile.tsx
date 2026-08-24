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
import { deleteAccount, exportAccountData } from '@/lib/account';
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
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

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

  async function handleExport() {
    setIsExporting(true);
    setMessage(null);
    try {
      await exportAccountData();
      setMessage('Your private flight data export is ready.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not export your data.');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setMessage(null);
    try {
      await deleteAccount();
      router.replace('/profile');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete your account.');
      setIsDeleting(false);
    }
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

          <Pressable
            accessibilityHint="Opens your flight statistics and route map"
            accessibilityRole="button"
            onPress={() => router.push('/insights')}
            style={({ pressed }) => [styles.insightsButton, pressed && styles.pressed]}
          >
            <View style={styles.insightsIcon}>
              <Text style={styles.insightsIconText}>⌁</Text>
            </View>
            <View style={styles.insightsCopy}>
              <Text style={styles.insightsTitle}>Flight insights</Text>
              <Text style={styles.insightsBody}>View your route map, totals, and yearly recaps.</Text>
            </View>
            <Text style={styles.insightsArrow}>›</Text>
          </Pressable>

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
              <View style={styles.dataControls}>
                <Text style={styles.sectionLabel}>YOUR DATA</Text>
                <Text style={styles.controlCopy}>
                  Download your profile and complete flight history as a portable JSON file.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={isExporting || isDeleting}
                  onPress={handleExport}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  {isExporting ? (
                    <ActivityIndicator color={palette.text} />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Export flight data</Text>
                  )}
                </Pressable>

                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>DANGER ZONE</Text>
                <Text style={styles.controlCopy}>
                  Deleting your account permanently removes your profile and every saved flight.
                </Text>
                {showDeleteConfirmation ? (
                  <View style={styles.confirmation}>
                    <Text style={styles.confirmationTitle}>This cannot be undone.</Text>
                    <View style={styles.confirmationActions}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isDeleting}
                        onPress={() => setShowDeleteConfirmation(false)}
                        style={({ pressed }) => [
                          styles.cancelButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isDeleting}
                        onPress={handleDeleteAccount}
                        style={({ pressed }) => [
                          styles.deleteButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        {isDeleting ? (
                          <ActivityIndicator color={palette.text} />
                        ) : (
                          <Text style={styles.deleteButtonText}>Delete permanently</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isExporting}
                    onPress={() => setShowDeleteConfirmation(true)}
                    style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.dangerButtonText}>Delete account</Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting || isExporting || isDeleting}
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
  title: { color: palette.text, fontSize: 34, fontWeight: '800', marginBottom: spacing.lg },
  insightsButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.xl,
    minHeight: 82,
    padding: spacing.md,
  },
  insightsIcon: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  insightsIconText: { color: palette.accent, fontSize: 23, fontWeight: '800' },
  insightsCopy: { flex: 1, gap: 3 },
  insightsTitle: { color: palette.text, fontSize: 16, fontWeight: '800' },
  insightsBody: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  insightsArrow: { color: palette.muted, fontSize: 28, lineHeight: 30 },
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
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  dataControls: { gap: 10, marginBottom: spacing.lg, width: '100%' },
  sectionLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  controlCopy: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  divider: { backgroundColor: palette.border, height: 1, marginVertical: spacing.sm },
  confirmation: {
    backgroundColor: palette.background,
    borderColor: palette.warning,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: spacing.md,
  },
  confirmationTitle: { color: palette.text, fontSize: 14, fontWeight: '700' },
  confirmationActions: { flexDirection: 'row', gap: 10 },
  cancelButton: {
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: palette.warning,
    borderRadius: 12,
    flex: 1.4,
    justifyContent: 'center',
    minHeight: 46,
  },
  deleteButtonText: { color: palette.background, fontSize: 13, fontWeight: '800' },
  dangerButton: {
    alignItems: 'center',
    borderColor: palette.warning,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  dangerButtonText: { color: palette.warning, fontSize: 15, fontWeight: '700' },
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

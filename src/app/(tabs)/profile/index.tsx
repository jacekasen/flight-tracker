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

import { layout, palette, radius, spacing, type } from '@/constants/theme';
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
      setMessage('Your flight data export is ready.');
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
            <View style={styles.sessionContent}>
              <View style={styles.profileHero}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(session.user.user_metadata.full_name ?? session.user.email ?? '?')
                      .slice(0, 1)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileCopy}>
                  <Text style={styles.accountName}>
                    {session.user.user_metadata.full_name ?? 'Flight tracker'}
                  </Text>
                  <Text style={styles.accountEmail}>{session.user.email}</Text>
                </View>
              </View>

              <Text style={styles.groupLabel}>TRAVEL</Text>
              <View style={styles.settingsGroup}>
                <SettingsRow
                  body="Route map, totals, and yearly recaps"
                  icon="⌁"
                  onPress={() => router.push('/profile/globe')}
                  title="Flight insights"
                />
              </View>

              <Text style={styles.groupLabel}>YOUR DATA</Text>
              <View style={styles.settingsGroup}>
                <SettingsRow
                  body="Download your complete flight history"
                  disabled={isExporting || isDeleting}
                  icon="↓"
                  loading={isExporting}
                  onPress={handleExport}
                  title="Export flight data"
                />
              </View>

              <View style={styles.settingsGroup}>
                <SettingsRow
                  disabled={isSubmitting || isExporting || isDeleting}
                  icon="↗"
                  onPress={signOut}
                  showChevron={false}
                  title="Sign out"
                />
              </View>

              <Text style={[styles.groupLabel, styles.dangerLabel]}>DANGER ZONE</Text>
              <View style={styles.dangerGroup}>
                {showDeleteConfirmation ? (
                  <View style={styles.confirmation}>
                    <Text style={styles.confirmationTitle}>Delete your account?</Text>
                    <Text style={styles.controlCopy}>
                      This permanently removes your profile and every saved flight.
                    </Text>
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
                        <Text style={styles.cancelButtonText}>Cancel</Text>
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
                          <ActivityIndicator color={palette.background} />
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
                    style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
                  >
                    <View style={[styles.rowIcon, styles.deleteIcon]}>
                      <Text style={styles.deleteIconText}>×</Text>
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.deleteRowTitle}>Delete account</Text>
                      <Text style={styles.rowBody}>Permanently remove your account and data</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                )}
              </View>
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
              <Text style={styles.accountHelper}>
                Sign in to save, edit, and revisit your flight history.
              </Text>
              <View style={styles.settingsGroup}>
                <SettingsRow
                  body="Preview route maps, totals, and yearly recaps"
                  icon="⌁"
                  onPress={() => router.push('/profile/globe')}
                  title="Flight insights"
                />
              </View>
            </View>
          )}

          {session && message && <Text style={styles.message}>{message}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SettingsRow({
  title,
  body,
  icon,
  onPress,
  disabled = false,
  loading = false,
  showChevron = true,
}: {
  title: string;
  body?: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  showChevron?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {body && <Text style={styles.rowBody}>{body}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator color={palette.accent} size="small" />
      ) : showChevron ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: {
    paddingBottom: layout.pageBottomPadding,
    paddingHorizontal: layout.mainTabHorizontal,
    paddingTop: layout.mainTabHeaderTop,
  },
  title: { color: palette.text, marginBottom: spacing.md, ...type.display },
  card: {
    alignItems: 'flex-start',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: spacing.md,
  },
  statusDot: {
    backgroundColor: palette.warning,
    borderRadius: 5,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  statusCopy: { flex: 1 },
  statusTitle: { color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 5 },
  statusBody: { color: palette.muted, ...type.body },
  sessionContent: { gap: 8 },
  profileHero: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 90,
    padding: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginRight: 14,
    width: 60,
  },
  avatarText: { color: palette.text, fontSize: 24, fontWeight: '800' },
  profileCopy: { alignItems: 'flex-start', flex: 1 },
  accountName: { color: palette.text, fontSize: 19, fontWeight: '800' },
  accountEmail: { color: palette.muted, fontSize: 12, marginTop: 2 },
  groupLabel: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginLeft: 12,
    marginTop: 3,
  },
  dangerLabel: { color: palette.danger },
  settingsGroup: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderRadius: radius.sm,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  rowIconText: { color: palette.accent, fontSize: 18, fontWeight: '700' },
  rowCopy: { flex: 1 },
  rowTitle: { color: palette.text, fontSize: 15, fontWeight: '700' },
  rowBody: { color: palette.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  chevron: { color: palette.muted, fontSize: 24, lineHeight: 26 },
  dangerGroup: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  deleteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  deleteIcon: { backgroundColor: palette.dangerSoft },
  deleteIconText: { color: palette.danger, fontSize: 24, fontWeight: '500', lineHeight: 25 },
  deleteRowTitle: { color: palette.danger, fontSize: 15, fontWeight: '700' },
  controlCopy: { color: palette.muted, ...type.body },
  confirmation: {
    gap: 12,
    padding: spacing.md,
  },
  confirmationTitle: { color: palette.text, fontSize: 16, fontWeight: '800' },
  confirmationActions: { flexDirection: 'row', gap: 10 },
  cancelButton: {
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: layout.controlHeight,
  },
  cancelButtonText: { color: palette.text, fontSize: 14, fontWeight: '700' },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: palette.danger,
    borderRadius: radius.md,
    flex: 1.4,
    justifyContent: 'center',
    minHeight: layout.controlHeight,
  },
  deleteButtonText: { color: palette.background, fontSize: 13, fontWeight: '800' },
  form: { gap: 12 },
  modeRow: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: 4,
  },
  modeButton: { alignItems: 'center', borderRadius: radius.sm, flex: 1, paddingVertical: 11 },
  modeButtonActive: { backgroundColor: palette.accentSoft },
  modeText: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  modeTextActive: { color: palette.accent },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.text,
    fontSize: 16,
    paddingHorizontal: 16,
    minHeight: layout.controlHeight,
    paddingVertical: 12,
  },
  message: { color: palette.warning, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: layout.controlHeight,
  },
  primaryButtonText: { color: palette.background, ...type.button },
  secondaryButton: {
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 14,
    width: '100%',
  },
  secondaryButtonText: { color: palette.text, ...type.bodyStrong },
  pressed: { opacity: 0.65 },
  accountHelper: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});

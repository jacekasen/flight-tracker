import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { layout, palette, radius, spacing, type } from '@/constants/theme';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

type AuthMode = 'signIn' | 'signUp';
type Notice = { kind: 'error' | 'success'; text: string };

function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (normalized.includes('email not confirmed')) return 'Confirm your email before logging in.';
  if (normalized.includes('user already registered')) return 'An account already exists for this email.';
  if (normalized.includes('rate limit')) return 'Too many attempts. Wait a moment and try again.';
  return message;
}

export default function AuthScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setNotice(null);
    setPassword('');
    setShowPassword(false);
  }

  async function submit() {
    if (!isSupabaseConfigured) {
      setNotice({ kind: 'error', text: 'Add your Supabase project URL and publishable key to continue.' });
      return;
    }
    if (!email.trim() || !password) {
      setNotice({ kind: 'error', text: 'Enter your email and password.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setNotice({ kind: 'error', text: 'Enter a valid email address.' });
      return;
    }
    if (mode === 'signUp' && !fullName.trim()) {
      setNotice({ kind: 'error', text: 'Enter your name.' });
      return;
    }
    if (mode === 'signUp' && password.length < 8) {
      setNotice({ kind: 'error', text: 'Create a password with at least 8 characters.' });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);
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
      setNotice({ kind: 'error', text: friendlyAuthError(result.error.message) });
      return;
    }
    if (!result.data.session) {
      setNotice({ kind: 'success', text: 'Check your email to confirm your account, then log in.' });
      setMode('signIn');
      setPassword('');
    }
  }

  async function recoverPassword() {
    const normalizedEmail = email.trim();
    if (!isSupabaseConfigured) {
      setNotice({ kind: 'error', text: 'Add your Supabase configuration to continue.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setNotice({ kind: 'error', text: 'Enter your email first, then request a reset link.' });
      return;
    }

    setIsRecovering(true);
    setNotice(null);
    const { error } = await getSupabase().auth.resetPasswordForEmail(normalizedEmail);
    setIsRecovering(false);
    setNotice(
      error
        ? { kind: 'error', text: friendlyAuthError(error.message) }
        : { kind: 'success', text: 'Password reset link sent. Check your email.' },
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backdrop} pointerEvents="none">
        <View style={styles.glow} />
        <View style={styles.orbitLarge} />
        <View style={styles.orbitSmall} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.content, isWide && styles.contentWide]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.shell, isWide && styles.shellWide]}>
            {isWide && <ProductStory />}

            <View style={[styles.authColumn, isWide && styles.authColumnWide]}>
              {!isWide && (
                <View style={styles.brand}>
                  <View style={styles.brandMark}>
                    <Text style={styles.brandMarkText}>✈</Text>
                  </View>
                  <Text style={styles.brandName}>Flight tracker</Text>
                </View>
              )}

              <View style={styles.intro}>
                <Text style={styles.title}>
                  {mode === 'signIn' ? 'Welcome back' : 'Create your account'}
                </Text>
                <Text style={styles.subtitle}>
                  {mode === 'signIn'
                    ? 'Log in to continue your flight history.'
                    : 'Start building a visual record of every journey.'}
                </Text>
              </View>

              <View style={styles.formCard}>
              <View style={styles.modeRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: mode === 'signIn' }}
                  onPress={() => changeMode('signIn')}
                  style={[styles.modeButton, mode === 'signIn' && styles.modeButtonActive]}
                >
                  <Text style={[styles.modeText, mode === 'signIn' && styles.modeTextActive]}>
                    Log in
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: mode === 'signUp' }}
                  onPress={() => changeMode('signUp')}
                  style={[styles.modeButton, mode === 'signUp' && styles.modeButtonActive]}
                >
                  <Text style={[styles.modeText, mode === 'signUp' && styles.modeTextActive]}>
                    Sign up
                  </Text>
                </Pressable>
              </View>

              {mode === 'signUp' && (
                <View style={styles.field}>
                  <Text style={styles.label}>FULL NAME</Text>
                  <TextInput
                    accessibilityLabel="Full name"
                    autoComplete="name"
                    editable={!isSubmitting}
                    onChangeText={setFullName}
                    placeholder="Your name"
                    placeholderTextColor={palette.muted}
                    style={styles.input}
                    value={fullName}
                  />
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  accessibilityLabel="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={email}
                  editable={!isSubmitting && !isRecovering}
                />
              </View>

              <View style={styles.field}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.label}>PASSWORD</Text>
                  {mode === 'signIn' && (
                    <Pressable
                      accessibilityRole="button"
                      disabled={isSubmitting || isRecovering}
                      onPress={() => void recoverPassword()}
                    >
                      <Text style={styles.forgotText}>
                        {isRecovering ? 'Sending…' : 'Forgot password?'}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.passwordInputShell}>
                  <TextInput
                    accessibilityLabel="Password"
                    autoCapitalize="none"
                    autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                    editable={!isSubmitting && !isRecovering}
                    onChangeText={setPassword}
                    onSubmitEditing={submit}
                    placeholder={mode === 'signIn' ? 'Enter your password' : 'At least 8 characters'}
                    placeholderTextColor={palette.muted}
                    secureTextEntry={!showPassword}
                    style={styles.passwordInput}
                    value={password}
                  />
                  <Pressable
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setShowPassword((visible) => !visible)}
                    style={styles.passwordToggle}
                  >
                    <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                </View>
                {mode === 'signUp' && (
                  <Text style={styles.fieldHint}>Use 8 or more characters.</Text>
                )}
              </View>

              {notice && (
                <View
                  accessibilityLiveRegion="polite"
                  style={[styles.notice, notice.kind === 'success' && styles.noticeSuccess]}
                >
                  <Text
                    style={[
                      styles.noticeText,
                      notice.kind === 'success' && styles.noticeSuccessText,
                    ]}
                  >
                    {notice.text}
                  </Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting || isRecovering}
                onPress={submit}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed || isSubmitting || isRecovering) && styles.pressed,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={palette.background} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'signIn' ? 'Log in' : 'Create account'}
                  </Text>
                )}
              </Pressable>
              </View>

              <Text style={styles.footerText}>
                {mode === 'signIn'
                  ? 'New to Flight tracker? Choose Sign up above.'
                  : 'Already have an account? Choose Log in above.'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProductStory() {
  return (
    <View style={styles.productStory}>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>✈</Text>
        </View>
        <Text style={styles.brandName}>Flight tracker</Text>
      </View>

      <View style={styles.storyCopy}>
        <Text style={styles.storyEyebrow}>YOUR TRAVEL HISTORY</Text>
        <Text style={styles.storyTitle}>Every journey, mapped.</Text>
        <Text style={styles.storyBody}>
          Save flights in seconds, see every route on your globe, and revisit the years that took
          you furthest.
        </Text>
      </View>

      <View style={styles.miniGlobe}>
        <View style={[styles.globeLine, styles.globeEquator]} />
        <View style={[styles.globeLine, styles.globeLatitude]} />
        <View style={[styles.globeLine, styles.globeMeridian]} />
        <View style={styles.globeRoute} />
        <View style={[styles.globePoint, styles.globePointStart]} />
        <View style={[styles.globePoint, styles.globePointEnd]} />
      </View>

      <View style={styles.benefits}>
        <Benefit icon="✈" label="Add flights without the spreadsheet" />
        <Benefit icon="◎" label="See your complete route map" />
        <Benefit icon="◈" label="Turn each year into a recap" />
      </View>
    </View>
  );
}

function Benefit({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Text style={styles.benefitIconText}>{icon}</Text>
      </View>
      <Text style={styles.benefitText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: palette.background, flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  glow: {
    backgroundColor: palette.accent,
    borderRadius: 260,
    height: 440,
    opacity: 0.08,
    position: 'absolute',
    right: -190,
    top: -190,
    width: 440,
  },
  orbitLarge: {
    borderColor: 'rgba(77, 163, 255, 0.12)',
    borderRadius: 220,
    borderWidth: 1,
    height: 440,
    position: 'absolute',
    right: -150,
    top: -155,
    width: 440,
  },
  orbitSmall: {
    borderColor: 'rgba(77, 163, 255, 0.1)',
    borderRadius: 130,
    borderWidth: 1,
    height: 260,
    position: 'absolute',
    right: -60,
    top: -65,
    width: 260,
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: spacing.xl,
    paddingHorizontal: layout.pagePadding,
    paddingTop: 28,
  },
  contentWide: { justifyContent: 'center', paddingVertical: spacing.xl },
  shell: { gap: spacing.lg, maxWidth: 1080, width: '100%' },
  shellWide: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 72,
    justifyContent: 'space-between',
  },
  authColumn: {
    gap: spacing.lg,
    maxWidth: 460,
    width: '100%',
  },
  authColumnWide: { flex: 1 },
  productStory: { flex: 1, gap: spacing.lg, maxWidth: 500 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  brandMark: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderColor: 'rgba(77, 163, 255, 0.28)',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  brandMarkText: { color: palette.accent, fontSize: 18 },
  brandName: { color: palette.text, fontSize: 16, fontWeight: '800' },
  storyCopy: { gap: spacing.sm },
  storyEyebrow: { color: palette.accent, ...type.eyebrow },
  storyTitle: {
    color: palette.text,
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: -1.8,
    lineHeight: 50,
  },
  storyBody: { color: palette.muted, maxWidth: 450, ...type.body },
  miniGlobe: {
    alignSelf: 'center',
    backgroundColor: '#0B2136',
    borderColor: '#3279B9',
    borderRadius: 140,
    borderWidth: 1,
    height: 280,
    overflow: 'hidden',
    shadowColor: palette.accent,
    shadowOpacity: 0.36,
    shadowRadius: 30,
    width: 280,
  },
  globeLine: {
    borderColor: '#276493',
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.7,
    position: 'absolute',
  },
  globeEquator: { height: 1, left: 0, right: 0, top: 139 },
  globeLatitude: { borderRadius: 100, height: 74, left: 0, right: 0, top: 50 },
  globeMeridian: { borderRadius: 140, bottom: 0, left: 90, top: 0, width: 100 },
  globeRoute: {
    borderColor: palette.accent,
    borderRadius: 90,
    borderTopWidth: 2,
    height: 86,
    left: 56,
    position: 'absolute',
    top: 80,
    transform: [{ rotate: '-12deg' }],
    width: 170,
  },
  globePoint: {
    backgroundColor: palette.accent,
    borderColor: '#CBE5FF',
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    width: 10,
  },
  globePointStart: { left: 56, top: 146 },
  globePointEnd: { right: 48, top: 105 },
  benefits: { gap: 10 },
  benefitRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  benefitIcon: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderRadius: radius.sm,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  benefitIconText: { color: palette.accent, fontSize: 15 },
  benefitText: { color: '#C8D5E2', ...type.bodyStrong },
  intro: { gap: spacing.sm, minHeight: 68 },
  title: { color: palette.text, ...type.display },
  subtitle: { color: palette.muted, maxWidth: 360, ...type.body },
  formCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  modeRow: {
    backgroundColor: palette.background,
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: 4,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  modeButtonActive: { backgroundColor: palette.accentSoft },
  modeText: { color: palette.muted, fontSize: 14, fontWeight: '700' },
  modeTextActive: { color: palette.accent },
  field: { gap: 7 },
  label: { color: palette.muted, ...type.label },
  passwordLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forgotText: { color: palette.accent, fontSize: 12, fontWeight: '700' },
  input: {
    backgroundColor: palette.background,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.text,
    fontSize: 16,
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  passwordInputShell: {
    alignItems: 'center',
    backgroundColor: palette.background,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: layout.controlHeight,
  },
  passwordInput: {
    color: palette.text,
    flex: 1,
    fontSize: 16,
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  passwordToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  passwordToggleText: { color: palette.accent, fontSize: 12, fontWeight: '800' },
  fieldHint: { color: palette.muted, ...type.caption },
  notice: {
    backgroundColor: palette.dangerSoft,
    borderColor: palette.danger,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: 12,
  },
  noticeSuccess: { backgroundColor: palette.successSoft, borderColor: palette.success },
  noticeText: { color: palette.danger, ...type.caption },
  noticeSuccessText: { color: palette.success },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: spacing.xs,
    minHeight: layout.controlHeight,
  },
  primaryButtonText: { color: palette.background, ...type.button },
  footerText: { color: palette.muted, minHeight: 34, textAlign: 'center', ...type.caption },
  pressed: { opacity: 0.68 },
});

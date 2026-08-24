import { useState } from 'react';

import { friendlyAuthError } from '@/lib/auth-errors';
import { toErrorMessage } from '@/lib/errors';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type AuthMode = 'signIn' | 'signUp';
export type AuthNotice = { kind: 'error' | 'success'; text: string };

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function useAuthForm() {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<AuthNotice | null>(null);
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
    const normalizedEmail = email.trim();
    if (!isSupabaseConfigured) {
      setNotice({
        kind: 'error',
        text: 'Add your Supabase project URL and publishable key to continue.',
      });
      return;
    }
    if (!normalizedEmail || !password) {
      setNotice({ kind: 'error', text: 'Enter your email and password.' });
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
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
    try {
      const supabase = getSupabase();
      const result =
        mode === 'signIn'
          ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
          : await supabase.auth.signUp({
              email: normalizedEmail,
              password,
              options: { data: { full_name: fullName.trim() } },
            });

      if (result.error) {
        setNotice({ kind: 'error', text: friendlyAuthError(result.error.message) });
      } else if (!result.data.session) {
        setNotice({
          kind: 'success',
          text: 'Check your email to confirm your account, then log in.',
        });
        setMode('signIn');
        setPassword('');
      }
    } catch (error) {
      setNotice({ kind: 'error', text: toErrorMessage(error, 'Could not authenticate.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function recoverPassword() {
    const normalizedEmail = email.trim();
    if (!isSupabaseConfigured) {
      setNotice({ kind: 'error', text: 'Add your Supabase configuration to continue.' });
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setNotice({ kind: 'error', text: 'Enter your email first, then request a reset link.' });
      return;
    }

    setIsRecovering(true);
    setNotice(null);
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(normalizedEmail);
      setNotice(
        error
          ? { kind: 'error', text: friendlyAuthError(error.message) }
          : { kind: 'success', text: 'Password reset link sent. Check your email.' },
      );
    } catch (error) {
      setNotice({ kind: 'error', text: toErrorMessage(error, 'Could not send a reset link.') });
    } finally {
      setIsRecovering(false);
    }
  }

  return {
    changeMode,
    email,
    fullName,
    isRecovering,
    isSubmitting,
    mode,
    notice,
    password,
    recoverPassword,
    setEmail,
    setFullName,
    setPassword,
    setShowPassword,
    showPassword,
    submit,
  };
}

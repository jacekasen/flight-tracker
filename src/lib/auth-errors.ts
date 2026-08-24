export function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (normalized.includes('email not confirmed')) return 'Confirm your email before logging in.';
  if (normalized.includes('user already registered')) {
    return 'An account already exists for this email.';
  }
  if (normalized.includes('rate limit')) return 'Too many attempts. Wait a moment and try again.';
  return message;
}

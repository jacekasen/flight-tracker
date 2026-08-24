import { useState } from 'react';
import { router } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SymbolIcon } from '@/components/ui/symbol-icon';
import { layout, palette, radius, spacing, type } from '@/constants/theme';
import { deleteAccount, exportAccountData } from '@/lib/account';
import { confirmDestructiveAction } from '@/lib/confirmation';
import { toErrorMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type Notice = { kind: 'error' | 'success'; text: string };

type SettingsItem = {
  body?: string;
  disabled?: boolean;
  fallback: string;
  loading?: boolean;
  onPress: () => void;
  showChevron?: boolean;
  symbol: SFSymbol;
  title: string;
};

export default function ProfileScreen() {
  const { session, isLoading: isSessionLoading } = useAuth();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isSessionLoading || !session) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centeredState}>
          <ActivityIndicator color={palette.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const metadataName = session.user.user_metadata.full_name;
  const displayName =
    typeof metadataName === 'string' && metadataName.trim() ? metadataName : 'Flight tracker';
  const avatarLabel = (displayName === 'Flight tracker' ? session.user.email : displayName)
    ?.slice(0, 1)
    .toUpperCase() ?? '?';
  const isBusy = isSigningOut || isExporting || isDeleting;

  async function signOut() {
    setIsSigningOut(true);
    setNotice(null);
    const { error } = await getSupabase().auth.signOut();
    if (error) {
      setNotice({ kind: 'error', text: error.message });
      setIsSigningOut(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    setNotice(null);
    try {
      await exportAccountData();
      setNotice({ kind: 'success', text: 'Your flight data export is ready.' });
    } catch (error) {
      setNotice({
        kind: 'error',
        text: toErrorMessage(error, 'Could not export your data.'),
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setNotice(null);
    try {
      await deleteAccount();
    } catch (error) {
      setNotice({
        kind: 'error',
        text: toErrorMessage(error, 'Could not delete your account.'),
      });
      setIsDeleting(false);
    }
  }

  function requestAccountDeletion() {
    confirmDestructiveAction({
      confirmLabel: 'Delete account',
      message: 'This permanently removes your profile and every saved flight. This cannot be undone.',
      onConfirm: () => void handleDeleteAccount(),
      title: 'Delete your account?',
    });
  }

  const travelAndDataItems: SettingsItem[] = [
    {
      body: 'Route map, totals, and yearly recaps',
      disabled: isBusy,
      fallback: '✈',
      onPress: () => router.push('/profile/globe'),
      symbol: 'airplane',
      title: 'Flight insights',
    },
    {
      body: 'Download your complete flight history',
      disabled: isBusy,
      fallback: '↓',
      loading: isExporting,
      onPress: () => void handleExport(),
      symbol: 'square.and.arrow.down',
      title: 'Export flight data',
    },
  ];

  const accountItems: SettingsItem[] = [
    {
      disabled: isBusy,
      fallback: '↗',
      loading: isSigningOut,
      onPress: () => void signOut(),
      showChevron: false,
      symbol: 'rectangle.portrait.and.arrow.right',
      title: 'Sign out',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileHero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLabel}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.accountName}>{displayName}</Text>
            <Text style={styles.accountEmail}>{session.user.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.groupLabel}>TRAVEL &amp; DATA</Text>
          <SettingsGroup items={travelAndDataItems} />
        </View>

        <View style={styles.section}>
          <Text style={styles.groupLabel}>ACCOUNT</Text>
          <SettingsGroup items={accountItems} />
        </View>

        {notice && (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.notice, notice.kind === 'error' && styles.noticeError]}
          >
            <Text style={[styles.noticeText, notice.kind === 'error' && styles.noticeErrorText]}>
              {notice.text}
            </Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={requestAccountDeletion}
          style={({ pressed }) => [styles.deleteAction, pressed && styles.pressed]}
        >
          {isDeleting ? (
            <ActivityIndicator color={palette.danger} size="small" />
          ) : (
            <SymbolIcon color={palette.danger} fallback="×" name="trash" size={15} />
          )}
          <Text style={styles.deleteActionText}>Delete account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsGroup({ items }: { items: SettingsItem[] }) {
  return (
    <View style={styles.settingsGroup}>
      {items.map((item, index) => (
        <View key={item.title}>
          {index > 0 && <View style={styles.rowDivider} />}
          <SettingsRow {...item} />
        </View>
      ))}
    </View>
  );
}

function SettingsRow({
  title,
  body,
  symbol,
  fallback,
  onPress,
  disabled = false,
  loading = false,
  showChevron = true,
}: SettingsItem) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>
        <SymbolIcon fallback={fallback} name={symbol} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {body && <Text style={styles.rowBody}>{body}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator color={palette.accent} size="small" />
      ) : showChevron ? (
        <SymbolIcon color={palette.muted} fallback="›" name="chevron.right" size={13} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: palette.background, flex: 1 },
  centeredState: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: {
    paddingBottom: layout.pageBottomPadding,
    paddingHorizontal: layout.mainTabHorizontal,
    paddingTop: layout.mainTabHeaderTop,
  },
  title: { color: palette.text, marginBottom: spacing.md, ...type.display },
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
  section: { gap: 7, marginTop: spacing.md },
  groupLabel: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginLeft: 12,
  },
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
    minHeight: 62,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  rowDivider: {
    backgroundColor: palette.border,
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderRadius: radius.sm,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  rowCopy: { flex: 1 },
  rowTitle: { color: palette.text, fontSize: 15, fontWeight: '700' },
  rowBody: { color: palette.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  notice: {
    backgroundColor: palette.successSoft,
    borderColor: palette.success,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: 12,
  },
  noticeError: { backgroundColor: palette.dangerSoft, borderColor: palette.danger },
  noticeText: { color: palette.success, ...type.caption },
  noticeErrorText: { color: palette.danger },
  deleteAction: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: spacing.xl,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  deleteActionText: { color: palette.danger, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});

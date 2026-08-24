import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteMap } from '@/components/route-map';
import { layout, palette, radius, spacing, type } from '@/constants/theme';
import { getCachedFlights, loadFlights, type FlightRow } from '@/lib/flights';
import { summarizeFlights } from '@/lib/insights';
import { useAuth } from '@/providers/auth-provider';

export default function FlightGlobeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session, isLoading: isSessionLoading } = useAuth();
  const [flights, setFlights] = useState<FlightRow[]>(
    () => getCachedFlights(session?.user.id) ?? [],
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(
    async (showSpinner = false) => {
      if (!session) {
        setFlights([]);
        return;
      }
      if (showSpinner) setIsRefreshing(true);
      setMessage(null);
      try {
        setFlights(await loadFlights(session.user.id));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load your flight paths.');
      } finally {
        setIsRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const insights = summarizeFlights(flights, null);

  if (isSessionLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={palette.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Sign in to see your flight paths</Text>
          <Pressable onPress={() => router.replace('/profile')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go to sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]} style={styles.safeArea}>
      <View style={styles.canvas}>
        <RouteMap fullscreen globe routes={insights.routes} />

        <View style={[styles.topBar, { paddingTop: insets.top + layout.mainTabHeaderTop }]}>
          <View style={styles.headerIdentity}>
            <Pressable
              accessibilityLabel="Back to profile"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.title}>Insights</Text>
          </View>
          <Pressable
            accessibilityLabel="Refresh flight paths"
            accessibilityRole="button"
            disabled={isRefreshing}
            onPress={() => void refresh(true)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            {isRefreshing ? (
              <ActivityIndicator color={palette.text} size="small" />
            ) : (
              <Text style={styles.refreshIcon}>↻</Text>
            )}
          </Pressable>
        </View>

        {message && (
          <View style={[styles.errorBanner, { top: insets.top + 72 }]}>
            <Text numberOfLines={1} style={styles.errorText}>{message}</Text>
            <Pressable onPress={() => void refresh()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        <View
          style={[
            styles.bottomPanel,
            {
              bottom: Platform.OS === 'ios' ? 34 : spacing.md,
              width: Math.min(width - 32, 430),
            },
          ]}
        >
          <View style={styles.panelCopy}>
            <View>
              <Text style={styles.panelLabel}>ALL FLIGHT PATHS</Text>
              <Text style={styles.panelTitle}>
                {insights.routes.length} mapped {insights.routes.length === 1 ? 'route' : 'routes'}
              </Text>
            </View>
            <Text style={styles.routeCount}>{insights.routes.length}</Text>
          </View>
          <Text style={styles.panelBody}>
            {flights.length
              ? `Across ${flights.length} saved ${flights.length === 1 ? 'flight' : 'flights'}`
              : 'Add a flight to begin building your globe'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              flights.length ? router.push('/profile/insights') : router.push('/search')
            }
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>
              {flights.length ? 'View recap' : 'Add a flight'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: palette.background, flex: 1 },
  canvas: { backgroundColor: '#03070D', flex: 1, overflow: 'hidden' },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  emptyState: {
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: layout.pagePadding,
  },
  emptyTitle: { color: palette.text, ...type.title },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: layout.mainTabHorizontal,
    position: 'absolute',
    right: layout.mainTabHorizontal,
    top: 0,
  },
  headerIdentity: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  title: { color: palette.text, ...type.display },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 21, 26, 0.86)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  backIcon: { color: palette.text, fontSize: 30, lineHeight: 31 },
  refreshIcon: { color: palette.text, fontSize: 21, fontWeight: '700', lineHeight: 23 },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: palette.dangerSoft,
    borderColor: palette.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    left: layout.mainTabHorizontal,
    padding: 12,
    position: 'absolute',
    right: layout.mainTabHorizontal,
  },
  errorText: { color: palette.text, flex: 1, ...type.caption },
  retryText: { color: palette.danger, fontWeight: '800', marginLeft: spacing.sm },
  bottomPanel: {
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 18, 23, 0.97)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.46,
    shadowRadius: 28,
  },
  panelCopy: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelLabel: { color: palette.muted, ...type.label },
  panelTitle: { color: palette.text, marginTop: 3, ...type.title },
  panelBody: { color: palette.muted, ...type.caption },
  routeCount: { color: palette.accent, fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: { color: palette.background, ...type.button },
  pressed: { opacity: 0.68 },
});

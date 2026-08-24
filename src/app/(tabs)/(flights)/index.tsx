import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteMap } from '@/components/route-map';
import { layout, palette, radius, spacing, type } from '@/constants/theme';
import { flightRowToPreview, loadFlights, type FlightRow } from '@/lib/flights';
import { summarizeFlights } from '@/lib/insights';
import { useAuth } from '@/providers/auth-provider';

export default function FlightsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session, isLoading: isSessionLoading } = useAuth();
  const [flights, setFlights] = useState<FlightRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [referenceTime, setReferenceTime] = useState(() => Date.now());

  const refresh = useCallback(
    async (showSpinner = false) => {
      if (!session) {
        setFlights([]);
        return;
      }
      if (showSpinner) setIsRefreshing(true);
      else setIsLoading(true);
      setMessage(null);
      setReferenceTime(Date.now());
      try {
        setFlights(await loadFlights(session.user.id));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load your flights.');
      } finally {
        setIsLoading(false);
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

  const { upcoming, upcomingRoutes } = useMemo(() => {
    const next = flights.filter(
      (flight) => Date.parse(flight.scheduled_departure) >= referenceTime,
    );
    return {
      upcoming: next,
      upcomingRoutes: summarizeFlights(next, null).routes,
    };
  }, [flights, referenceTime]);

  const nextFlight = upcoming[0];
  const nextFlightPreview = nextFlight ? flightRowToPreview(nextFlight) : null;

  function openFlight(flight: FlightRow) {
    router.push(
      { pathname: '/flight/[id]', params: { id: flight.id } } as unknown as Href,
    );
  }

  if (isSessionLoading || (session && isLoading && flights.length === 0)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          <ActivityIndicator color={palette.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Flights</Text>
            </View>
          </View>
          <EmptyCard
            action="Sign in"
            body="Sign in or create an account to build your flight history across devices."
            onPress={() => router.push('/profile')}
            title="Your history starts here"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]} style={styles.safeArea}>
      <View style={styles.mapCanvas}>
        <RouteMap fullscreen globe routes={upcomingRoutes} />

        <View style={[styles.topOverlay, { paddingTop: insets.top + layout.mainTabHeaderTop }]}>
          <View style={styles.globeHeader}>
            <View>
              <Text style={styles.globeTitle}>Flights</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Refresh flights"
                accessibilityRole="button"
                disabled={isRefreshing}
                onPress={() => void refresh(true)}
                style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
              >
                {isRefreshing ? (
                  <ActivityIndicator color={palette.text} size="small" />
                ) : (
                  <Text style={styles.refreshIcon}>↻</Text>
                )}
              </Pressable>
            </View>
          </View>

          {message && (
            <View style={styles.floatingError}>
              <View style={styles.errorCopy}>
                <Text style={styles.errorTitle}>Couldn&apos;t refresh flights</Text>
                <Text numberOfLines={1} style={styles.errorBody}>{message}</Text>
              </View>
              <Pressable onPress={() => void refresh()}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View
          style={[
            styles.flightsPanel,
            { width: Math.min(width - 32, 430) },
          ]}
        >
          <Pressable
            accessibilityLabel="View all flights"
            accessibilityRole="button"
            onPress={() => router.push('/flights')}
            style={({ pressed }) => [styles.panelHeader, pressed && styles.pressed]}
          >
            <View style={styles.panelIdentity}>
              <View style={styles.panelIcon}>
                <Text style={styles.panelIconText}>✈</Text>
              </View>
              <View style={styles.panelCopy}>
                <View style={styles.panelTitleRow}>
                  <Text style={styles.panelTitle}>Upcoming flights</Text>
                  <View style={styles.totalBadge}>
                    <Text style={styles.totalBadgeText}>{upcoming.length}</Text>
                  </View>
                </View>
                <Text style={styles.panelBody}>
                  {upcoming.length
                    ? `${upcoming.length} ${upcoming.length === 1 ? 'journey' : 'journeys'} scheduled`
                    : 'No journeys scheduled'}
                </Text>
              </View>
            </View>
            <View style={styles.expandAction}>
              <Text style={styles.expandActionText}>View all</Text>
              <Text style={styles.expandIcon}>›</Text>
            </View>
          </Pressable>

          <Pressable
              accessibilityLabel={
                nextFlightPreview
                  ? `Next flight, ${nextFlightPreview.flightNumber}, ${nextFlightPreview.origin} to ${nextFlightPreview.destination}`
                  : 'Add an upcoming flight'
              }
              accessibilityRole="button"
              onPress={() => (nextFlight ? openFlight(nextFlight) : router.push('/search'))}
              style={({ pressed }) => [
                styles.nextFlightRow,
                !nextFlightPreview && styles.emptyNextFlightRow,
                pressed && styles.pressed,
              ]}
            >
              {nextFlightPreview ? (
                <>
                  <View style={styles.nextFlightSummary}>
                    <View style={styles.nextFlightTopRow}>
                      <Text style={styles.nextFlightEyebrow}>
                        UP NEXT · {nextFlightPreview.dateLabel}
                      </Text>
                      <View style={styles.nextStatusBadge}>
                        <Text style={styles.nextStatusText}>{nextFlightPreview.status}</Text>
                      </View>
                    </View>
                    <View style={styles.nextRouteRow}>
                      <View style={styles.nextEndpoint}>
                        <Text numberOfLines={1} style={styles.nextCityRoute}>
                          {nextFlightPreview.origin}
                        </Text>
                        <Text style={styles.nextAirportMeta}>
                          {nextFlightPreview.originCode} · {nextFlightPreview.departureTime}
                        </Text>
                      </View>
                      <View style={styles.routeArrow}>
                        <View style={styles.routeArrowLine} />
                        <Text style={styles.routeArrowText}>✈</Text>
                        <View style={styles.routeArrowLine} />
                      </View>
                      <View style={[styles.nextEndpoint, styles.nextDestination]}>
                        <Text numberOfLines={1} style={styles.nextCityRoute}>
                          {nextFlightPreview.destination}
                        </Text>
                        <Text style={styles.nextAirportMeta}>
                          {nextFlightPreview.destinationCode} · {nextFlightPreview.arrivalTime}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.nextFlightFooter}>
                      <Text style={styles.nextFlightMeta}>
                        {nextFlightPreview.flightNumber} · {nextFlightPreview.duration}
                      </Text>
                      <Text style={styles.detailsLink}>Flight details ›</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.noNextFlightIcon}>
                    <Text style={styles.noNextFlightIconText}>＋</Text>
                  </View>
                  <View style={styles.panelCopy}>
                    <Text style={styles.nextFlightEyebrow}>NEXT FLIGHT</Text>
                    <Text style={styles.noNextFlightTitle}>Add your next journey</Text>
                  </View>
                  <Text style={styles.nextChevron}>›</Text>
                </>
              )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function EmptyCard({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.cardButton}>
        <Text style={styles.cardButtonText}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  centeredState: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: {
    gap: spacing.md,
    paddingBottom: layout.pageBottomPadding,
    paddingHorizontal: layout.mainTabHorizontal,
    paddingTop: layout.mainTabHeaderTop,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: { color: palette.text, ...type.display },
  mapCanvas: { backgroundColor: '#03070D', flex: 1, overflow: 'hidden' },
  topOverlay: {
    left: 0,
    paddingBottom: spacing.md,
    paddingHorizontal: layout.mainTabHorizontal,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  globeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  globeTitle: {
    color: palette.text,
    ...type.display,
  },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 21, 26, 0.86)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  refreshIcon: { color: palette.text, fontSize: 21, fontWeight: '700', lineHeight: 23 },
  floatingError: {
    alignItems: 'center',
    backgroundColor: 'rgba(53, 24, 29, 0.94)',
    borderColor: palette.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.sm,
    padding: 12,
  },
  errorCopy: { flex: 1 },
  errorTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  errorBody: { color: palette.muted, fontSize: 11, marginTop: 2 },
  retryText: { color: palette.danger, fontSize: 13, fontWeight: '800', marginLeft: 10 },
  nextFlightRow: {
    borderTopColor: 'rgba(255, 255, 255, 0.09)',
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 124,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  emptyNextFlightRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  nextFlightSummary: { flex: 1, gap: 11 },
  nextFlightTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  nextFlightEyebrow: {
    color: palette.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  nextRouteRow: { alignItems: 'center', flexDirection: 'row' },
  nextEndpoint: { flex: 1 },
  nextDestination: { alignItems: 'flex-end' },
  routeArrow: {
    alignItems: 'center',
    flex: 0.56,
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  routeArrowLine: { backgroundColor: palette.borderStrong, flex: 1, height: 1 },
  routeArrowText: { color: palette.accent, fontSize: 13, marginHorizontal: 5 },
  nextAirportMeta: { color: palette.muted, fontSize: 11, fontWeight: '600', marginTop: 3 },
  nextFlightFooter: {
    alignItems: 'center',
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  nextCityRoute: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  nextFlightMeta: { color: palette.muted, fontSize: 11, fontWeight: '700' },
  detailsLink: { color: palette.accent, fontSize: 11, fontWeight: '800' },
  nextStatusBadge: {
    backgroundColor: 'rgba(16, 42, 69, 0.72)',
    borderColor: 'rgba(77, 163, 255, 0.22)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  nextStatusText: { color: palette.accent, fontSize: 8, fontWeight: '800' },
  noNextFlightIcon: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  noNextFlightIconText: { color: palette.accent, fontSize: 20, fontWeight: '700' },
  noNextFlightTitle: { color: palette.text, fontSize: 14, fontWeight: '800', marginTop: 3 },
  nextChevron: { color: palette.muted, fontSize: 24 },
  flightsPanel: {
    backgroundColor: 'rgba(15, 18, 23, 0.97)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.xl,
    borderWidth: 1,
    bottom: Platform.OS === 'ios' ? 48 : 18,
    left: 16,
    overflow: 'hidden',
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.46,
    shadowRadius: 28,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 76,
    padding: spacing.md,
  },
  panelIdentity: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 11 },
  panelIcon: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  panelIconText: { color: palette.accent, fontSize: 17 },
  panelCopy: { flex: 1 },
  panelTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  panelTitle: { color: palette.text, ...type.title },
  totalBadge: {
    alignItems: 'center',
    backgroundColor: palette.border,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  totalBadgeText: { color: '#C7D0DA', fontSize: 10, fontWeight: '800' },
  panelBody: { color: palette.muted, fontSize: 11, fontWeight: '600', marginTop: 3 },
  expandAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  expandActionText: { color: palette.text, fontSize: 10, fontWeight: '800' },
  expandIcon: { color: palette.accent, fontSize: 16, fontWeight: '800', lineHeight: 16 },
  pressed: { opacity: 0.68 },
  emptyCard: {
    borderColor: palette.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  errorCard: {
    borderColor: palette.warning,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  emptyTitle: { color: palette.text, marginBottom: 6, ...type.title },
  emptyBody: { color: palette.muted, ...type.body },
  cardButton: {
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingVertical: 12,
  },
  cardButtonText: { color: palette.text, ...type.bodyStrong },
});

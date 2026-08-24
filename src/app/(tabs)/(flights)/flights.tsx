import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlightCard } from '@/components/flight-card';
import { layout, palette, radius, spacing, type } from '@/constants/theme';
import { useFlightCollection } from '@/hooks/use-flight-collection';
import { partitionFlights } from '@/lib/flight-collections';
import { flightRowToPreview, type FlightRow } from '@/lib/flights';
import { flightDetailsRoute } from '@/lib/routes';

export default function AllFlightsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'ios' ? 44 : Platform.OS === 'android' ? 24 : 0,
  );
  const { error, flights, isInitialLoading, isRefreshing, refresh, session } =
    useFlightCollection({ errorMessage: 'Could not load your flights.' });
  const [activeGroup, setActiveGroup] = useState<'upcoming' | 'history'>('upcoming');

  const { upcoming, history } = useMemo(() => partitionFlights(flights), [flights]);

  const visibleFlights = activeGroup === 'upcoming' ? upcoming : history;

  function openFlight(flight: FlightRow) {
    router.push(flightDetailsRoute(flight.id));
  }

  if (isInitialLoading || !session) return <SafeAreaView style={styles.safeArea} />;

  return (
    <SafeAreaView edges={[]} style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[palette.accent]}
            onRefresh={() => void refresh(true)}
            progressBackgroundColor={palette.surface}
            refreshing={isRefreshing}
            tintColor={palette.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        style={[styles.pageScroll, { marginTop: topInset }]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to flights"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>All flights</Text>
            <Text style={styles.subtitle}>
              {flights.length} {flights.length === 1 ? 'journey' : 'journeys'} · {upcoming.length}{' '}
              upcoming
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/search')}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              <Text style={styles.addButtonText}>＋ Add flight</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.segmentedControl}>
          <GroupButton
            active={activeGroup === 'upcoming'}
            count={upcoming.length}
            label="Upcoming"
            onPress={() => setActiveGroup('upcoming')}
          />
          <GroupButton
            active={activeGroup === 'history'}
            count={history.length}
            label="History"
            onPress={() => setActiveGroup('history')}
          />
        </View>

        <View style={styles.collectionHeader}>
          <View>
            <Text style={styles.collectionEyebrow}>
              {activeGroup === 'upcoming' ? 'SCHEDULE' : 'TRAVEL LOG'}
            </Text>
            <Text style={styles.collectionTitle}>
              {activeGroup === 'upcoming' ? 'Upcoming journeys' : 'Flight history'}
            </Text>
          </View>
          <Text style={styles.collectionCount}>
            {visibleFlights.length} {visibleFlights.length === 1 ? 'flight' : 'flights'}
          </Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text numberOfLines={1} style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void refresh()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.flightList}>
          {visibleFlights.length ? (
            visibleFlights.map((flight) => (
              <FlightCard
                compact
                flight={flightRowToPreview(flight)}
                key={flight.id}
                onPress={() => openFlight(flight)}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>✈</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {activeGroup === 'upcoming' ? 'No upcoming flights' : 'No flight history yet'}
              </Text>
              <Text style={styles.emptyBody}>
                {activeGroup === 'upcoming'
                  ? 'Add a flight to start planning your next journey.'
                  : 'Completed journeys will collect here over time.'}
              </Text>
              <Pressable onPress={() => router.push('/search')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Add a flight</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GroupButton({
  active,
  count,
  label,
  onPress,
}: {
  active: boolean;
  count: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
      <View style={[styles.segmentCount, active && styles.segmentCountActive]}>
        <Text style={[styles.segmentCountText, active && styles.segmentCountTextActive]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: palette.background, flex: 1 },
  pageScroll: { flex: 1 },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: 760,
    padding: layout.pagePadding,
    paddingBottom: 0,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerCopy: { flex: 1 },
  backButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  backIcon: { color: palette.text, fontSize: 30, fontWeight: '400', lineHeight: 31 },
  title: { color: palette.text, ...type.display },
  subtitle: { color: palette.muted, marginTop: 3, ...type.caption },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  addButton: {
    backgroundColor: palette.accentSoft,
    borderColor: 'rgba(77, 163, 255, 0.25)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButtonText: { color: palette.accent, fontSize: 11, fontWeight: '800' },
  segmentedControl: {
    backgroundColor: '#05070A',
    borderColor: palette.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 42,
  },
  segmentButtonActive: { backgroundColor: palette.accentSoft },
  segmentText: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: palette.accent },
  segmentCount: {
    alignItems: 'center',
    backgroundColor: palette.border,
    borderRadius: radius.pill,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  segmentCountActive: { backgroundColor: palette.accent },
  segmentCountText: { color: palette.muted, fontSize: 10, fontWeight: '800' },
  segmentCountTextActive: { color: palette.background },
  collectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 14,
  },
  collectionEyebrow: { color: palette.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  collectionTitle: { color: palette.text, fontSize: 16, fontWeight: '800', marginTop: 2 },
  collectionCount: { color: palette.muted, fontSize: 11, fontWeight: '700' },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: palette.dangerSoft,
    borderColor: palette.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 10,
  },
  errorText: { color: palette.text, flex: 1, fontSize: 11 },
  retryText: { color: palette.danger, fontSize: 11, fontWeight: '800', marginLeft: 8 },
  flightList: { gap: 12, paddingBottom: spacing.sm },
  emptyCard: {
    alignItems: 'center',
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: spacing.lg,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderRadius: radius.lg,
    height: 44,
    justifyContent: 'center',
    marginBottom: 12,
    width: 44,
  },
  emptyIconText: { color: palette.accent, fontSize: 18 },
  emptyTitle: { color: palette.text, textAlign: 'center', ...type.title },
  emptyBody: { color: palette.muted, marginTop: 6, textAlign: 'center', ...type.body },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: radius.md,
    marginTop: spacing.md,
    minHeight: layout.controlHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: { color: palette.background, ...type.button },
  pressed: { opacity: 0.68 },
});

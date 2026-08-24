import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RouteMap } from '@/components/route-map';
import { palette, spacing } from '@/constants/theme';
import { loadFlights, type FlightRow } from '@/lib/flights';
import {
  availableInsightYears,
  formatFlightTime,
  summarizeFlights,
  type InsightRanking,
} from '@/lib/insights';
import { useAuth } from '@/providers/auth-provider';

export default function InsightsScreen() {
  const { session, isLoading: isSessionLoading } = useAuth();
  const [flights, setFlights] = useState<FlightRow[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(
    async (showRefresh = false) => {
      if (!session) {
        setFlights([]);
        return;
      }
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setMessage(null);
      try {
        setFlights(await loadFlights(session.user.id));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load your insights.');
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

  const years = useMemo(() => availableInsightYears(flights), [flights]);
  const insights = useMemo(
    () => summarizeFlights(flights, selectedYear),
    [flights, selectedYear],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          session ? (
            <RefreshControl
              onRefresh={() => void refresh(true)}
              refreshing={isRefreshing}
              tintColor={palette.accent}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR STORY IN NUMBERS</Text>
            <Text style={styles.title}>Insights</Text>
          </View>
          {selectedYear != null && <Text style={styles.recapBadge}>{selectedYear} RECAP</Text>}
        </View>

        {isSessionLoading || (isLoading && flights.length === 0) ? (
          <ActivityIndicator color={palette.accent} />
        ) : !session ? (
          <EmptyState
            action="Sign in"
            body="Your route map and travel totals are private to your account."
            onPress={() => router.back()}
            title="Sign in to see insights"
          />
        ) : message && flights.length === 0 ? (
          <EmptyState
            action="Try again"
            body={message}
            onPress={() => void refresh()}
            title="Couldn't load insights"
          />
        ) : flights.length === 0 ? (
          <EmptyState
            action="Add a flight"
            body="Save a flight to start building your map and yearly recaps."
            onPress={() => router.push('/search')}
            title="Your travel story starts here"
          />
        ) : (
          <>
            {message && <Text style={styles.message}>{message}</Text>}
            <ScrollView
              contentContainerStyle={styles.yearRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <YearChip
                active={selectedYear == null}
                label="All time"
                onPress={() => setSelectedYear(null)}
              />
              {years.map((year) => (
                <YearChip
                  active={selectedYear === year}
                  key={year}
                  label={String(year)}
                  onPress={() => setSelectedYear(year)}
                />
              ))}
            </ScrollView>

            <View style={styles.totalGrid}>
              <TotalCard label="FLIGHTS" value={String(insights.totalFlights)} />
              <TotalCard
                label="DISTANCE"
                value={`${insights.totalDistanceKm.toLocaleString()} km`}
              />
              <TotalCard label="TIME ALOFT" value={formatFlightTime(insights.totalDurationMinutes)} />
            </View>
            {insights.flightsWithDistance < insights.totalFlights && (
              <Text style={styles.coverage}>
                Distance available for {insights.flightsWithDistance} of {insights.totalFlights}{' '}
                flights. Other totals still include every flight.
              </Text>
            )}

            <SectionHeader
              detail={`${insights.routes.length} mapped ${insights.routes.length === 1 ? 'route' : 'routes'}`}
              title="Route map"
            />
            <RouteMap routes={insights.routes} />

            <SectionHeader detail="Most frequent" title="Highlights" />
            <View style={styles.summaryGrid}>
              <RankingCard icon="✈" items={insights.airlines} title="Airlines" />
              <RankingCard icon="◎" items={insights.airports} title="Airports" />
              <RankingCard icon="◇" items={insights.countries} title="Countries" />
              <RankingCard icon="◈" items={insights.aircraft} title="Aircraft" />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function YearChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.yearChip, active && styles.yearChipActive]}
    >
      <Text style={[styles.yearText, active && styles.yearTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalCard}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.totalValue}>
        {value}
      </Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDetail}>{detail}</Text>
    </View>
  );
}

function RankingCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: InsightRanking[];
}) {
  return (
    <View style={styles.rankingCard}>
      <View style={styles.rankingTitleRow}>
        <Text style={styles.rankingIcon}>{icon}</Text>
        <Text style={styles.rankingTitle}>{title}</Text>
      </View>
      {items.length ? (
        items.slice(0, 5).map((item, index) => (
          <View key={item.label} style={styles.rankingRow}>
            <Text numberOfLines={1} style={styles.rankingLabel}>
              {index + 1}. {item.label}
            </Text>
            <Text style={styles.rankingCount}>{item.count}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.unavailable}>Not available yet</Text>
      )}
    </View>
  );
}

function EmptyState({
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
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: palette.background, flex: 1 },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: 120 },
  header: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  eyebrow: { color: palette.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: palette.text, fontSize: 36, fontWeight: '800', letterSpacing: -1.4 },
  recapBadge: {
    backgroundColor: palette.accentSoft,
    borderRadius: 999,
    color: palette.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  yearRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  yearChip: {
    borderColor: palette.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  yearChipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  yearText: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  yearTextActive: { color: palette.background },
  totalGrid: { flexDirection: 'row', gap: spacing.sm },
  totalCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 105,
    padding: 13,
    justifyContent: 'center',
  },
  totalValue: { color: palette.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  totalLabel: {
    color: palette.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 7,
  },
  coverage: { color: palette.muted, fontSize: 11, lineHeight: 16 },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  sectionTitle: { color: palette.text, fontSize: 20, fontWeight: '800' },
  sectionDetail: { color: palette.muted, fontSize: 11 },
  summaryGrid: { gap: spacing.sm },
  rankingCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
  },
  rankingTitleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: 12 },
  rankingIcon: { color: palette.accent, fontSize: 18 },
  rankingTitle: { color: palette.text, fontSize: 16, fontWeight: '800' },
  rankingRow: {
    alignItems: 'center',
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 38,
  },
  rankingLabel: { color: palette.text, flex: 1, fontSize: 13 },
  rankingCount: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  unavailable: { color: palette.muted, fontSize: 13, fontStyle: 'italic' },
  message: { color: palette.warning, fontSize: 13 },
  emptyCard: {
    borderColor: palette.border,
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  emptyTitle: { color: palette.text, fontSize: 18, fontWeight: '800' },
  emptyBody: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  emptyButton: {
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderRadius: 13,
    borderWidth: 1,
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyButtonText: { color: palette.text, fontSize: 14, fontWeight: '700' },
});

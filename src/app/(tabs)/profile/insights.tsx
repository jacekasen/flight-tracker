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

import { layout, palette, radius, spacing, type } from '@/constants/theme';
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
  const periodLabel = selectedYear == null ? 'ALL TIME' : `${selectedYear} RECAP`;
  const airportLabel = `${insights.airports.length} ${insights.airports.length === 1 ? 'airport' : 'airports'}`;
  const favoriteAirline = insights.airlines[0]?.label;
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
          <View style={styles.headerIdentity}>
            <Pressable
              accessibilityLabel="Back to flight paths"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.title}>Recap</Text>
          </View>
          {selectedYear != null && <Text style={styles.recapBadge}>{selectedYear} RECAP</Text>}
        </View>

        {isSessionLoading || (isLoading && flights.length === 0) ? (
          <ActivityIndicator color={palette.accent} />
        ) : !session ? (
          <EmptyState
            action="Sign in"
            body="Sign in to view your route map and travel totals."
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

            <Text style={styles.recapIntro}>Choose a chapter from your travel history.</Text>
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

            <View style={styles.recapHero}>
              <View style={styles.heroGlow} />
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroEyebrow}>{periodLabel}</Text>
                  <Text style={styles.heroValue}>{insights.totalFlights}</Text>
                  <Text style={styles.heroLabel}>FLIGHTS LOGGED</Text>
                </View>
                <View style={styles.heroIcon}>
                  <Text style={styles.heroIconText}>✈</Text>
                </View>
              </View>

              <Text style={styles.heroStory}>
                You connected {airportLabel}
                {favoriteAirline ? `, flying ${favoriteAirline} most often.` : '.'}
              </Text>

              <View style={styles.heroDivider} />
              <View style={styles.heroStats}>
                <HeroMetric
                  label="DISTANCE"
                  value={`${insights.totalDistanceKm.toLocaleString()} km`}
                />
                <View style={styles.metricDivider} />
                <HeroMetric
                  label="TIME ALOFT"
                  value={formatFlightTime(insights.totalDurationMinutes)}
                />
              </View>
            </View>
            {insights.flightsWithDistance < insights.totalFlights && (
              <Text style={styles.coverage}>
                Distance available for {insights.flightsWithDistance} of {insights.totalFlights}{' '}
                flights. Other totals still include every flight.
              </Text>
            )}

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

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroMetric}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
            <Text style={styles.rankingIndex}>{String(index + 1).padStart(2, '0')}</Text>
            <Text numberOfLines={1} style={styles.rankingLabel}>
              {item.label}
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
  content: { gap: spacing.md, padding: layout.pagePadding, paddingBottom: layout.pageBottomPadding },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerIdentity: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  backButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  backIcon: { color: palette.text, fontSize: 30, lineHeight: 31 },
  title: { color: palette.text, ...type.display },
  recapBadge: {
    backgroundColor: palette.accentSoft,
    borderRadius: radius.pill,
    color: palette.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  recapIntro: { color: palette.muted, marginBottom: spacing.sm, ...type.body },
  yearRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  yearChip: {
    borderColor: palette.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  yearChipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  yearText: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  yearTextActive: { color: palette.background },
  recapHero: {
    backgroundColor: '#0B1C2E',
    borderColor: 'rgba(77, 163, 255, 0.35)',
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.lg,
    position: 'relative',
  },
  heroGlow: {
    backgroundColor: palette.accent,
    borderRadius: 120,
    height: 210,
    opacity: 0.1,
    position: 'absolute',
    right: -70,
    top: -90,
    width: 210,
  },
  heroTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroEyebrow: { color: palette.accent, ...type.label },
  heroValue: {
    color: palette.text,
    fontSize: 58,
    fontWeight: '800',
    letterSpacing: -2.5,
    lineHeight: 64,
    marginTop: 3,
  },
  heroLabel: { color: '#B7C6D6', ...type.label },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(77, 163, 255, 0.15)',
    borderColor: 'rgba(77, 163, 255, 0.32)',
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  heroIconText: { color: palette.accent, fontSize: 23 },
  heroStory: {
    color: '#D6E0EA',
    marginTop: spacing.lg,
    maxWidth: 330,
    ...type.body,
  },
  heroDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
  },
  heroStats: { flexDirection: 'row' },
  heroMetric: { flex: 1 },
  metricDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: spacing.md,
    width: StyleSheet.hairlineWidth,
  },
  metricValue: { color: palette.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  metricLabel: {
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
  sectionTitle: { color: palette.text, ...type.title },
  sectionDetail: { color: palette.muted, fontSize: 11 },
  summaryGrid: { gap: spacing.sm },
  rankingCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
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
  rankingIndex: { color: palette.accent, fontSize: 11, fontWeight: '800', width: 24 },
  rankingLabel: { color: palette.text, flex: 1, fontSize: 13 },
  rankingCount: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  unavailable: { color: palette.muted, fontSize: 13, fontStyle: 'italic' },
  message: { color: palette.warning, fontSize: 13 },
  emptyCard: {
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  emptyTitle: { color: palette.text, ...type.title },
  emptyBody: { color: palette.muted, marginTop: spacing.sm, ...type.body },
  emptyButton: {
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyButtonText: { color: palette.text, ...type.bodyStrong },
});

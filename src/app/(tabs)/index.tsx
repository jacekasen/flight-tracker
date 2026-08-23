import { useCallback, useState } from 'react';
import { router, useFocusEffect, type Href } from 'expo-router';
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

import { FlightCard } from '@/components/flight-card';
import { palette, spacing } from '@/constants/theme';
import { flightRowToPreview, loadFlights, type FlightRow } from '@/lib/flights';
import { useAuth } from '@/providers/auth-provider';

export default function FlightsScreen() {
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
        setFlights(await loadFlights());
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

  const upcoming = flights.filter(
    (flight) => Date.parse(flight.scheduled_departure) >= referenceTime,
  );
  const completed = flights
    .filter((flight) => Date.parse(flight.scheduled_departure) < referenceTime)
    .reverse();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
            <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
            <Text style={styles.title}>Flights</Text>
          </View>
          {session && (
            <View style={styles.privateBadge}>
              <Text style={styles.privateText}>PRIVATE</Text>
            </View>
          )}
        </View>

        {isSessionLoading ? (
          <ActivityIndicator color={palette.accent} />
        ) : !session ? (
          <EmptyCard
            action="Sign in"
            body="Sign in or create an account to build a private flight history across devices."
            onPress={() => router.push('/profile')}
            title="Your history starts here"
          />
        ) : isLoading && flights.length === 0 ? (
          <ActivityIndicator color={palette.accent} />
        ) : (
          <>
            {message && (
              <View style={styles.errorCard}>
                <Text style={styles.emptyTitle}>Couldn&apos;t load flights</Text>
                <Text style={styles.emptyBody}>{message}</Text>
                <Pressable onPress={() => void refresh()} style={styles.cardButton}>
                  <Text style={styles.cardButtonText}>Try again</Text>
                </Pressable>
              </View>
            )}

            <Text style={styles.sectionTitle}>Upcoming</Text>
            {upcoming.length ? (
              upcoming.map((flight) => (
                <FlightCard
                  flight={flightRowToPreview(flight)}
                  key={flight.id}
                  onPress={() =>
                    router.push(
                      { pathname: '/flight/[id]', params: { id: flight.id } } as unknown as Href,
                    )
                  }
                />
              ))
            ) : (
              <Text style={styles.sectionEmpty}>No upcoming flights.</Text>
            )}

            <Text style={[styles.sectionTitle, styles.completedTitle]}>Completed</Text>
            {completed.length ? (
              completed.map((flight) => (
                <FlightCard
                  flight={flightRowToPreview(flight)}
                  key={flight.id}
                  onPress={() =>
                    router.push(
                      { pathname: '/flight/[id]', params: { id: flight.id } } as unknown as Href,
                    )
                  }
                />
              ))
            ) : (
              <Text style={styles.sectionEmpty}>No completed flights yet.</Text>
            )}

            {flights.length === 0 && !message && (
              <EmptyCard
                action="Add a flight"
                body="Search by flight number or enter an itinerary manually."
                onPress={() => router.push('/search')}
                title="Ready for the first one?"
              />
            )}
          </>
        )}
      </ScrollView>
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
  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  eyebrow: { color: palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: palette.text, fontSize: 36, fontWeight: '800', letterSpacing: -1.5 },
  privateBadge: {
    backgroundColor: palette.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  privateText: { color: palette.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  sectionTitle: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  completedTitle: { marginTop: spacing.lg },
  sectionEmpty: { color: palette.muted, fontSize: 13, fontStyle: 'italic' },
  emptyCard: {
    borderColor: palette.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  errorCard: {
    borderColor: palette.warning,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
  },
  emptyTitle: { color: palette.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptyBody: { color: palette.muted, fontSize: 14, lineHeight: 20 },
  cardButton: {
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingVertical: 12,
  },
  cardButtonText: { color: palette.text, fontSize: 14, fontWeight: '700' },
});

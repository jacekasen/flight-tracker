import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlightCard } from '@/components/flight-card';
import { palette, spacing } from '@/constants/theme';
import { sampleFlights } from '@/data/sample-flights';

export default function FlightsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
            <Text style={styles.title}>Flights</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Upcoming</Text>
        {sampleFlights.map((flight) => (
          <FlightCard key={flight.id} flight={flight} />
        ))}

        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Ready for the next one?</Text>
          <Text style={styles.emptyBody}>
            Add a flight by number or route. Live data will plug into this timeline next.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.successSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.success },
  liveText: { color: palette.success, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  sectionTitle: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  emptyCard: {
    borderColor: palette.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  emptyTitle: { color: palette.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptyBody: { color: palette.muted, fontSize: 14, lineHeight: 20 },
});

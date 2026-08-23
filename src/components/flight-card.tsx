import { StyleSheet, Text, View } from 'react-native';

import { palette, spacing } from '@/constants/theme';
import type { FlightPreview } from '@/types/flight';

export function FlightCard({ flight }: { flight: FlightPreview }) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.date}>{flight.dateLabel}</Text>
          <Text style={styles.number}>{flight.flightNumber}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.status}>{flight.status}</Text>
        </View>
      </View>

      <View style={styles.route}>
        <View>
          <Text style={styles.airport}>{flight.origin}</Text>
          <Text style={styles.time}>{flight.departureTime}</Text>
        </View>
        <View style={styles.routeLine}>
          <View style={styles.line} />
          <Text style={styles.plane}>✈</Text>
          <View style={styles.line} />
        </View>
        <View style={styles.destination}>
          <Text style={styles.airport}>{flight.destination}</Text>
          <Text style={styles.time}>{flight.arrivalTime}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.detail}>{flight.duration}</Text>
        <Text style={styles.detail}>{flight.aircraft}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  date: { color: palette.muted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  number: { color: palette.text, fontSize: 16, fontWeight: '700' },
  statusBadge: { backgroundColor: palette.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  status: { color: palette.accent, fontSize: 11, fontWeight: '800' },
  route: { flexDirection: 'row', alignItems: 'center' },
  destination: { alignItems: 'flex-end' },
  airport: { color: palette.text, fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  time: { color: palette.muted, fontSize: 13, marginTop: 2 },
  routeLine: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  line: { flex: 1, height: 1, backgroundColor: palette.borderStrong },
  plane: { color: palette.accent, fontSize: 16, marginHorizontal: 7 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, borderTopColor: palette.border, borderTopWidth: 1 },
  detail: { color: palette.muted, fontSize: 12, fontWeight: '600' },
});

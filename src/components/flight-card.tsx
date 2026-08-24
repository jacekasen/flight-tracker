import { Pressable, StyleSheet, Text, View } from 'react-native';

import { layout, palette, radius, spacing, type } from '@/constants/theme';
import type { FlightPreview } from '@/types/flight';

export function FlightCard({
  flight,
  onPress,
  compact = false,
}: {
  flight: FlightPreview;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={`${flight.flightNumber}, ${flight.origin} to ${flight.destination}`}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compactCard,
        pressed && styles.pressed,
      ]}
    >
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
        <View style={styles.endpoint}>
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.city}>
            {flight.origin}
          </Text>
          <Text style={styles.airportMeta}>
            {flight.originCode} · {flight.departureTime}
          </Text>
        </View>
        <View style={styles.routeLine}>
          <View style={styles.line} />
          <Text style={styles.plane}>✈</Text>
          <View style={styles.line} />
        </View>
        <View style={[styles.endpoint, styles.destination]}>
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.city}>
            {flight.destination}
          </Text>
          <Text style={styles.airportMeta}>
            {flight.destinationCode} · {flight.arrivalTime}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.detail}>{flight.duration}</Text>
        <Text style={styles.detail}>{flight.aircraft}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: layout.cardPadding,
    gap: spacing.lg,
  },
  compactCard: { borderRadius: radius.lg, gap: 12, padding: layout.cardPadding },
  pressed: { opacity: 0.72 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  date: { color: palette.muted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  number: { color: palette.text, fontSize: 16, fontWeight: '700' },
  statusBadge: { backgroundColor: palette.accentSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  status: { color: palette.accent, fontSize: 11, fontWeight: '800' },
  route: { alignItems: 'center', flexDirection: 'row' },
  endpoint: { flex: 1 },
  destination: { alignItems: 'flex-end' },
  city: { color: palette.text, maxWidth: '100%', ...type.title },
  airportMeta: { color: palette.muted, fontSize: 12, fontWeight: '600', marginTop: 4 },
  routeLine: { alignItems: 'center', flex: 0.34, flexDirection: 'row', paddingHorizontal: 6 },
  line: { flex: 1, height: 1, backgroundColor: palette.borderStrong },
  plane: { color: palette.accent, fontSize: 15, marginHorizontal: 5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, borderTopColor: palette.border, borderTopWidth: 1 },
  detail: { color: palette.muted, fontSize: 12, fontWeight: '600' },
});

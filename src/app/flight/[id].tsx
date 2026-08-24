import { useEffect, useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlightCard } from '@/components/flight-card';
import { layout, palette, radius, spacing, type } from '@/constants/theme';
import {
  deleteFlight,
  flightRowToPreview,
  loadFlight,
  updateFlight,
  type FlightRow,
} from '@/lib/flights';
import { useAuth } from '@/providers/auth-provider';

function formatDateTime(value: string, timeZone: string | null): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timeZone ?? undefined,
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

export default function FlightDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { session, isLoading: isSessionLoading } = useAuth();
  const [flight, setFlight] = useState<FlightRow | null>(null);
  const [seat, setSeat] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id || !session) return;
    let active = true;
    void loadFlight(id)
      .then((data) => {
        if (!active) return;
        setFlight(data);
        setSeat(data.seat ?? '');
        setNotes(data.notes ?? '');
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : 'Could not load flight.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, session]);

  async function savePersonalDetails() {
    if (!flight) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const updated = await updateFlight(flight.id, {
        seat: seat.trim() || null,
        notes: notes.trim() || null,
      });
      setFlight(updated);
      setMessage('Changes saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save changes.');
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete() {
    if (!flight) return;
    Alert.alert(
      'Delete flight?',
      `${flight.flight_number} will be permanently removed from your history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setIsSaving(true);
            void deleteFlight(flight.id)
              .then(() => router.replace('/'))
              .catch((error) => {
                setMessage(error instanceof Error ? error.message : 'Could not delete flight.');
                setIsSaving(false);
              });
          },
        },
      ],
    );
  }

  if (isSessionLoading || (session && isLoading)) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={palette.accent} />
      </SafeAreaView>
    );
  }

  if (!session || !flight) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>{message ?? 'Sign in to view this flight.'}</Text>
        <Pressable onPress={() => router.replace(session ? '/' : '/profile')} style={styles.button}>
          <Text style={styles.buttonText}>{session ? 'Back to flights' : 'Go to sign in'}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.headingRow}>
            <View>
              <Text style={styles.eyebrow}>{flight.is_manual ? 'MANUAL ENTRY' : 'SAVED FLIGHT'}</Text>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Flight details</Text>
                <Text style={styles.airline} numberOfLines={1}>
                  {flight.airline_name ?? flight.airline_iata ?? 'Unknown airline'}
                </Text>
              </View>
            </View>
            {flight.is_manual && (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push(
                    { pathname: '/manual', params: { id: flight.id } } as unknown as Href,
                  )
                }
                style={styles.editButton}
              >
                <Text style={styles.editText}>Edit itinerary</Text>
              </Pressable>
            )}
          </View>

          <FlightCard compact flight={flightRowToPreview(flight)} />

          <View style={[styles.lowerGrid, width >= 760 && styles.lowerGridWide]}>
            <View style={[styles.detailsCard, width >= 760 && styles.gridPanel]}>
              <View style={styles.cardHeadingRow}>
                <Text style={styles.sectionTitle}>Itinerary</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LOCAL TIMES</Text>
                </View>
              </View>
              <View style={styles.detailGrid}>
                <Detail
                  label="DEPARTURE TIME"
                  value={formatDateTime(flight.scheduled_departure, flight.origin_time_zone)}
                />
                <Detail
                  label="ARRIVAL TIME"
                  value={formatDateTime(flight.scheduled_arrival, flight.destination_time_zone)}
                />
                <Detail
                  label="DEPARTURE"
                  value={[
                    flight.departure_terminal && `Terminal ${flight.departure_terminal}`,
                    flight.departure_gate && `Gate ${flight.departure_gate}`,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Terminal and gate unavailable'}
                />
                <Detail
                  label="ARRIVAL"
                  value={[
                    flight.arrival_terminal && `Terminal ${flight.arrival_terminal}`,
                    flight.arrival_gate && `Gate ${flight.arrival_gate}`,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Terminal and gate unavailable'}
                />
                {flight.aircraft_registration && (
                  <Detail label="AIRCRAFT" value={flight.aircraft_registration} />
                )}
              </View>
            </View>

            <View style={[styles.formCard, width >= 760 && styles.gridPanel]}>
              <View style={styles.cardHeadingRow}>
                <Text style={styles.sectionTitle}>Personal details</Text>
                {message && (
                  <Text style={message === 'Changes saved.' ? styles.success : styles.message}>
                    {message}
                  </Text>
                )}
              </View>
              <View style={styles.inputRow}>
                <View style={styles.seatField}>
                  <Text style={styles.label}>SEAT</Text>
                  <TextInput
                    accessibilityLabel="Seat"
                    autoCapitalize="characters"
                    onChangeText={setSeat}
                    placeholder="—"
                    placeholderTextColor={palette.muted}
                    style={styles.input}
                    value={seat}
                  />
                </View>
                <View style={styles.notesField}>
                  <Text style={styles.label}>NOTES</Text>
                  <TextInput
                    accessibilityLabel="Notes"
                    onChangeText={setNotes}
                    placeholder="Add a note"
                    placeholderTextColor={palette.muted}
                    style={styles.input}
                    value={notes}
                  />
                </View>
              </View>
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={savePersonalDetails}
                  style={({ pressed }) => [
                    styles.button,
                    styles.saveButton,
                    (pressed || isSaving) && styles.pressed,
                  ]}
                >
                  {isSaving ? (
                    <ActivityIndicator color={palette.background} />
                  ) : (
                    <Text style={styles.buttonText}>Save changes</Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={confirmDelete}
                  style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                >
                  <Text style={styles.deleteText}>Delete flight</Text>
                </Pressable>
              </View>
            </View>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: palette.background, flex: 1 },
  centered: {
    alignItems: 'center',
    backgroundColor: palette.background,
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: { flex: 1, gap: spacing.md, padding: layout.pagePadding },
  headingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: palette.muted, ...type.eyebrow },
  titleRow: { alignItems: 'baseline', flexDirection: 'row', gap: 10 },
  title: { color: palette.text, ...type.display },
  airline: { color: palette.muted, fontSize: 13, fontWeight: '600', maxWidth: 180 },
  editButton: {
    borderColor: palette.borderStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  editText: { color: palette.accent, fontSize: 12, fontWeight: '700' },
  detailsCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: spacing.md,
  },
  lowerGrid: { flex: 1, gap: 12, minHeight: 0 },
  lowerGridWide: { flexDirection: 'row' },
  gridPanel: { flex: 1 },
  cardHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: palette.text, ...type.title },
  liveBadge: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  liveDot: { backgroundColor: palette.success, borderRadius: 3, height: 6, width: 6 },
  liveText: { color: palette.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  detail: { gap: 3, minHeight: 39, width: '50%' },
  label: { color: palette.muted, ...type.label },
  detailValue: { color: palette.text, fontSize: 13, lineHeight: 18, paddingRight: 8 },
  formCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: spacing.md,
  },
  inputRow: { flexDirection: 'row', gap: 10 },
  seatField: { gap: 5, width: 82 },
  notesField: { flex: 1, gap: 5 },
  input: {
    borderColor: palette.borderStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: palette.text,
    fontSize: 15,
    paddingHorizontal: 14,
    height: layout.controlHeight,
    paddingVertical: 10,
  },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 'auto' },
  button: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.lg,
  },
  saveButton: { flex: 1 },
  buttonText: { color: palette.background, ...type.button },
  deleteButton: {
    alignItems: 'center',
    borderColor: palette.warning,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
  },
  deleteText: { color: palette.warning, fontSize: 14, fontWeight: '700' },
  message: { color: palette.warning, fontSize: 13 },
  success: { color: palette.success, fontSize: 13 },
  pressed: { opacity: 0.6 },
});

import { useEffect, useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlightCard } from '@/components/flight-card';
import { palette, spacing } from '@/constants/theme';
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headingRow}>
            <View>
              <Text style={styles.eyebrow}>{flight.is_manual ? 'MANUAL ENTRY' : 'SAVED FLIGHT'}</Text>
              <Text style={styles.title}>Flight details</Text>
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

          <Text style={styles.airline}>
            {flight.airline_name ?? flight.airline_iata ?? 'Unknown airline'}
          </Text>
          <FlightCard flight={flightRowToPreview(flight)} />

          <View style={styles.detailsCard}>
            <Detail
              label="SCHEDULED DEPARTURE"
              value={formatDateTime(flight.scheduled_departure, flight.origin_time_zone)}
            />
            <Detail
              label="SCHEDULED ARRIVAL"
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
              <Detail label="AIRCRAFT REGISTRATION" value={flight.aircraft_registration} />
            )}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Personal details</Text>
            <Text style={styles.label}>SEAT</Text>
            <TextInput
              accessibilityLabel="Seat"
              autoCapitalize="characters"
              onChangeText={setSeat}
              placeholder="Not added"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={seat}
            />
            <Text style={styles.label}>NOTES</Text>
            <TextInput
              accessibilityLabel="Notes"
              multiline
              onChangeText={setNotes}
              placeholder="No notes yet"
              placeholderTextColor={palette.muted}
              style={[styles.input, styles.notesInput]}
              textAlignVertical="top"
              value={notes}
            />
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={savePersonalDetails}
              style={({ pressed }) => [
                styles.button,
                (pressed || isSaving) && styles.pressed,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color={palette.background} />
              ) : (
                <Text style={styles.buttonText}>Save personal details</Text>
              )}
            </Pressable>
          </View>

          {message && (
            <Text style={message === 'Changes saved.' ? styles.success : styles.message}>
              {message}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={confirmDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Text style={styles.deleteText}>Delete flight</Text>
          </Pressable>
        </ScrollView>
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
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: 48 },
  headingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: palette.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: palette.text, fontSize: 29, fontWeight: '800' },
  airline: { color: palette.muted, fontSize: 14 },
  editButton: {
    borderColor: palette.borderStrong,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  editText: { color: palette.accent, fontSize: 12, fontWeight: '700' },
  detailsCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  detail: { gap: 4 },
  label: { color: palette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  detailValue: { color: palette.text, fontSize: 14, lineHeight: 20 },
  formCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: spacing.lg,
  },
  formTitle: { color: palette.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  input: {
    borderColor: palette.borderStrong,
    borderRadius: 13,
    borderWidth: 1,
    color: palette.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  notesInput: { minHeight: 100 },
  button: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  buttonText: { color: palette.background, fontSize: 15, fontWeight: '800' },
  deleteButton: {
    alignItems: 'center',
    borderColor: palette.warning,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  deleteText: { color: palette.warning, fontSize: 14, fontWeight: '700' },
  message: { color: palette.warning, fontSize: 13 },
  success: { color: palette.success, fontSize: 13 },
  pressed: { opacity: 0.6 },
});

import { useEffect, useState } from 'react';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { FormField } from '@/components/ui/form-field';
import { layout, palette, radius, spacing, type } from '@/constants/theme';
import { toErrorMessage } from '@/lib/errors';
import {
  FlightDataError,
  loadFlight,
  saveFlight,
  updateFlight,
  type FlightInsert,
} from '@/lib/flights';
import { normalizeFlightNumberInput } from '@/lib/flight-number';
import { flightDetailsRoute } from '@/lib/routes';
import { trimmedOrNull } from '@/lib/strings';
import { useAuth } from '@/providers/auth-provider';

type FieldName = 'flightNumber' | 'airline' | 'origin' | 'destination' | 'time';
type Errors = Partial<Record<FieldName, string>>;

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}) {
  function change(_event: DateTimePickerEvent, date?: Date) {
    if (date) onChange(date);
  }

  function open(mode: 'date' | 'time') {
    DateTimePickerAndroid.open({ value, mode, onChange: change });
  }

  return (
    <View style={styles.dateCard}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <View style={styles.pickerRow}>
          <DateTimePicker mode="date" onChange={change} themeVariant="dark" value={value} />
          <DateTimePicker mode="time" onChange={change} themeVariant="dark" value={value} />
        </View>
      ) : (
        <View style={styles.pickerRow}>
          <Pressable onPress={() => open('date')} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>
              {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value)}
            </Text>
          </Pressable>
          <Pressable onPress={() => open('time')} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>
              {new Intl.DateTimeFormat(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              }).format(value)}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function ManualEntryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departure, setDeparture] = useState(() => new Date());
  const [arrival, setArrival] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [seat, setSeat] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return;
    let active = true;
    void loadFlight(id)
      .then((flight) => {
        if (!active) return;
        if (!flight.is_manual) {
          setMessage('Only manually entered itineraries can be changed.');
          return;
        }
        setFlightNumber(flight.flight_number);
        setAirline(flight.airline_name ?? flight.airline_iata ?? '');
        setOrigin(flight.origin_iata);
        setDestination(flight.destination_iata);
        setDeparture(new Date(flight.scheduled_departure));
        setArrival(new Date(flight.scheduled_arrival));
        setSeat(flight.seat ?? '');
        setNotes(flight.notes ?? '');
      })
      .catch((error) => {
        if (active) setMessage(toErrorMessage(error, 'Could not load flight.'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  function buildInsert(): FlightInsert | null {
    const nextErrors: Errors = {};
    const normalizedFlight = normalizeFlightNumberInput(flightNumber);
    const normalizedOrigin = origin.trim().toUpperCase();
    const normalizedDestination = destination.trim().toUpperCase();
    const normalizedAirline = airline.trim();

    if (!normalizedFlight) {
      nextErrors.flightNumber = 'Enter a valid flight number, such as F9 1191.';
    }
    if (!normalizedAirline) nextErrors.airline = 'Airline is required.';
    if (!/^[A-Z]{3}$/.test(normalizedOrigin)) {
      nextErrors.origin = 'Use a three-letter IATA code.';
    }
    if (!/^[A-Z]{3}$/.test(normalizedDestination)) {
      nextErrors.destination = 'Use a three-letter IATA code.';
    }
    if (arrival.getTime() <= departure.getTime()) {
      nextErrors.time = 'Arrival must occur after departure.';
    }
    if (!session) setMessage('Sign in before saving a manual flight.');

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !session || !normalizedFlight) return null;

    const looksLikeAirlineCode = /^[A-Z0-9]{2,3}$/.test(normalizedAirline.toUpperCase());
    const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      user_id: session.user.id,
      flight_number: normalizedFlight,
      airline_iata: looksLikeAirlineCode ? normalizedAirline.toUpperCase() : null,
      airline_name: looksLikeAirlineCode ? null : normalizedAirline,
      origin_iata: normalizedOrigin,
      destination_iata: normalizedDestination,
      scheduled_departure: departure.toISOString(),
      scheduled_arrival: arrival.toISOString(),
      origin_time_zone: deviceTimeZone,
      destination_time_zone: deviceTimeZone,
      status: 'scheduled',
      seat: trimmedOrNull(seat),
      notes: trimmedOrNull(notes),
      is_manual: true,
    };
  }

  async function submit() {
    setMessage(null);
    const insert = buildInsert();
    if (!insert) return;

    setIsSaving(true);
    try {
      const saved = id
        ? await updateFlight(id, {
            flight_number: insert.flight_number,
            airline_iata: insert.airline_iata,
            airline_name: insert.airline_name,
            origin_iata: insert.origin_iata,
            destination_iata: insert.destination_iata,
            scheduled_departure: insert.scheduled_departure,
            scheduled_arrival: insert.scheduled_arrival,
            origin_time_zone: insert.origin_time_zone,
            destination_time_zone: insert.destination_time_zone,
            seat: insert.seat,
            notes: insert.notes,
          })
        : await saveFlight(insert);
      router.replace(flightDetailsRoute(saved.id));
    } catch (error) {
      setMessage(
        error instanceof FlightDataError
          ? error.message
          : 'Could not save this flight. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
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
          <Text style={styles.eyebrow}>NO LOOKUP NEEDED</Text>
          <Text style={styles.title}>{id ? 'Edit manual flight' : 'Enter flight manually'}</Text>
          <Text style={styles.helper}>
            Required itinerary fields are marked. Times use this device&apos;s time zone.
          </Text>

          {isLoading ? (
            <ActivityIndicator color={palette.accent} />
          ) : (
          <View style={styles.form}>
            <FormField
              autoCapitalize="characters"
              autoCorrect={false}
              error={errors.flightNumber}
              label="FLIGHT NUMBER"
              onChangeText={setFlightNumber}
              placeholder="UA120"
              value={flightNumber}
            />
            <FormField
              autoCapitalize="characters"
              autoCorrect={false}
              error={errors.airline}
              label="AIRLINE NAME OR IATA CODE"
              onChangeText={setAirline}
              placeholder="United Airlines or UA"
              value={airline}
            />
            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <FormField
                  autoCapitalize="characters"
                  autoCorrect={false}
                  error={errors.origin}
                  label="ORIGIN"
                  maxLength={3}
                  onChangeText={setOrigin}
                  placeholder="SFO"
                  value={origin}
                />
              </View>
              <View style={styles.column}>
                <FormField
                  autoCapitalize="characters"
                  autoCorrect={false}
                  error={errors.destination}
                  label="DESTINATION"
                  maxLength={3}
                  onChangeText={setDestination}
                  placeholder="JFK"
                  value={destination}
                />
              </View>
            </View>
            <DateTimeField label="DEPARTURE" onChange={setDeparture} value={departure} />
            <DateTimeField label="ARRIVAL" onChange={setArrival} value={arrival} />
            {errors.time && <Text style={styles.error}>{errors.time}</Text>}
            <FormField
              autoCapitalize="characters"
              autoCorrect={false}
              label="SEAT · OPTIONAL"
              onChangeText={setSeat}
              placeholder="14A"
              value={seat}
            />
            <FormField
              accessibilityLabel="Notes"
              label="NOTES · OPTIONAL"
              multiline
              onChangeText={setNotes}
              placeholder="Trip, companions, memories…"
              value={notes}
            />
          </View>
          )}

          {message && <Text style={styles.message}>{message}</Text>}
          {!session && (
            <ActionButton
              label="Sign in"
              onPress={() => router.push('/profile')}
              variant="secondary"
            />
          )}
          <ActionButton
            disabled={isSaving || isLoading || !session}
            label={id ? 'Save changes' : 'Save manual flight'}
            loading={isSaving}
            onPress={() => void submit()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: palette.background, flex: 1 },
  content: { gap: spacing.md, padding: layout.pagePadding, paddingBottom: layout.pageBottomPadding },
  eyebrow: { color: palette.muted, ...type.eyebrow },
  title: { color: palette.text, ...type.display },
  helper: { color: palette.muted, ...type.body },
  form: { gap: 14, marginTop: spacing.sm },
  label: { color: palette.muted, ...type.label },
  error: { color: palette.warning, fontSize: 12 },
  twoColumns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
  dateCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 7,
    padding: 14,
  },
  pickerRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  dateButton: {
    borderColor: palette.borderStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  dateButtonText: { color: palette.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  message: { color: palette.warning, fontSize: 13, lineHeight: 19 },
});

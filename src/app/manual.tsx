import { useEffect, useState } from 'react';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  ActivityIndicator,
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

import { palette, spacing } from '@/constants/theme';
import {
  FlightDataError,
  loadFlight,
  saveFlight,
  updateFlight,
  type FlightInsert,
} from '@/lib/flights';
import { useAuth } from '@/providers/auth-provider';

type FieldName = 'flightNumber' | 'airline' | 'origin' | 'destination' | 'time';
type Errors = Partial<Record<FieldName, string>>;

function clean(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

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
        if (active) setMessage(error instanceof Error ? error.message : 'Could not load flight.');
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
    const normalizedFlight = flightNumber.replace(/\s+/g, '').toUpperCase();
    const normalizedOrigin = origin.trim().toUpperCase();
    const normalizedDestination = destination.trim().toUpperCase();
    const normalizedAirline = airline.trim();

    if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(normalizedFlight)) {
      nextErrors.flightNumber = 'Enter a valid flight number, such as UA120.';
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
    if (Object.keys(nextErrors).length || !session) return null;

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
      seat: clean(seat),
      notes: clean(notes),
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
      router.replace(
        { pathname: '/flight/[id]', params: { id: saved.id } } as unknown as Href,
      );
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
            <Field
              error={errors.flightNumber}
              label="FLIGHT NUMBER"
              onChangeText={setFlightNumber}
              placeholder="UA120"
              value={flightNumber}
            />
            <Field
              error={errors.airline}
              label="AIRLINE NAME OR IATA CODE"
              onChangeText={setAirline}
              placeholder="United Airlines or UA"
              value={airline}
            />
            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <Field
                  error={errors.origin}
                  label="ORIGIN"
                  maxLength={3}
                  onChangeText={setOrigin}
                  placeholder="SFO"
                  value={origin}
                />
              </View>
              <View style={styles.column}>
                <Field
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
            <Field
              label="SEAT · OPTIONAL"
              onChangeText={setSeat}
              placeholder="14A"
              value={seat}
            />
            <Text style={styles.label}>NOTES · OPTIONAL</Text>
            <TextInput
              accessibilityLabel="Notes"
              multiline
              onChangeText={setNotes}
              placeholder="Trip, companions, memories…"
              placeholderTextColor={palette.muted}
              style={[styles.input, styles.notesInput]}
              textAlignVertical="top"
              value={notes}
            />
          </View>
          )}

          {message && <Text style={styles.message}>{message}</Text>}
          {!session && (
            <Pressable onPress={() => router.push('/profile')} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Sign in</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={isSaving || isLoading || !session}
            onPress={submit}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSaving || isLoading || !session) && styles.pressed,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={palette.background} />
            ) : (
              <Text style={styles.primaryText}>{id ? 'Save changes' : 'Save manual flight'}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  error,
  ...props
}: {
  label: string;
  error?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholderTextColor={palette.muted}
        style={[styles.input, error && styles.inputError]}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: palette.background, flex: 1 },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: 48 },
  eyebrow: { color: palette.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: palette.text, fontSize: 30, fontWeight: '800' },
  helper: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  form: { gap: 14, marginTop: spacing.sm },
  field: { gap: 7 },
  label: { color: palette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 13,
    borderWidth: 1,
    color: palette.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputError: { borderColor: palette.warning },
  error: { color: palette.warning, fontSize: 12 },
  twoColumns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
  dateCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 15,
    borderWidth: 1,
    gap: 7,
    padding: 14,
  },
  pickerRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  dateButton: {
    borderColor: palette.borderStrong,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  dateButtonText: { color: palette.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  notesInput: { minHeight: 100 },
  message: { color: palette.warning, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
  },
  primaryText: { color: palette.background, fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  secondaryText: { color: palette.text, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});

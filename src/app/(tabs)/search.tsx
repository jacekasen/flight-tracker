import { useState } from 'react';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Keyboard,
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
import { FlightSearchError, searchFlights, toFlightPreview } from '@/lib/flight-search';
import type { FlightPreview } from '@/types/flight';

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSelectedDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'results'; flights: FlightPreview[] };

export default function SearchScreen() {
  const [flightNumber, setFlightNumber] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [step, setStep] = useState<'flight' | 'date'>('flight');
  const [state, setState] = useState<SearchState>({ kind: 'idle' });

  const isLoading = state.kind === 'loading';

  function handleContinue() {
    Keyboard.dismiss();
    const normalized = flightNumber.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(normalized)) {
      setState({ kind: 'error', message: 'Enter a valid flight number, such as UA 120.' });
      return;
    }

    setFlightNumber(normalized);
    setState({ kind: 'idle' });
    setStep('date');

    if (Platform.OS === 'android') {
      openAndroidDatePicker();
    }
  }

  function handleDateChange(_event: DateTimePickerEvent, date?: Date) {
    if (date) setSelectedDate(date);
  }

  function openAndroidDatePicker() {
    DateTimePickerAndroid.open({
      value: selectedDate,
      mode: 'date',
      onChange: handleDateChange,
    });
  }

  function editFlightNumber() {
    setStep('flight');
    setState({ kind: 'idle' });
  }

  async function handleSearch() {
    Keyboard.dismiss();
    const date = toIsoDate(selectedDate);

    setState({ kind: 'loading' });
    try {
      const results = await searchFlights({ flightNumber, date });
      const flights = results.map((result) => toFlightPreview(result, date));
      setState({ kind: 'results', flights });
    } catch (error) {
      const message =
        error instanceof FlightSearchError
          ? error.message
          : 'Something went wrong. Please try again.';
      setState({ kind: 'error', message });
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>TRACK SOMETHING NEW</Text>
        <Text style={styles.title}>Add a flight</Text>

        {step === 'flight' ? (
          <>
            <Text style={styles.stepLabel}>1 · FLIGHT NUMBER</Text>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                accessibilityLabel="Flight number"
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                onChangeText={setFlightNumber}
                onSubmitEditing={handleContinue}
                placeholder="Flight number, e.g. UA 120"
                placeholderTextColor={palette.muted}
                returnKeyType="next"
                style={styles.input}
                value={flightNumber}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleContinue}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.flightSummary}>
              <View>
                <Text style={styles.stepLabel}>FLIGHT</Text>
                <Text style={styles.flightSummaryNumber}>{flightNumber}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={editFlightNumber}>
                <Text style={styles.changeText}>Change</Text>
              </Pressable>
            </View>

            <Text style={styles.stepLabel}>2 · DEPARTURE DATE</Text>

            {Platform.OS === 'ios' ? (
              <View style={styles.datePickerCard}>
                <DateTimePicker
                  accentColor={palette.accent}
                  display="inline"
                  mode="date"
                  onChange={handleDateChange}
                  themeVariant="dark"
                  value={selectedDate}
                />
              </View>
            ) : (
              <Pressable
                accessibilityLabel="Choose departure date"
                accessibilityRole="button"
                onPress={openAndroidDatePicker}
                style={({ pressed }) => [
                  styles.dateButton,
                  pressed && styles.dateButtonPressed,
                ]}
              >
                <Text style={styles.calendarIcon}>▦</Text>
                <View style={styles.dateButtonText}>
                  <Text style={styles.dateButtonLabel}>Departure date</Text>
                  <Text style={styles.dateButtonValue}>{formatSelectedDate(selectedDate)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={isLoading}
              onPress={handleSearch}
              style={({ pressed }) => [
                styles.button,
                (pressed || isLoading) && styles.buttonPressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={palette.background} />
              ) : (
                <Text style={styles.buttonText}>Search {flightNumber}</Text>
              )}
            </Pressable>
          </>
        )}

        <View style={styles.results}>
          {state.kind === 'error' && (
            <View style={styles.messageCard}>
              <Text style={styles.messageTitle}>Couldn&apos;t search</Text>
              <Text style={styles.messageBody}>{state.message}</Text>
            </View>
          )}

          {state.kind === 'results' && state.flights.length === 0 && (
            <View style={styles.messageCard}>
              <Text style={styles.messageTitle}>No flights found</Text>
              <Text style={styles.messageBody}>
                We couldn&apos;t find that flight on the selected date. Double-check the number and
                date, then try again.
              </Text>
            </View>
          )}

          {state.kind === 'results' &&
            state.flights.map((flight) => <FlightCard key={flight.id} flight={flight} />)}

          {state.kind === 'idle' && step === 'flight' && (
            <Text style={styles.hint}>
              Start with the airline code and flight number. You&apos;ll choose the date next.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
  eyebrow: { color: palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: palette.text, fontSize: 34, fontWeight: '800', marginBottom: spacing.sm },
  stepLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  searchIcon: { color: palette.accent, fontSize: 22 },
  input: { flex: 1, color: palette.text, fontSize: 16, paddingVertical: 18 },
  button: {
    backgroundColor: palette.accent,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: palette.background, fontSize: 16, fontWeight: '800' },
  flightSummary: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  flightSummaryNumber: { color: palette.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  changeText: { color: palette.accent, fontSize: 14, fontWeight: '700' },
  datePickerCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  dateButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.md,
  },
  dateButtonPressed: { borderColor: palette.borderStrong },
  calendarIcon: { color: palette.accent, fontSize: 22, marginRight: 12 },
  dateButtonText: { flex: 1 },
  dateButtonLabel: { color: palette.muted, fontSize: 12, marginBottom: 3 },
  dateButtonValue: { color: palette.text, fontSize: 16, fontWeight: '700' },
  chevron: { color: palette.muted, fontSize: 28 },
  results: { gap: spacing.md, marginTop: spacing.sm },
  hint: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  messageCard: {
    borderColor: palette.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: spacing.lg,
  },
  messageTitle: { color: palette.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  messageBody: { color: palette.muted, fontSize: 14, lineHeight: 20 },
});

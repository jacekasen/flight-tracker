import { useMemo, useState } from 'react';
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

import { FlightCard } from '@/components/flight-card';
import { palette, spacing } from '@/constants/theme';
import { toFlightPreview, type FlightSearchResult } from '@/lib/flight-search';
import { FlightDataError, saveFlight, searchResultToInsert } from '@/lib/flights';
import { useAuth } from '@/providers/auth-provider';

function parseResult(value: string | string[] | undefined): FlightSearchResult | null {
  if (!value || Array.isArray(value)) return null;
  try {
    return JSON.parse(value) as FlightSearchResult;
  } catch {
    return null;
  }
}

function formatScheduled(value: string | null): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return 'Scheduled time unavailable';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  const hour = Number(match[4]);
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${day}, ${hour % 12 || 12}:${match[5]} ${period}`;
}

export default function ConfirmFlightScreen() {
  const params = useLocalSearchParams<{ result?: string | string[] }>();
  const { session } = useAuth();
  const result = useMemo(() => parseResult(params.result), [params.result]);
  const [seat, setSeat] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fallbackDate =
    result?.departure.scheduledUtc?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const preview = result ? toFlightPreview(result, fallbackDate) : null;

  async function save() {
    if (!session || !result) {
      setMessage('Sign in again before saving this flight.');
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const insert = searchResultToInsert(result, session.user.id, { seat, notes });
      const saved = await saveFlight(insert);
      router.replace(
        { pathname: '/flight/[id]', params: { id: saved.id } } as unknown as Href,
      );
    } catch (error) {
      setMessage(
        error instanceof FlightDataError
          ? error.message
          : 'Could not save this flight. Your notes are still here—please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!result || !preview) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Flight result unavailable</Text>
          <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Return to search</Text>
          </Pressable>
        </View>
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
          <Text style={styles.eyebrow}>REVIEW ITINERARY</Text>
          <Text style={styles.title}>Is this your flight?</Text>
          <Text style={styles.airline}>
            {result.airlineName ?? result.airlineIata ?? 'Airline unavailable'}
          </Text>
          <FlightCard flight={preview} />
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleColumn}>
              <Text style={styles.label}>SCHEDULED DEPARTURE</Text>
              <Text style={styles.scheduleValue}>
                {formatScheduled(result.departure.scheduledLocal)}
              </Text>
            </View>
            <View style={styles.scheduleColumn}>
              <Text style={styles.label}>SCHEDULED ARRIVAL</Text>
              <Text style={styles.scheduleValue}>
                {formatScheduled(result.arrival.scheduledLocal)}
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Personal details</Text>
            <Text style={styles.label}>SEAT · OPTIONAL</Text>
            <TextInput
              accessibilityLabel="Seat"
              autoCapitalize="characters"
              onChangeText={setSeat}
              placeholder="e.g. 14A"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={seat}
            />
            <Text style={styles.label}>NOTES · OPTIONAL</Text>
            <TextInput
              accessibilityLabel="Personal notes"
              multiline
              onChangeText={setNotes}
              placeholder="Trip, companions, memories…"
              placeholderTextColor={palette.muted}
              style={[styles.input, styles.notesInput]}
              textAlignVertical="top"
              value={notes}
            />
          </View>

          {message && <Text style={styles.message}>{message}</Text>}
          {!session && (
            <Pressable onPress={() => router.push('/profile')} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Sign in to save</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={isSaving || !session}
            onPress={save}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSaving || !session) && styles.pressed,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={palette.background} />
            ) : (
              <Text style={styles.primaryText}>Save to my flights</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: palette.background, flex: 1 },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: 48 },
  centered: { flex: 1, gap: spacing.lg, justifyContent: 'center', padding: spacing.lg },
  eyebrow: { color: palette.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: palette.text, fontSize: 30, fontWeight: '800' },
  airline: { color: palette.muted, fontSize: 14, marginTop: -8 },
  scheduleCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  scheduleColumn: { flex: 1, gap: 5 },
  scheduleValue: { color: palette.text, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  formCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  formTitle: { color: palette.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  label: { color: palette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
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
  errorTitle: { color: palette.text, fontSize: 22, fontWeight: '800' },
});

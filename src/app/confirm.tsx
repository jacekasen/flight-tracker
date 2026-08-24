import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlightCard } from '@/components/flight-card';
import { ActionButton } from '@/components/ui/action-button';
import { FormField } from '@/components/ui/form-field';
import { layout, palette, radius, spacing, type } from '@/constants/theme';
import { toFlightPreview, type FlightSearchResult } from '@/lib/flight-search';
import { FlightDataError, saveFlight, searchResultToInsert } from '@/lib/flights';
import { flightDetailsRoute } from '@/lib/routes';
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
      router.replace(flightDetailsRoute(saved.id));
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
          <ActionButton label="Return to search" onPress={() => router.back()} variant="secondary" />
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
            <FormField
              accessibilityLabel="Seat"
              autoCapitalize="characters"
              label="SEAT · OPTIONAL"
              onChangeText={setSeat}
              placeholder="e.g. 14A"
              value={seat}
            />
            <FormField
              accessibilityLabel="Personal notes"
              label="NOTES · OPTIONAL"
              multiline
              onChangeText={setNotes}
              placeholder="Trip, companions, memories…"
              value={notes}
            />
          </View>

          {message && <Text style={styles.message}>{message}</Text>}
          {!session && (
            <ActionButton
              label="Sign in to save"
              onPress={() => router.push('/profile')}
              variant="secondary"
            />
          )}
          <ActionButton
            disabled={isSaving || !session}
            label="Save to my flights"
            loading={isSaving}
            onPress={() => void save()}
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
  centered: { flex: 1, gap: spacing.lg, justifyContent: 'center', padding: spacing.lg },
  eyebrow: { color: palette.muted, ...type.eyebrow },
  title: { color: palette.text, ...type.display },
  airline: { color: palette.muted, marginTop: -8, ...type.body },
  scheduleCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: layout.cardPadding,
  },
  scheduleColumn: { flex: 1, gap: 5 },
  scheduleValue: { color: palette.text, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  formCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 10,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  formTitle: { color: palette.text, marginBottom: 4, ...type.title },
  label: { color: palette.muted, ...type.label },
  message: { color: palette.warning, fontSize: 13, lineHeight: 19 },
  errorTitle: { color: palette.text, fontSize: 22, fontWeight: '800' },
});

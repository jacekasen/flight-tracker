import { getSupabase } from '@/lib/supabase';
import type { FlightPreview } from '@/types/flight';

const FUNCTION_NAME = 'search-flights';

type FlightEndpoint = {
  iata: string | null;
  icao: string | null;
  name: string | null;
  municipality: string | null;
  timeZone: string | null;
  terminal: string | null;
  gate: string | null;
};

type FlightTimes = {
  scheduledUtc: string | null;
  scheduledLocal: string | null;
  actualUtc: string | null;
  actualLocal: string | null;
};

// Mirror of the normalized contract returned by the search-flights Edge Function.
export type FlightSearchResult = {
  id: string;
  flightNumber: string;
  airlineName: string | null;
  airlineIata: string | null;
  status: string;
  origin: FlightEndpoint;
  destination: FlightEndpoint;
  departure: FlightTimes;
  arrival: FlightTimes;
  durationMinutes: number | null;
  distanceKm: number | null;
  aircraft: { model: string | null; reg: string | null };
  isCargo: boolean;
  codeshareStatus: string | null;
};

type SearchResponse = {
  query: { flightNumber: string; date: string };
  results: FlightSearchResult[];
};

type FunctionError = {
  error?: { code?: string; message?: string };
};

export type SearchFlightsArgs = {
  flightNumber: string;
  date: string;
};

// User-facing error with a stable code so the UI can branch if needed.
export class FlightSearchError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'FlightSearchError';
    this.code = code;
  }
}

export async function searchFlights({
  flightNumber,
  date,
}: SearchFlightsArgs): Promise<FlightSearchResult[]> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch {
    throw new FlightSearchError(
      'not_configured',
      'Supabase is not configured. Add your project URL and key to .env.',
    );
  }

  const { data, error } = await supabase.functions.invoke<SearchResponse>(FUNCTION_NAME, {
    body: { flightNumber, date },
  });

  if (error) {
    // Edge Functions surface non-2xx bodies via FunctionsHttpError.context.
    const parsed = await extractFunctionError(error);
    throw new FlightSearchError(parsed.code, parsed.message);
  }

  if (!data || !Array.isArray(data.results)) {
    throw new FlightSearchError('upstream_error', 'Received an unexpected response from search.');
  }

  return data.results;
}

async function extractFunctionError(
  error: unknown,
): Promise<{ code: string; message: string }> {
  const fallback = {
    code: 'request_failed',
    message: 'Something went wrong searching for that flight. Please try again.',
  };

  const context = (error as { context?: Response }).context;
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as FunctionError;
      if (body?.error?.message) {
        return {
          code: body.error.code ?? fallback.code,
          message: body.error.message,
        };
      }
    } catch {
      // Ignore and fall through to the default message.
    }
  }

  return fallback;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// AeroDataBox local times look like "2026-01-03 08:15-08:00" (sometimes with a
// "T" separator). Parse the wall-clock parts directly so we display the
// airport's local time without applying the device time zone.
function parseLocalParts(local: string | null): { y: number; mo: number; d: number; h: number; mi: number } | null {
  if (!local) return null;
  const match = local.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return null;
  return {
    y: Number(match[1]),
    mo: Number(match[2]),
    d: Number(match[3]),
    h: Number(match[4]),
    mi: Number(match[5]),
  };
}

function formatLocalTime(local: string | null): string {
  const parts = parseLocalParts(local);
  if (!parts) return '--:--';
  const period = parts.h >= 12 ? 'PM' : 'AM';
  const hour12 = parts.h % 12 === 0 ? 12 : parts.h % 12;
  const minute = String(parts.mi).padStart(2, '0');
  return `${hour12}:${minute} ${period}`;
}

function formatDateLabel(local: string | null, fallbackDate: string): string {
  const parts = parseLocalParts(local);
  if (parts) {
    const date = new Date(Date.UTC(parts.y, parts.mo - 1, parts.d));
    return `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[parts.mo - 1]} ${parts.d}`;
  }
  const fallback = fallbackDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (fallback) {
    const y = Number(fallback[1]);
    const mo = Number(fallback[2]);
    const d = Number(fallback[3]);
    const date = new Date(Date.UTC(y, mo - 1, d));
    return `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[mo - 1]} ${d}`;
  }
  return fallbackDate;
}

function formatDuration(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return 'Duration N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatStatus(status: string): string {
  // Split PascalCase provider statuses (e.g. "EnRoute") into readable text.
  const spaced = status.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.toUpperCase();
}

// Adapts a normalized search result into the FlightPreview the FlightCard uses.
// Prefers actual times, falling back to scheduled, then a placeholder.
export function toFlightPreview(result: FlightSearchResult, fallbackDate: string): FlightPreview {
  const depLocal = result.departure.actualLocal ?? result.departure.scheduledLocal;
  const arrLocal = result.arrival.actualLocal ?? result.arrival.scheduledLocal;

  return {
    id: result.id,
    flightNumber: result.flightNumber || 'Unknown flight',
    dateLabel: formatDateLabel(depLocal, fallbackDate),
    origin: result.origin.iata ?? result.origin.icao ?? '???',
    destination: result.destination.iata ?? result.destination.icao ?? '???',
    departureTime: formatLocalTime(depLocal),
    arrivalTime: formatLocalTime(arrLocal),
    status: formatStatus(result.status),
    duration: formatDuration(result.durationMinutes),
    aircraft: result.aircraft.model ?? 'Aircraft N/A',
  };
}

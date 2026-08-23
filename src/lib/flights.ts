import { getSupabase } from '@/lib/supabase';
import type { FlightSearchResult } from '@/lib/flight-search';
import type { Database } from '@/types/database';
import type { FlightPreview } from '@/types/flight';

export type FlightRow = Database['public']['Tables']['flights']['Row'];
export type FlightInsert = Database['public']['Tables']['flights']['Insert'];

export class FlightDataError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'FlightDataError';
    this.code = code;
  }
}

function nullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function requireAirport(value: string | null, label: string): string {
  const airport = value?.trim().toUpperCase();
  if (!airport || !/^[A-Z]{3}$/.test(airport)) {
    throw new FlightDataError('invalid_flight', `${label} needs a valid three-letter IATA code.`);
  }
  return airport;
}

function requireTimestamp(value: string | null, label: string): string {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new FlightDataError('invalid_flight', `${label} is missing from this result.`);
  }
  return new Date(value).toISOString();
}

function throwDataError(error: { code?: string; message: string } | null): never {
  if (error?.code === '23505') {
    throw new FlightDataError('duplicate', 'This flight is already in your history.');
  }
  throw new FlightDataError('database_error', error?.message ?? 'Could not save this flight.');
}

export function searchResultToInsert(
  result: FlightSearchResult,
  userId: string,
  personal: { seat?: string; notes?: string },
): FlightInsert {
  const scheduledDeparture = requireTimestamp(
    result.departure.scheduledUtc,
    'Scheduled departure',
  );
  const scheduledArrival = requireTimestamp(result.arrival.scheduledUtc, 'Scheduled arrival');

  if (Date.parse(scheduledArrival) <= Date.parse(scheduledDeparture)) {
    throw new FlightDataError('invalid_flight', 'Arrival must occur after departure.');
  }

  if (!result.airlineIata && !result.airlineName) {
    throw new FlightDataError('invalid_flight', 'Airline information is missing from this result.');
  }

  return {
    user_id: userId,
    flight_number: result.flightNumber.replace(/\s+/g, '').toUpperCase(),
    airline_iata: nullable(result.airlineIata?.toUpperCase()),
    airline_name: nullable(result.airlineName),
    origin_iata: requireAirport(result.origin.iata, 'Origin'),
    destination_iata: requireAirport(result.destination.iata, 'Destination'),
    scheduled_departure: scheduledDeparture,
    scheduled_arrival: scheduledArrival,
    actual_departure: result.departure.actualUtc
      ? requireTimestamp(result.departure.actualUtc, 'Actual departure')
      : null,
    actual_arrival: result.arrival.actualUtc
      ? requireTimestamp(result.arrival.actualUtc, 'Actual arrival')
      : null,
    status: result.status || 'scheduled',
    departure_terminal: nullable(result.origin.terminal),
    departure_gate: nullable(result.origin.gate),
    arrival_terminal: nullable(result.destination.terminal),
    arrival_gate: nullable(result.destination.gate),
    origin_time_zone: nullable(result.origin.timeZone),
    destination_time_zone: nullable(result.destination.timeZone),
    aircraft_model: nullable(result.aircraft.model),
    aircraft_registration: nullable(result.aircraft.reg),
    distance_km: result.distanceKm,
    provider: 'aerodatabox',
    provider_record_id: result.id,
    provider_retrieved_at: new Date().toISOString(),
    seat: nullable(personal.seat),
    notes: nullable(personal.notes),
    is_manual: false,
  };
}

export async function saveFlight(insert: FlightInsert): Promise<FlightRow> {
  const { data, error } = await getSupabase().from('flights').insert(insert).select().single();
  if (error || !data) throwDataError(error);
  return data;
}

export async function loadFlights(): Promise<FlightRow[]> {
  const pageSize = 1_000;
  const flights: FlightRow[] = [];

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await getSupabase()
      .from('flights')
      .select('*')
      .order('scheduled_departure', { ascending: true })
      .range(start, start + pageSize - 1);
    if (error) throw new FlightDataError('database_error', error.message);
    flights.push(...data);
    if (data.length < pageSize) return flights;
  }
}

export async function loadFlight(id: string): Promise<FlightRow> {
  const { data, error } = await getSupabase().from('flights').select('*').eq('id', id).single();
  if (error || !data) {
    throw new FlightDataError('not_found', 'This flight could not be found.');
  }
  return data;
}

export async function updateFlight(
  id: string,
  updates: Database['public']['Tables']['flights']['Update'],
): Promise<FlightRow> {
  const { data, error } = await getSupabase()
    .from('flights')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throwDataError(error);
  return data;
}

export async function deleteFlight(id: string): Promise<void> {
  const { error } = await getSupabase().from('flights').delete().eq('id', id);
  if (error) throw new FlightDataError('database_error', error.message);
}

function safeFormat(date: string, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(date));
  } catch {
    const { timeZone: _timeZone, ...fallback } = options;
    return new Intl.DateTimeFormat(undefined, fallback).format(new Date(date));
  }
}

function durationLabel(departure: string, arrival: string): string {
  const minutes = Math.round((Date.parse(arrival) - Date.parse(departure)) / 60_000);
  if (minutes <= 0) return 'Duration N/A';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

export function flightRowToPreview(flight: FlightRow): FlightPreview {
  const departure = flight.actual_departure ?? flight.scheduled_departure;
  const arrival = flight.actual_arrival ?? flight.scheduled_arrival;
  return {
    id: flight.id,
    flightNumber: flight.flight_number,
    dateLabel: safeFormat(departure, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: flight.origin_time_zone ?? undefined,
    }).toUpperCase(),
    origin: flight.origin_iata,
    destination: flight.destination_iata,
    departureTime: safeFormat(departure, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: flight.origin_time_zone ?? undefined,
    }),
    arrivalTime: safeFormat(arrival, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: flight.destination_time_zone ?? undefined,
    }),
    status: flight.status.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase(),
    duration: durationLabel(departure, arrival),
    aircraft: flight.aircraft_model ?? (flight.is_manual ? 'MANUAL ENTRY' : 'Aircraft N/A'),
  };
}

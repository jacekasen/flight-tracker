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

type FlightEndpoint = {
  iata: string | null;
  icao: string | null;
  name: string | null;
  municipality: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
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

export function normalizeFlightNumber(raw: string): string | null {
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  const match = compact.match(/^([A-Z0-9]{2}|[A-Z]{3})(\d{1,4}[A-Z]?)$/);

  if (!match || !/[A-Z]/.test(match[1])) return null;
  return `${match[1]}${match[2]}`;
}

export function isValidDate(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === raw;
}

export function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 60_000);
}

function valueAt(source: unknown, path: readonly string[]): unknown {
  let value = source;
  for (const key of path) {
    if (typeof value !== 'object' || value === null || !(key in value)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

function stringAt(source: unknown, path: readonly string[]): string | null {
  const value = valueAt(source, path);
  return typeof value === 'string' ? value : null;
}

function numberAt(source: unknown, path: readonly string[]): number | null {
  const value = valueAt(source, path);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function endpoint(source: unknown, movement: 'departure' | 'arrival'): FlightEndpoint {
  const airport = [movement, 'airport'] as const;
  return {
    iata: stringAt(source, [...airport, 'iata']),
    icao: stringAt(source, [...airport, 'icao']),
    name: stringAt(source, [...airport, 'name']),
    municipality: stringAt(source, [...airport, 'municipalityName']),
    countryCode: stringAt(source, [...airport, 'countryCode']),
    latitude: numberAt(source, [...airport, 'location', 'lat']),
    longitude: numberAt(source, [...airport, 'location', 'lon']),
    timeZone: stringAt(source, [...airport, 'timeZone']),
    terminal: stringAt(source, [movement, 'terminal']),
    gate: stringAt(source, [movement, 'gate']),
  };
}

// Maps one AeroDataBox record to the app-owned contract while tolerating
// optional and partially-covered provider fields.
export function normalizeFlight(flight: unknown, index: number): FlightSearchResult {
  const flightNumber = stringAt(flight, ['number']) ?? '';
  const origin = endpoint(flight, 'departure');
  const destination = endpoint(flight, 'arrival');
  const depScheduledUtc = stringAt(flight, ['departure', 'scheduledTime', 'utc']);
  const depScheduledLocal = stringAt(flight, ['departure', 'scheduledTime', 'local']);
  const depActualUtc =
    stringAt(flight, ['departure', 'revisedTime', 'utc']) ??
    stringAt(flight, ['departure', 'runwayTime', 'utc']);
  const depActualLocal =
    stringAt(flight, ['departure', 'revisedTime', 'local']) ??
    stringAt(flight, ['departure', 'runwayTime', 'local']);
  const arrScheduledUtc = stringAt(flight, ['arrival', 'scheduledTime', 'utc']);
  const arrScheduledLocal = stringAt(flight, ['arrival', 'scheduledTime', 'local']);
  const arrActualUtc =
    stringAt(flight, ['arrival', 'revisedTime', 'utc']) ??
    stringAt(flight, ['arrival', 'runwayTime', 'utc']);
  const arrActualLocal =
    stringAt(flight, ['arrival', 'revisedTime', 'local']) ??
    stringAt(flight, ['arrival', 'runwayTime', 'local']);

  const durationMinutes = minutesBetween(
    depActualUtc ?? depScheduledUtc,
    arrActualUtc ?? arrScheduledUtc,
  );

  return {
    id: [
      flightNumber || 'flight',
      origin.iata ?? '',
      depScheduledUtc ?? String(index),
    ].join('-'),
    flightNumber,
    airlineName: stringAt(flight, ['airline', 'name']),
    airlineIata: stringAt(flight, ['airline', 'iata']),
    status: stringAt(flight, ['status']) ?? 'Unknown',
    origin,
    destination,
    departure: {
      scheduledUtc: depScheduledUtc,
      scheduledLocal: depScheduledLocal,
      actualUtc: depActualUtc,
      actualLocal: depActualLocal,
    },
    arrival: {
      scheduledUtc: arrScheduledUtc,
      scheduledLocal: arrScheduledLocal,
      actualUtc: arrActualUtc,
      actualLocal: arrActualLocal,
    },
    durationMinutes,
    distanceKm: numberAt(flight, ['greatCircleDistance', 'km']),
    aircraft: {
      model: stringAt(flight, ['aircraft', 'model']),
      reg: stringAt(flight, ['aircraft', 'reg']),
    },
    isCargo: valueAt(flight, ['isCargo']) === true,
    codeshareStatus: stringAt(flight, ['codeshareStatus']),
  };
}

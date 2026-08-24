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

// Maps one AeroDataBox record to the app-owned contract while tolerating
// optional and partially-covered provider fields.
export function normalizeFlight(flight: any, index: number): FlightSearchResult {
  const departure = flight?.departure ?? {};
  const arrival = flight?.arrival ?? {};

  const depScheduledUtc = departure?.scheduledTime?.utc ?? null;
  const depScheduledLocal = departure?.scheduledTime?.local ?? null;
  const depActualUtc = departure?.revisedTime?.utc ?? departure?.runwayTime?.utc ?? null;
  const depActualLocal = departure?.revisedTime?.local ?? departure?.runwayTime?.local ?? null;

  const arrScheduledUtc = arrival?.scheduledTime?.utc ?? null;
  const arrScheduledLocal = arrival?.scheduledTime?.local ?? null;
  const arrActualUtc = arrival?.revisedTime?.utc ?? arrival?.runwayTime?.utc ?? null;
  const arrActualLocal = arrival?.revisedTime?.local ?? arrival?.runwayTime?.local ?? null;

  const durationMinutes = minutesBetween(
    depActualUtc ?? depScheduledUtc,
    arrActualUtc ?? arrScheduledUtc,
  );

  return {
    id: [
      flight?.number ?? 'flight',
      departure?.airport?.iata ?? '',
      depScheduledUtc ?? String(index),
    ].join('-'),
    flightNumber: typeof flight?.number === 'string' ? flight.number : '',
    airlineName: flight?.airline?.name ?? null,
    airlineIata: flight?.airline?.iata ?? null,
    status: typeof flight?.status === 'string' ? flight.status : 'Unknown',
    origin: {
      iata: departure?.airport?.iata ?? null,
      icao: departure?.airport?.icao ?? null,
      name: departure?.airport?.name ?? null,
      municipality: departure?.airport?.municipalityName ?? null,
      countryCode: departure?.airport?.countryCode ?? null,
      latitude:
        typeof departure?.airport?.location?.lat === 'number'
          ? departure.airport.location.lat
          : null,
      longitude:
        typeof departure?.airport?.location?.lon === 'number'
          ? departure.airport.location.lon
          : null,
      timeZone: departure?.airport?.timeZone ?? null,
      terminal: departure?.terminal ?? null,
      gate: departure?.gate ?? null,
    },
    destination: {
      iata: arrival?.airport?.iata ?? null,
      icao: arrival?.airport?.icao ?? null,
      name: arrival?.airport?.name ?? null,
      municipality: arrival?.airport?.municipalityName ?? null,
      countryCode: arrival?.airport?.countryCode ?? null,
      latitude:
        typeof arrival?.airport?.location?.lat === 'number' ? arrival.airport.location.lat : null,
      longitude:
        typeof arrival?.airport?.location?.lon === 'number' ? arrival.airport.location.lon : null,
      timeZone: arrival?.airport?.timeZone ?? null,
      terminal: arrival?.terminal ?? null,
      gate: arrival?.gate ?? null,
    },
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
    distanceKm:
      typeof flight?.greatCircleDistance?.km === 'number'
        ? flight.greatCircleDistance.km
        : null,
    aircraft: {
      model: flight?.aircraft?.model ?? null,
      reg: flight?.aircraft?.reg ?? null,
    },
    isCargo: Boolean(flight?.isCargo),
    codeshareStatus: flight?.codeshareStatus ?? null,
  };
}

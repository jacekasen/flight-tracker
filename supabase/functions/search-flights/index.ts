// Public Edge Function: looks up flights by number + date via AeroDataBox
// (RapidAPI) and returns a normalized, app-owned result contract. The provider
// key is read from the AERODATABOX_API_KEY secret and never leaves the server.

const RAPIDAPI_HOST = 'aerodatabox.p.rapidapi.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type SearchRequest = {
  flightNumber?: unknown;
  date?: unknown;
};

// Normalized result the app depends on. Kept intentionally provider-agnostic.
type FlightSearchResult = {
  id: string;
  flightNumber: string;
  airlineName: string | null;
  airlineIata: string | null;
  status: string;
  origin: {
    iata: string | null;
    icao: string | null;
    name: string | null;
    municipality: string | null;
    timeZone: string | null;
    terminal: string | null;
    gate: string | null;
  };
  destination: {
    iata: string | null;
    icao: string | null;
    name: string | null;
    municipality: string | null;
    timeZone: string | null;
    terminal: string | null;
    gate: string | null;
  };
  departure: { scheduledUtc: string | null; scheduledLocal: string | null; actualUtc: string | null; actualLocal: string | null };
  arrival: { scheduledUtc: string | null; scheduledLocal: string | null; actualUtc: string | null; actualLocal: string | null };
  durationMinutes: number | null;
  distanceKm: number | null;
  aircraft: { model: string | null; reg: string | null };
  isCargo: boolean;
  codeshareStatus: string | null;
};

type ErrorCode =
  | 'invalid_request'
  | 'invalid_flight_number'
  | 'invalid_date'
  | 'not_configured'
  | 'not_found'
  | 'quota_exceeded'
  | 'upstream_error'
  | 'method_not_allowed';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(code: ErrorCode, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

// Accepts "UA 120", "ua120", "KL 1395" etc. -> "UA120". Validates that the
// value looks like an airline prefix + numeric suffix.
function normalizeFlightNumber(raw: string): string | null {
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(compact)) return null;
  return compact;
}

function isValidDate(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  // Guard against values like 2026-02-31 that Date silently rolls over.
  return parsed.toISOString().slice(0, 10) === raw;
}

function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 60000);
}

// Maps a single AeroDataBox FlightContract to our normalized result. Tolerates
// missing sections so partially-covered flights still render.
function normalizeFlight(flight: any, index: number): FlightSearchResult {
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

  const idParts = [
    flight?.number ?? 'flight',
    departure?.airport?.iata ?? '',
    depScheduledUtc ?? String(index),
  ];

  return {
    id: idParts.join('-'),
    flightNumber: typeof flight?.number === 'string' ? flight.number : '',
    airlineName: flight?.airline?.name ?? null,
    airlineIata: flight?.airline?.iata ?? null,
    status: typeof flight?.status === 'string' ? flight.status : 'Unknown',
    origin: {
      iata: departure?.airport?.iata ?? null,
      icao: departure?.airport?.icao ?? null,
      name: departure?.airport?.name ?? null,
      municipality: departure?.airport?.municipalityName ?? null,
      timeZone: departure?.airport?.timeZone ?? null,
      terminal: departure?.terminal ?? null,
      gate: departure?.gate ?? null,
    },
    destination: {
      iata: arrival?.airport?.iata ?? null,
      icao: arrival?.airport?.icao ?? null,
      name: arrival?.airport?.name ?? null,
      municipality: arrival?.airport?.municipalityName ?? null,
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
    distanceKm: typeof flight?.greatCircleDistance?.km === 'number' ? flight.greatCircleDistance.km : null,
    aircraft: {
      model: flight?.aircraft?.model ?? null,
      reg: flight?.aircraft?.reg ?? null,
    },
    isCargo: Boolean(flight?.isCargo),
    codeshareStatus: flight?.codeshareStatus ?? null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return fail('method_not_allowed', 'Use POST to search for flights.', 405);
  }

  const apiKey = Deno.env.get('AERODATABOX_API_KEY');
  if (!apiKey) {
    return fail(
      'not_configured',
      'Flight search is not configured. Set the AERODATABOX_API_KEY secret.',
      503,
    );
  }

  let payload: SearchRequest;
  try {
    payload = await req.json();
  } catch {
    return fail('invalid_request', 'Request body must be valid JSON.', 400);
  }

  if (typeof payload.flightNumber !== 'string' || typeof payload.date !== 'string') {
    return fail('invalid_request', 'Both flightNumber and date are required.', 400);
  }

  const flightNumber = normalizeFlightNumber(payload.flightNumber);
  if (!flightNumber) {
    return fail('invalid_flight_number', 'Enter a valid flight number, e.g. UA120.', 400);
  }

  const date = payload.date.trim();
  if (!isValidDate(date)) {
    return fail('invalid_date', 'Date must be in YYYY-MM-DD format.', 400);
  }

  const url = new URL(
    `https://${RAPIDAPI_HOST}/flights/number/${encodeURIComponent(flightNumber)}/${date}`,
  );
  // Keep optional add-ons off to conserve the free quota.
  url.searchParams.set('withAircraftImage', 'false');
  url.searchParams.set('withLocation', 'false');
  url.searchParams.set('dateLocalRole', 'Both');

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    });
  } catch (_error) {
    return fail('upstream_error', 'Could not reach the flight data provider.', 502);
  }

  // AeroDataBox uses 204/404 to signal "no such flight on that date".
  if (upstream.status === 204 || upstream.status === 404) {
    return json({ query: { flightNumber, date }, results: [] }, 200);
  }

  if (upstream.status === 429) {
    return fail('quota_exceeded', 'Flight search quota reached. Try again later.', 429);
  }

  if (!upstream.ok) {
    return fail('upstream_error', 'The flight data provider returned an error.', 502);
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return fail('upstream_error', 'The flight data provider returned an invalid response.', 502);
  }

  const flights = Array.isArray(data) ? data : [];
  const results = flights.map((flight, index) => normalizeFlight(flight, index));

  return json({ query: { flightNumber, date }, results }, 200);
});

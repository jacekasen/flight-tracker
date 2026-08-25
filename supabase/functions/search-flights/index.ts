import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  isValidDate,
  normalizeFlight,
  normalizeFlightNumber,
  type FlightSearchResult,
} from './core.ts';

const RAPIDAPI_HOST = 'aerodatabox.p.rapidapi.com';
const CACHE_TTL_MS = 15 * 60 * 1_000;
const PROVIDER_TIMEOUT_MS = 8_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Retry-After, X-Cache',
};

type SearchRequest = {
  flightNumber?: unknown;
  date?: unknown;
};

type SearchResponse = {
  query: { flightNumber: string; date: string };
  results: FlightSearchResult[];
};

type ErrorCode =
  | 'invalid_request'
  | 'invalid_flight_number'
  | 'invalid_date'
  | 'not_configured'
  | 'unauthorized'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'upstream_error'
  | 'method_not_allowed';

function json(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...headers },
  });
}

function fail(
  code: ErrorCode,
  message: string,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return json({ error: { code, message } }, status, headers);
}

function bearerToken(req: Request): string | null {
  const authorization = req.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    req.headers.get('cf-connecting-ip')?.trim() ||
    forwarded ||
    req.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

async function hmacSha256(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function logSearch(outcome: string, startedAt: number, cache: 'hit' | 'miss' | 'none'): void {
  console.log(
    JSON.stringify({
      event: 'flight_search',
      outcome,
      cache,
      duration_ms: Date.now() - startedAt,
    }),
  );
}

export async function handleSearchRequest(req: Request): Promise<Response> {
  const startedAt = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return fail('method_not_allowed', 'Use POST to search for flights.', 405);
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const ipHashSecret = Deno.env.get('RATE_LIMIT_IP_HASH_SECRET');
  if (!supabaseUrl || !serviceRoleKey || !ipHashSecret) {
    logSearch('not_configured', startedAt, 'none');
    return fail(
      'not_configured',
      'Flight search security controls are not configured.',
      503,
    );
  }

  const token = bearerToken(req);
  if (!token) {
    return fail('unauthorized', 'Sign in to search for flights.', 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user) {
    return fail('unauthorized', 'Your session is no longer valid. Sign in again.', 401);
  }

  const ipHash = await hmacSha256(ipHashSecret, clientIp(req));
  const { data: rateRows, error: rateError } = await admin.rpc('consume_search_rate_limit', {
    p_user_id: user.id,
    p_ip_hash: ipHash,
  });
  if (rateError || !Array.isArray(rateRows) || !rateRows[0]) {
    logSearch('rate_limit_error', startedAt, 'none');
    return fail('upstream_error', 'Flight search is temporarily unavailable.', 503);
  }

  const rate = rateRows[0] as { is_allowed: boolean; retry_after_seconds: number };
  if (!rate.is_allowed) {
    const retryAfter = Math.max(1, rate.retry_after_seconds);
    logSearch('rate_limited', startedAt, 'none');
    return fail(
      'rate_limited',
      'Too many searches. Try again after the current hourly window.',
      429,
      { 'Retry-After': String(retryAfter) },
    );
  }

  const cacheKey = `${flightNumber}:${date}`;
  const { data: cached, error: cacheReadError } = await admin
    .from('provider_search_cache')
    .select('response')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!cacheReadError && cached?.response) {
    logSearch('success', startedAt, 'hit');
    return json(cached.response, 200, { 'X-Cache': 'HIT' });
  }

  const apiKey = Deno.env.get('AERODATABOX_API_KEY');
  if (!apiKey) {
    logSearch('not_configured', startedAt, 'miss');
    return fail(
      'not_configured',
      'Flight search is not configured. Set the AERODATABOX_API_KEY secret.',
      503,
    );
  }

  const url = new URL(
    `https://${RAPIDAPI_HOST}/flights/number/${encodeURIComponent(flightNumber)}/${date}`,
  );
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
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch {
    logSearch('provider_unreachable', startedAt, 'miss');
    return fail('upstream_error', 'Could not reach the flight data provider.', 502);
  }

  if (upstream.status === 429) {
    logSearch('quota_exceeded', startedAt, 'miss');
    return fail('quota_exceeded', 'Flight search quota reached. Try again later.', 429);
  }

  if (upstream.status !== 204 && upstream.status !== 404 && !upstream.ok) {
    logSearch('provider_error', startedAt, 'miss');
    return fail('upstream_error', 'The flight data provider returned an error.', 502);
  }

  let results: FlightSearchResult[] = [];
  if (upstream.status !== 204 && upstream.status !== 404) {
    let data: unknown;
    try {
      data = await upstream.json();
    } catch {
      logSearch('malformed_provider_response', startedAt, 'miss');
      return fail('upstream_error', 'The flight data provider returned an invalid response.', 502);
    }
    const flights = Array.isArray(data) ? data : [];
    results = flights.map((flight, index) => normalizeFlight(flight, index));
  }

  const response: SearchResponse = {
    query: { flightNumber, date },
    results,
  };
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  const { error: cacheWriteError } = await admin.from('provider_search_cache').upsert({
    cache_key: cacheKey,
    response,
    expires_at: expiresAt,
  });
  if (cacheWriteError) {
    console.error(JSON.stringify({ event: 'flight_search_cache_write_failed' }));
  }

  logSearch(results.length ? 'success' : 'empty', startedAt, 'miss');
  return json(response, 200, { 'X-Cache': 'MISS' });
}

if (import.meta.main) {
  Deno.serve(handleSearchRequest);
}

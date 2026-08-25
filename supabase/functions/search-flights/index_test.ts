import { handleSearchRequest } from './index.ts';

function assertEquals<T>(actual: T, expected: T): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

async function errorCode(response: Response): Promise<string | undefined> {
  const body = await response.json() as { error?: { code?: string } };
  return body.error?.code;
}

Deno.test('search handler responds to CORS preflight requests', async () => {
  const response = await handleSearchRequest(
    new Request('http://localhost/search-flights', { method: 'OPTIONS' }),
  );

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
  assertEquals(await response.text(), 'ok');
});

Deno.test('search handler rejects unsupported HTTP methods', async () => {
  const response = await handleSearchRequest(
    new Request('http://localhost/search-flights', { method: 'GET' }),
  );

  assertEquals(response.status, 405);
  assertEquals(await errorCode(response), 'method_not_allowed');
  assertEquals(response.headers.get('access-control-allow-origin'), '*');
});

Deno.test('search handler rejects malformed JSON', async () => {
  const response = await handleSearchRequest(
    new Request('http://localhost/search-flights', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }),
  );

  assertEquals(response.status, 400);
  assertEquals(await errorCode(response), 'invalid_request');
});

Deno.test('search handler validates flight numbers and dates before integrations', async () => {
  const invalidFlight = await handleSearchRequest(
    new Request('http://localhost/search-flights', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ flightNumber: '1234', date: '2026-08-25' }),
    }),
  );
  const invalidDate = await handleSearchRequest(
    new Request('http://localhost/search-flights', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ flightNumber: 'UA120', date: '2026-02-30' }),
    }),
  );

  assertEquals(invalidFlight.status, 400);
  assertEquals(await errorCode(invalidFlight), 'invalid_flight_number');
  assertEquals(invalidDate.status, 400);
  assertEquals(await errorCode(invalidDate), 'invalid_date');
});

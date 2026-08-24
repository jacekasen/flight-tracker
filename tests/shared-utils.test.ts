import { describe, expect, it } from 'vitest';

import { friendlyAuthError } from '../src/lib/auth-errors';
import { toIsoDate } from '../src/lib/dates';
import { toErrorMessage } from '../src/lib/errors';
import { partitionFlights } from '../src/lib/flight-collections';
import type { FlightRow } from '../src/lib/flights';
import { trimmedOrNull } from '../src/lib/strings';

function flight(id: string, scheduledDeparture: string): FlightRow {
  return { id, scheduled_departure: scheduledDeparture } as FlightRow;
}

describe('shared utilities', () => {
  it('formats a local calendar date without UTC drift', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('normalizes optional text', () => {
    expect(trimmedOrNull('  14A ')).toBe('14A');
    expect(trimmedOrNull('   ')).toBeNull();
    expect(trimmedOrNull(undefined)).toBeNull();
  });

  it('uses Error messages and falls back for unknown failures', () => {
    expect(toErrorMessage(new Error('Unavailable'), 'Fallback')).toBe('Unavailable');
    expect(toErrorMessage({ message: 'unsafe shape' }, 'Fallback')).toBe('Fallback');
  });

  it('translates common authentication errors without hiding unknown messages', () => {
    expect(friendlyAuthError('Invalid login credentials')).toBe(
      'Email or password is incorrect.',
    );
    expect(friendlyAuthError('Provider temporarily unavailable')).toBe(
      'Provider temporarily unavailable',
    );
  });

  it('partitions flights while keeping upcoming order and reversing history', () => {
    const now = Date.parse('2026-06-15T12:00:00Z');
    const result = partitionFlights(
      [
        flight('oldest', '2025-01-01T12:00:00Z'),
        flight('recent', '2026-06-01T12:00:00Z'),
        flight('next', '2026-07-01T12:00:00Z'),
        flight('later', '2026-08-01T12:00:00Z'),
      ],
      now,
    );

    expect(result.history.map(({ id }) => id)).toEqual(['recent', 'oldest']);
    expect(result.upcoming.map(({ id }) => id)).toEqual(['next', 'later']);
  });
});

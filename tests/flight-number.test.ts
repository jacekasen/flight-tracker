import { describe, expect, it } from 'vitest';

import { normalizeFlightNumberInput } from '../src/lib/flight-number';

describe('flight number input', () => {
  it.each([
    ['R3 501', 'R3501'],
    ['F9 1191', 'F91191'],
    ['3U 8633', '3U8633'],
    ['ua 120', 'UA120'],
  ])('normalizes %s without treating a designator digit as the flight number', (input, expected) => {
    expect(normalizeFlightNumberInput(input)).toBe(expected);
  });

  it.each(['1234', 'R3', 'F9-1191', 'UNITED 120'])('rejects invalid input %s', (input) => {
    expect(normalizeFlightNumberInput(input)).toBeNull();
  });
});

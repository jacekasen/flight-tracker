import { describe, expect, it } from 'vitest';

import {
  isValidDate,
  minutesBetween,
  normalizeFlight,
  normalizeFlightNumber,
} from '../supabase/functions/search-flights/core';

describe('flight search validation', () => {
  it.each([
    ['UA 120', 'UA120'],
    ['ua120', 'UA120'],
    ['KL 1395', 'KL1395'],
    ['3U8633', '3U8633'],
    ['R3 501', 'R3501'],
    ['F9 1191', 'F91191'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeFlightNumber(input)).toBe(expected);
  });

  it.each(['UA', '120', '1234', 'UNITED120', 'UA12-0', ''])('rejects %s', (input) => {
    expect(normalizeFlightNumber(input)).toBeNull();
  });

  it('strictly validates calendar dates', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2024-02-29')).toBe(true);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('08/23/2026')).toBe(false);
  });
});

describe('provider normalization', () => {
  it('calculates overnight duration from UTC timestamps', () => {
    expect(minutesBetween('2026-08-23T23:30:00Z', '2026-08-24T01:05:00Z')).toBe(95);
    expect(minutesBetween('2026-08-24T01:05:00Z', '2026-08-23T23:30:00Z')).toBeNull();
  });

  it('prefers revised times and preserves optional provider data', () => {
    const result = normalizeFlight(
      {
        number: 'UA120',
        airline: { name: 'United Airlines', iata: 'UA' },
        status: 'EnRoute',
        departure: {
          airport: {
            iata: 'SFO',
            icao: 'KSFO',
            name: 'San Francisco International',
            municipalityName: 'San Francisco',
            countryCode: 'US',
            location: { lat: 37.6213, lon: -122.379 },
            timeZone: 'America/Los_Angeles',
          },
          scheduledTime: {
            utc: '2026-08-23T15:00:00Z',
            local: '2026-08-23 08:00-07:00',
          },
          revisedTime: {
            utc: '2026-08-23T15:15:00Z',
            local: '2026-08-23 08:15-07:00',
          },
          terminal: '3',
          gate: 'F12',
        },
        arrival: {
          airport: { iata: 'EWR', location: { lat: 40.6895, lon: -74.1745 } },
          scheduledTime: {
            utc: '2026-08-23T20:30:00Z',
            local: '2026-08-23 16:30-04:00',
          },
          revisedTime: {
            utc: '2026-08-23T20:45:00Z',
            local: '2026-08-23 16:45-04:00',
          },
        },
        aircraft: { model: 'Boeing 777', reg: 'N12345' },
        greatCircleDistance: { km: 4120 },
      },
      0,
    );

    expect(result.id).toBe('UA120-SFO-2026-08-23T15:00:00Z');
    expect(result.origin.timeZone).toBe('America/Los_Angeles');
    expect(result.departure.actualUtc).toBe('2026-08-23T15:15:00Z');
    expect(result.durationMinutes).toBe(330);
    expect(result.distanceKm).toBe(4120);
    expect(result.aircraft.model).toBe('Boeing 777');
  });

  it('keeps partial records usable', () => {
    const result = normalizeFlight({ number: 'UA120' }, 2);

    expect(result.id).toBe('UA120--2');
    expect(result.status).toBe('Unknown');
    expect(result.origin.iata).toBeNull();
    expect(result.durationMinutes).toBeNull();
    expect(result.isCargo).toBe(false);
  });
});

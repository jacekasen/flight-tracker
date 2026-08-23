import { describe, expect, it } from 'vitest';

import {
  availableInsightYears,
  formatFlightTime,
  summarizeFlights,
} from '../src/lib/insights';
import type { FlightRow } from '../src/lib/flights';

function flight(overrides: Partial<FlightRow> = {}): FlightRow {
  return {
    id: 'flight-1',
    user_id: 'user-1',
    flight_number: 'UA120',
    airline_iata: 'UA',
    airline_name: 'United Airlines',
    origin_iata: 'SFO',
    destination_iata: 'EWR',
    scheduled_departure: '2025-12-31T23:30:00Z',
    scheduled_arrival: '2026-01-01T05:30:00Z',
    actual_departure: null,
    actual_arrival: null,
    status: 'scheduled',
    departure_terminal: null,
    departure_gate: null,
    arrival_terminal: null,
    arrival_gate: null,
    origin_time_zone: 'America/Los_Angeles',
    destination_time_zone: 'America/New_York',
    origin_latitude: 37.6213,
    origin_longitude: -122.379,
    origin_country_code: 'US',
    origin_country_name: 'United States',
    destination_latitude: 40.6895,
    destination_longitude: -74.1745,
    destination_country_code: 'US',
    destination_country_name: 'United States',
    aircraft_model: 'Boeing 777',
    aircraft_registration: null,
    distance_km: 4120,
    operating_airline_iata: null,
    operating_flight_number: null,
    provider: 'aerodatabox',
    provider_record_id: null,
    provider_retrieved_at: null,
    seat: null,
    notes: null,
    is_manual: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('flight insights', () => {
  it('uses the origin-local year for recap filtering', () => {
    const westCoastNewYear = flight();
    const followingYear = flight({
      id: 'flight-2',
      scheduled_departure: '2026-08-23T15:00:00Z',
      scheduled_arrival: '2026-08-23T17:00:00Z',
    });

    expect(availableInsightYears([westCoastNewYear, followingYear])).toEqual([2026, 2025]);
    expect(summarizeFlights([westCoastNewYear, followingYear], 2025).totalFlights).toBe(1);
  });

  it('summarizes totals and deterministic rankings', () => {
    const flights = [
      flight(),
      flight({
        id: 'flight-2',
        flight_number: 'AS10',
        airline_iata: 'AS',
        airline_name: 'Alaska Airlines',
        origin_iata: 'SEA',
        destination_iata: 'SFO',
        scheduled_departure: '2026-08-23T15:00:00Z',
        scheduled_arrival: '2026-08-23T17:00:00Z',
        distance_km: 1090,
        aircraft_model: 'Boeing 737',
      }),
    ];

    const summary = summarizeFlights(flights, null);
    expect(summary.totalFlights).toBe(2);
    expect(summary.totalDistanceKm).toBe(5210);
    expect(summary.totalDurationMinutes).toBe(480);
    expect(summary.airports[0]).toEqual({ label: 'SFO', count: 2 });
    expect(summary.airlines.map((entry) => entry.label)).toEqual([
      'Alaska Airlines',
      'United Airlines',
    ]);
  });

  it('uses actual duration only when both actual timestamps exist', () => {
    const completed = flight({
      actual_departure: '2025-12-31T23:45:00Z',
      actual_arrival: '2026-01-01T05:00:00Z',
    });
    const partial = flight({ id: 'flight-2', actual_departure: '2026-01-01T00:00:00Z' });

    expect(summarizeFlights([completed], null).totalDurationMinutes).toBe(315);
    expect(summarizeFlights([partial], null).totalDurationMinutes).toBe(360);
  });

  it('derives distance from coordinates when stored distance is missing', () => {
    const summary = summarizeFlights([flight({ distance_km: null })], null);

    expect(summary.flightsWithDistance).toBe(1);
    expect(summary.totalDistanceKm).toBeGreaterThan(4000);
    expect(summary.routes).toHaveLength(1);
  });

  it('does not let missing optional data affect unrelated totals', () => {
    const summary = summarizeFlights([
      flight({
        airline_iata: null,
        airline_name: null,
        aircraft_model: null,
        distance_km: null,
        origin_latitude: null,
        origin_longitude: null,
      }),
    ], null);

    expect(summary.totalFlights).toBe(1);
    expect(summary.totalDistanceKm).toBe(0);
    expect(summary.airlines).toEqual([{ label: 'Unknown airline', count: 1 }]);
    expect(summary.aircraft).toEqual([]);
    expect(summary.routes).toEqual([]);
  });

  it('formats flight time totals', () => {
    expect(formatFlightTime(45)).toBe('45m');
    expect(formatFlightTime(120)).toBe('2h');
    expect(formatFlightTime(135)).toBe('2h 15m');
  });
});

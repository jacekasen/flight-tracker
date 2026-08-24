import type { FlightRow } from '@/lib/flights';

export type InsightRanking = {
  label: string;
  count: number;
};

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type InsightRoute = {
  id: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  originPoint: RoutePoint;
  destinationPoint: RoutePoint;
};

export type FlightInsights = {
  totalFlights: number;
  totalDistanceKm: number;
  flightsWithDistance: number;
  totalDurationMinutes: number;
  airlines: InsightRanking[];
  airports: InsightRanking[];
  countries: InsightRanking[];
  aircraft: InsightRanking[];
  routes: InsightRoute[];
};

function flightYear(flight: FlightRow): number {
  try {
    const formatted = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      timeZone: flight.origin_time_zone ?? 'UTC',
    }).format(new Date(flight.scheduled_departure));
    return Number(formatted);
  } catch {
    return new Date(flight.scheduled_departure).getUTCFullYear();
  }
}

function rank(values: (string | null | undefined)[]): InsightRanking[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value?.trim();
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function durationMinutes(flight: FlightRow): number {
  const hasActualTimes = flight.actual_departure != null && flight.actual_arrival != null;
  const departure = Date.parse(
    hasActualTimes ? flight.actual_departure! : flight.scheduled_departure,
  );
  const arrival = Date.parse(hasActualTimes ? flight.actual_arrival! : flight.scheduled_arrival);
  if (!Number.isFinite(departure) || !Number.isFinite(arrival) || arrival <= departure) return 0;
  return Math.round((arrival - departure) / 60_000);
}

function coordinate(latitude: number | null, longitude: number | null): RoutePoint | null {
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }
  return { latitude, longitude };
}

function distanceKm(flight: FlightRow): number | null {
  if (
    flight.distance_km != null &&
    Number.isFinite(flight.distance_km) &&
    flight.distance_km >= 0
  ) {
    return flight.distance_km;
  }

  const origin = coordinate(flight.origin_latitude, flight.origin_longitude);
  const destination = coordinate(flight.destination_latitude, flight.destination_longitude);
  if (!origin || !destination) return null;

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const startLatitude = toRadians(origin.latitude);
  const endLatitude = toRadians(destination.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(haversine));
}

export function availableInsightYears(flights: FlightRow[]): number[] {
  return [...new Set(flights.map(flightYear))].sort((left, right) => right - left);
}

export function summarizeFlights(flights: FlightRow[], year: number | null): FlightInsights {
  const selected = year == null ? flights : flights.filter((flight) => flightYear(flight) === year);
  const distances = selected.map(distanceKm).filter((value): value is number => value != null);
  const routes = selected.flatMap((flight): InsightRoute[] => {
    const originPoint = coordinate(flight.origin_latitude, flight.origin_longitude);
    const destinationPoint = coordinate(
      flight.destination_latitude,
      flight.destination_longitude,
    );
    if (!originPoint || !destinationPoint) return [];
    return [
      {
        id: flight.id,
        origin: flight.origin_iata,
        originCity: flight.origin_city ?? flight.origin_iata,
        destination: flight.destination_iata,
        destinationCity: flight.destination_city ?? flight.destination_iata,
        originPoint,
        destinationPoint,
      },
    ];
  });

  return {
    totalFlights: selected.length,
    totalDistanceKm: Math.round(distances.reduce((total, distance) => total + distance, 0)),
    flightsWithDistance: distances.length,
    totalDurationMinutes: selected.reduce(
      (total, flight) => total + durationMinutes(flight),
      0,
    ),
    airlines: rank(
      selected.map((flight) => flight.airline_name ?? flight.airline_iata ?? 'Unknown airline'),
    ),
    airports: rank(
      selected.flatMap((flight) => [flight.origin_iata, flight.destination_iata]),
    ),
    countries: rank(
      selected.flatMap((flight) => [
        flight.origin_country_name ?? flight.origin_country_code,
        flight.destination_country_name ?? flight.destination_country_code,
      ]),
    ),
    aircraft: rank(selected.map((flight) => flight.aircraft_model)),
    routes,
  };
}

export function formatFlightTime(totalMinutes: number): string {
  const roundedHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (roundedHours === 0) return `${minutes}m`;
  return minutes ? `${roundedHours}h ${minutes}m` : `${roundedHours}h`;
}

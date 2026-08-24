import type { FlightRow } from './flights';

export function partitionFlights(flights: FlightRow[], now = Date.now()) {
  const upcoming: FlightRow[] = [];
  const history: FlightRow[] = [];

  for (const flight of flights) {
    const collection = Date.parse(flight.scheduled_departure) >= now ? upcoming : history;
    collection.push(flight);
  }

  return { history: history.reverse(), upcoming };
}

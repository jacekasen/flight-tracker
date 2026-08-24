import type { Href } from 'expo-router';

import type { FlightSearchResult } from '@/lib/flight-search';

export function flightDetailsRoute(id: string): Href {
  return { pathname: '/flight/[id]', params: { id } } as Href;
}

export function manualFlightRoute(id: string): Href {
  return { pathname: '/manual', params: { id } } as Href;
}

export function confirmFlightRoute(result: FlightSearchResult): Href {
  return {
    pathname: '/confirm',
    params: { result: JSON.stringify(result) },
  } as Href;
}

import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getCachedFlights, loadFlights, type FlightRow } from '@/lib/flights';
import { toErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';

type UseFlightCollectionOptions = {
  errorMessage: string;
};

export function useFlightCollection({ errorMessage }: UseFlightCollectionOptions) {
  const { session, isLoading: isSessionLoading } = useAuth();
  const userId = session?.user.id;
  const [flights, setFlights] = useState<FlightRow[]>(
    () => getCachedFlights(userId) ?? [],
  );
  const [isLoading, setIsLoading] = useState(flights.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (showRefreshIndicator = false) => {
      if (!userId) {
        setFlights([]);
        setIsLoading(false);
        return;
      }

      if (showRefreshIndicator) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        setFlights(await loadFlights(userId));
      } catch (cause) {
        setError(toErrorMessage(cause, errorMessage));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [errorMessage, userId],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    setFlights(getCachedFlights(userId) ?? []);
  }, [userId]);

  return {
    error,
    flights,
    isInitialLoading: isSessionLoading || (isLoading && flights.length === 0),
    isRefreshing,
    refresh,
    session,
  };
}

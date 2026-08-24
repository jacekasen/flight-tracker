/**
 * Normalizes an IATA/ICAO flight number while preserving the airline-code boundary.
 * IATA designators are two alphanumeric characters and may contain a digit (F9, R3, 3U).
 * Three-character ICAO designators remain letter-only here to avoid ambiguous numeric splits.
 */
export function normalizeFlightNumberInput(raw: string): string | null {
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  const match = compact.match(/^([A-Z0-9]{2}|[A-Z]{3})(\d{1,4}[A-Z]?)$/);

  if (!match || !/[A-Z]/.test(match[1])) return null;
  return `${match[1]}${match[2]}`;
}

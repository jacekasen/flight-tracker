import { writeFile } from 'node:fs/promises';

const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const COUNTRIES_URL = 'https://davidmegginson.github.io/ourairports-data/countries.csv';
const OUTPUT_URL = new URL(
  '../supabase/migrations/20260823011000_import_airport_metadata.sql',
  import.meta.url,
);

function parseCsv(input) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n') {
      row.push(value.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (value || row.length) {
    row.push(value.replace(/\r$/, ''));
    rows.push(row);
  }

  const [headers, ...records] = rows;
  return records
    .filter((record) => record.length === headers.length)
    .map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index]])));
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

const [airportsResponse, countriesResponse] = await Promise.all([
  fetch(AIRPORTS_URL),
  fetch(COUNTRIES_URL),
]);

if (!airportsResponse.ok || !countriesResponse.ok) {
  throw new Error(
    `Could not download OurAirports data (${airportsResponse.status}, ${countriesResponse.status}).`,
  );
}

const [airportsCsv, countriesCsv] = await Promise.all([
  airportsResponse.text(),
  countriesResponse.text(),
]);
const countries = new Map(
  parseCsv(countriesCsv).map((country) => [country.code, country.name]),
);

const airportRows = parseCsv(airportsCsv)
  .filter(
    (airport) =>
      airport.scheduled_service === 'yes' &&
      /^[A-Z]{3}$/.test(airport.iata_code) &&
      countries.has(airport.iso_country) &&
      Number.isFinite(Number(airport.latitude_deg)) &&
      Number.isFinite(Number(airport.longitude_deg)),
  );
const sizePriority = { large_airport: 3, medium_airport: 2, small_airport: 1 };
const airportByIata = new Map();
for (const airport of airportRows) {
  const existing = airportByIata.get(airport.iata_code);
  if (
    !existing ||
    (sizePriority[airport.type] ?? 0) > (sizePriority[existing.type] ?? 0)
  ) {
    airportByIata.set(airport.iata_code, airport);
  }
}
const airports = [...airportByIata.values()].sort((left, right) =>
  left.iata_code.localeCompare(right.iata_code),
);

const chunks = [];
for (let start = 0; start < airports.length; start += 500) {
  const values = airports.slice(start, start + 500).map((airport) => {
    const fields = [
      sqlString(airport.iata_code),
      sqlString(airport.name),
      airport.municipality ? sqlString(airport.municipality) : 'null',
      sqlString(airport.iso_country),
      sqlString(countries.get(airport.iso_country)),
      Number(airport.latitude_deg),
      Number(airport.longitude_deg),
      'null',
    ];
    return `  (${fields.join(', ')})`;
  });

  chunks.push(`insert into public.airports (
  iata,
  name,
  municipality,
  iso_country,
  country_name,
  latitude,
  longitude,
  time_zone
)
values
${values.join(',\n')}
on conflict (iata) do update set
  name = excluded.name,
  municipality = excluded.municipality,
  iso_country = excluded.iso_country,
  country_name = excluded.country_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  time_zone = coalesce(excluded.time_zone, public.airports.time_zone);`);
}

const migration = `-- Generated from the public-domain OurAirports data snapshot.
-- Source: ${AIRPORTS_URL}
-- Regenerate with: node scripts/generate-airport-migration.mjs

${chunks.join('\n\n')}

-- Re-run the enrichment trigger to backfill existing personal history.
update public.flights
set
  origin_iata = origin_iata,
  destination_iata = destination_iata;
`;

await writeFile(OUTPUT_URL, migration);
console.log(`Wrote ${airports.length} scheduled-service airports to ${OUTPUT_URL.pathname}.`);

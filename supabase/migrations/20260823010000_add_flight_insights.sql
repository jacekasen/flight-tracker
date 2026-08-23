create table public.airports (
  iata text primary key,
  name text not null,
  municipality text,
  iso_country text not null,
  country_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  time_zone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint airports_iata_valid check (iata ~ '^[A-Z]{3}$'),
  constraint airports_country_valid check (iso_country ~ '^[A-Z]{2}$'),
  constraint airports_latitude_valid check (latitude between -90 and 90),
  constraint airports_longitude_valid check (longitude between -180 and 180)
);

alter table public.airports enable row level security;

create policy "Authenticated users can read airport metadata"
on public.airports for select
to authenticated
using (true);

grant select on public.airports to authenticated;

create trigger airports_set_updated_at
before update on public.airports
for each row execute function public.set_updated_at();

alter table public.flights
  add column if not exists origin_latitude double precision,
  add column if not exists origin_longitude double precision,
  add column if not exists origin_country_code text,
  add column if not exists origin_country_name text,
  add column if not exists destination_latitude double precision,
  add column if not exists destination_longitude double precision,
  add column if not exists destination_country_code text,
  add column if not exists destination_country_name text;

alter table public.flights
  add constraint flights_origin_latitude_valid
    check (origin_latitude is null or origin_latitude between -90 and 90),
  add constraint flights_origin_longitude_valid
    check (origin_longitude is null or origin_longitude between -180 and 180),
  add constraint flights_destination_latitude_valid
    check (destination_latitude is null or destination_latitude between -90 and 90),
  add constraint flights_destination_longitude_valid
    check (destination_longitude is null or destination_longitude between -180 and 180);

create or replace function public.great_circle_distance_km(
  latitude_one double precision,
  longitude_one double precision,
  latitude_two double precision,
  longitude_two double precision
)
returns double precision
language sql
immutable
strict
set search_path = ''
as $$
  select 6371.0088 * 2 * asin(
    least(1, sqrt(
      power(sin(radians(latitude_two - latitude_one) / 2), 2)
      + cos(radians(latitude_one))
      * cos(radians(latitude_two))
      * power(sin(radians(longitude_two - longitude_one) / 2), 2)
    ))
  );
$$;

create or replace function public.enrich_flight_airports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  origin_airport public.airports%rowtype;
  destination_airport public.airports%rowtype;
begin
  select * into origin_airport
  from public.airports
  where iata = new.origin_iata;

  select * into destination_airport
  from public.airports
  where iata = new.destination_iata;

  if origin_airport.iata is not null then
    new.origin_latitude := coalesce(new.origin_latitude, origin_airport.latitude);
    new.origin_longitude := coalesce(new.origin_longitude, origin_airport.longitude);
    new.origin_country_code := coalesce(new.origin_country_code, origin_airport.iso_country);
    new.origin_country_name := coalesce(new.origin_country_name, origin_airport.country_name);
    new.origin_time_zone := coalesce(new.origin_time_zone, origin_airport.time_zone);
  end if;

  if destination_airport.iata is not null then
    new.destination_latitude := coalesce(
      new.destination_latitude,
      destination_airport.latitude
    );
    new.destination_longitude := coalesce(
      new.destination_longitude,
      destination_airport.longitude
    );
    new.destination_country_code := coalesce(
      new.destination_country_code,
      destination_airport.iso_country
    );
    new.destination_country_name := coalesce(
      new.destination_country_name,
      destination_airport.country_name
    );
    new.destination_time_zone := coalesce(
      new.destination_time_zone,
      destination_airport.time_zone
    );
  end if;

  if new.distance_km is null
    and new.origin_latitude is not null
    and new.origin_longitude is not null
    and new.destination_latitude is not null
    and new.destination_longitude is not null
  then
    new.distance_km := public.great_circle_distance_km(
      new.origin_latitude,
      new.origin_longitude,
      new.destination_latitude,
      new.destination_longitude
    );
  end if;

  return new;
end;
$$;

create trigger flights_enrich_airports
before insert or update on public.flights
for each row execute function public.enrich_flight_airports();

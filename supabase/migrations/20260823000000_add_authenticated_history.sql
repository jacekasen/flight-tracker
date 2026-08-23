alter table public.flights
  drop constraint if exists flights_user_id_flight_number_scheduled_departure_key,
  drop column if exists confirmation_code,
  alter column airline_iata drop not null,
  add column if not exists airline_name text,
  add column if not exists actual_departure timestamptz,
  add column if not exists actual_arrival timestamptz,
  add column if not exists origin_time_zone text,
  add column if not exists destination_time_zone text,
  add column if not exists aircraft_model text,
  add column if not exists aircraft_registration text,
  add column if not exists distance_km numeric,
  add column if not exists operating_airline_iata text,
  add column if not exists operating_flight_number text,
  add column if not exists provider text,
  add column if not exists provider_record_id text,
  add column if not exists provider_retrieved_at timestamptz,
  add column if not exists notes text,
  add column if not exists is_manual boolean not null default false;

alter table public.flights
  add constraint flights_airline_present
  check (airline_iata is not null or nullif(trim(airline_name), '') is not null),
  add constraint flights_user_flight_origin_departure_key
  unique (user_id, flight_number, origin_iata, scheduled_departure);

alter table public.flights
  add constraint flights_actual_times_valid
  check (
    actual_departure is null
    or actual_arrival is null
    or actual_arrival > actual_departure
  );

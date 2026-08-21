create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  flight_number text not null,
  airline_iata text not null,
  origin_iata text not null,
  destination_iata text not null,
  scheduled_departure timestamptz not null,
  scheduled_arrival timestamptz not null,
  status text not null default 'scheduled',
  departure_terminal text,
  departure_gate text,
  arrival_terminal text,
  arrival_gate text,
  seat text,
  confirmation_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_airports check (
    origin_iata ~ '^[A-Z]{3}$' and destination_iata ~ '^[A-Z]{3}$'
  ),
  constraint valid_times check (scheduled_arrival > scheduled_departure),
  unique (user_id, flight_number, scheduled_departure)
);

create index flights_user_departure_idx
  on public.flights (user_id, scheduled_departure desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger flights_set_updated_at
before update on public.flights
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.flights enable row level security;

create policy "Users can read their profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can read their flights"
on public.flights for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their flights"
on public.flights for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their flights"
on public.flights for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their flights"
on public.flights for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000001', 'first@example.com'),
  ('00000000-0000-4000-8000-000000000002', 'second@example.com');

insert into public.flights (
  id,
  user_id,
  flight_number,
  airline_iata,
  origin_iata,
  destination_iata,
  scheduled_departure,
  scheduled_arrival
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'UA120',
    'UA',
    'SFO',
    'EWR',
    '2026-08-23T15:00:00Z',
    '2026-08-23T20:30:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'AS10',
    'AS',
    'SEA',
    'JFK',
    '2026-08-24T15:00:00Z',
    '2026-08-24T20:30:00Z'
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.flights),
  1::bigint,
  'an authenticated user sees only their own flights'
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'an authenticated user sees only their own profile'
);

select is_empty(
  $$ select id from public.flights
     where id = '10000000-0000-4000-8000-000000000002' $$,
  'another user flight cannot be read'
);

select throws_ok(
  $$ insert into public.flights (
       user_id,
       flight_number,
       airline_iata,
       origin_iata,
       destination_iata,
       scheduled_departure,
       scheduled_arrival
     ) values (
       '00000000-0000-4000-8000-000000000002',
       'AS11',
       'AS',
       'SEA',
       'JFK',
       '2026-08-25T15:00:00Z',
       '2026-08-25T20:30:00Z'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "flights"',
  'a user cannot insert a flight for another account'
);

select is_empty(
  $$ update public.flights
     set notes = 'not allowed'
     where id = '10000000-0000-4000-8000-000000000002'
     returning id $$,
  'a user cannot update another user flight'
);

select is_empty(
  $$ delete from public.flights
     where id = '10000000-0000-4000-8000-000000000002'
     returning id $$,
  'a user cannot delete another user flight'
);

select ok(
  has_function_privilege('authenticated', 'public.delete_own_account()', 'execute'),
  'authenticated users can invoke account deletion'
);

select is(
  has_table_privilege('authenticated', 'public.provider_search_cache', 'select'),
  false,
  'provider cache is not exposed through the authenticated Data API'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.consume_search_rate_limit(uuid,text)',
    'execute'
  ),
  false,
  'rate-limit mutation is reserved for the Edge Function'
);

select lives_ok(
  $$ select public.delete_own_account() $$,
  'account deletion succeeds for the authenticated user'
);

reset role;

select is(
  (
    select count(*)
    from auth.users
    where id = '00000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'account deletion removes the auth user'
);

select is(
  (
    select count(*)
    from public.flights
    where user_id = '00000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'account deletion cascades to saved flights'
);

select * from finish();
rollback;

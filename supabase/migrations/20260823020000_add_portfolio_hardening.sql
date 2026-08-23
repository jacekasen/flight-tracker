create table public.provider_search_cache (
  cache_key text primary key,
  response jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index provider_search_cache_expiry_idx
  on public.provider_search_cache (expires_at);

alter table public.provider_search_cache enable row level security;
revoke all on public.provider_search_cache from anon, authenticated;
grant select, insert, update, delete on public.provider_search_cache to service_role;

create trigger provider_search_cache_set_updated_at
before update on public.provider_search_cache
for each row execute function public.set_updated_at();

create table public.search_rate_limit_buckets (
  scope text not null check (scope in ('user', 'ip')),
  identifier text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (scope, identifier, window_started_at)
);

create index search_rate_limit_buckets_window_idx
  on public.search_rate_limit_buckets (window_started_at);

alter table public.search_rate_limit_buckets enable row level security;
revoke all on public.search_rate_limit_buckets from anon, authenticated;

create or replace function public.consume_search_rate_limit(
  p_user_id uuid,
  p_ip_hash text
)
returns table (is_allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz := date_trunc('hour', v_now);
  v_user_count integer;
  v_ip_count integer;
begin
  if p_user_id is null or nullif(trim(p_ip_hash), '') is null then
    raise exception 'A user and IP hash are required';
  end if;

  delete from public.search_rate_limit_buckets
  where window_started_at < v_window_start - interval '48 hours';

  insert into public.search_rate_limit_buckets (
    scope,
    identifier,
    window_started_at,
    request_count
  )
  values ('user', p_user_id::text, v_window_start, 1)
  on conflict (scope, identifier, window_started_at)
  do update set request_count = public.search_rate_limit_buckets.request_count + 1
  returning request_count into v_user_count;

  insert into public.search_rate_limit_buckets (
    scope,
    identifier,
    window_started_at,
    request_count
  )
  values ('ip', p_ip_hash, v_window_start, 1)
  on conflict (scope, identifier, window_started_at)
  do update set request_count = public.search_rate_limit_buckets.request_count + 1
  returning request_count into v_ip_count;

  return query
  select
    v_user_count <= 10 and v_ip_count <= 30,
    case
      when v_user_count <= 10 and v_ip_count <= 30 then 0
      else greatest(
        1,
        ceil(extract(epoch from (v_window_start + interval '1 hour' - v_now)))::integer
      )
    end;
end;
$$;

revoke all on function public.consume_search_rate_limit(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_search_rate_limit(uuid, text) to service_role;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from auth.users where id = v_user_id;

  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

comment on table public.provider_search_cache is
  'Short-lived normalized AeroDataBox responses. Accessible only to the search Edge Function.';
comment on table public.search_rate_limit_buckets is
  'Persistent fixed-window search counters. IP identifiers are HMAC hashes.';
comment on function public.delete_own_account() is
  'Deletes the authenticated auth user; profile and flight rows cascade.';

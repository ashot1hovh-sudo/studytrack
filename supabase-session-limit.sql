-- Concurrent-session limit (anti account-sharing).
--
-- Access is sold as a one-time purchase with a multi-year window, which makes a
-- single account worth sharing: split four ways it is a real saving. A device
-- limit is what makes sharing inconvenient enough not to bother.
--
-- No registry table: GoTrue already records every session in auth.sessions
-- (id, user_id, created_at, updated_at, refreshed_at, ip, user_agent). A second
-- copy of that state would only ever drift out of sync with the real one.
--
-- PostgREST cannot reach the auth schema, so this SECURITY DEFINER function is
-- the bridge. It is called with the service-role key from getAuthenticatedUser().

-- Why a record of evictions is needed at all:
--
-- Deleting a row from auth.sessions invalidates its access token *immediately* —
-- GoTrue re-checks the session on every getUser(). So an evicted device fails
-- authentication outright and the app never gets far enough to explain why; the
-- user just sees a silent logout, which reads as a broken app and generates a
-- support message. This table is the breadcrumb that lets the failure path say
-- "you were signed in on another device" instead of nothing.
create table if not exists public.evicted_sessions (
  session_id uuid primary key,
  user_id uuid not null,
  evicted_at timestamptz not null default now()
);

create index if not exists evicted_sessions_evicted_at_idx
  on public.evicted_sessions (evicted_at);

alter table public.evicted_sessions enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) reads this.
revoke all on table public.evicted_sessions from anon, authenticated;

create or replace function public.enforce_session_limit(
  p_user uuid,
  p_session uuid,
  p_max int default 2
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_role text;
begin
  -- Staff are exempt: consultants work from several machines and evicting each
  -- other out of the admin panel is a self-inflicted outage.
  select role::text into v_role from public.students where id = p_user;
  if v_role = 'consultant' then
    return true;
  end if;

  -- Nothing to enforce against if the caller's session is unknown. Allow rather
  -- than lock everyone out; a missing session_id claim is anomalous, not hostile.
  if p_session is null then
    return true;
  end if;

  -- Forget evictions old enough that nobody is still holding that token.
  delete from public.evicted_sessions where evicted_at < now() - interval '7 days';

  -- Evict everything outside the N most recently *active* sessions.
  --
  -- Ordering by activity, not by created_at, on purpose: ordering by login time
  -- would evict the owner's own laptop (logged in first, still in daily use) and
  -- keep the freshly-added freeloader. Activity keeps the devices actually being
  -- used, which is the behaviour a real customer expects.
  --
  -- Deleting the row kills the refresh token, so an evicted device cannot renew
  -- itself. Its current access token stays cryptographically valid until it
  -- expires (up to an hour), which is why the caller re-checks this on every
  -- request rather than only at login.
  with kept as (
    select id
    from auth.sessions
    where user_id = p_user
    order by coalesce(refreshed_at::timestamptz, updated_at, created_at) desc
    limit p_max
  ), removed as (
    delete from auth.sessions s
    where s.user_id = p_user
      and s.id not in (select id from kept)
    returning s.id
  )
  insert into public.evicted_sessions (session_id, user_id)
  select id, p_user from removed
  on conflict (session_id) do nothing;

  -- Did the caller's own session survive the eviction?
  return exists (
    select 1 from auth.sessions where id = p_session and user_id = p_user
  );
end
$function$;

-- Only the service role should be able to call this; it mutates auth state.
revoke all on function public.enforce_session_limit(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.enforce_session_limit(uuid, uuid, int) to service_role;

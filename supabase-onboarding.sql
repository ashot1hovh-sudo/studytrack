-- Onboarding tour completion, per account.
--
-- This used to live only in localStorage under 'st_onboarded_v1', which records
-- "this browser has seen the tour" — not "this account has". The difference is
-- what users actually hit:
--   * a second account on the same browser (shared computer) got no tour at all;
--   * the same account on a second device got the tour again;
--   * clearing site data replayed it.
--
-- "First login to the platform" is a fact about the account, so it belongs on the
-- account. It also makes onboarding observable: you can now ask the database how
-- many registered users actually completed the intro.
alter table public.students
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.students.onboarding_completed_at is
  'When the user finished (or dismissed) the intro tour. NULL = never seen it, so show it.';

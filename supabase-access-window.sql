-- Access window for the one-time purchase.
--
-- Access is sold once and covers a fixed period rather than forever. Two years is
-- the span from a 10th-grader buying to actually applying, so it is invisible to a
-- real customer — but it means a resold account is a depreciating asset rather
-- than a permanent one, which is most of why resale is not worth anyone's time.
--
-- NULL means "no expiry": staff accounts, and anyone who bought before this
-- existed. Never backfill this to a date without deciding what happens to those
-- users first.
alter table public.students
  add column if not exists access_expires_at timestamptz;

comment on column public.students.access_expires_at is
  'When paid access lapses. NULL = never expires (staff, legacy purchases). Set by verify-pin on activation.';

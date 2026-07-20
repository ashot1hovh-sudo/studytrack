-- Student-added calendar events: собеседования, экзамены, and anything else.
--
-- The deadlines table already existed but was read-only from the app's point of
-- view: it had a SELECT policy and nothing else, so an INSERT would have been
-- silently rejected by RLS and reported as success — the same failure mode that
-- hid the missing DELETE policies on universities and documents.

alter table public.deadlines
  -- 'interview' | 'exam' | 'custom'. Drives the colour and icon in the
  -- calendar. Existing rows predate this and read as 'custom'.
  add column if not exists kind text not null default 'custom';

-- Free text rather than an enum on purpose: adding a kind should not require a
-- migration, and an unknown value degrades to the neutral style rather than
-- breaking the query.
alter table public.deadlines
  drop constraint if exists deadlines_kind_check;
alter table public.deadlines
  add constraint deadlines_kind_check
  check (kind in ('interview', 'exam', 'custom'));

drop policy if exists "Students can insert own deadlines" on public.deadlines;
create policy "Students can insert own deadlines"
  on public.deadlines for insert
  to authenticated
  with check (student_id = auth.uid());

drop policy if exists "Students can update own deadlines" on public.deadlines;
create policy "Students can update own deadlines"
  on public.deadlines for update
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "Students can delete own deadlines" on public.deadlines;
create policy "Students can delete own deadlines"
  on public.deadlines for delete
  to authenticated
  using (student_id = auth.uid());

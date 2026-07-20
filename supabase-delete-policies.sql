-- DELETE policies for the student-owned tables.
--
-- These never existed: universities and documents had SELECT and UPDATE only,
-- so RLS failed closed on DELETE and every delete quietly affected zero rows.
-- PostgREST does not treat "deleted nothing" as an error, so the API answered
-- 200 and the row stayed put.
--
-- Scoped to the owner, exactly like the existing SELECT/UPDATE policies, so a
-- student can only ever delete their own rows. Deliberately NOT granting the
-- app's service-role client this job instead: the database should be the thing
-- that enforces ownership, not the correctness of a .eq() in a route handler.

drop policy if exists "Students can delete own universities" on public.universities;
create policy "Students can delete own universities"
  on public.universities for delete
  to authenticated
  using (student_id = auth.uid());

drop policy if exists "Students can delete own documents" on public.documents;
create policy "Students can delete own documents"
  on public.documents for delete
  to authenticated
  using (student_id = auth.uid());

-- university_history rows are removed by the FK (on delete cascade) when their
-- university goes, so no policy is needed there.

alter table public.documents
add column if not exists review_comment text;

alter table public.documents
add column if not exists review_file_url text;

alter table public.students
add column if not exists age integer;

alter table public.students
add column if not exists program text;

alter table public.universities
add column if not exists price text;

alter table public.universities
add column if not exists exam_requirements text;

alter table public.universities
add column if not exists city text;

alter table public.universities
add column if not exists major text;

alter table public.documents
add column if not exists target_university_id bigint references public.universities(id) on delete set null;

-- Consultant authority comes from students.role, never from a hardcoded email.
--
-- These policies previously read `auth.jwt() ->> 'email' = 'admin@gmail.com'`.
-- With open registration that address was claimable by anyone, and because the
-- check lived in RLS it was exploitable straight through PostgREST with the
-- public anon key — no app involvement required.
--
-- A policy on public.students cannot SELECT from public.students without
-- recursing, so the lookup goes through a SECURITY DEFINER function that runs as
-- the owner and bypasses RLS for that one query.

create or replace function public.is_consultant()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.students
    where id = auth.uid() and role = 'consultant'
  );
$fn$;

comment on function public.is_consultant() is
  'True when the current user has role=consultant. SECURITY DEFINER so RLS policies on students can call it without recursing.';

revoke all on function public.is_consultant() from public;
grant execute on function public.is_consultant() to authenticated, service_role;

drop policy if exists "Consultants can read all students" on public.students;
create policy "Consultants can read all students"
on public.students for select
to authenticated
using (public.is_consultant());

drop policy if exists "Consultants can read all documents" on public.documents;
create policy "Consultants can read all documents"
on public.documents for select
to authenticated
using (public.is_consultant());

drop policy if exists "Consultants can update all documents" on public.documents;
create policy "Consultants can update all documents"
on public.documents for update
to authenticated
using (public.is_consultant())
with check (public.is_consultant());

drop policy if exists "Consultants can read all storage documents" on storage.objects;
create policy "Consultants can read all storage documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and public.is_consultant()
);

-- Promote an account to admin after creating it:
-- update public.students set role = 'consultant' where email = '<admin address>';


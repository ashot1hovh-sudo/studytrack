alter table public.documents
add column if not exists review_comment text;

alter table public.documents
add column if not exists review_file_url text;

alter table public.students
add column if not exists age integer;

alter table public.students
add column if not exists program text;

drop policy if exists "Consultants can read all students" on public.students;
create policy "Consultants can read all students"
on public.students for select
to authenticated
using (auth.jwt() ->> 'email' = 'admin@gmail.com');

drop policy if exists "Consultants can read all documents" on public.documents;
create policy "Consultants can read all documents"
on public.documents for select
to authenticated
using (auth.jwt() ->> 'email' = 'admin@gmail.com');

drop policy if exists "Consultants can update all documents" on public.documents;
create policy "Consultants can update all documents"
on public.documents for update
to authenticated
using (auth.jwt() ->> 'email' = 'admin@gmail.com')
with check (auth.jwt() ->> 'email' = 'admin@gmail.com');

drop policy if exists "Consultants can read all storage documents" on storage.objects;
create policy "Consultants can read all storage documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and auth.jwt() ->> 'email' = 'admin@gmail.com'
);

-- Run this after creating your admin auth user. Replace the email if needed.
-- update public.students set role = 'consultant' where email = 'admin@gmail.com';



-- Remember that a standard document was deleted.
--
-- Seeding is idempotent by "does a row with this template_key exist", so a hard
-- delete of a standard document is undone the next time anything reseeds — add
-- a university, delete one, change a deadline, and Видео визитка is back. The
-- student deletes it, it returns, and there is no way to say "I don't need it".
--
-- Marking instead of removing keeps the row visible to the seeder (so it does
-- not recreate it) and invisible to the student. It also means the existing
-- partial unique indexes keep working unchanged — no new constraint needed.
--
-- Documents the student typed in themselves have no template_key, nothing ever
-- reseeds them, and they are still deleted outright.

alter table public.documents
  add column if not exists deleted_at timestamptz;

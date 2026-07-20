-- Standard document checklist: lead times and computed deadlines.
--
-- A document's deadline is derived from the earliest university deadline minus
-- the time it takes to obtain that document (справка о несудимости takes ~1.5
-- months, so it has to be ordered long before the application closes).
--
-- Additive and backward compatible: every column is nullable or defaulted, so
-- the currently deployed app keeps working untouched.

alter table public.documents
  -- Which catalogue entry this row came from (see src/lib/documentTemplates.ts).
  -- NULL means the student created it by hand, so nothing is derived for it.
  add column if not exists template_key text,
  -- Days needed to obtain the document. NULL = no computed deadline (аттестат
  -- is gated by graduation, not by a production time).
  add column if not exists lead_time_days integer,
  -- Set once the student edits the date themselves; recomputation then leaves
  -- this row alone. Without it, auto-recompute would silently overwrite their
  -- own planning every time a university deadline moved.
  add column if not exists deadline_manual boolean not null default false;

-- Seeding must be idempotent: adding a second university re-runs it, and the
-- shared documents must not be duplicated. Partial indexes because the shared
-- set (target_university_id is null) and the per-university documents
-- (мотивационное письмо) have different uniqueness rules.
create unique index if not exists documents_shared_template_uniq
  on public.documents (student_id, template_key)
  where template_key is not null and target_university_id is null;

create unique index if not exists documents_per_university_template_uniq
  on public.documents (student_id, template_key, target_university_id)
  where template_key is not null and target_university_id is not null;
